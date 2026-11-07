CREATE TABLE IF NOT EXISTS livestock (
  id BIGSERIAL PRIMARY KEY,
  tag_number VARCHAR(50) NOT NULL UNIQUE CHECK (tag_number ~ '^[0-9]{4}-[0-9]{3,}$'),
  name VARCHAR(100),
  sex VARCHAR(10) NOT NULL CHECK (sex IN ('male', 'female')),
  breed VARCHAR(100) NOT NULL,
  birth_date DATE NOT NULL,
  birth_weight_kg NUMERIC(8,2) CHECK (birth_weight_kg > 0),
  current_weight_kg NUMERIC(8,2) NOT NULL CHECK (current_weight_kg > 0),
  color_markings TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'culled', 'deceased', 'transferred_out')),
  acquisition_date DATE,
  acquisition_type VARCHAR(30) NOT NULL DEFAULT 'born_on_farm' CHECK (acquisition_type IN ('born_on_farm','purchased','donated','transferred_in')),
  notes TEXT,
  purchased BOOLEAN NOT NULL DEFAULT FALSE,
  has_calved BOOLEAN NOT NULL DEFAULT FALSE,
  sire_id BIGINT REFERENCES livestock(id) ON DELETE SET NULL,
  dam_id BIGINT REFERENCES livestock(id) ON DELETE SET NULL,
  seller VARCHAR(200),
  seller_contact VARCHAR(200),
  seller_address TEXT,
  previous_farm VARCHAR(200),
  purchase_price NUMERIC(12,2) CHECK (purchase_price > 0),
  birth_type VARCHAR(50),
  calf_vigor VARCHAR(100),
  calving_difficulty VARCHAR(100),
  weaning_date DATE,
  management_decision TEXT,
  vaccination_treatment_history TEXT,
  body_condition_score SMALLINT CHECK (body_condition_score BETWEEN 1 AND 6),
  health_status VARCHAR(10) CHECK (health_status IN ('excellent', 'good', 'fair', 'poor')),
  physical_assessment_notes TEXT,
  CHECK (NOT purchased OR NULLIF(BTRIM(seller), '') IS NOT NULL),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);

CREATE OR REPLACE FUNCTION set_livestock_tag() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tag_number IS NULL THEN
    NEW.tag_number := EXTRACT(YEAR FROM COALESCE(NEW.created_at, NOW()))::INTEGER || '-' || LPAD(NEW.id::text, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS livestock_set_tag ON livestock;
CREATE TRIGGER livestock_set_tag
BEFORE INSERT ON livestock
FOR EACH ROW EXECUTE FUNCTION set_livestock_tag();

CREATE INDEX IF NOT EXISTS livestock_active_idx ON livestock (status) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS livestock_created_at_idx ON livestock (created_at);
CREATE INDEX IF NOT EXISTS livestock_sire_idx ON livestock (sire_id) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS livestock_dam_idx ON livestock (dam_id) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS livestock_active_sex_birth_idx ON livestock (sex, status, birth_date) WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(320) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'farm_aide' CHECK (role IN ('admin', 'veterinarian', 'farm_aide', 'faculty')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_email_lowercase CHECK (email = LOWER(email))
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx ON users (LOWER(email));
ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_health_alerts BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_activity_digest BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS users_active_idx ON users (active);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash CHAR(64) PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions (expires_at);

ALTER TABLE livestock ADD COLUMN IF NOT EXISTS archive_reason TEXT;
ALTER TABLE livestock ADD COLUMN IF NOT EXISTS archived_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS livestock_archived_by_idx ON livestock (archived_by_user_id);
ALTER TABLE livestock ADD COLUMN IF NOT EXISTS acquisition_type VARCHAR(30) NOT NULL DEFAULT 'born_on_farm';
ALTER TABLE livestock ADD COLUMN IF NOT EXISTS previous_farm VARCHAR(200);
ALTER TABLE livestock DROP CONSTRAINT IF EXISTS livestock_acquisition_type_check;
ALTER TABLE livestock ADD CONSTRAINT livestock_acquisition_type_check CHECK (acquisition_type IN ('born_on_farm','purchased','donated','transferred_in'));

CREATE TABLE IF NOT EXISTS health_records (
  id BIGSERIAL PRIMARY KEY,
  livestock_id BIGINT NOT NULL REFERENCES livestock(id),
  record_type VARCHAR(100) NOT NULL,
  record_date DATE NOT NULL,
  diagnosis TEXT,
  details TEXT,
  treatment TEXT,
  medication_name VARCHAR(200),
  dose VARCHAR(100),
  administration_route VARCHAR(100),
  treatment_start_date DATE,
  treatment_end_date DATE,
  withdrawal_end_date DATE,
  next_due_date DATE,
  veterinarian VARCHAR(150),
  follow_up_date DATE,
  status VARCHAR(10) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  created_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  source_health_record_id BIGINT REFERENCES health_records(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS health_records_livestock_idx ON health_records (livestock_id) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS health_records_open_follow_up_idx ON health_records (follow_up_date) WHERE status = 'open' AND archived_at IS NULL;
CREATE INDEX IF NOT EXISTS health_records_created_at_idx ON health_records (created_at);
CREATE INDEX IF NOT EXISTS health_records_creator_idx ON health_records (created_by_user_id);
CREATE INDEX IF NOT EXISTS health_records_source_idx ON health_records (source_health_record_id);
CREATE INDEX IF NOT EXISTS health_records_livestock_date_idx ON health_records (livestock_id, record_date DESC, id DESC) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS health_records_livestock_type_status_idx ON health_records (livestock_id, record_type, status) WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS treatment_products (
  id BIGSERIAL PRIMARY KEY,
  treatment_type VARCHAR(100) NOT NULL,
  name VARCHAR(200) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (treatment_type, name)
);

CREATE UNIQUE INDEX IF NOT EXISTS treatment_products_type_name_lower_idx
  ON treatment_products (treatment_type, LOWER(name));

CREATE TABLE IF NOT EXISTS cattle_breeds (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS cattle_breeds_name_lower_idx ON cattle_breeds (LOWER(name));
INSERT INTO cattle_breeds (name) VALUES ('Brahman'), ('Angus'), ('Holstein'), ('Native/Carabao'), ('Crossbreed') ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS weight_records (
  id BIGSERIAL PRIMARY KEY,
  livestock_id BIGINT NOT NULL REFERENCES livestock(id),
  measured_at DATE NOT NULL,
  weight_kg NUMERIC(8,2) NOT NULL CHECK (weight_kg > 0),
  notes TEXT,
  recorded_by VARCHAR(150),
  created_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS weight_records_livestock_idx ON weight_records (livestock_id, measured_at DESC) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS weight_records_creator_idx ON weight_records (created_by_user_id);

CREATE TABLE IF NOT EXISTS body_condition_records (
  id BIGSERIAL PRIMARY KEY,
  livestock_id BIGINT NOT NULL REFERENCES livestock(id),
  measured_at DATE NOT NULL,
  score SMALLINT NOT NULL CHECK (score BETWEEN 1 AND 6),
  notes TEXT,
  recorded_by VARCHAR(150),
  created_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS body_condition_records_livestock_idx ON body_condition_records (livestock_id, measured_at DESC);

CREATE TABLE IF NOT EXISTS breeding_records (
  id BIGSERIAL PRIMARY KEY,
  livestock_id BIGINT NOT NULL REFERENCES livestock(id),
  event_type VARCHAR(100) NOT NULL,
  event_date DATE NOT NULL,
  sire_id BIGINT REFERENCES livestock(id) ON DELETE SET NULL,
  pregnancy_status VARCHAR(50),
  expected_calving_date DATE,
  details TEXT,
  performed_by VARCHAR(150),
  created_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  source_service_id BIGINT REFERENCES breeding_records(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS breeding_records_livestock_idx ON breeding_records (livestock_id, event_date DESC) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS breeding_records_sire_idx ON breeding_records (sire_id) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS breeding_records_creator_idx ON breeding_records (created_by_user_id);
CREATE INDEX IF NOT EXISTS breeding_records_livestock_type_date_idx ON breeding_records (livestock_id, event_type, event_date DESC, id DESC) WHERE archived_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS breeding_records_calving_service_idx ON breeding_records (source_service_id) WHERE event_type = 'calving' AND archived_at IS NULL;

CREATE TABLE IF NOT EXISTS calving_events (
  id BIGSERIAL PRIMARY KEY,
  dam_id BIGINT NOT NULL REFERENCES livestock(id) ON DELETE RESTRICT,
  pregnancy_confirmation_id BIGINT NOT NULL REFERENCES breeding_records(id) ON DELETE RESTRICT,
  service_id BIGINT NOT NULL REFERENCES breeding_records(id) ON DELETE RESTRICT,
  breeding_record_id BIGINT NOT NULL UNIQUE REFERENCES breeding_records(id) ON DELETE RESTRICT,
  birth_date DATE NOT NULL,
  performed_by VARCHAR(150) NOT NULL,
  calving_difficulty VARCHAR(30) NOT NULL CHECK (calving_difficulty IN ('unassisted','minor_assistance','major_assistance','caesarean')),
  twins BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (pregnancy_confirmation_id),
  UNIQUE (service_id),
  UNIQUE (pregnancy_confirmation_id, service_id)
);

CREATE INDEX IF NOT EXISTS calving_events_dam_idx ON calving_events (dam_id, birth_date DESC);

CREATE TABLE IF NOT EXISTS calving_outcomes (
  id BIGSERIAL PRIMARY KEY,
  calving_event_id BIGINT NOT NULL REFERENCES calving_events(id) ON DELETE RESTRICT,
  birth_order SMALLINT NOT NULL CHECK (birth_order IN (1,2)),
  outcome VARCHAR(20) NOT NULL CHECK (outcome IN ('live','stillborn','neonatal_death')),
  livestock_id BIGINT REFERENCES livestock(id) ON DELETE RESTRICT,
  name VARCHAR(100),
  sex VARCHAR(10) NOT NULL CHECK (sex IN ('male','female')),
  birth_weight_kg NUMERIC(8,2) NOT NULL CHECK (birth_weight_kg > 0),
  calf_vigor VARCHAR(20) NOT NULL CHECK (calf_vigor IN ('vigorous','normal','weak','critical')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (calving_event_id, birth_order),
  CHECK ((outcome = 'stillborn' AND livestock_id IS NULL) OR (outcome <> 'stillborn' AND livestock_id IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS calving_outcomes_livestock_idx ON calving_outcomes (livestock_id) WHERE livestock_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS pregnancy_checkups (
  id BIGSERIAL PRIMARY KEY,
  livestock_id BIGINT NOT NULL REFERENCES livestock(id) ON DELETE CASCADE,
  service_id BIGINT NOT NULL REFERENCES breeding_records(id) ON DELETE RESTRICT,
  checkup_date DATE NOT NULL,
  gestation_month SMALLINT NOT NULL CHECK (gestation_month BETWEEN 1 AND 10),
  health_status VARCHAR(10) NOT NULL CHECK (health_status IN ('excellent', 'good', 'fair', 'poor')),
  body_condition_score NUMERIC(2,1) NOT NULL CHECK (body_condition_score BETWEEN 1 AND 5),
  weight_kg NUMERIC(8,2) NOT NULL CHECK (weight_kg > 0),
  veterinarian VARCHAR(150) NOT NULL,
  findings TEXT NOT NULL,
  next_checkup_date DATE,
  created_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (service_id, checkup_date)
);

CREATE INDEX IF NOT EXISTS pregnancy_checkups_livestock_idx ON pregnancy_checkups (livestock_id, checkup_date DESC);
CREATE INDEX IF NOT EXISTS pregnancy_checkups_livestock_service_date_idx ON pregnancy_checkups (livestock_id, service_id, checkup_date DESC);

CREATE TABLE IF NOT EXISTS calf_care_plans (
  id BIGSERIAL PRIMARY KEY,
  livestock_id BIGINT NOT NULL REFERENCES livestock(id) ON DELETE CASCADE,
  care_type VARCHAR(100) NOT NULL,
  due_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  notes TEXT,
  created_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE (livestock_id, care_type, due_date)
);

CREATE INDEX IF NOT EXISTS calf_care_plans_due_idx ON calf_care_plans (due_date) WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS activity_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(30) NOT NULL,
  entity_type VARCHAR(30) NOT NULL,
  entity_id BIGINT,
  title VARCHAR(200) NOT NULL,
  detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS activity_logs_created_at_idx ON activity_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS activity_logs_entity_idx ON activity_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS activity_logs_user_id_idx ON activity_logs (user_id);

CREATE TABLE IF NOT EXISTS alert_acknowledgements (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  health_record_id BIGINT NOT NULL REFERENCES health_records(id) ON DELETE CASCADE,
  alert_type VARCHAR(40) NOT NULL,
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, health_record_id, alert_type)
);

CREATE INDEX IF NOT EXISTS alert_acknowledgements_user_idx ON alert_acknowledgements (user_id, acknowledged_at DESC);

CREATE TABLE IF NOT EXISTS system_settings (
  key VARCHAR(80) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO system_settings (key, value) VALUES
  ('farm_name', 'MSU-GenSan Animal Science Farm'),
  ('farm_timezone', 'Asia/Manila'),
  ('report_page_size', '25'),
  ('mature_cattle_price_per_kg', '130'),
  ('calf_fixed_price', '10000')
ON CONFLICT (key) DO NOTHING;

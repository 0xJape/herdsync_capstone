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

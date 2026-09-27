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
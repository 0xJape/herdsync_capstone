BEGIN;

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

INSERT INTO body_condition_records (livestock_id, measured_at, score, notes)
SELECT id, COALESCE(updated_at::date, CURRENT_DATE), body_condition_score, 'Initial profile score'
FROM livestock
WHERE body_condition_score IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM body_condition_records WHERE body_condition_records.livestock_id = livestock.id);

COMMIT;
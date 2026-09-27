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
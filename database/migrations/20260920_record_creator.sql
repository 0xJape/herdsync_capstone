ALTER TABLE health_records ADD COLUMN IF NOT EXISTS created_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE weight_records ADD COLUMN IF NOT EXISTS created_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE breeding_records ADD COLUMN IF NOT EXISTS created_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS health_records_creator_idx ON health_records (created_by_user_id);
CREATE INDEX IF NOT EXISTS weight_records_creator_idx ON weight_records (created_by_user_id);
CREATE INDEX IF NOT EXISTS breeding_records_creator_idx ON breeding_records (created_by_user_id);
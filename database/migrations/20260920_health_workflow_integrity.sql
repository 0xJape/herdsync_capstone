ALTER TABLE health_records ADD COLUMN IF NOT EXISTS source_health_record_id BIGINT REFERENCES health_records(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS health_records_source_idx ON health_records (source_health_record_id);

ALTER TABLE livestock ADD COLUMN IF NOT EXISTS archive_reason TEXT;
ALTER TABLE livestock ADD COLUMN IF NOT EXISTS archived_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS livestock_archived_by_idx ON livestock (archived_by_user_id);

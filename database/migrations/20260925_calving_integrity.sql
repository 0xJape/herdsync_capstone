ALTER TABLE breeding_records ADD COLUMN IF NOT EXISTS source_service_id BIGINT REFERENCES breeding_records(id) ON DELETE RESTRICT;

CREATE UNIQUE INDEX IF NOT EXISTS breeding_records_calving_service_idx
  ON breeding_records (source_service_id)
  WHERE event_type = 'calving' AND archived_at IS NULL;
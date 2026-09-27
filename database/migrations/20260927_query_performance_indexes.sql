CREATE INDEX IF NOT EXISTS health_records_livestock_date_idx
  ON health_records (livestock_id, record_date DESC, id DESC)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS health_records_livestock_type_status_idx
  ON health_records (livestock_id, record_type, status)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS breeding_records_livestock_type_date_idx
  ON breeding_records (livestock_id, event_type, event_date DESC, id DESC)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS pregnancy_checkups_livestock_service_date_idx
  ON pregnancy_checkups (livestock_id, service_id, checkup_date DESC);

CREATE INDEX IF NOT EXISTS livestock_active_sex_birth_idx
  ON livestock (sex, status, birth_date)
  WHERE archived_at IS NULL;

-- Align current cattle health with unresolved clinical history without changing event history.
UPDATE livestock l
SET health_status = 'fair', updated_at = NOW()
WHERE l.archived_at IS NULL
  AND EXISTS (
    SELECT 1
    FROM health_records h
    WHERE h.livestock_id = l.id
      AND h.archived_at IS NULL
      AND h.status = 'open'
      AND h.record_type IN ('illness', 'injury', 'treatment', 'antibiotics', 'anti_inflammatory')
  )
  AND l.health_status IN ('excellent', 'good');

-- Completed records do not retain clinical follow-up work. Recurring next care and withdrawal stay intact.
UPDATE health_records
SET follow_up_date = NULL, updated_at = NOW()
WHERE archived_at IS NULL
  AND status = 'resolved'
  AND follow_up_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS health_records_creator_idx ON health_records (created_by_user_id);
CREATE INDEX IF NOT EXISTS weight_records_creator_idx ON weight_records (created_by_user_id);
CREATE INDEX IF NOT EXISTS breeding_records_creator_idx ON breeding_records (created_by_user_id);
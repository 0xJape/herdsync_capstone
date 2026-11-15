ALTER TABLE livestock
  ADD COLUMN IF NOT EXISTS quarantine_status VARCHAR(20);

UPDATE livestock
SET quarantine_status = CASE
  WHEN acquisition_type = 'born_on_farm' THEN 'not_required'
  ELSE 'active'
END
WHERE quarantine_status IS NULL;

ALTER TABLE livestock
  ALTER COLUMN quarantine_status SET DEFAULT 'not_required',
  ALTER COLUMN quarantine_status SET NOT NULL;

ALTER TABLE livestock DROP CONSTRAINT IF EXISTS livestock_quarantine_status_check;
ALTER TABLE livestock ADD CONSTRAINT livestock_quarantine_status_check
  CHECK (quarantine_status IN ('not_required', 'active', 'released'));

CREATE INDEX IF NOT EXISTS livestock_active_quarantine_idx
  ON livestock (quarantine_status)
  WHERE quarantine_status = 'active' AND archived_at IS NULL;
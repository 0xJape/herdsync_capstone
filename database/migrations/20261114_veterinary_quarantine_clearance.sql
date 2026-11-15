ALTER TABLE livestock DROP CONSTRAINT IF EXISTS livestock_quarantine_status_check;
ALTER TABLE livestock ADD CONSTRAINT livestock_quarantine_status_check
  CHECK (quarantine_status IN ('not_required', 'active', 'pending_clearance', 'released'));

CREATE INDEX IF NOT EXISTS livestock_pending_clearance_idx
  ON livestock (quarantine_status)
  WHERE quarantine_status = 'pending_clearance' AND archived_at IS NULL;
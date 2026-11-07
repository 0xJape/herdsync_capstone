ALTER TABLE livestock DROP CONSTRAINT IF EXISTS livestock_status_check;
UPDATE livestock SET status = 'transferred_out' WHERE status = 'transferred';
ALTER TABLE livestock ADD CONSTRAINT livestock_status_check CHECK (status IN ('active', 'sold', 'culled', 'deceased', 'transferred_out'));
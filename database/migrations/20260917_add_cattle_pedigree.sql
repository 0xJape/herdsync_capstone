ALTER TABLE livestock ADD COLUMN IF NOT EXISTS sire_id BIGINT REFERENCES livestock(id) ON DELETE SET NULL;
ALTER TABLE livestock ADD COLUMN IF NOT EXISTS dam_id BIGINT REFERENCES livestock(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS livestock_sire_idx ON livestock (sire_id) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS livestock_dam_idx ON livestock (dam_id) WHERE archived_at IS NULL;
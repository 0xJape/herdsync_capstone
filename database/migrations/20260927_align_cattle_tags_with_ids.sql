BEGIN;

LOCK TABLE livestock IN ACCESS EXCLUSIVE MODE;

ALTER TABLE livestock ALTER COLUMN tag_number DROP DEFAULT;
ALTER TABLE livestock DROP CONSTRAINT IF EXISTS livestock_tag_number_format_check;

CREATE OR REPLACE FUNCTION set_livestock_tag() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tag_number IS NULL THEN
    NEW.tag_number := EXTRACT(YEAR FROM COALESCE(NEW.created_at, NOW()))::INTEGER || '-' || LPAD(NEW.id::text, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS livestock_set_tag ON livestock;
CREATE TRIGGER livestock_set_tag
BEFORE INSERT ON livestock
FOR EACH ROW EXECUTE FUNCTION set_livestock_tag();

UPDATE livestock SET tag_number = 'migrating-' || id;
UPDATE livestock
SET tag_number = EXTRACT(YEAR FROM created_at)::INTEGER || '-' || LPAD(id::text, 3, '0');

ALTER TABLE livestock
  ADD CONSTRAINT livestock_tag_number_format_check CHECK (tag_number ~ '^[0-9]{4}-[0-9]{3,}$');

DROP TABLE IF EXISTS livestock_tag_counters;
DROP FUNCTION IF EXISTS next_livestock_tag();

COMMIT;
BEGIN;

LOCK TABLE livestock IN ACCESS EXCLUSIVE MODE;

CREATE TABLE IF NOT EXISTS livestock_tag_counters (
  tag_year INTEGER PRIMARY KEY,
  last_number INTEGER NOT NULL CHECK (last_number > 0)
);

CREATE OR REPLACE FUNCTION next_livestock_tag() RETURNS TEXT AS $$
DECLARE
  current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
  next_number INTEGER;
BEGIN
  INSERT INTO livestock_tag_counters (tag_year, last_number)
  VALUES (current_year, 1)
  ON CONFLICT (tag_year) DO UPDATE
    SET last_number = livestock_tag_counters.last_number + 1
  RETURNING last_number INTO next_number;

  RETURN current_year || '-' || LPAD(next_number::text, 3, '0');
END;
$$ LANGUAGE plpgsql;

ALTER TABLE livestock DROP CONSTRAINT IF EXISTS livestock_tag_number_format_check;

UPDATE livestock SET tag_number = 'migrating-' || id;

WITH numbered AS (
  SELECT
    id,
    EXTRACT(YEAR FROM created_at)::INTEGER AS tag_year,
    ROW_NUMBER() OVER (
      PARTITION BY EXTRACT(YEAR FROM created_at)
      ORDER BY created_at, id
    ) AS tag_number
  FROM livestock
)
UPDATE livestock
SET tag_number = numbered.tag_year || '-' || LPAD(numbered.tag_number::text, 3, '0')
FROM numbered
WHERE livestock.id = numbered.id;

INSERT INTO livestock_tag_counters (tag_year, last_number)
SELECT
  EXTRACT(YEAR FROM created_at)::INTEGER,
  COUNT(*)::INTEGER
FROM livestock
GROUP BY EXTRACT(YEAR FROM created_at)
ON CONFLICT (tag_year) DO UPDATE SET last_number = EXCLUDED.last_number;

ALTER TABLE livestock
  ALTER COLUMN tag_number SET DEFAULT next_livestock_tag(),
  ADD CONSTRAINT livestock_tag_number_format_check CHECK (tag_number ~ '^[0-9]{4}-[0-9]{3,}$');

COMMIT;
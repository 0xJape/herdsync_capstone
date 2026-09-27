BEGIN;

LOCK TABLE livestock IN ACCESS EXCLUSIVE MODE;

ALTER TABLE livestock DROP CONSTRAINT IF EXISTS livestock_tag_number_format_check;

-- Two phases avoid unique collisions while assigning stable printable IDs by record order.
UPDATE livestock SET tag_number = 'migrating-' || id;

WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS tag
  FROM livestock
)
UPDATE livestock
SET tag_number = LPAD(numbered.tag::text, 3, '0')
FROM numbered
WHERE livestock.id = numbered.id;

SELECT setval(
  'livestock_cattle_id_seq',
  COALESCE((SELECT MAX(tag_number::BIGINT) FROM livestock), 0) + 1,
  FALSE
);

ALTER TABLE livestock
  ALTER COLUMN tag_number SET DEFAULT LPAD(nextval('livestock_cattle_id_seq')::text, 3, '0'),
  ADD CONSTRAINT livestock_tag_number_format_check CHECK (tag_number ~ '^[0-9]{3,}$');

COMMIT;
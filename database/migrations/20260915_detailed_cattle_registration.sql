BEGIN;

CREATE SEQUENCE IF NOT EXISTS livestock_cattle_id_seq;

DO $$
DECLARE
  next_number BIGINT;
BEGIN
  SELECT COALESCE(MAX(tag_number::BIGINT) FILTER (WHERE tag_number ~ '^[0-9]+$'), 0) + 1
    INTO next_number
    FROM livestock
  WHERE tag_number ~ '^[0-9]+$';
  PERFORM setval('livestock_cattle_id_seq', next_number, FALSE);
END $$;

ALTER TABLE livestock
  ALTER COLUMN tag_number SET DEFAULT LPAD(nextval('livestock_cattle_id_seq')::text, 3, '0'),
  ADD COLUMN IF NOT EXISTS birth_weight_kg NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS current_weight_kg NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS color_markings TEXT,
  ADD COLUMN IF NOT EXISTS has_calved BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS purchased BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS seller VARCHAR(200),
  ADD COLUMN IF NOT EXISTS vaccination_treatment_history TEXT,
  ADD COLUMN IF NOT EXISTS body_condition_score SMALLINT,
  ADD COLUMN IF NOT EXISTS health_status VARCHAR(10),
  ADD COLUMN IF NOT EXISTS physical_assessment_notes TEXT;

ALTER TABLE livestock DROP CONSTRAINT IF EXISTS livestock_status_check;
ALTER TABLE livestock ADD CONSTRAINT livestock_status_check CHECK (status IN ('active', 'sold', 'culled', 'deceased', 'transferred'));

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'livestock_birth_weight_check' AND conrelid = 'livestock'::regclass) THEN
    ALTER TABLE livestock ADD CONSTRAINT livestock_birth_weight_check CHECK (birth_weight_kg IS NULL OR birth_weight_kg > 0) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'livestock_current_weight_check' AND conrelid = 'livestock'::regclass) THEN
    ALTER TABLE livestock ADD CONSTRAINT livestock_current_weight_check CHECK (current_weight_kg IS NULL OR current_weight_kg > 0) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'livestock_bcs_check' AND conrelid = 'livestock'::regclass) THEN
    ALTER TABLE livestock ADD CONSTRAINT livestock_bcs_check CHECK (body_condition_score IS NULL OR body_condition_score BETWEEN 1 AND 6) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'livestock_health_status_check' AND conrelid = 'livestock'::regclass) THEN
    ALTER TABLE livestock ADD CONSTRAINT livestock_health_status_check CHECK (health_status IS NULL OR health_status IN ('excellent', 'good', 'fair', 'poor')) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'livestock_purchase_seller_check' AND conrelid = 'livestock'::regclass) THEN
    ALTER TABLE livestock ADD CONSTRAINT livestock_purchase_seller_check CHECK (NOT purchased OR NULLIF(BTRIM(seller), '') IS NOT NULL) NOT VALID;
  END IF;
END $$;

COMMIT;
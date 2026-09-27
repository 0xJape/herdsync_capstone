BEGIN;

ALTER TABLE livestock
  ADD COLUMN IF NOT EXISTS seller_contact VARCHAR(200),
  ADD COLUMN IF NOT EXISTS seller_address TEXT,
  ADD COLUMN IF NOT EXISTS purchase_price NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS birth_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS calf_vigor VARCHAR(100),
  ADD COLUMN IF NOT EXISTS calving_difficulty VARCHAR(100),
  ADD COLUMN IF NOT EXISTS weaning_date DATE,
  ADD COLUMN IF NOT EXISTS management_decision TEXT;

ALTER TABLE health_records
  ADD COLUMN IF NOT EXISTS medication_name VARCHAR(200),
  ADD COLUMN IF NOT EXISTS dose VARCHAR(100),
  ADD COLUMN IF NOT EXISTS administration_route VARCHAR(100),
  ADD COLUMN IF NOT EXISTS treatment_start_date DATE,
  ADD COLUMN IF NOT EXISTS treatment_end_date DATE,
  ADD COLUMN IF NOT EXISTS withdrawal_end_date DATE,
  ADD COLUMN IF NOT EXISTS next_due_date DATE;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'livestock_purchase_price_check' AND conrelid = 'livestock'::regclass) THEN
    ALTER TABLE livestock ADD CONSTRAINT livestock_purchase_price_check CHECK (purchase_price IS NULL OR purchase_price > 0) NOT VALID;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS weight_records (
  id BIGSERIAL PRIMARY KEY,
  livestock_id BIGINT NOT NULL REFERENCES livestock(id),
  measured_at DATE NOT NULL,
  weight_kg NUMERIC(8,2) NOT NULL CHECK (weight_kg > 0),
  notes TEXT,
  recorded_by VARCHAR(150),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS weight_records_livestock_idx ON weight_records (livestock_id, measured_at DESC) WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS breeding_records (
  id BIGSERIAL PRIMARY KEY,
  livestock_id BIGINT NOT NULL REFERENCES livestock(id),
  event_type VARCHAR(100) NOT NULL,
  event_date DATE NOT NULL,
  sire_id BIGINT REFERENCES livestock(id) ON DELETE SET NULL,
  pregnancy_status VARCHAR(50),
  expected_calving_date DATE,
  details TEXT,
  performed_by VARCHAR(150),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS breeding_records_livestock_idx ON breeding_records (livestock_id, event_date DESC) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS breeding_records_sire_idx ON breeding_records (sire_id) WHERE archived_at IS NULL;

COMMIT;
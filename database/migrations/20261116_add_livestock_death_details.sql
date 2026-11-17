ALTER TABLE livestock
  ADD COLUMN IF NOT EXISTS death_date DATE,
  ADD COLUMN IF NOT EXISTS death_reason TEXT,
  ADD COLUMN IF NOT EXISTS death_photo_urls JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE livestock DROP CONSTRAINT IF EXISTS livestock_death_photo_urls_check;
ALTER TABLE livestock ADD CONSTRAINT livestock_death_photo_urls_check
  CHECK (jsonb_typeof(death_photo_urls) = 'array' AND jsonb_array_length(death_photo_urls) <= 3);

ALTER TABLE breeding_records
  ADD COLUMN IF NOT EXISTS photo_urls JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE breeding_records
SET photo_urls = jsonb_build_array(photo_url)
WHERE photo_url IS NOT NULL AND photo_urls = '[]'::jsonb;

ALTER TABLE breeding_records
  DROP CONSTRAINT IF EXISTS breeding_records_photo_urls_check;

ALTER TABLE breeding_records
  ADD CONSTRAINT breeding_records_photo_urls_check
  CHECK (jsonb_typeof(photo_urls) = 'array' AND jsonb_array_length(photo_urls) <= 3);

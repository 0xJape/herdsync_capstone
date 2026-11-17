ALTER TABLE livestock
ADD COLUMN IF NOT EXISTS photo_urls JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE livestock DROP CONSTRAINT IF EXISTS livestock_photo_urls_check;
ALTER TABLE livestock ADD CONSTRAINT livestock_photo_urls_check
CHECK (jsonb_typeof(photo_urls) = 'array' AND jsonb_array_length(photo_urls) <= 3);

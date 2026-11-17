ALTER TABLE calving_events
  ADD COLUMN IF NOT EXISTS photo_urls JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE calving_events
  DROP CONSTRAINT IF EXISTS calving_events_photo_urls_check;

ALTER TABLE calving_events
  ADD CONSTRAINT calving_events_photo_urls_check
  CHECK (jsonb_typeof(photo_urls) = 'array' AND jsonb_array_length(photo_urls) <= 3);

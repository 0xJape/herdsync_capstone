ALTER TABLE breeding_records
  ADD COLUMN IF NOT EXISTS photo_url TEXT;

ALTER TABLE breeding_records
  DROP CONSTRAINT IF EXISTS breeding_records_photo_url_check;

ALTER TABLE breeding_records
  ADD CONSTRAINT breeding_records_photo_url_check
  CHECK (photo_url IS NULL OR photo_url LIKE '/uploads/breeding/%');

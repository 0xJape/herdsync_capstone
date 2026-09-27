BEGIN;

-- Repeatable demo enrichment for every active baseline animal.
UPDATE livestock
SET
  purchased = TRUE,
  seller = COALESCE(NULLIF(seller, ''), 'MSU Partner Breeder ' || ((id % 4) + 1)),
  seller_contact = COALESCE(NULLIF(seller_contact, ''), '09' || LPAD((170000000 + id)::text, 9, '0')),
  seller_address = COALESCE(NULLIF(seller_address, ''), 'General Santos City, South Cotabato'),
  purchase_price = COALESCE(purchase_price, CASE
    WHEN tag_number LIKE 'MSU-B-%' THEN 78000 + id * 500
    WHEN tag_number LIKE 'MSU-C-%' THEN 52000 + id * 350
    WHEN tag_number LIKE 'MSU-H-%' THEN 39000 + id * 250
    WHEN tag_number LIKE 'MSU-YB-%' THEN 58000
    ELSE 24000 + id * 150
  END),
  birth_type = COALESCE(NULLIF(birth_type, ''), CASE WHEN id % 7 = 0 THEN 'Twin' ELSE 'Single' END),
  calf_vigor = COALESCE(NULLIF(calf_vigor, ''), CASE WHEN id % 5 = 0 THEN 'Moderate — assisted standing' ELSE 'Strong — stood within one hour' END),
  calving_difficulty = COALESCE(NULLIF(calving_difficulty, ''), CASE WHEN id % 6 = 0 THEN 'Minor assistance' ELSE 'Unassisted' END),
  weaning_date = COALESCE(weaning_date, birth_date + ((180 + id % 20) * INTERVAL '1 day')),
  management_decision = COALESCE(NULLIF(management_decision, ''), CASE
    WHEN sex = 'male' AND tag_number LIKE 'MSU-B-%' THEN 'Retain as breeding bull; reassess fertility each season.'
    WHEN sex = 'male' THEN 'Monitor growth and evaluate breeding potential.'
    WHEN has_calved THEN 'Retain in breeding herd and monitor calving interval.'
    ELSE 'Retain as replacement female and monitor growth targets.'
  END),
  updated_at = NOW()
WHERE archived_at IS NULL
  AND tag_number ~ '^MSU-(B|YB|C|H|K)-[0-9]{3}$';

-- Three dated measurements per animal make progress visible.
INSERT INTO weight_records (livestock_id, measured_at, weight_kg, notes, recorded_by)
SELECT l.id, d.measured_at, GREATEST(1, l.current_weight_kg - d.loss), d.notes, 'Farm Staff · Marlo Gel'
FROM livestock l
CROSS JOIN LATERAL (VALUES
  (CURRENT_DATE - 120, 28::numeric, 'Quarterly baseline measurement'),
  (CURRENT_DATE - 60, 14::numeric, 'Routine growth monitoring'),
  (CURRENT_DATE - 7, 0::numeric, 'Latest body-weight measurement')
) AS d(measured_at, loss, notes)
WHERE l.archived_at IS NULL
  AND l.tag_number ~ '^MSU-(B|YB|C|H|K)-[0-9]{3}$'
  AND NOT EXISTS (
    SELECT 1 FROM weight_records w
    WHERE w.livestock_id = l.id AND w.measured_at = d.measured_at AND w.archived_at IS NULL
  );

-- Routine resolved preventive record for every animal.
INSERT INTO health_records (
  livestock_id, record_type, record_date, diagnosis, details, treatment,
  medication_name, dose, administration_route, treatment_start_date,
  treatment_end_date, withdrawal_end_date, next_due_date, veterinarian,
  follow_up_date, status
)
SELECT
  l.id, 'Vaccination', CURRENT_DATE - 45,
  'Routine preventive care', 'Annual herd vaccination completed without adverse reaction.',
  'FMD preventive vaccination', 'FMD Vaccine', '2 mL', 'Subcutaneous',
  CURRENT_DATE - 45, CURRENT_DATE - 45, NULL, CURRENT_DATE + 320,
  'Dr. Maria Santos', CURRENT_DATE + 320, 'resolved'
FROM livestock l
WHERE l.archived_at IS NULL
  AND l.tag_number ~ '^MSU-(B|YB|C|H|K)-[0-9]{3}$'
  AND NOT EXISTS (
    SELECT 1 FROM health_records h
    WHERE h.livestock_id = l.id AND h.record_type = 'Vaccination'
      AND h.medication_name = 'FMD Vaccine' AND h.archived_at IS NULL
  );

-- One active antibiotic case demonstrates AMR and withdrawal warnings without flagging whole herd.
INSERT INTO health_records (
  livestock_id, record_type, record_date, diagnosis, details, treatment,
  medication_name, dose, administration_route, treatment_start_date,
  treatment_end_date, withdrawal_end_date, next_due_date, veterinarian,
  follow_up_date, status
)
SELECT
  l.id, 'Treatment', CURRENT_DATE - 2, 'Respiratory infection',
  'Reduced appetite and nasal discharge; temperature monitored twice daily.',
  'Complete prescribed antimicrobial course.', 'Oxytetracycline', '10 mg/kg',
  'Intramuscular', CURRENT_DATE - 2, CURRENT_DATE + 3, CURRENT_DATE + 31,
  CURRENT_DATE + 1, 'Dr. Maria Santos', CURRENT_DATE + 1, 'open'
FROM livestock l
WHERE l.tag_number = 'MSU-H-004' AND l.archived_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM health_records h
    WHERE h.livestock_id = l.id AND h.medication_name = 'Oxytetracycline'
      AND h.archived_at IS NULL
  );

-- Breeding and reproductive history for mature females.
INSERT INTO breeding_records (
  livestock_id, event_type, event_date, sire_id, pregnancy_status,
  expected_calving_date, details, performed_by
)
SELECT
  female.id, 'Natural service', CURRENT_DATE - (90 + female.id % 30)::integer, sire.id,
  CASE WHEN female.id % 3 = 0 THEN 'Confirmed pregnant' ELSE 'Open / monitoring' END,
  CASE WHEN female.id % 3 = 0 THEN CURRENT_DATE + (180 + female.id % 25)::integer ELSE NULL END,
  CASE WHEN female.id % 3 = 0 THEN 'Pregnancy confirmed during routine reproductive examination.' ELSE 'Service recorded; schedule pregnancy diagnosis.' END,
  'Dr. Ana Cruz'
FROM livestock female
JOIN livestock sire ON sire.tag_number = 'MSU-B-001' AND sire.archived_at IS NULL
WHERE female.archived_at IS NULL
  AND female.sex = 'female'
  AND female.tag_number ~ '^MSU-(C|H)-[0-9]{3}$'
  AND NOT EXISTS (
    SELECT 1 FROM breeding_records b
    WHERE b.livestock_id = female.id AND b.event_type = 'Natural service' AND b.archived_at IS NULL
  );

-- Bull profiles also show breeding activity.
INSERT INTO breeding_records (
  livestock_id, event_type, event_date, pregnancy_status, details, performed_by
)
SELECT l.id, 'Breeding soundness exam', CURRENT_DATE - 75, 'Approved for service',
  'Physical examination and reproductive fitness assessment completed.', 'Dr. Ana Cruz'
FROM livestock l
WHERE l.archived_at IS NULL AND l.sex = 'male'
  AND l.tag_number ~ '^MSU-(B|YB)-[0-9]{3}$'
  AND NOT EXISTS (
    SELECT 1 FROM breeding_records b
    WHERE b.livestock_id = l.id AND b.event_type = 'Breeding soundness exam' AND b.archived_at IS NULL
  );

COMMIT;

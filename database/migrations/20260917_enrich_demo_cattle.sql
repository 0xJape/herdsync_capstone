BEGIN;

UPDATE livestock
SET
  birth_weight_kg = CASE
    WHEN sex = 'male' THEN 34 + (id % 5)
    ELSE 30 + (id % 5)
  END,
  current_weight_kg = CASE
    WHEN tag_number LIKE 'MSU-B-%' THEN 650 + (id * 8)
    WHEN tag_number LIKE 'MSU-YB-%' THEN 390
    WHEN tag_number LIKE 'MSU-C-%' THEN 410 + (id % 7) * 9
    WHEN tag_number LIKE 'MSU-H-%' THEN 265 + (id % 6) * 8
    ELSE 145 + (id % 4) * 7
  END,
  color_markings = CASE breed
    WHEN 'Holstein' THEN '#30302f'
    WHEN 'Simmental' THEN '#a85f36'
    ELSE '#d8d0bd'
  END,
  has_calved = tag_number LIKE 'MSU-C-%',
  vaccination_treatment_history = CASE
    WHEN tag_number IN ('MSU-C-001', 'MSU-C-003', 'MSU-C-006', 'MSU-H-004', 'MSU-K-002') THEN 'See recorded health history for detailed treatment and follow-up.'
    ELSE 'Routine vaccination and deworming schedule maintained.'
  END,
  body_condition_score = CASE
    WHEN tag_number = 'MSU-H-004' THEN 3
    WHEN tag_number LIKE 'MSU-K-%' THEN 4
    WHEN tag_number IN ('MSU-C-003', 'MSU-C-006', 'MSU-B-002') THEN 4
    ELSE 3
  END,
  health_status = CASE
    WHEN tag_number = 'MSU-H-004' THEN 'fair'
    WHEN tag_number IN ('MSU-C-001', 'MSU-C-003', 'MSU-B-001') THEN 'excellent'
    ELSE 'good'
  END,
  physical_assessment_notes = CASE
    WHEN tag_number = 'MSU-H-004' THEN 'Monitor appetite and activity; follow-up assessment recommended.'
    WHEN tag_number LIKE 'MSU-K-%' THEN 'Normal growth and development for age.'
    ELSE 'Bright, alert, responsive, and moving normally.'
  END,
  notes = REPLACE(notes, 'Demo record · ', '') || ' maintained at MSU-General Santos Animal Science Farm.',
  updated_at = NOW()
WHERE archived_at IS NULL
  AND tag_number ~ '^MSU-(B|YB|C|H|K)-[0-9]{3}$';

UPDATE livestock child
SET sire_id = sire.id, dam_id = dam.id, updated_at = NOW()
FROM livestock sire, livestock dam
WHERE child.archived_at IS NULL
  AND sire.tag_number = 'MSU-B-001'
  AND dam.tag_number = CASE child.tag_number
    WHEN 'MSU-H-001' THEN 'MSU-C-001'
    WHEN 'MSU-H-002' THEN 'MSU-C-005'
    WHEN 'MSU-H-003' THEN 'MSU-C-002'
    WHEN 'MSU-H-004' THEN 'MSU-C-003'
    WHEN 'MSU-K-001' THEN 'MSU-C-004'
    WHEN 'MSU-K-002' THEN 'MSU-C-006'
    WHEN 'MSU-K-003' THEN 'MSU-C-005'
  END
  AND child.tag_number IN ('MSU-H-001', 'MSU-H-002', 'MSU-H-003', 'MSU-H-004', 'MSU-K-001', 'MSU-K-002', 'MSU-K-003');

COMMIT;

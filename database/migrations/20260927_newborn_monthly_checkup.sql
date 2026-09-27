UPDATE health_records
SET follow_up_date = record_date + INTERVAL '1 month',
    details = 'Newborn assessment completed; one-month follow-up assigned automatically.',
    updated_at = NOW()
WHERE record_type = 'newborn_care'
  AND status = 'open'
  AND follow_up_date = record_date
  AND archived_at IS NULL;

UPDATE calf_care_plans
SET due_date = l.birth_date + INTERVAL '1 month',
    notes = 'Complete one-month calf health check.'
FROM livestock l
WHERE calf_care_plans.livestock_id = l.id
  AND calf_care_plans.care_type = 'newborn_checkup'
  AND calf_care_plans.status = 'pending'
  AND calf_care_plans.due_date = l.birth_date;
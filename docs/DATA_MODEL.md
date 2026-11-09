# HerdSync Data Model

## Core entities
- `users`: id, full_name, email, username, password_hash, role_id, phone, avatar_url, active, last_login_at, created_at, updated_at, deactivated_at.
- `roles`: id, name, description, created_at.
- `permissions`: id, key, description.
- `role_permissions`: role_id, permission_id.
- `cattle`: id, tag_number, name, species, breed_id, sex, birth_date, age_class, color, origin, status, health_status, current_weight, current_bcs, location, dam_id, sire_id, photo_url, notes, created_by, updated_by, created_at, updated_at, archived_at.
- `breeds`: id, name, description, active.
- `cattle_status_history`: cattle_id, previous_status, new_status, reason, changed_by, changed_at.
- `admissions`: id, cattle_id, source, acquisition_date, seller, purchase_reference, purchase_price, quarantine_start, quarantine_end, admission_date, assessment_status, assessment_notes, approved_by, created_at.
- `measurements`: id, cattle_id, type, value, unit, measured_at, method, notes, recorded_by, created_at.
- `health_assessments`: id, cattle_id, status, body_temperature, findings, symptoms, diagnosis_note, recommendations, assessed_at, assessed_by, reviewed_by, reviewed_at, created_at.
- `treatments`: id, cattle_id, category, product, active_ingredient, batch_number, reason, dose, dose_unit, route, frequency, started_at, administered_at, completed_at, next_due_at, instructions, notes, administered_by, created_at.
- `preventive_care`: id, cattle_id, type, product, dose, dose_unit, administered_at, next_due_at, administered_by, notes.
- `withdrawals`: id, treatment_id, cattle_id, reason, duration_days, starts_at, ends_at, status, clearance_notes, cleared_at, cleared_by, created_at.
- `breeding_events`: id, dam_id, sire_id, method, event_date, heat_observed_at, semen_reference, outcome, check_due_at, notes, recorded_by, created_at, updated_at.
- `pregnancies`: id, breeding_event_id, dam_id, confirmed_at, conception_date, expected_delivery_at, status, examiner_id, notes, completed_at, created_at, updated_at.
- `pregnancy_checkups`: id, pregnancy_id, checked_at, gestation_day, weight, bcs, condition, findings, nutrition_notes, recommendations, next_due_at, checked_by, created_at.
- `birth_events`: id, pregnancy_id, delivered_at, outcome, birth_type, offspring_count, complications, postpartum_notes, recorded_by, created_at.
- `offspring_records`: id, birth_event_id, cattle_id, sex, birth_weight, initial_bcs, condition, survival_status, notes, created_at.
- `alerts`: id, cattle_id, source_entity, source_id, event_type, title, message, due_at, severity, status, assigned_role, assigned_user_id, acknowledged_at, acknowledged_by, completed_at, completed_by, created_at.
- `activities`: id, cattle_id, type, title, notes, occurred_at, location, recorded_by, created_at.
- `attachments`: id, entity, entity_id, file_name, storage_path, mime_type, file_size, uploaded_by, created_at, deleted_at.
- `audit_logs`: id, user_id, action, entity, entity_id, before_data, after_data, ip_address, user_agent, outcome, occurred_at.
- `saved_reports`: id, user_id, name, report_type, filters_json, created_at, updated_at.
- `system_settings`: id, key, value, value_type, description, updated_by, updated_at.

## Lookup and configuration data

Keep changing farm-approved values out of application code:

- `health_statuses`: key, label, severity, active.
- `cattle_categories`: key, label, active.
- `treatment_categories`: key, label, active.
- `administration_routes`: key, label, active.
- `breeding_methods`: key, label, active.
- `alert_types`: key, label, default_severity, active.
- `farm_locations`: id, name, description, active.
- `schedule_rules`: type, cattle_category, interval_days, reminder_days, approved_by, active.

## Constraints
- Tag number unique.
- User email and username unique.
- Lookup names and keys unique within their lookup table.
- Required records include creator, timestamp, and responsible personnel where applicable.
- Dam and sire cannot equal cattle id.
- Dam and sire must reference existing cattle.
- Sire must be male; dam must be female.
- A cattle record cannot be its own ancestor.
- Birth date cannot be after admission, treatment, breeding, or assessment dates without an explicit correction workflow.
- Numeric weight, BCS, dose, and duration values must be within configured valid ranges.
- Pregnancy requires confirmed breeding event.
- Only authorized users can confirm pregnancy or clear withdrawal.
- Birth requires pregnancy.
- A pregnancy can have at most one completed birth event unless loss or correction is recorded.
- Offspring records must belong to their birth event and inherit valid parentage.
- Offspring cannot reference itself as parent.
- Archive instead of deleting cattle history.
- Audit logs are append-only for normal users.
- Attachments require authorized entity access and private storage.
- Use transactions for pregnancy confirmation and birth recording.
- Store timestamps in UTC; display local farm timezone.

## Indexes
Tag number, status, health status, breed, sex, birth date, due dates, treatment dates, breeding dates, pregnancy status, assigned alerts, user email, audit timestamp.

## Public interface alignment

The accessible landing page currently exposes these data-model-backed areas:

| Interface area | Data model source | Rule |
|---|---|---|
| Livestock information | `cattle`, `admissions`, `health_assessments` | Show only approved public summary data. Never expose private cattle or health details. |
| Health activities | `treatments`, `withdrawals`, `health_assessments` | Public page may describe capabilities; treatment records require authentication and authorization. |
| Breeding and reporting | `breeding_events`, `pregnancies`, `birth_events`, report queries | Public page may describe capabilities; records and exports remain protected. |
| Current farm statistics | `cattle` aggregate query | Count active cattle dynamically. Do not hard-code the initial count of 25. |

## Required route behavior

- `/` displays public product information and a dynamically loaded public-safe cattle count if approved.
- `/login` must render an authentication screen instead of returning `404`.
- Protected dashboard and record pages require authentication before loading data.
- Unauthorized users receive a clear `401` or `403` response, not private data.

## Prototype navigation mapping

| Prototype route | Data model areas |
|---|---|
| `/dashboard` | `cattle`, `health_assessments`, `alerts`, `activities`, aggregate reports |
| `/manage-users` | `users`, `roles`, `permissions`, `role_permissions` |
| `/audit-log` | `audit_logs` |
| `/reports` | report queries over cattle, health, treatment, breeding, pregnancy, birth, and activity data |
| `/livestock` | `cattle`, `breeds`, `admissions`, `measurements`, `cattle_status_history` |
| `/vaccination` | `treatments`, `preventive_care`, `withdrawals`, `alerts` |
| `/pregnancy` | `breeding_events`, `pregnancies`, `pregnancy_checkups`, `birth_events` |
| `/alerts` | `alerts` |
| `/activity` | `activities`, `audit_logs` |

The dashboard also links individual records such as `/livestock/:tag_number`; this route must resolve cattle by unique tag number and enforce access before returning profile data.

## Exploration limitation

The deployed site currently exposes only the landing page. Its `/login` link returns a Vercel `404`, so dashboard, cattle, health, breeding, pregnancy, birth, alerts, reports, audit, and user-management pages remain unverified until authentication and routes are available.

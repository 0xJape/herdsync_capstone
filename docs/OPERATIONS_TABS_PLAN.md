# Operations Tabs Plan

## Alerts (`/alerts`)
- Purpose: one actionable queue for clinical follow-ups, preventive care, reminders, and medicine withdrawal endings.
- Source: derived from non-archived health records; no duplicated alert entity.
- Actions: open cattle profile, acknowledge, restore. Acknowledgment is per user and never changes source care.
- States: urgency filters, search, empty/no-results, retry, loading, mobile cards.

## Activity (`/activity`)
- Purpose: searchable chronological record of completed system work.
- Source: immutable `activity_logs` joined to actor and source cattle where possible.
- Actions: filter, paginate, open source record. No edit/delete controls.
- States: loading, empty/no-results, retry, responsive timeline.

## Manage users (`/manage-users`)
- Purpose: administrator access control.
- Actions: create account, change role, activate/deactivate, reset password.
- Integrity: admin-only API, unique lowercase email, audited mutations, no self-deactivation, no removal of final active administrator.
- States: permission failure, validation, success, loading, responsive cards/table.

## Settings (`/settings`)
- Purpose: administrator-owned farm display and reporting defaults.
- Settings: farm name, IANA timezone, report page size.
- Integrity: admin-only mutation, allowlisted keys, audited changes. Clinical protocol intervals remain code-owned.
- States: permission failure, validation, saved confirmation, loading, responsive form.

## Shared quality bar
- Protected APIs; server-side role checks.
- No dead buttons or placeholder controls.
- No source-data mutation from presentation actions.
- Keyboard labels, status text, 44px touch targets, mobile-safe layouts.
- `Cache-Control: no-store` for operational reads.
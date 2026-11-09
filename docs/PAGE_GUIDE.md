# HerdSync Page Guide

Purpose: define each page before implementation. Every protected page must enforce role access on the server and use Lucide icons, Poppins, green palette, responsive layouts, and accessible labels.

## Public pages

### `/`
Public introduction to HerdSync. Shows MSU-GenSan context, system purpose, safe capability summaries, and sign-in action. Public cattle statistics must be approved and dynamically queried; never expose private health data.

### `/login`
Authentication page. Email/username, password, remember-me option, validation errors, sign-in, and approved password-recovery link. Remove quick-login credentials before production.

### `/forgot-password`
Password recovery request and reset flow. Show generic responses so account existence is not revealed.

## Main pages

### `/dashboard`
Operational summary for current user. Shows active cattle count, health-status totals, pregnancy and breeding summaries, upcoming work, overdue items, active withdrawals, critical alerts, recent activities, and trend charts. Every card links to its source page.

### `/livestock`
Cattle inventory. Search by tag or name; filter by breed, sex, age class, health, reproductive status, location, and active/archive status. Supports pagination, add cattle, profile access, edit, and archive actions.

### `/livestock/add`
Cattle registration form. Captures identification, breed, sex, birth date, origin, admission/acquisition, location, initial health, weight, BCS, parentage, photo, and notes. Validates unique tag and required relationships before saving.

### `/livestock/:tag_number`
Individual cattle profile. Shows identification header, current status, health summary, parentage, measurements, treatment, withdrawal, reproduction, alerts, activity, and audit history. Editing depends on role.

## Health pages

### `/vaccination`
Preventive-care workspace. Shows vaccinations, deworming, vitamins, minerals, treatment follow-ups, due items, overdue items, and active withdrawals. Supports recording care and opening the cattle profile.

### `/health`
Health assessment workspace. Lists recent assessments and cattle needing attention. Supports recording findings, symptoms, status, temperature, recommendations, review, and critical-condition alerts.

### `/treatments`
Treatment workspace. Shows treatment history and active medication records. Supports product, reason, dose, route, dates, administrator, follow-up, withdrawal duration, and treatment notes. Clinical values require authorized personnel.

## Reproduction pages

### `/breeding`
Breeding workspace. Shows planned, completed, pending-check, pregnant, and unsuccessful breeding events. Supports dam, sire, method, date, eligibility checks, notes, and pregnancy-check scheduling.

### `/pregnancy`
Pregnancy workspace. Shows confirmed pregnancies by stage, expected delivery, checkups, overdue examinations, and pregnancy outcomes. Supports confirmation, checkups, status updates, and opening birth recording.

### `/births`
Birth and offspring workspace. Records delivery date, outcome, birth type, offspring count, complications, postpartum notes, and offspring records. Links each offspring to dam and sire and completes pregnancy transactionally.

## Monitoring pages

### `/alerts`
Central notification center. Groups upcoming, due, overdue, critical, acknowledged, and completed alerts. Each alert links to its source record. Dismissal changes alert status only; it never removes source data.

### `/activity`
Operational activity feed. Shows daily farm actions, notes, dates, cattle references, location, and responsible user. Useful for recent work and coordination; not a replacement for immutable audit history.

### `/audit-log`
Immutable traceability page. Shows who changed what, when, outcome, affected entity, and before/after values where authorized. Filter by user, action, entity, result, and date. Administrator access by default.

## Reporting pages

### `/reports`
Report hub. Select report type, filters, date range, columns, and output. Supports inventory, cattle profile, health, treatment, withdrawal, breeding, pregnancy, birth, archived cattle, activities, and audit reports. Enforce permissions before display or export.

### `/reports/:type`
Filtered report view. Shows title, applied filters, generated timestamp, totals, tables, chart text alternatives, print action, and approved CSV/PDF export.

## Administration pages

### `/manage-users`
Administrator user management. Lists users, roles, account status, last login, creation date, and actions. Supports creating accounts, assigning roles, activating/deactivating accounts, and resetting access. All changes create audit logs.

### `/settings`
System and farm configuration. Manages approved breeds, cattle categories, health statuses, treatment categories, routes, locations, schedule intervals, farm timezone, report defaults, and notification rules. Restrict medical schedule changes to authorized roles.

### `/profile`
Current user's account page. Shows name, email, role, contact details, password change, session actions, and notification preferences. Users cannot change their own role or audit history.

## Shared page behavior

- Show loading, empty, success, validation, permission, and server-error states.
- Use breadcrumbs or clear back navigation.
- Keep primary action visible and role-appropriate.
- Use responsive cards on phones and tables with controlled horizontal scrolling where needed.
- Show status with text and icon, never color alone.
- Record significant mutations in `audit_logs`.
- Never delete operational history when archive or status change preserves it.

## Comprehensive review standard

Review every page against six questions:

1. **Purpose:** What decision or task does page support?
2. **Audience:** Which roles can view, create, edit, approve, export, or archive?
3. **Data:** Which entities, fields, relationships, filters, and calculations appear?
4. **Actions:** What is primary action, what validation blocks it, and what audit event results?
5. **States:** What appears during loading, no results, errors, unauthorized access, stale data, and success?
6. **Responsive behavior:** What remains visible on phone, what becomes cards/drawers, and what may scroll?

## Page review matrix

| Page | Primary task | Required summary | Main action | Critical risks |
|---|---|---|---|---|
| `/` | Explain product and enter system | Farm context and approved public count | Sign in | Exposing private data or hard-coded statistics |
| `/login` | Authenticate | Account and session feedback | Sign in | Credential leakage, weak errors, missing keyboard support |
| `/dashboard` | Prioritize farm work | Counts, alerts, due work, trends | Open priority task | Misleading counts, hidden critical alerts, stale data |
| `/livestock` | Find and manage cattle | Filtered inventory and status totals | Add cattle | Duplicate tags, poor mobile table, accidental archive |
| `/livestock/add` | Create valid animal record | Required identity and admission fields | Save cattle | Partial records, invalid parentage, duplicate submission |
| `/livestock/:tag_number` | Understand one animal | Identity, current status, full history | Record relevant event | Timeline gaps, unauthorized medical edits |
| `/health` | Assess condition | Recent, attention, and critical cases | Record assessment | Treating missing data as healthy, unsupported diagnosis |
| `/vaccination` | Manage preventive care | Due, overdue, completed, active withdrawal | Record care | Wrong schedule, missing product/personnel, no audit |
| `/treatments` | Record medical treatment | Active/completed treatment and withdrawal | Record treatment | Unsafe clinical defaults, incorrect withdrawal dates |
| `/breeding` | Track breeding attempts | Pending checks and outcomes | Record breeding | Ineligible animals, invalid dam/sire, duplicate events |
| `/pregnancy` | Monitor confirmed pregnancy | Stage, checkups, expected delivery | Confirm/check pregnancy | Unapproved confirmation, incorrect dates, missing examiner |
| `/births` | Record delivery and offspring | Birth outcomes and lineage | Record birth | Broken transaction, invalid parentage, duplicate offspring |
| `/alerts` | Resolve scheduled work | Severity, due state, source record | Acknowledge/complete | Dismissal hiding risk, duplicate alerts |
| `/activity` | Review daily operations | Chronological farm activity | Add activity | Confusing activity with audit history |
| `/audit-log` | Prove traceability | Actor, action, entity, timestamp, outcome | Filter/export | Editing logs, leaking before/after data |
| `/reports` | Choose analysis | Report catalog and saved filters | Generate report | Export bypassing permissions |
| `/reports/:type` | Read/share analysis | Filters, totals, tables, chart alternative | Print/export | Incorrect aggregation, missing filter context |
| `/manage-users` | Control access | User, role, status, last login | Add/deactivate user | Lockout, privilege escalation, permanent deletion |
| `/settings` | Configure approved rules | Current farm configuration | Save setting | Changing clinical rules without approval |
| `/profile` | Manage own account | Identity, role, sessions | Change password | Changing protected role or exposing credentials |

## Required detail for each page specification

Before implementation, add these sections to page-specific tickets or designs:

### Layout
- Desktop shell, sidebar, header, content width, and primary action placement.
- Tablet collapse behavior.
- Phone layout, card conversion, drawer behavior, and touch target size.
- Exact empty space, card padding, table overflow, and long-text handling.

### Data contract
- Read endpoints or queries.
- Create/update endpoints or mutations.
- Required and optional fields.
- Field units and accepted values.
- Loading, pagination, sort, filter, and refresh behavior.
- Cache and stale-data behavior.

### Permission contract
- Allowed roles for viewing.
- Allowed roles for each mutation.
- Approval requirements.
- Fields hidden by role.
- Export restrictions.

### Validation and integrity
- Field-level messages.
- Cross-record rules.
- Duplicate submission handling.
- Transaction boundary.
- Optimistic concurrency or stale-record handling.
- Audit event name and recorded before/after values.

### State design
- Loading skeleton.
- Empty state with useful next action.
- No-results state distinct from empty database.
- Validation failure.
- Unauthorized state.
- Network/server failure with retry.
- Success confirmation and destination.

### Accessibility and content
- Page heading and landmark.
- Label for every input.
- Keyboard order and focus return.
- Accessible names for icon buttons.
- Status text plus icon, never color only.
- Screen-reader alternative for charts.
- Sentence-case labels and farm terminology.

## Prototype-specific review findings

The deployed prototype currently shows a dashboard after Admin quick login with navigation for Dashboard, Manage Users, Audit Log, Reports, Add Cattle, Health Check, Cattle Herd, Pregnancy, Alerts, and Activity. It also shows priority-alert links, recent activity, cattle distribution, and population trend.

Prototype review must additionally resolve:

- Replace emoji quick-login labels with Lucide icons and text.
- Add Farm Manager quick-login coverage or remove quick login entirely.
- Remove prefilled credentials before production.
- Fix direct-route Vercel `404` behavior with SPA rewrites or server routes.
- Correct malformed alert text such as `Dec 1523 days`.
- Confirm displayed statistics come from live data rather than demo constants.
- Confirm every dashboard link has a working destination and permission check.

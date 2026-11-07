## 2026-09-27 — Breeding pagination correction

- Root cause: API loaded every `breeding_records` and pending `calf_care_plans` row, derived lists in JavaScript, then paginated with `slice`.
- Fix: moved all five lists to PostgreSQL queries using `LIMIT 7 OFFSET`, separate `COUNT(*)` metadata, and CTE/window/lateral derivation. Replaced form support transfers with compact aggregate queries while retaining full cattle data for forms.
- Validation: `npm run typecheck` and focused ESLint on `src/app/api/breeding/route.ts` and `src/app/breeding/page.tsx` pass.

## 2026-10-21 — Pregnancy at cattle registration

- Added registration-only pregnancy controls for female cattle: known service date or estimated months pregnant (1–9), plus optional active sire.
- `POST /api/livestock` validates sex, mode, dates, month bounds, and sire status; one PostgreSQL transaction creates cattle, natural-service and pregnancy-confirmation records, and activity log.
- Estimated service dates use calendar-month subtraction; expected calving uses 283 days. Edit payloads exclude pregnancy fields to prevent duplicate breeding records.
- Validation: `npm run typecheck` passes with 0 errors.
- Review: source diff inspected; no blocking findings.

## 2026-10-21 — Cattle workflow update checklist

| Module / area | Feedback / issue | Revision | Function | Inspect / test |
|---|---|---|---|---|
| Cattle — Add Cattle | Sire and Dam labels | Replace Female/Male labels with Sire/Dam | Identifies parent cattle using breeding terminology | `src/app/livestock/registration-form.tsx` — open Add Cattle and inspect parent fields |
| Cattle — Add Cattle | Seller requirement unclear | Mark required Seller fields with `*`; mark optional fields clearly | Prevents incomplete purchased-cattle records | Add Cattle → Acquisition Information → Purchased |
| Cattle — Add Cattle | ID hidden during registration | Show generated Cattle ID before save and in success modal | Lets user identify cattle immediately | Add Cattle form and registration success modal |
| Cattle — Add Cattle | Profile navigation after save | Add View Profile action and redirect path | Opens newly created cattle record immediately | Register cattle → success modal → View Profile |
| Cattle — Add Cattle | Pregnant cattle unsupported | Add pregnancy mode, service date or estimated months, and sire | Creates breeding and pregnancy records during registration | Add Cattle → Female → Already pregnant |
| Cattle — Add Cattle | Lifecycle status in registration | Force new cattle to `active`; remove sold, culled, deceased, transferred options | Keeps registration separate from lifecycle events | `src/app/api/livestock/route.ts`; inspect new record status |
| Cattle — Add Cattle | Color stored as code | Display color names while preserving existing values | Makes cattle color understandable to users | Add Cattle → Color |
| Cattle — Add Cattle | Breed duplicates and uncontrolled creation | Select existing breeds; restrict breed management to veterinarian; reject duplicates | Keeps reference data consistent | `src/app/settings/reference-data.tsx`; `src/app/api/reference-data/route.ts` |
| Cattle — Add Cattle | Has Calved Before unclear | Show only for female cattle and add explanation tooltip | Explains whether cattle previously gave birth | Add Cattle → Female → hover info icon |
| Cattle — Add Cattle | Purchase-only acquisition | Add Born on Farm, Purchased, Donated, and Transferred In | Captures correct origin and conditional details | Add Cattle → Acquisition Information |
| Cattle — Add Cattle | Recently added cattle hard to identify | Record Date Added and support recent sorting | Helps locate newly registered cattle without permanent New status | Inventory list; inspect date and sort control |
| Cattle — Add Cattle | Field rules unclear | Add hover-only tooltips for rules and standards | Gives context without cluttering form | Add Cattle → hover `i` icons |
| Cattle — Profile | Information spread across pages | Make profile central with Personal Information, Health, Breeding, and Pregnancy sections | Gives one cattle-focused workspace | `src/app/livestock/[id]/page.tsx`; open `/livestock/{id}` |
| Cattle — Inventory | Cattle records difficult to open | Link each inventory record to its cattle profile and actions | Reduces navigation steps | Inventory → click cattle row or View Profile |
| Cattle — Profile | Information insufficiently separated | Use labeled tabs and tables for health, breeding, pregnancy, and history | Makes records easier to inspect | Cattle profile tabs |
| Cattle — Profile Status | Lifecycle changes look like ordinary edits | Move status changes into dedicated Lifecycle Action flow | Requires event-specific details for sold, culled, deceased, or transferred | Cattle profile → Change Status / Lifecycle Action |
| Runtime | Missing `cattle_breeds` table | Apply canonical PostgreSQL schema to active database | Enables breed and medicine reference-data loading | `database/schema.sql`; Settings → Reference Data |
| Runtime | Empty pregnancy returned `404` | Return `200` with `pregnancy: null` and empty arrays | Treats cattle without pregnancy as normal | `GET /api/pregnancy/{id}`; inspect `src/app/api/pregnancy/[id]/route.ts` |
| Validation | Changes need verification | Run lint, typecheck, build, and browser smoke checks | Confirms source and workflows remain valid | `npm run lint`, `npm run typecheck`, `npm run build` |

## Phase 2 — Alerts and User Guidance

| Module / area | Feedback / issue | Revision | Function | Inspect / test |
|---|---|---|---|---|
| Alerts — Filtering & Sorting | Specific alerts become difficult to locate as records grow | Add Alert Type filter plus existing status filters and sorting by due date or cattle ID | Narrows alert work queue and controls display order | `src/app/alerts/page.tsx`; open Alerts, use Alert Type and Sort controls |
| Alerts — Tooltips & User Guidance | Statuses and actions may confuse first-time users | Add contextual tooltips for status, Open Cattle, Acknowledge, Restore, and withdrawal-related alert context | Explains alert meaning and action effect without extra navigation | `src/app/alerts/page.tsx`; hover status and action controls |
| Cattle — BCS | Body Condition Score may be unfamiliar | Add tooltip explaining BCS scale and its livestock health purpose | Helps users enter and interpret body condition consistently | `src/app/livestock/registration-form.tsx` and profile health tab; hover BCS info icon |

## Phase 3 — Health Records

| Module / area | Feedback / issue | Revision | Function | Inspect / test |
|---|---|---|---|---|
| Health — Health Records | Health types are mixed together | Add tabs for All, Checkup, Vaccine, Vitamins, Antibiotics, Anti-Inflammatory, and Dewormer; retain Active/Completed status filter | Filters clinical history by category and status | `src/app/health/page.tsx`; open `/health` and select record tabs/status |
| Health — Record Navigation | Cattle links are not visually obvious | Add consistent profile-link styling and tooltip | Makes cattle ID/name navigation discoverable | `/health`; hover or click cattle ID/name |
| Health — Treatment Management | Duplicate treatment names may be added | Compare new names case-insensitively against approved options and block duplicates | Keeps treatment catalog clean | Health → Add Treatment → Add new treatment |
| Health — Tooltips & Guidance | Health fields, restrictions, statuses, and actions need explanation | Add contextual tooltips for profile links, edit actions, approved treatment rules, withdrawal context, and statuses | Explains meaning and action effects inline | `src/app/health/page.tsx`; hover guided controls |

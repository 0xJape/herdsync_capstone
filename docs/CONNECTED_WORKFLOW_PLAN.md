# Connected Workflow Plan

## Source of truth

- Cattle stores current operational state.
- Health, weight, and breeding rows preserve dated history.
- Due work derives from stored `follow_up_date`, `next_due_date`, `withdrawal_end_date`, and reproductive milestone dates.
- Activity logs identify account performing each system action; operational-person fields identify person performing farm work.

## Transaction boundaries

1. Recording treatment creates clinical history, schedules follow-up/next care, activates applicable restriction, updates current cattle health, and records audit event together.
2. Recording checkup creates checkup history, updates source treatment schedule/status, updates current cattle health when recovered, and records audit event together.
3. Resolving clinical monitoring never removes active withdrawal restriction.
4. Dashboard, calendar, cattle profile, and alerts use same schedule fields and status rules.

## Delivery order

1. Make checkup completion atomic.
2. Keep withdrawal visibility independent from clinical status.
3. Synchronize current cattle health with treatment/recovery transitions.
4. Normalize existing schedule/status inconsistencies.
5. Connect breeding, pregnancy, calving, and offspring as next workflow slice.
6. Add role authorization, alert lifecycle, archive reasons, reports, and user management.

## Invariants

- Creator account comes only from authenticated session.
- Historical creator and operational-person identities remain separate.
- Withdrawal remains active through its end date regardless of clinical resolution.
- Follow-up and next-due dates cannot precede source event date.
- Failed multi-record workflow leaves no partial rows or state changes.
# HerdSync Alert Rules

## Sources
- Upcoming and overdue vaccination, deworming, treatment, and checkups.
- Active or ending withdrawal periods.
- Breeding follow-up and pregnancy confirmation.
- Gestational milestones and expected delivery.
- Attention-needed or critical health assessment.

## Behavior
- Store source entity and due date for every alert.
- Use farm timezone for displayed dates.
- Generate one active alert per source event and type.
- Re-evaluate overdue status through scheduled processing.
- Critical alerts remain visible until authorized completion or status resolution.
- Alert dismissal changes presentation only; it does not alter source records.
- Do not create medical schedules without approved dates or intervals.

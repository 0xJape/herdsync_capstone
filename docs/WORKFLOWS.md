# HerdSync Workflows

## Cattle
Register → validate unique tag → save → audit. Update → validate → save history → audit. Archive → require status and confirmation → preserve history.

## Treatment
Select cattle → enter product, reason, dose, route, date, personnel → validate → save treatment → create next-due and withdrawal records → create alerts → audit.

## Breeding
Select eligible dam and optional sire → validate age, health, admission, and identifiers → record method/date → schedule pregnancy check → audit.

## Pregnancy
Select pending breeding → authorized examiner records result. Positive creates pregnancy and expected delivery; negative closes breeding outcome. All changes transactional.

## Birth
Select pregnancy → record delivery, outcome, offspring, complications → create offspring records → link parents → complete pregnancy → update dam → audit transaction.

## Alert lifecycle
Upcoming → Due → Overdue → Acknowledged → Completed or Dismissed. Dismissal never removes source warning.

# HerdSync Project Overview

> **Project:** HerdSync - Livestock Management Information System  
> **Target institution:** College of Agriculture, Animal Science Farm, Mindanao State University - General Santos  
> **Primary domain:** Cattle recordkeeping, health, treatment, breeding, pregnancy, offspring, alerts, and farm reporting  
> **Document purpose:** Development-ready functional overview for creating a new implementation of HerdSync  
> **Source basis:** `HERDSYNC_RevisedPaper (1)(1).pdf`  
> **Technology policy:** Implementation-neutral. The technologies mentioned in the source paper are intentionally not adopted by this document.

---

## 1. Project Summary

HerdSync is a web-based Livestock Management Information System designed for the Animal Science Farm of the College of Agriculture at Mindanao State University - General Santos (MSU-GenSan). It replaces fragmented manual recordkeeping, handwritten logs, and spreadsheets with a centralized system for recording, monitoring, searching, and reporting cattle information.

The system focuses on the complete operational history of each cattle record. This includes identification and acquisition details, body condition and weight history, preventive healthcare, vaccinations, medicines, treatment withdrawal periods, breeding events, pregnancy progression, birth outcomes, offspring lineage, and activity history.

HerdSync is intended to support the farm's daily operations, academic activities, research, animal welfare practices, and evidence-based management decisions. It is a management and recordkeeping platform; it does not replace the professional judgment of a veterinarian or trained farm personnel.

---

## 2. Background and Problem Statement

The Animal Science Farm currently handles important cattle information through manual methods and spreadsheet-based records. The source study identified the following operational problems:

- Cattle information is maintained primarily in Excel.
- Basic identification data may exist, but individual health, vaccination, breeding, treatment, and event histories are incomplete or disconnected.
- Vaccinations may be administered by batch without a complete record of the individual dose, medicine, date, and responsible personnel.
- Antibiotics, vitamins, and other medications are not consistently recorded digitally.
- There is no complete breeding log.
- Calving, lineage, and reproductive performance are not systematically tracked.
- Treatment, illness, deworming, mortality, and necropsy events may not have centralized records.
- Manual processes increase the risk of human error, missing data, data loss, and delayed action.
- Important schedules may be missed, including vaccination, treatment, pregnancy examination, expected delivery, and drug withdrawal completion.
- Farm staff and faculty lack a unified, role-appropriate view of current farm status and historical records.

HerdSync addresses these gaps by creating one structured and traceable source of cattle-management information.

---

## 3. Project Goal

To develop a Livestock Management Information System that records, monitors, and organizes cattle, health, breeding, pregnancy, and overall farm-management data for the Animal Science Farm of MSU-GenSan.

---

## 4. Complete Project Objectives

### 4.1 General Objective

Develop a centralized and accessible system for recording, monitoring, organizing, and reporting cattle and farm-management data within the MSU-GenSan Animal Science Farm.

### 4.2 Specific Objectives

#### Objective 1 - Develop a comprehensive cattle database

The system must manage:

- Species, breed, sex, age, birth date, identification details, and acquisition data.
- Ear-tag or assigned identification number.
- Purchase information and seller information when applicable.
- Weight records and weight progression.
- Body Condition Score (BCS) and physical assessment records.
- Health-status classification.
- Health-related schedules.
- Vaccination records.
- Vitamin and mineral supplementation records.
- Deworming records.
- Medical treatment records.
- Date administered, dosage, administration route, and personnel involved.
- Treatment history, including antibiotic use.
- Required withdrawal period and withdrawal completion.
- Breeding and reproductive information.
- Pregnancy status and gestational progress.
- Pregnancy checkups and expected delivery dates.
- Birth outcomes, offspring information, and parentage links.

#### Objective 2 - Monitor cattle operations and history

The system must monitor:

- Cattle handling and record changes.
- Health assessments and health-status changes.
- Preventive health activities.
- Treatment and medication history.
- Breeding events and breeding cycles.
- Pregnancy progression and checkups.
- Birth and offspring outcomes.

#### Objective 3 - Implement alerts and notifications

The system must automatically trigger reminders or warnings for:

- Upcoming vaccination schedules.
- Other upcoming health-related activities.
- Overdue vaccinations or tasks.
- Breeding events and reproductive milestones.
- Pregnancy-confirmation examinations.
- Pregnancy checkups and gestational milestones.
- Expected delivery dates and pre-calving periods.
- Treatment schedules.
- Antibiotic or medicated-feed withdrawal periods.
- Health-status changes.
- Abnormal or critical cattle conditions.

#### Objective 4 - Generate reports and analytics

The system must generate reports that summarize:

- Cattle inventory.
- Individual cattle profiles.
- Health records and health schedules.
- Treatment and vaccination history.
- Breeding records and outcomes.
- Pregnancy status and birth outcomes.
- Farm activities.
- Overall farm-management status.

Reports should support on-screen viewing and appropriate downloadable or printable formats.

### 4.3 Objective-to-Module Traceability

| Objective | Primary supporting modules |
| --- | --- |
| Comprehensive cattle database | Cattle Management, Health and Treatment, Breeding, Pregnancy and Birth |
| Monitor cattle operations and history | Dashboard, Cattle Profiles, Activity Logs, Health, Breeding, Pregnancy |
| Alerts and notifications | Notification and Scheduling System |
| Reports and analytics | Reports, Data Visualization, Dashboard |

---

## 5. Target Environment and Current Herd

The initial deployment is intended for the Animal Science Farm of the College of Agriculture at MSU-GenSan. At the time described in the source paper, the farm had 25 cattle:

| Classification | Count |
| --- | ---: |
| Bulls | 2 |
| Yearling bull | 1 |
| Cows | 11 |
| Heifers | 8 |
| Calves | 3 |
| **Total** | **25** |

The system must not hard-code this herd size. Its data model, navigation, filtering, reporting, and performance must support a growing population.

---

## 6. Stakeholders and Intended Benefits

### 6.1 Primary Stakeholders

- System administrators
- Farm managers
- Veterinarians
- Farm aides
- Faculty members
- College of Agriculture administrators
- Students and researchers

### 6.2 Secondary Stakeholders

- Other educational institutions seeking an affordable livestock-management reference model
- Local cattle farms that may later adapt the approach
- Government agriculture and animal-health organizations, including the Bureau of Animal Industry

### 6.3 Expected Benefits

- More accurate and complete cattle records
- Reduced duplication, loss, and inconsistency of data
- Better visibility of cattle health and reproductive status
- Timely reminders for critical farm activities
- Traceable medicine, treatment, and withdrawal records
- Better support for animal welfare and food-safety practices
- Faster preparation of farm, academic, and analytical reports
- Improved coordination among farm personnel, veterinarians, administrators, and faculty
- A structured source of data for instruction and research
- A scalable foundation for future smart-livestock integrations

---

## 7. User Roles and Access Control

HerdSync must implement role-based access control. The exact permission matrix may be refined with the farm, but the minimum responsibilities from the study are as follows.

| Role | Core permissions and responsibilities |
| --- | --- |
| **Administrator** | Manage users and roles; review audit logs; oversee system-level activities and access. |
| **Farm Manager** | Add, view, search, update, and archive cattle; manage farm operations; record or oversee treatments, breeding, pregnancy, birth, and activities; access dashboards and reports. |
| **Veterinarian** | View cattle history; record or validate health assessments, treatments, medicines, vaccinations, breeding/pregnancy findings, and critical health information; access relevant reports. |
| **Farm Aide** | Enter and retrieve cattle information; assist with daily record maintenance and authorized farm activities; access only permitted operational functions. |
| **Faculty** | View and search cattle information; view authorized dashboards; generate academic or analytical reports; no unrestricted operational editing. |

### 7.1 Permission Principles

- Users must authenticate before accessing protected data.
- Every protected action must be authorized on the server or trusted application layer, not only hidden in the interface.
- High-risk actions must be restricted by role.
- User-management functions are administrator-only.
- Sensitive cattle and health changes must be attributable to the user who performed them.
- Deleted operational history should be avoided when archiving or status changes can preserve traceability.

---

## 8. Core System Modules and Features

### 8.1 Authentication and User Management

- Secure sign-in and sign-out
- User account creation by an administrator
- User profile editing
- Role assignment and permission enforcement
- Account activation or deactivation
- Password protection and secure credential storage
- Session handling
- Audit trail for user creation, modification, and removal or deactivation
- Duplicate-email or duplicate-username prevention

### 8.2 Dashboard and Farm Monitoring

The dashboard must provide a quick operational view of the farm, including:

- Total active cattle
- Counts by sex, age class, breed, or cattle category
- Counts by health status
- Healthy, attention-needed, and critical cases
- Active breeding records
- Confirmed pregnancies
- Upcoming expected deliveries
- Recent births
- Upcoming vaccinations and treatments
- Overdue schedules
- Active withdrawal periods
- Recent farm activities
- Alerts requiring action
- Charts showing cattle distribution and relevant trends

Dashboard content should be filtered according to the current user's role.

### 8.3 Cattle Registration and Inventory

Users with permission must be able to:

- Register a new animal.
- Assign or enter a unique cattle identifier or ear-tag number.
- Record species, breed, sex, birth date, age class, and status.
- Record origin: purchased/external or newborn/on-farm.
- Record acquisition date, seller, purchase details, and available supporting information.
- Add a cattle photo when the new implementation supports file storage.
- Record initial weight, BCS, and health assessment.
- View all cattle in a searchable and filterable list.
- Filter by sex, breed, age class, health status, pregnancy status, and operational status.
- Update cattle details while retaining change history.
- Archive a cattle as sold, culled, or deceased instead of removing its history.
- View archived cattle separately from active herd records.

### 8.4 Individual Cattle Profile

Each cattle profile should provide a unified view of:

- Identification and demographic information
- Current farm and health status
- Origin and acquisition information
- Weight and BCS history
- Physical assessments
- Vaccination and deworming history
- Vitamin and mineral supplementation
- Medication and treatment history
- Current and completed withdrawal periods
- Breeding history
- Pregnancy history and checkups
- Birth outcomes and offspring
- Parentage, including sire and dam when known
- Alerts, schedules, and recent activities
- User-attributed change history
- Printable or downloadable profile summary

### 8.5 Weight, Growth, and Body Condition Tracking

- Add dated weight records.
- Add dated BCS records.
- Record the person who performed the assessment.
- Show weight progression over time.
- Show changes in body condition over time.
- Display simple growth charts when sufficient data exists.
- Clearly label manually estimated or unavailable measurements.
- Do not fabricate weight data when a weighing apparatus is unavailable.

### 8.6 Health Assessment and Health Status

- Record physical assessment results and notes.
- Classify current condition using approved categories such as `Good`, `Attention Needed`, or `Critical`.
- Record assessment date and responsible personnel.
- Preserve prior status changes.
- Generate an alert when an abnormal or critical status is recorded.
- Support veterinarian review or validation where required by farm policy.

### 8.7 Treatment Recording

- Record a treatment for an individual animal.
- Support authorized batch treatment or vaccination when applicable.
- Capture treatment category, product or medicine, reason, dosage, unit, route, date, and administrator.
- Record notes and follow-up instructions.
- Set the next due date.
- Support configurable reminder intervals, including the paper's examples of 7, 14, 30, or 60 days.
- Update relevant cattle health status when appropriate.
- Log the complete operation in the audit trail.

### 8.8 Vaccination and Preventive Care

- Maintain the complete vaccination history of every animal.
- Record vaccine name or product, dose, route, administration date, next due date, and personnel.
- Display upcoming and overdue vaccinations.
- Track vaccination completion status.
- Record deworming, vitamins, minerals, and other preventive activities.
- Allow schedules to reflect cattle age class and farm-approved protocols.

### 8.9 Withdrawal Management

For antibiotics, medicated feeds, or other treatments requiring a withdrawal time, the system must:

- Record whether a withdrawal period applies.
- Record or calculate the withdrawal start and end dates.
- Display the number of days remaining.
- Show a prominent warning while the period is active.
- Prevent or flag sale, slaughter, or consumption-related clearance while withdrawal is active.
- Record who cleared or completed the withdrawal status.
- Preserve the completed withdrawal history for compliance and traceability.

Any automated calculation must use an authorized product-specific withdrawal duration entered or approved by qualified personnel. The system must not invent clinical withdrawal durations.

### 8.10 Breeding Management

- Record a breeding event.
- Select the dam and sire when known.
- Record breeding method: natural mating or artificial insemination.
- Record estrus or breeding date and relevant notes.
- Validate basic breeding eligibility before allowing confirmation.
- Calculate an estimated pregnancy-check date.
- Track repeated breeding attempts and cycles.
- Mark breeding outcome as pending, confirmed pregnant, or not pregnant.
- Preserve historical breeding events even when unsuccessful.

### 8.11 Pregnancy Management

- Create a pregnancy record only after a positive pregnancy finding by authorized personnel.
- Link the pregnancy to the originating breeding event and dam.
- Record confirmation date and examiner.
- Calculate gestational age from the approved conception or breeding date.
- Calculate an estimated delivery date.
- Show pregnancy stage: early, mid, late, pre-calving, completed, or other approved status.
- Record monthly or scheduled checkups.
- Capture checkup date, weight, BCS, condition, notes, and next checkup date.
- Generate an alert for `Attention Needed` or `Critical` findings.
- Update the dam's reproductive status.
- Notify users of upcoming checkups, gestational milestones, and expected delivery.

### 8.12 Birth and Offspring Recording

- Record delivery date and birth outcome.
- Record number of offspring.
- Record birth type: single, twin, triplet, or another approved category.
- Record each offspring's sex, birth weight, BCS or initial condition, and complications.
- Create a cattle record for each surviving offspring when appropriate.
- Link offspring records to the dam and sire.
- Mark the source pregnancy as completed.
- Update the dam's status after delivery.
- Record post-partum observations.
- Preserve stillbirth, mortality, or complication information when authorized.

### 8.13 Alerts and Notification Center

Alerts must be generated from stored schedules and status changes, not from untracked manual assumptions.

Minimum alert types:

- Upcoming vaccination
- Overdue vaccination
- Upcoming deworming or preventive care
- Scheduled treatment or follow-up
- Active and ending withdrawal period
- Breeding follow-up
- Pregnancy-confirmation check
- Pregnancy checkup
- Pre-calving milestone
- Expected delivery
- Health attention required
- Critical cattle condition
- Overdue operational task

Each alert should include:

- Cattle identifier and name, if used
- Alert type
- Due date or occurrence date
- Priority or severity
- Current status
- Responsible role or assignee when supported
- Link to the relevant cattle or event record
- Acknowledge, complete, or dismiss action with proper authorization

### 8.14 Reports and Analytics

The system should support customizable filters and date ranges for:

- Current cattle inventory
- Inventory by sex, breed, age class, and status
- Individual cattle profile
- Weight and BCS history
- Health-status summary
- Vaccination schedule and history
- Treatment and medicine history
- Withdrawal-status report
- Breeding activity and outcomes
- Pregnancy status and expected deliveries
- Birth and offspring outcomes
- Mortality, culling, sold, and archived cattle
- User activity and audit logs
- Overall farm-management summary

Where relevant, reports may include summary cards, tables, charts, totals, averages, and a signature block. Supported exports should be selected during implementation, with PDF, CSV, and print output included as functional targets from the paper.

### 8.15 Activity and Audit Logs

- Record significant user and system actions.
- Capture user, timestamp, action, entity, record identifier, and outcome.
- Record creation, update, archive, status change, treatment, breeding, pregnancy, birth, report, and user-management events.
- Support filtering by user, action, entity, status, and date range.
- Permit authorized CSV export.
- Prevent ordinary users from editing audit-history records.
- Retain enough detail to reconstruct who changed important information and when.

---

## 9. Required Operational Workflows

### 9.1 Add Cattle

1. Authorized user opens the cattle-registration form.
2. User enters identification, origin, demographic, acquisition, and available health details.
3. System validates required fields and uniqueness of the cattle identifier.
4. Valid data is saved.
5. The creation is added to the audit log.
6. The user receives a success response and the cattle profile becomes available.
7. Invalid data produces clear field-level errors without creating a partial duplicate record.

### 9.2 Update Cattle

1. User selects an existing cattle record.
2. System loads current details into a form.
3. User submits authorized changes.
4. System validates the changes.
5. System updates the record and preserves audit information.
6. User receives confirmation or a clear error message.

### 9.3 Archive Cattle

1. User selects an active cattle record.
2. User chooses an archival status such as sold, culled, or deceased.
3. System requires confirmation and any mandatory supporting details.
4. System changes the status without deleting the animal's history.
5. System logs the action.
6. The record moves out of the active-herd list but remains searchable to authorized users.

### 9.4 Search and Filter Cattle

1. User opens the cattle list.
2. User searches by cattle ID, breed, age class, or other supported fields.
3. User may combine filters such as sex, health status, pregnancy status, and active/archive status.
4. System returns matching records or an informative no-results state.

### 9.5 Record Treatment

1. User selects an animal or an authorized batch.
2. User enters treatment details.
3. System validates medicine, dose fields, date, administrator, and required follow-up information.
4. System stores treatment records.
5. System creates next-due and withdrawal alerts when applicable.
6. System updates health status when authorized.
7. System records the operation in the audit log.

### 9.6 Record Breeding

1. User selects an eligible dam and, when applicable, sire.
2. System checks required identification, health, age, and breeding prerequisites.
3. User records natural mating or artificial insemination details.
4. System stores the breeding event.
5. System schedules a pregnancy-confirmation reminder, using the farm's approved interval.
6. System logs the operation.

### 9.7 Confirm Pregnancy

1. User selects a pending breeding record.
2. Authorized user records examination result and date.
3. If positive, the system creates a pregnancy record, estimates the delivery date, updates the dam's status, and schedules checkups.
4. If negative, the breeding outcome is retained and the dam may return to heat monitoring.
5. The result and related changes are logged as one consistent transaction.

### 9.8 Add Pregnancy Checkup

1. User selects a pregnant cattle record.
2. User enters date, weight, BCS, condition, notes, and next schedule.
3. System validates and stores the assessment.
4. System updates the next-checkup schedule.
5. An alert is created if the condition is abnormal.
6. The operation is logged.

### 9.9 Record Birth

1. User selects the pregnancy record.
2. User records delivery and offspring details.
3. System validates the payload.
4. System completes the pregnancy record.
5. System creates and links offspring records where appropriate.
6. System updates the dam's status.
7. System logs the complete transaction.

### 9.10 Generate Report

1. User selects a report type, filters, and date range.
2. System validates access and retrieves the appropriate records.
3. System calculates permitted totals, averages, or summaries.
4. System displays the report with tables and appropriate visualizations.
5. User may print or export in an approved format.
6. Sensitive values remain subject to role permissions.

---

## 10. Farm and Cattle Management Rules

These rules are operational baselines from the source paper. Qualified farm or veterinary personnel must be able to confirm or configure medical schedules where local practice requires it.

### 10.1 Herd Admission

| Cattle origin | Required process |
| --- | --- |
| **Purchased or external cattle** | Health assessment before quarantine and at the end of quarantine; average 30-day quarantine; re-assessment after any treatment; may join the herd only after completing quarantine and passing health assessment. |
| **Newborn or on-farm cattle** | Record birth details and conduct required health assessment; no external-origin quarantine; may join the herd after required records and assessment are complete. |

### 10.2 Breeding Eligibility

- Only clinically sound and fully identified cattle that have passed herd-admission requirements are eligible.
- The animal must meet the farm's approved breeding age and maturity requirements.
- The paper gives 18-24 months as the reference breeding-age range for both dam and sire.
- The animal should have an acceptable BCS and no disqualifying illness.
- The female must show estrus or be scheduled for artificial insemination by trained personnel.
- Breeding should be postponed if eligibility conditions are not satisfied.
- Breeding events must retain method, date, sire/dam information, and responsible personnel.
- The paper describes pregnancy confirmation at approximately 90 days after breeding; this interval should be configurable or approved by the farm.

### 10.3 Pregnancy Stages

| Stage | Approximate period | System interpretation |
| --- | --- | --- |
| Early | Conception to about day 95 | Pregnancy established and early fetal development |
| Mid | About days 96-190 | Rapid fetal growth and organ development |
| Late | About days 191-283 | Major fetal weight gain and preparation for birth |
| Pre-calving | Last 1-2 weeks | Close monitoring and preparation for delivery |
| Calving | Around day 283, with natural variation | Delivery and completion of gestation |

### 10.4 Pregnancy and Post-Birth Rules

- Pregnancy must be recorded as confirmed only after a positive finding by a veterinarian or trained technician.
- Pregnant cattle must be monitored by gestation stage.
- Checkups should record body condition, nutrition/weight information, health condition, notes, and the next checkup date.
- The parturition area should be prepared before the estimated delivery date.
- Dam and offspring information must be recorded after delivery.
- Post-partum status and care should be recorded before the dam returns to the breeding program.
- Offspring should remain linked to the dam and sire when known.

### 10.5 Preventive Health and Treatment Rules

- Vaccination schedules must be appropriate to age or cattle class and approved farm protocols.
- Every vaccination must record the date, product, dose where applicable, and personnel.
- Deworming must be recorded with date and product.
- Vitamins and minerals may be prioritized for calves, pregnant and lactating cows, and cattle with low BCS.
- Antibiotics and anti-inflammatory treatment must be recorded case by case.
- Drug and medicated-feed withdrawal periods must be observed before sale, slaughter, or consumption clearance.
- Product-specific clinical decisions remain the responsibility of authorized veterinary or farm personnel.

---

## 11. Conceptual Data Model

The new implementation should support the following conceptual entities. Names and physical database design may change with the selected technology.

| Entity | Purpose and important relationships |
| --- | --- |
| **User** | Authenticated system user linked to a role and audit actions |
| **Role/Permission** | Defines allowed operations for administrators, farm personnel, veterinarians, and faculty |
| **Cattle** | Central animal record; may reference sire, dam, origin, current health, reproductive, and archive status |
| **Acquisition/Admission** | Purchase, seller, external origin, quarantine, assessment, and herd-admission data |
| **Weight Record** | Dated weight measurement linked to one cattle record |
| **Body Condition Record** | Dated BCS and assessment information linked to one cattle record |
| **Health Assessment** | Physical findings, status classification, notes, date, and examiner |
| **Treatment** | Medicine, treatment, vaccination, vitamin, deworming, dose, route, date, next due date, and administrator |
| **Withdrawal Period** | Start, end, status, warnings, and clearance linked to a treatment and cattle |
| **Breeding Event** | Dam, sire, method, breeding date, outcome, and expected check date |
| **Pregnancy** | Confirmed pregnancy linked to a breeding event and dam; tracks gestation and expected delivery |
| **Pregnancy Checkup** | Dated weight, BCS, condition, notes, and next schedule |
| **Birth Event** | Delivery outcome, type, complications, offspring count, and pregnancy completion |
| **Parentage Link** | Connects offspring to dam and sire; may be represented directly in the cattle entity |
| **Alert/Schedule** | Due date, type, severity, status, cattle/event reference, and responsible user or role |
| **Farm Activity** | Daily operational activity and notes |
| **Audit Log** | Immutable record of significant user and system actions |
| **Attachment** | Optional photo or supporting file linked to authorized records |

### 11.1 Core Relationship Expectations

- One cattle record can have many weight records, BCS records, health assessments, treatments, breeding events, pregnancies, alerts, and activities.
- One treatment may create zero or one active withdrawal period and related alerts.
- One breeding event belongs to one dam and may reference one sire.
- One confirmed breeding event may create a pregnancy record.
- One pregnancy can have many checkups and normally one concluding birth outcome.
- One birth event can create one or more offspring cattle records.
- One offspring may reference one dam and one sire.
- Every significant mutation should reference the responsible user through an audit record.

---

## 12. Suggested Record Statuses

The final values should be reviewed with stakeholders, but the system requires clear state management.

### 12.1 Cattle Status

- Active
- Quarantine
- Under treatment
- Withdrawal active
- Pregnant
- Lactating
- Sold
- Culled
- Deceased
- Archived

### 12.2 Health Status

- Good
- Attention Needed
- Critical
- Unknown or Not Yet Assessed

### 12.3 Breeding Status

- Planned
- Completed / Awaiting Check
- Confirmed Pregnant
- Not Pregnant
- Cancelled

### 12.4 Pregnancy Status

- Early
- Mid
- Late
- Pre-calving
- In Labor
- Completed
- Pregnancy Loss
- Archived

### 12.5 Alert Status

- Upcoming
- Due
- Overdue
- Acknowledged
- Completed
- Dismissed

---

## 13. Functional Requirements Summary

| ID | Requirement |
| --- | --- |
| FR-01 | Authenticate users and enforce role-based access. |
| FR-02 | Allow administrators to manage users and permissions. |
| FR-03 | Register, view, search, filter, update, and archive cattle. |
| FR-04 | Maintain complete individual cattle profiles. |
| FR-05 | Track weight, BCS, physical assessments, and health status. |
| FR-06 | Record individual and authorized batch treatments. |
| FR-07 | Track vaccinations and preventive care with upcoming and overdue schedules. |
| FR-08 | Calculate or record treatment withdrawal periods and enforce warnings. |
| FR-09 | Record breeding events and reproductive outcomes. |
| FR-10 | Confirm and monitor pregnancies, gestation stages, and checkups. |
| FR-11 | Record births, offspring, complications, and parentage. |
| FR-12 | Automatically generate alerts from schedules and critical conditions. |
| FR-13 | Display role-appropriate farm statistics and visualizations. |
| FR-14 | Generate filtered inventory, health, treatment, breeding, pregnancy, birth, and management reports. |
| FR-15 | Export or print supported reports, including target PDF and CSV output. |
| FR-16 | Record immutable audit information for significant actions. |
| FR-17 | Preserve historical records when cattle or events change status. |
| FR-18 | Support a growing herd without relying on the initial count of 25. |

---

## 14. Non-Functional Requirements

### 14.1 Usability

- Use clear, consistent navigation and terminology.
- Minimize steps for common farm tasks.
- Provide field-level validation and actionable errors.
- Make cattle IDs, health warnings, due dates, and critical actions visually prominent.
- Provide useful empty, loading, success, and error states.

### 14.2 Responsiveness and Compatibility

- Support desktop, tablet, and mobile layouts.
- Test the supported interface across current Chrome, Firefox, Edge, and Safari versions where applicable.
- Ensure data tables remain usable on smaller screens through responsive patterns.

### 14.3 Accessibility

- Use readable text sizes and sufficient color contrast.
- Provide clear form labels and validation messages.
- Do not use color alone to communicate health or alert severity.
- Support keyboard navigation for essential workflows where the chosen platform permits it.
- Provide meaningful labels for icons and interactive controls.

### 14.4 Security and Privacy

- Securely store credentials using accepted password-hashing practices.
- Enforce authorization for every protected operation.
- Validate and sanitize input.
- Protect sessions or authentication tokens.
- Limit sensitive data and reports to authorized roles.
- Log security-relevant and high-impact actions.
- Avoid exposing confidential internal details through errors.

### 14.5 Data Integrity and Traceability

- Use unique cattle identifiers.
- Prevent invalid parentage, breeding, pregnancy, and birth relationships.
- Use consistent transactions for multi-record operations such as pregnancy confirmation and birth recording.
- Preserve historical health and reproductive records.
- Store created/updated timestamps and responsible users.
- Prevent unauthorized editing of audit logs.
- Back up operational data according to the deployment plan.

### 14.6 Reliability and Performance

- Avoid duplicate submission of critical forms.
- Gracefully handle unavailable services or network interruption.
- Provide pagination or equivalent loading strategies for growing record sets.
- Return search and dashboard results within an acceptable time for the farm's dataset.
- Use background or scheduled processing for reminders when required by the selected implementation.

### 14.7 Maintainability and Scalability

- Keep domain rules separate from interface code where practical.
- Use modular feature boundaries.
- Document data models, APIs or service boundaries, configuration, and deployment.
- Make reminder intervals and farm-approved schedules configurable when possible.
- Allow new cattle categories, reports, and notification channels to be introduced later.

---

## 15. Implementation Architecture - Technology Neutral

This overview deliberately does not select the programming language, framework, database, hosting provider, or cloud vendor from the source paper.

The chosen implementation should still provide the following logical parts:

1. **User Interface Layer** - dashboards, forms, cattle profiles, reports, alerts, and administration screens.
2. **Application and Domain Layer** - validation, authorization, cattle-management rules, pregnancy calculations, withdrawal handling, alerts, reporting, and audit behavior.
3. **Persistent Data Layer** - structured and relational storage for cattle, health, breeding, pregnancy, birth, users, alerts, and logs.
4. **Scheduled Task Layer** - evaluates upcoming and overdue activities and creates or sends notifications.
5. **Report and Export Layer** - prepares filtered summaries, charts, printable views, PDF, or CSV output.
6. **File Storage Layer, if enabled** - manages cattle photos or authorized supporting files.
7. **Deployment and Backup Layer** - hosts the application, protects configuration, monitors availability, and backs up data.

### 15.1 Technology Decisions To Be Made

| Area | Status | Decision criteria |
| --- | --- | --- |
| Frontend or client platform | To be selected | Responsiveness, accessibility, maintainability, developer familiarity |
| Backend or application platform | To be selected | Security, validation, scheduled tasks, reporting, maintainability |
| Database | To be selected | Relational integrity, transactions, backup, filtering, reporting |
| Authentication approach | To be selected | Role-based access, secure sessions, operational simplicity |
| Notification mechanism | To be selected | In-app baseline; email/SMS only if approved and configured |
| File storage | Optional decision | Cattle photos, cost, privacy, backup |
| Hosting | To be selected | Availability, cost, deployment workflow, data protection |
| Report generation | To be selected | PDF/CSV quality, charts, printing, deployment support |

No technology choice should reduce or redefine the objectives and required features in this document.

---

## 16. Interface Areas

The implementation should, at minimum, provide the following screens or equivalent interface areas:

1. Sign-in
2. Role-based dashboard
3. Cattle list and filters
4. New cattle registration
5. Individual cattle profile
6. Edit and archive cattle workflows
7. Weight and BCS history
8. Health assessments
9. Treatment and vaccination management
10. Withdrawal monitoring
11. Breeding dashboard and event form
12. Pregnancy dashboard, confirmation, and checkup forms
13. Birth and offspring recording
14. Alerts and schedules
15. Reports and analytics
16. Activity and audit logs
17. User and role management
18. User profile and account settings

---

## 17. Scope Boundaries and Limitations

### 17.1 Included in the Baseline Scope

- Cattle-focused record management for the MSU-GenSan Animal Science Farm
- Manually entered cattle identification or ear-tag numbers
- Centralized cattle profiles
- Health, treatment, vaccination, and withdrawal records
- Breeding, pregnancy, birth, and offspring records
- Dashboards, alerts, reports, and audit history
- Role-based access for the identified users
- Responsive web-based or equivalent connected access
- Evaluation with the farm's actual and growing cattle population

### 17.2 Excluded from the Baseline Scope

- RFID scanners
- IoT physiological or environmental sensors
- GPS or real-time cattle location tracking
- Fully automated measurement collection
- Automatic diagnosis or replacement of veterinary judgment
- Guaranteed accurate body weight without a weighing apparatus or trusted measurement source
- Multi-farm commercial operation unless later approved
- Unapproved integration with government or external databases

### 17.3 Practical Limitations

- Data quality depends on accurate and timely user entry.
- Connectivity may affect access if the chosen implementation requires continuous internet service.
- Medicine availability and clinical decisions remain outside the software's control.
- Alerts are only reliable when source dates and schedules are complete and correct.
- The system can identify overdue or abnormal records but does not independently diagnose disease.

---

## 18. Future Enhancements

These may be considered after the baseline system is stable and validated:

- QR-code cattle identification and printable profile tags
- RFID identification
- IoT sensor integration
- GPS or location tracking
- Automated weighing or measurement devices
- Advanced decision support and predictive analytics
- External email or SMS notifications
- Offline-first data capture and later synchronization
- Native mobile application
- Multi-farm or multi-campus support
- Integration with approved government animal-health systems
- Extended academic research datasets and anonymized exports

QR identification is treated as a future enhancement because it appears in the paper's iterative improvement discussion but is not part of the stated baseline objectives and manual ear-tag scope.

---

## 19. Development Methodology

The source project uses Feature-Driven Development (FDD). A new implementation may retain the same practical sequence even if the team adapts its broader process.

### 19.1 Develop an Overall Model

- Confirm farm workflows, actors, rules, and scope.
- Validate terminology and required data.
- Review the conceptual model with stakeholders.

### 19.2 Build a Feature List

- Break modules into small user-valued features.
- Define dependencies, business rules, and acceptance criteria.
- Prioritize core recordkeeping before optional enhancements.

### 19.3 Plan by Feature

- Assign feature ownership.
- Estimate complexity and sequence dependencies.
- Plan incremental releases.

### 19.4 Design by Feature

- Define interface flows, validation, permissions, data changes, and error behavior.
- Review designs with farm stakeholders before implementation.

### 19.5 Build by Feature

- Implement small functional units.
- Test each feature and its integration.
- Demonstrate completed work to stakeholders.
- Incorporate approved feedback before the next iteration.

---

## 20. Testing and Validation Plan

### 20.1 Unit Testing

- Validate individual rules, calculations, form behavior, and components.
- Test due dates, pregnancy stages, withdrawal dates, status changes, and permissions.

### 20.2 Integration Testing

- Verify complete interactions among cattle, treatment, alerts, breeding, pregnancy, birth, reports, and audit history.
- Confirm multi-record operations either complete fully or fail safely.

### 20.3 System and Alpha Testing

- Enter representative cattle datasets.
- Test required and invalid form inputs.
- Detect and resolve functional defects.
- Review spelling, labels, dates, formatting, and report output.
- Test vaccination, treatment, breeding, pregnancy, withdrawal, and critical-health alerts.
- Test dashboards, charts, filters, and exports with different data conditions.

### 20.4 Beta and User Acceptance Testing

- Involve administrators, farm managers, veterinarians, farm aides, and faculty.
- Validate that permissions match real responsibilities.
- Confirm daily workflows are efficient and understandable.
- Evaluate accuracy, reliability, usability, and stakeholder satisfaction.
- Record requested improvements and prioritize them for the next iteration.

### 20.5 Iteration Completion Criteria

An iteration may be accepted when:

- Its prioritized features are complete.
- Functional and integration tests pass.
- No known critical data-integrity or security issue remains.
- The feature works with realistic cattle data.
- Relevant stakeholders confirm that the behavior meets operational needs.

---

## 21. Minimum Acceptance Criteria

The first production-ready version should not be considered complete unless:

- All five user roles can be represented with correct permissions.
- Administrators can manage users and inspect audit logs.
- Authorized users can register, edit, search, filter, view, and archive cattle.
- Every cattle record can display a consolidated health and reproductive history.
- Treatments and vaccinations retain product, date, dosage, route, and administrator information where applicable.
- Active withdrawal periods produce visible warnings and prevent or flag prohibited clearance.
- Breeding records support natural mating and artificial insemination.
- Positive pregnancy confirmation creates a linked pregnancy record and estimated delivery date.
- Pregnancy checkups can record weight, BCS, condition, notes, and next schedule.
- Birth recording completes the pregnancy and links offspring to parents.
- Alerts identify upcoming, due, and overdue activities.
- Critical health information is visibly prioritized.
- Required inventory, health, breeding, pregnancy, and overall farm reports are available.
- Significant changes create audit entries with user and timestamp.
- Archived cattle remain available to authorized users.
- The interface works on the approved desktop and mobile screen sizes.
- Backup and restoration procedures are documented and successfully tested before live use.

---

## 22. Recommended Build Order

### Phase 1 - Foundation

- Authentication
- Roles and permissions
- User management
- Core cattle data model
- Audit-log foundation

### Phase 2 - Cattle Inventory

- Registration
- Cattle list, search, and filters
- Individual profile
- Update and archive workflows
- Weight and BCS history

### Phase 3 - Health and Treatment

- Health assessments
- Treatments and batch vaccination
- Vaccination and preventive-care history
- Withdrawal management
- Health alerts

### Phase 4 - Reproduction

- Breeding events
- Pregnancy confirmation
- Gestation tracking and checkups
- Birth recording and offspring links

### Phase 5 - Monitoring and Reporting

- Full dashboard
- Notification center
- Reports and visualizations
- PDF/CSV/print output
- Audit-log filtering and export

### Phase 6 - Hardening and Deployment

- Accessibility and responsive QA
- Security review
- Performance testing
- Backups and recovery test
- Alpha, beta, and user acceptance testing
- Production deployment and user training

---

## 23. Open Decisions Requiring Stakeholder Confirmation

These items should be confirmed before or during detailed design:

1. The new technology stack and hosting environment.
2. Whether the application must function during internet outages.
3. Exact permissions of Farm Manager, Veterinarian, and Farm Aide where responsibilities overlap.
4. Whether user deletion should be permanent or replaced by account deactivation.
5. The official BCS scale. The paper contains an inconsistency: one definition states 1-6 while another table title refers to a 1-5 scale.
6. Farm-approved health-status values and escalation rules.
7. Exact vaccine, deworming, treatment, and follow-up schedules.
8. Whether the approximately 90-day pregnancy check should be fixed or configurable.
9. How conception date is determined when only the breeding date is known.
10. Rules for multiple breeding attempts before pregnancy confirmation.
11. Required withdrawal-duration source and approval workflow.
12. Required report templates, signatures, pricing, and financial calculations.
13. Whether cattle photos and supporting attachments are mandatory.
14. Which notification channels are required: in-app only, email, SMS, or another channel.
15. Data-retention, privacy, backup, and restore policies.
16. Whether QR identification belongs in the first release or a later release.

---

## 24. Important Implementation Safeguards

- Do not interpret missing health information as a healthy status.
- Do not calculate medical instructions that were not supplied or approved by qualified personnel.
- Do not delete cattle history when an animal is sold, culled, or deceased.
- Do not allow pregnancy or birth records to exist without valid cattle relationships.
- Do not allow offspring to reference itself as a parent.
- Do not allow unauthorized users to change critical health, treatment, pregnancy, or user records.
- Do not allow an active withdrawal warning to disappear solely because a screen was dismissed.
- Do not allow report exports to bypass role permissions.
- Do not rely on frontend validation alone for important rules.
- Do not bind the project to the current herd count or to one fixed set of breeds.
- Do not treat future RFID, QR, GPS, or IoT functionality as already implemented.

---

## 25. Key Domain Terms

| Term | Meaning in HerdSync |
| --- | --- |
| **Artificial Insemination (AI)** | Controlled breeding method in which semen is introduced into the female reproductive tract without natural mating |
| **Biosecurity** | Practices intended to prevent introduction and spread of disease in the herd |
| **Body Condition Score (BCS)** | Standardized assessment of physical condition and nutritional status; the official scale must be confirmed |
| **Calving / Parturition** | The process of giving birth |
| **Culling** | Removing an animal from the breeding herd because of productivity, health, age, or other approved reasons |
| **Dam** | Female parent of an animal |
| **Gestation** | Period from conception to birth, approximately 283 days for cattle with natural variation |
| **Sire** | Male parent of an animal |
| **Withdrawal Time** | Required period between the final administration of a drug and permitted slaughter or consumption clearance |
| **Weaning** | Transition of young livestock from maternal milk to solid feed |

---

## 26. Definition of Done for the Project Overview

This file is the functional baseline for the new HerdSync implementation. It preserves the complete project objectives and essential domain details from the source paper while intentionally leaving technology choices open. Any later architecture, design, or development document should reference this overview and clearly document approved changes to scope, rules, or objectives.


HerdSync Design System

Design direction: Modern Pasture
Component system: shadcn/ui
Primary typeface: Poppins
Product: HerdSync Livestock Management Information System
Related specification: HERDSYNC_PROJECT_OVERVIEW.md
Document purpose: Provide a complete visual, interaction, layout, and component specification for implementing HerdSync consistently.

1. Design Vision

HerdSync should feel like a modern agricultural operations platform: dependable, calm, organized, and easy to understand during daily farm work. The interface should combine natural farm-inspired colors with the clarity of a professional management dashboard.

The product must not look like a decorative farm website. Avoid literal wood textures, grass backgrounds, barn illustrations, excessive animal graphics, and novelty typography. Agricultural identity should come from the forest-green, sage, cream, wheat, and earth palette; the cow logo; and the content itself.

1.1 Design Keywords

Modern

Agricultural

Dependable

Calm

Clean

Traceable

Approachable

Data-focused

Professional

Accessible

1.2 Design Principles

Operational clarity first. Cattle status, health warnings, due dates, and required actions must be immediately understandable.

Natural, not rustic. Use farm-inspired colors without decorative farm clichés.

Dense information, calm presentation. HerdSync contains many records; use hierarchy, spacing, tabs, filters, and progressive disclosure to prevent visual overload.

Status must never depend on color alone. Pair color with text, icons, and labels.

Frequent actions should be close to the data. Users should not navigate through several pages to record a treatment, checkup, or cattle update.

Historical data is valuable. Timelines, tables, and audit information should be readable and traceable.

Mobile supports field work. Desktop may be the main management environment, but essential viewing and recording workflows must remain usable on phones and tablets.

2. Typography

2.1 Primary Font: Poppins

Use Poppins for the entire HerdSync interface.

Poppins provides a modern, approachable, and recognizable visual style across dashboards, forms, tables, navigation, reports, and mobile views.

2.2 Font Stack

font-family: "Poppins", "Segoe UI", Arial, sans-serif;

Load the following weights only unless another weight is specifically required:

400 - regular body text

500 - labels, secondary emphasis, table values

600 - buttons, navigation, card labels, subheadings

700 - page titles, major metrics, strong emphasis

Avoid using weight 800 or 900 in the main interface because it can make the dashboard feel heavy.

2.3 Typography Scale

Token

Size / line height

Weight

Usage

Display

32px / 40px

700

Rare welcome or empty-state headline

H1

28px / 36px

700

Primary page title

H2

22px / 30px

700

Major page section

H3

18px / 26px

600

Card or form section title

H4

16px / 24px

600

Compact subsection title

Body Large

16px / 26px

400

Introductory or important body content

Body

14px / 22px

400

Default interface text

Body Medium

14px / 22px

500

Values, active labels, emphasized body text

Label

13px / 18px

600

Form labels and compact card labels

Caption

12px / 18px

400

Metadata, helper text, timestamps

Overline

11px / 16px

700

Small uppercase grouping labels

Metric XL

36px / 42px

700

Primary dashboard metric

Metric

28px / 34px

700

Standard statistics-card value

2.4 Typography Rules

Use sentence case for page titles, labels, buttons, navigation, and table headers.

Do not use all caps for full sentences.

Overlines may use uppercase with 0.06em letter spacing.

Use tabular numbers for counts, dates, weight, dosage, and financial values.

Keep long descriptions to a readable maximum width of approximately 65-75ch.

Avoid text smaller than 12px.

Do not use more than four font weights on one screen.

.numeric-data {
  font-variant-numeric: tabular-nums;
}

3. Color System

3.1 Modern Pasture Brand Palette

Token

Name

Hex

Intended use

forest-900

Deep Forest

#0C3C01

Hover states, dark navigation, dark backgrounds

forest-800

Forest Green

#0C3C01

Primary brand and primary action

forest-700

Pasture Green

#5B6D49

Active states, chart series, supporting emphasis

sage-600

Sage

#A2AC82

Secondary accents and calmer data series

sage-200

Light Sage

#E1E5D5

Soft selected states and positive backgrounds

sage-100

Mist Sage

#F1F2ED

Muted panels and section backgrounds

wheat-500

Wheat Gold

#D6A84B

Accent, attention highlights, logo node

wheat-100

Pale Wheat

#F5E9C9

Warning or informational background

black-900

Black

#000000

Limited agricultural accent and chart series

cream-100

Warm Cream

#F1F2ED

Application background

cream-50

Soft White

#FFFFFF

Cards, dialogs, sheets

stone-300

Warm Border

#D8D4C7

Borders and dividers

stone-500

Muted Olive Gray

#667066

Secondary text

charcoal-900

Charcoal Green

#1D1D1B

Primary text

3.2 Brand Gradient

Reserve the gradient for the logo, selected hero moments, loading accents, or a small highlight. Do not use it as the background of every card or button.

background: linear-gradient(
  135deg,
  #174D32 0%,
  #4F8A45 58%,
  #A5C94A 100%
);

3.3 Semantic Status Colors

Brand color and operational status color are separate systems. A green primary button does not automatically mean a cattle record is healthy.

Status

Foreground

Background

Border

Suggested icon

Healthy / Completed

#2F6B3B

#E4F2E6

#B9D9BE

CircleCheck

Attention Needed / Due Soon

#8A5B09

#FFF3D6

#E9C979

TriangleAlert

Critical / Overdue

#9E3834

#FCE8E6

#EAB3AF

CircleAlert

Information

#2D6474

#E4F1F4

#ADD0D8

Info

Pregnant / Breeding

#744D70

#F2E7F0

#D8BBD4

HeartPulse

Withdrawal Active

#9A4F1F

#FBEBDC

#E8BD96

ShieldAlert

Archived / Inactive

#606862

#ECEEEC

#CED2CE

Archive

3.4 Health Priority

Priority

Color behavior

Normal

Calm green badge; no full-card tint unless the card is specifically a status summary

Attention

Amber icon, badge, and left border; avoid yellow body text on white

Critical

Red icon, badge, and strong left border; use a pale red surface only in the affected alert

Unknown

Neutral gray with explicit Not assessed text

3.5 Chart Palette

Use series colors in this order:

#24523A - forest

#78966A - sage

#D6A84B - wheat

#39758A - blue teal

#8B5E83 - muted plum

#000000 - black

Critical red should only represent negative or critical data, not a normal chart series.

4. shadcn Theme Tokens

Use semantic CSS variables so shadcn components inherit the HerdSync design consistently. The values below use direct color values for clarity and can be converted to the project's preferred color format during implementation.

4.1 Light Theme

:root {
  --radius: 0.75rem;

  --background: #F7F4EA;
  --foreground: #202A23;

  --card: #FFFDF8;
  --card-foreground: #202A23;

  --popover: #FFFDF8;
  --popover-foreground: #202A23;

  --primary: #24523A;
  --primary-foreground: #FFFDF8;

  --secondary: #E8EDE3;
  --secondary-foreground: #294333;

  --muted: #EEECE3;
  --muted-foreground: #667066;

  --accent: #F5E9C9;
  --accent-foreground: #65460C;

  --destructive: #B8433E;
  --destructive-foreground: #FFFFFF;

  --border: #D8D4C7;
  --input: #D8D4C7;
  --ring: #4F8A45;

  --chart-1: #24523A;
  --chart-2: #78966A;
  --chart-3: #D6A84B;
  --chart-4: #39758A;
  --chart-5: #8B5E83;

  --sidebar: #193D2A;
  --sidebar-foreground: #F4F7F2;
  --sidebar-primary: #D6A84B;
  --sidebar-primary-foreground: #193D2A;
  --sidebar-accent: #2B5A40;
  --sidebar-accent-foreground: #FFFFFF;
  --sidebar-border: #356448;
  --sidebar-ring: #A5C94A;
}

4.2 Dark Theme

Dark mode should feel like a deep forest at night, not pure black.

.dark {
  --background: #101813;
  --foreground: #ECF1EB;

  --card: #17231B;
  --card-foreground: #ECF1EB;

  --popover: #17231B;
  --popover-foreground: #ECF1EB;

  --primary: #78A683;
  --primary-foreground: #0E1711;

  --secondary: #243229;
  --secondary-foreground: #E7EEE8;

  --muted: #202C24;
  --muted-foreground: #AEB9B0;

  --accent: #3B3524;
  --accent-foreground: #F2D990;

  --destructive: #D96A64;
  --destructive-foreground: #190706;

  --border: #334039;
  --input: #3A4840;
  --ring: #88B693;

  --chart-1: #78A683;
  --chart-2: #A1BA8D;
  --chart-3: #E1BA62;
  --chart-4: #68A0AE;
  --chart-5: #B48AAD;

  --sidebar: #0C1510;
  --sidebar-foreground: #E8EFE9;
  --sidebar-primary: #E1BA62;
  --sidebar-primary-foreground: #121A14;
  --sidebar-accent: #203528;
  --sidebar-accent-foreground: #FFFFFF;
  --sidebar-border: #2C4033;
  --sidebar-ring: #88B693;
}

4.3 Additional HerdSync Tokens

:root {
  --status-healthy: #3F7D44;
  --status-healthy-soft: #E4F2E6;
  --status-attention: #B47A13;
  --status-attention-soft: #FFF3D6;
  --status-critical: #B8433E;
  --status-critical-soft: #FCE8E6;
  --status-info: #39758A;
  --status-info-soft: #E4F1F4;
  --status-pregnant: #8B5E83;
  --status-pregnant-soft: #F2E7F0;
  --status-withdrawal: #B35F2C;
  --status-withdrawal-soft: #FBEBDC;
  --status-archived: #7A807B;
  --status-archived-soft: #ECEEEC;

  --shadow-card: 0 1px 2px rgb(32 42 35 / 0.05),
                 0 8px 24px rgb(32 42 35 / 0.04);
  --shadow-overlay: 0 20px 50px rgb(18 30 22 / 0.18);
}

5. Spacing, Radius, Borders, and Elevation

5.1 Spacing Scale

Use a 4px base scale.

Layout spacing must keep content readable without oversized empty areas. Use responsive padding rather than fixed widths. Cards, forms, tables, and dialogs must keep content inside their boundaries at every supported viewport.

Token

Value

Common use

space-1

4px

Icon gap, micro spacing

space-2

8px

Inline groups, badge padding

space-3

12px

Compact fields and cards

space-4

16px

Standard component spacing

space-5

20px

Card inner spacing

space-6

24px

Standard section gap

space-8

32px

Major page sections

space-10

40px

Large layout separation

space-12

48px

Empty states and page breathing room

5.2 Radius

Element

Radius

Buttons and inputs

8px

Badges

999px pill or 6px compact

Cards

12px

Dialogs and sheets

16px

Avatar and cattle thumbnails

10px or circle, depending on context

Do not make every container pill-shaped.

5.3 Borders

Default: 1px solid var(--border)

Strong divider: use a slightly darker neutral, not a shadow.

Selected row: use a forest-green left border or a subtle sage surface.

Critical row: use a critical-red left border and status label.

5.4 Elevation

Use flat surfaces with borders by default.

Use --shadow-card for dashboard cards only when separation is needed.

Use --shadow-overlay for dialogs, popovers, dropdowns, and sheets.

Avoid strong black shadows and floating-card overload.

5.5 Fit and Layout Rules

- Use `box-sizing: border-box` globally.
- Keep cards and form sections at `width: 100%` within their grid column.
- Use `min-width: 0` on grid and flex children so long labels and tables do not force overflow.
- Use 16-24px card padding on desktop and 16px on narrow mobile screens.
- Use 16px minimum horizontal page padding on phones, 24px on tablets, and 24-32px on desktop.
- Keep primary actions full-width on phones when grouped actions would wrap poorly.
- Prevent text, buttons, badges, and inputs from escaping card boundaries.
- Use responsive grids with minimum viable column widths instead of fixed card widths.

6. Iconography

Use Lucide icons to align with shadcn components.

Do not use emojis in the interface. Use Lucide icons or another consistent accessible icon library instead. Icons support labels; they do not replace required text for unfamiliar or high-impact actions.

6.1 Icon Rules

Default icon size: 18px

Small icon size: 16px

Page or empty-state icon: 24-32px

Default stroke width: 1.75-2

Use one icon style consistently.

Pair unfamiliar icons with text.

Never use an icon as the only signal for a critical action.

6.2 Recommended Icon Mapping

Area

Suggested icon

Dashboard

LayoutDashboard

Cattle

Beef

Health

HeartPulse

Treatments

Syringe

Vaccinations

ShieldCheck

Breeding

HeartHandshake or GitBranch

Pregnancy

Activity or custom approved symbol

Birth / offspring

Baby used carefully, or Network for lineage

Alerts

Bell

Reports

FileChartColumn

Activity logs

ScrollText

Users

Users

Settings

Settings

Archive

Archive

Search

Search

Add

Plus

Export

Download

Print

Printer

7. Logo Usage

7.1 Preferred Logo System

Use the selected HerdSync cow-and-connection logo as the primary mark. Maintain separate assets for:

Full horizontal logo

Cow or network icon only

Light-background logo

Dark-background logo

Monochrome logo

Favicon and app icon

7.2 Clear Space

Maintain clear space around the logo equal to at least the height of the cow's ear or one-half of the icon height.

7.3 Minimum Size

Full horizontal logo: do not display below approximately 120px wide.

Icon only: do not display below 24px without a simplified small-size version.

7.4 Incorrect Usage

Do not stretch or rotate the logo.

Do not recolor it with unrelated gradients.

Do not add drop shadows or outlines.

Do not place it over busy photography.

Do not use the full logo repeatedly inside content cards.

8. Application Shell

8.1 Desktop Layout

Persistent left sidebar

Compact top header

Scrollable content area

Optional right-side sheet for quick details

Maximum content width may be fluid for tables and dashboards

Region

Recommended size

Expanded sidebar

256px

Collapsed sidebar

72px

Top header

64px

Page horizontal padding

24-32px

Page vertical padding

24px

8.2 Sidebar

The sidebar should use Deep Forest (#193D2A) in light mode and the darker forest token in dark mode.

Structure:

HerdSync logo

Primary navigation

Management navigation where authorized

Flexible spacer

User profile and sign-out

Navigation groups:

Overview

Dashboard

Livestock

Cattle

Health and treatments

Breeding

Pregnancy and births

Operations

Alerts and schedules

Reports

Activity logs

Administration

Users

Settings

Only show destinations the current role can access.

Active item style:

Slightly lighter forest background

White text

Wheat-gold or light-lime indicator

Icon and label remain aligned

8.3 Top Header

Include:

Mobile sidebar trigger

Page breadcrumb when helpful

Global cattle search or command trigger

Alerts button with unread count

Optional theme control

User menu

Do not repeat a large page title in both the header and content area.

8.4 Mobile Layout

Sidebar becomes a shadcn Sheet or mobile drawer.

Header remains sticky when useful.

Primary page actions remain visible near the page title or in a compact action menu.

Tables use responsive columns, horizontal scrolling, or mobile record cards.

Detail sheets may become full-screen.

Avoid bottom navigation unless later user testing demonstrates a strong need.

9. Page Header Pattern

Every main page should use a consistent header:

Breadcrumb, when the user is deeper than one level

Page title

Short supporting description, only when useful

Primary action aligned right on desktop

Optional secondary actions in a dropdown

Example:

Cattle Inventory                                  [Export] [Add cattle]
Manage active, quarantined, and archived cattle records.

Rules:

Only one visually dominant primary action per page.

Use verb-first button labels: Add cattle, Record treatment, Generate report.

Avoid vague labels such as Submit when the action can be named.

10. Dashboard Design

10.1 Dashboard Hierarchy

Farm-status summary

Required or overdue actions

Herd composition and health trends

Recent activity

10.2 Statistics Cards

Recommended first row:

Total active cattle

Healthy cattle

Attention needed

Confirmed pregnancies

Activities due this week

Card anatomy:

Small label

Main metric

Supporting comparison or description

Relevant icon in a subtle tinted container

Optional link to the detailed list

Do not use five different saturated card backgrounds. Keep cards neutral and use small semantic accents.

10.3 Priority Alerts Panel

Show critical and overdue alerts first.

Display cattle ID, alert type, due date, severity, and action.

Use tabs or filters for All, Critical, Due soon, and Overdue if the list is long.

Provide a clear empty state when no urgent items exist.

10.4 Dashboard Charts

Recommended charts:

Donut: cattle by sex or age class

Horizontal bar: cattle by health status

Line: weight or health activity trend

Bar: vaccinations or treatments by month

Timeline/list: upcoming pregnancy and delivery milestones

Avoid 3D charts, decorative gauges, and charts without visible values or tooltips.

11. Cattle Inventory Design

11.1 Desktop Data Table

Recommended columns:

Select checkbox when bulk actions are allowed

Cattle ID and optional thumbnail

Breed

Sex

Age class

Health status

Reproductive or pregnancy status

Weight / last measured date

Updated date

Actions menu

11.2 Table Toolbar

Use:

Search input

Filter button or visible high-value filters

Status tabs if appropriate

Column visibility control

Export action

Add cattle primary button

11.3 Filtering

Support clear, removable filter chips for:

Breed

Sex

Age class

Health status

Pregnancy status

Active, quarantine, sold, culled, deceased, or archived status

Display a Clear filters action when filters are active.

11.4 Row Behavior

Clicking the cattle ID or main row area opens the profile.

The actions menu contains edit, record treatment, record breeding, and archive actions according to permission and eligibility.

Critical status should be visible without opening the record.

Avoid putting many icon buttons directly in every row.

11.5 Mobile Inventory

Use compact record cards showing:

Cattle ID

Breed, sex, and age class

Health status

Pregnancy or withdrawal status when relevant

Next due action

Overflow menu

12. Cattle Profile Design

12.1 Profile Header

Include:

Cattle thumbnail or fallback icon

Cattle ID as the title

Breed, sex, and age class

Current health badge

Current reproductive badge

Active withdrawal warning if present

Primary contextual action

Actions dropdown

12.2 Profile Tabs

Use shadcn Tabs for:

Overview

Health

Treatments

Breeding

Pregnancy and births

Growth

Activity

On small screens, tabs may horizontally scroll or become a select menu.

12.3 Overview Tab

Identity and acquisition information

Current health summary

Weight and BCS summary

Upcoming schedules

Recent treatments

Parentage and offspring summary

Recent activity timeline

12.4 Timeline Pattern

Use a clean vertical timeline for important events:

Date and time

Event icon

Event title

Short details

Responsible person

Link to the full record

Use color only on the event marker or badge, not the entire timeline row.

13. Health and Treatment Design

13.1 Health Summary

Current health status

Latest assessment date

Latest BCS and weight

Active conditions or notes

Next preventive activity

Active withdrawal warning

13.2 Treatment Form

Group the form into logical sections:

Cattle selection

Treatment type and reason

Product or medicine

Dose, unit, and route

Administration date and personnel

Follow-up and next due date

Withdrawal requirement

Notes

Use conditional fields. Only reveal withdrawal controls when the treatment requires them.

13.3 Withdrawal Banner

An active withdrawal must produce a strong but controlled banner:

ShieldAlert icon

Withdrawal active label

End date and days remaining

Treatment or medicine reference

Explicit sale/slaughter clearance warning

Link to withdrawal details

Do not allow users to dismiss the underlying status by closing the banner.

14. Breeding and Pregnancy Design

14.1 Breeding Dashboard

Summary cards:

Breeding events awaiting pregnancy check

Confirmed pregnancies

Not-pregnant outcomes

Upcoming check dates

Expected deliveries

14.2 Breeding Form

Dam selection

Sire selection when applicable

Breeding method

Estrus or breeding date

Eligibility summary

Notes

Calculated pregnancy-check date

Show failed eligibility rules before submission and explain what must be resolved.

14.3 Pregnancy Progress

Use a horizontal segmented progress indicator on desktop and a vertical compact version on mobile:

Early

Mid

Late

Pre-calving

Birth completed

Always include stage text, approximate day, and expected delivery date. Do not depend on the progress color alone.

14.4 Pregnancy Checkup Card

Checkup date

Gestation day or stage

Weight

BCS

Condition badge

Notes

Examiner

Next checkup

14.5 Birth Recording

Use one parent birth-event form with repeatable offspring sections. Each offspring section should clearly indicate Offspring 1, Offspring 2, and so on.

15. Alerts and Schedules

15.1 Alert Card Anatomy

Severity indicator

Alert title

Cattle ID

Due date or overdue duration

Brief reason

Status badge

Primary next action

Secondary acknowledge or view action

15.2 Severity Ordering

Critical

Overdue

Due today

Due soon

Informational

15.3 Calendar

Use a month view for general schedules.

Use a list or agenda view as the default on small screens.

Use category filters for vaccination, treatment, breeding, pregnancy, withdrawal, and general tasks.

Always provide a text-based agenda alternative to color-coded calendar markers.

16. Reports and Analytics

16.1 Report Builder

Use a two-part layout:

Filter controls at the top or in a collapsible side panel

Report preview below

Controls may include:

Report type

Date range

Cattle status

Breed

Sex

Age class

Health status

Treatment category

Breeding or pregnancy status

16.2 Report Preview

Report title

Applied filters

Generation date

Summary metrics

Appropriate chart

Detailed table

Optional signature area

Print and export actions

16.3 Export Actions

Use explicit labels:

Export PDF

Export CSV

Print report

Do not hide all export formats behind an unlabeled icon.

17. shadcn Component Specifications

17.1 Button

Variant

Usage

default

One primary action in a section or page

secondary

Supporting non-destructive action

outline

Filters, exports, and alternate actions

ghost

Table actions, navigation, low-emphasis controls

destructive

Confirmed destructive or irreversible action only

link

Inline navigation

Button heights:

Small: 32px

Default: 40px

Large: 44px

Use text with icons where the action is not universally understood.

17.2 Card

Use CardHeader, CardTitle, CardDescription, and CardContent consistently.

Default padding: 20-24px.

Do not nest multiple bordered cards unless necessary.

Use section dividers or muted backgrounds for internal grouping.

17.3 Badge

Use semantic variants for health, pregnancy, withdrawal, alert, and archive status.

Use short labels: Healthy, Critical, Pregnant, Withdrawal active.

Pair with an icon only when it improves recognition.

17.4 Alert

Use for system feedback and persistent contextual warnings.

Destructive styling is reserved for errors and critical risk.

Include a clear title and action when the user can resolve the issue.

17.5 Dialog

Use for:

Confirming archive or high-impact actions

Short focused data entry

Final report or export confirmation

Do not place long multi-section forms in a narrow dialog. Use a page or large sheet instead.

17.6 Sheet

Use for:

Mobile navigation

Quick cattle preview

Filters on smaller screens

Contextual history or details

17.7 Tabs

Use for related views within one entity.

Do not use tabs as the primary application navigation.

Keep the number of visible tabs manageable.

17.8 Form Controls

Input height: 40px default; 44px on touch-heavy mobile forms.

Labels appear above fields.

Required indicators must be explained once per form.

Helper text appears before an error; error text replaces or follows helper text without causing large layout shifts.

Date controls must display the expected format.

Numeric fields must include units where applicable.

17.9 Table

Header height: approximately 44px.

Row height: 48-56px depending on density.

Keep headers visible on long desktop tables when practical.

Align text left and numeric data right.

Do not center every column.

Use pagination for long datasets.

17.10 Tooltip

Use for unfamiliar icons, truncated labels, or brief clarification.

Never place essential instructions only in a tooltip.

17.11 Toast

Use for short, non-blocking feedback:

Cattle record saved

Treatment recorded

Report generated

Export started or completed

Errors requiring action should also appear near the affected content or form.

17.12 Skeleton

Match the approximate final layout.

Use for table, card, and profile loading states.

Avoid indefinite spinners when useful structure can be shown.

18. Forms and Validation

18.1 Form Layout

Use one column for complex or dependent fields.

Use two columns on desktop for short, related fields.

Return to one column below tablet width.

Group fields with clear section titles.

Keep the primary submit action at the bottom-right on desktop and full-width or sticky when appropriate on mobile.

18.2 Validation Behavior

Validate required and structural rules on blur or submission without interrupting typing.

Show field-level errors directly below the field.

Show a summary alert for server or multi-field errors.

Preserve valid user input when submission fails.

Prevent accidental duplicate submission.

Ask for confirmation before discarding an unsaved long form.

18.3 Clinical and Domain Fields

Always show units for weight, dosage, and duration.

Do not prefill unknown health data with normal values.

Calculated dates must show their basis and allow authorized correction where required.

Medical schedules must come from approved data or qualified personnel.

19. Empty, Loading, Error, and Success States

19.1 Empty State Pattern

Include:

Simple icon or minimal cow illustration

Direct title

One-sentence explanation

Primary action when available

Example:

No cattle records yet
Register the first cattle to begin tracking health and farm activity.
[Add cattle]

19.2 No Search Results

Repeat the important search term or filter context.

Offer Clear filters.

Do not show the full first-use empty state.

19.3 Error States

Explain what failed in plain language.

Preserve user input.

Provide retry or recovery action.

Never display raw technical error output to ordinary users.

19.4 Success States

Confirm what changed.

Provide a useful next step when appropriate.

Avoid large celebration screens for routine farm operations.

20. Motion and Interaction

Motion should support orientation and feedback, not decoration.

Interaction

Duration

Hover and color transition

120-160ms

Accordion or collapsible

180-220ms

Sheet and dialog

200-260ms

Toast entry

180-220ms

Use subtle easing and respect reduced-motion preferences.

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

Avoid:

Constant pulsing metrics

Bouncing navigation

Large parallax effects

Decorative loading animation that delays access

Critical alerts may use one controlled attention animation when first presented, but must not flash continuously.

21. Responsive Breakpoints and Behavior

Use the implementation's breakpoint system while preserving these behavior targets:

Responsive behavior is required for desktop, tablet, and phone screens. Test primary workflows at narrow mobile width, including cattle registration, treatment entry, pregnancy checkup, birth recording, alerts, and reports. No page may require viewport-wide horizontal scrolling.

Range

Layout behavior

Under 640px

Single column; drawer navigation; mobile cards or scrollable tables; full-width primary actions

640-767px

Wider mobile; two-column compact metrics where readable

768-1023px

Tablet; collapsible sidebar; two-column forms and dashboard sections

1024-1279px

Standard desktop; expanded sidebar; multi-column dashboard

1280px and above

Spacious dashboard; wider tables and report layouts

21.1 Responsive Priority

When space becomes limited, preserve in this order:

Cattle ID

Health or critical status

Due action

Primary action

Core demographic information

Secondary metadata

Hide or move low-priority columns before compressing critical information.

22. Accessibility Requirements

Target WCAG 2.2 AA practices for the implemented interface.

Maintain sufficient contrast for text, controls, icons, and focus indicators.

Use visible keyboard focus with the theme ring token.

All inputs require programmatically associated labels.

Buttons require accessible names.

Icon-only actions require accessible text and tooltips where helpful.

Dialogs and sheets must trap focus and return focus after closing.

Tables require meaningful headers.

Charts require titles, readable tooltips, and a table or text alternative for important data.

Status must be conveyed through label and icon, not color alone.

Touch targets should be approximately 44px where practical on mobile.

Error messages should explain how to correct the problem.

Respect reduced motion and browser text scaling.

23. Content and Naming Guidelines

23.1 Tone

Clear

Calm

Direct

Respectful

Operational

23.2 Preferred Labels

Use

Avoid

Add cattle

Add new

Record treatment

Submit treatment data

Confirm pregnancy

Update status

Record birth

Process

Archive cattle

Delete cattle

Attention needed

Warning animal

No results found

Nothing here

Withdrawal active

Locked cow

23.3 Cattle Grammar

Use cattle for both singular domain references and plural groups where possible. When a sentence could sound unnatural, use animal, cattle record, cow, bull, heifer, or another accurate classification.

23.4 Date and Measurement Formatting

Display dates consistently according to the approved local format.

Avoid ambiguous numeric-only dates where practical.

Always show weight units.

Always show dosage units.

Show timestamps in activity logs.

Use tabular numbers in data tables.

24. Dark Mode Guidance

Dark mode is supported but should not be the default unless user testing prefers it.

Use deep green-black surfaces, not pure black.

Preserve semantic status distinction.

Avoid saturated neon green.

Reduce large pale-background tints to darker, lower-saturation equivalents.

Keep charts readable without making every series brighter.

Ensure logo assets have an approved dark-background version.

25. Recommended shadcn Components

The implementation is expected to use or adapt the following shadcn components:

Alert

Alert Dialog

Avatar

Badge

Breadcrumb

Button

Calendar

Card

Chart

Checkbox

Collapsible

Command

Data Table pattern

Date Picker pattern

Dialog

Dropdown Menu

Form

Input

Input OTP only if the chosen authentication flow needs it

Label

Pagination

Popover

Progress

Radio Group

Scroll Area

Select

Separator

Sheet

Sidebar

Skeleton

Sonner or approved toast system

Switch

Table

Tabs

Textarea

Tooltip

Do not install or expose components that the product does not use.

26. Design Review Checklist

Before approving a screen, verify:

Brand and Visual Quality

Poppins is applied consistently.

Forest green is the primary brand color.

Wheat gold is used as a restrained accent.

Earth brown is not overused.

Cards use calm surfaces and subtle borders.

The logo has adequate clear space.

Hierarchy and Usability

The page has one clear primary action.

The most important status is visible without scrolling when practical.

Health and due-date information is easy to scan.

Labels use clear action-oriented language.

Empty, loading, error, and success states are designed.

Long data uses tables, tabs, filters, or progressive disclosure.

Components

shadcn components use semantic theme tokens.

Status badges follow the semantic color system.

Forms show units and meaningful validation.

Dialogs are not overloaded with long forms.

Tables prioritize important columns.

Accessibility

Contrast is sufficient.

Focus indicators are visible.

Status is not communicated by color alone.

Controls have accessible names and labels.

The screen remains usable by keyboard.

Mobile touch targets are large enough.

Reduced motion is respected.

Responsive Behavior

Desktop, tablet, and mobile layouts are defined.

Sidebar becomes a drawer on small screens.

Tables have a mobile strategy.

Primary actions remain discoverable.

Critical information is not hidden before secondary metadata.

27. Final Design Direction

HerdSync will use the Modern Pasture design system: Poppins typography, a forest-green shadcn theme, warm cream application surfaces, restrained wheat-gold highlights, sage secondary accents, clear semantic status colors, consistent Lucide iconography, and data-focused responsive layouts.

The result should feel like a credible modern farm-management product rather than a generic admin template. Every design decision must support accurate recordkeeping, fast recognition of cattle condition, clear operational priorities, and comfortable daily use by administrators, farm personnel, veterinarians, and faculty.


# HerdSync API Specification

Base path: `/api`

## Authentication
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`

## Cattle
- `GET /cattle` — search, filters, pagination.
- `POST /cattle` — authorized creation.
- `GET /cattle/:id` — consolidated profile.
- `PATCH /cattle/:id` — authorized update.
- `POST /cattle/:id/archive` — status-preserving archive.

## Health and treatment
- `POST /cattle/:id/assessments`
- `GET /cattle/:id/assessments`
- `POST /cattle/:id/treatments`
- `GET /cattle/:id/treatments`
- `POST /treatments/:id/withdrawal-clearance`

## Reproduction
- `POST /breeding-events`
- `PATCH /breeding-events/:id/outcome`
- `POST /pregnancies`
- `POST /pregnancies/:id/checkups`
- `POST /pregnancies/:id/birth`

## Monitoring
- `GET /alerts`
- `PATCH /alerts/:id/status`
- `GET /dashboard`
- `GET /reports/:type`
- `GET /audit-logs`

## API rules
- Validate input server-side.
- Return consistent `{ data, error, meta }` shape.
- Use `400` validation, `401` unauthenticated, `403` unauthorized, `404` missing, `409` conflict, `500` unexpected error.
- Never expose password hashes or unauthorized records.
- Log significant mutations.

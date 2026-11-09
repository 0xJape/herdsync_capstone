# HerdSync Deployment

## Initial target
- Frontend: Vercel.
- Backend: use the selected SQLite-compatible backend deployment for the initial release.
- SQLite is suitable for initial development and early deployment.
- Future platform: Supabase for PostgreSQL, authentication, storage, and related backend services.

## Required configuration
Database URL, session secret, allowed frontend origin, storage credentials if attachments exist, farm timezone, approved schedule settings.

## Release checklist
1. Run tests and build.
2. Apply database migrations.
3. Configure secrets outside source control.
4. Verify CORS, authentication, authorization, and health endpoint.
5. Run backup and restoration check.
6. Validate production smoke workflow.
7. Monitor errors and scheduled alert processing.

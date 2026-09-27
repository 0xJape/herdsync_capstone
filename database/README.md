# Database

`schema.sql` is canonical PostgreSQL schema for a new HerdSync database.

## New database

Apply `schema.sql`, then create first administrator and optional demo data through npm scripts documented in root `README.md`.

## Existing database changes

Create timestamped, repeatable migration scripts under `scripts/` using names such as `migrate-20260914-add-field.mjs`. Use `IF EXISTS` or `IF NOT EXISTS` where PostgreSQL supports it. Update `schema.sql` in same change so fresh databases match migrated databases.

Never place passwords or production data in this directory.

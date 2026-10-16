# Neon PostgreSQL initial migration

The versioned migration in `prisma/migrations/20261016153000_init/migration.sql` mirrors the seven models in `prisma/schema.prisma` and the SQL successfully tested on Neon's temporary migration branch.

## Before production
- Verify there are no historical Prisma migration files outside the GitHub branch (e.g., on a developer machine or an earlier deployment).
- Confirm the migration SQL matches the Prisma schema with `npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --shadow-database-url "$SHADOW_DATABASE_URL" --exit-code` (Prisma 6 syntax; use a disposable shadow database).
- Run `npx prisma migrate status` against Neon production and ensure it is the intended empty database.
- After approval, **use one migration mechanism only**: `npx prisma migrate deploy` with `DATABASE_URL` set to the Neon production connection. This creates the seven tables **and** records the migration in `_prisma_migrations`.
- Do not also apply the previously prepared Neon SQL migration, or the SQL would be applied twice.
- Verify `npx prisma migrate status`, `npx prisma generate`, and application CRUD.
- Never commit `.env`, `.env.local`, or database connection credentials.

The temporary Neon migration branch can be discarded once no longer needed; it was used to validate the SQL, not to establish Prisma migration history.

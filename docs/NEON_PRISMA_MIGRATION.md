# Historical Neon baseline

The standalone seven-table baseline from the old migration branch is archived at `docs/migration-baselines/20261016153000_init.sql`. It is reference material, not an active Prisma migration.

Main already contains the incremental migration chain beginning with `20261016103713_init`. Keeping both baselines active would attempt to create the same tables twice. Use only `prisma/migrations` for deployment and check `prisma migrate status` against the intended database first. Do not manually apply the archived SQL or reset an existing database.

No database migrations were executed during branch consolidation.

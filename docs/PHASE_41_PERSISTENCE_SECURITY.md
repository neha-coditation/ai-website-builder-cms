# Phase 41: persistence and security verification

## Changes
- Dashboard: removed redundant "Projects in workspace" count. No website data or duplicate/delete API was touched. The inspected dashboard had no "Duplicate Website" button.
- Form inbox API: private no-store response to reduce accidental caching of personal submission data.
- Database smoke test: `npm run test:persistence` creates a temporary site, saves and reloads a page, inserts and reloads a form submission, then intentionally rolls back the transaction. No existing website is modified.

## Verify locally
```sh
npx prisma generate
npm run typecheck
npm run build
npm run test:persistence
npm audit
```
Then launch `npm run dev`. Edit a page in Designer, wait until the autosave indicator reports success, reload the page, and confirm the edit remains. Submit a form through the public preview, reload the Forms inbox and confirm the entry remains. The automated smoke test checks database persistence, **not** browser autosave behavior or the public form HTTP route.

## Security outstanding (do not deploy publicly yet)
- The reported `deepmerge-ts` and `postcss` advisories remain unresolved; do not use `npm audit fix --force` without planning Prisma 7 / Next 16 migrations.
- Form submit has no durable per-IP/site rate limiting; a honeypot and request-size checks are insufficient.
- Single-admin middleware is not tenant-aware authorization. Add role/site checks, CSRF protection for mutating requests, and login throttling.
- Form submissions require a retention policy, delete/export authorization, and notification configuration.
- `npm audit` output should be reviewed after lockfile reconciliation; avoid silently overriding transitive dependencies without compatibility tests.

QA status: code committed, not run against the user's database or browser.

# Free-tier Cloudflare deployment plan

## Explicit exclusions
- Do **not** provision Cloudflare R2.
- Do **not** provision Cloudflare Hyperdrive.
- Do **not** enable paid Cloudflare services without approval.

## Proposed architecture (not yet implemented)
- Cloudflare Workers Free for the application, after runtime compatibility tests.
- External PostgreSQL free tier (e.g. Neon) with a Workers-compatible connection/driver.
- External media storage free tier (e.g. Cloudinary), using server-side signed uploads.
- Existing Prisma schema stays PostgreSQL-based until adapter integration is tested.

## Required integration work
1. Select and test a Next.js 15 Workers runtime adapter.
2. Update Prisma to use a compatible connection/adapter without Hyperdrive.
3. Replace filesystem-based `public/uploads` writes with authenticated remote media uploads.
4. Add secret configuration and quota/error handling for the free services.
5. Run end-to-end tests and deploy only after passing.

No third-party account, credentials, database, or storage has been provisioned yet.

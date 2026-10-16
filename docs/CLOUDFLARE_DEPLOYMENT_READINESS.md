> **Current cost constraint:** Use free tiers only. Do not provision Cloudflare R2 or Hyperdrive. See [CLOUDFLARE_BINDINGS.md](./CLOUDFLARE_BINDINGS.md) for the revised architecture.

# Cloudflare Workers deployment readiness

Target: deploy the Studio CMS application to a **new** Cloudflare Workers service, without modifying existing Pages projects.

## Confirmed current state
- Cloudflare account is connected; no Studio CMS Pages project exists.
- Application uses Next.js 15, Prisma 6 and PostgreSQL; it is not a static export.
- PR #48 publishing preflight is merged into main. This is **not** a site deployment pipeline.
- Studio authentication requires `STUDIO_ADMIN_PASSWORD` and `STUDIO_SESSION_SECRET` (32+ chars).
- Prisma requires `DATABASE_URL`; it must point to a durable, Cloudflare-compatible PostgreSQL connection.

## Deployment gates (must pass before public release)
1. Choose and test the Next.js Workers runtime adapter. Cloudflare recommends vinext but its compatibility for this specific Next.js 15 app is unverified; OpenNext is an alternative if compatibility requires it.
2. Run the adapter compatibility check and production build, including all API routes, middleware, Prisma client, and site rendering.
3. Configure a production PostgreSQL provider and a compatible connection driver without Hyperdrive; run **forward-only** migrations after backup.
4. Configure Worker secrets through Cloudflare, never in Git or client bundles.
5. Configure persistent external free-tier media storage for uploads; local `public/uploads` is not durable on Workers.
6. Implement a staging Worker environment, authenticated preview, and automated smoke tests.
7. Validate login, create site, edit page, autosave, CMS CRUD, forms, SEO, and preview against staging.
8. Add deployment version records, rollback, audit logs and a manual production approval gate.
9. Enable custom domain only after staging acceptance and DNS ownership verification.

## Commands for a local checkout (verification only)
```sh
npm ci
npx prisma validate
npx prisma generate
npm run typecheck
npm run build
npx vinext check
```

Do not run `wrangler deploy` until the runtime adapter, secrets, database, upload storage and smoke tests are configured.

## Scope separation
This document prepares **deployment of the CMS application itself**. Publishing websites created inside the CMS is a separate feature requiring versioned site builds and domain routing.

## Added environment preflight
Run `npm run cloudflare:env-check` after setting the three required environment variables. It checks presence and basic formats without logging secret values. It does **not** verify database connectivity, Prisma compatibility, Worker bindings, storage, or readiness to deploy. Do not commit credentials.

## Compatibility concern
The current `lib/prisma.ts` constructs a normal Prisma Client with no Cloudflare-specific adapter or external PostgreSQL integration. Deploying it unchanged to Workers is not supported by the evidence available. Validate a compatible Prisma driver/adapter and database connection before deployment.

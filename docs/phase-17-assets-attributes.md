# Phase 17 — Assets and HTML attributes

## Implemented

- Per-site **Assets** tab in Designer, with image URL, name, alt text, preview thumbnail, Use and Remove actions.
- Prisma `SiteAsset` metadata table and GET/POST/DELETE API. Image URLs must be HTTPS; this does **not** upload or store image binaries.
- Element inspector for HTML ID, CSS class names, image alt text and button destination.
- Page persistence validation and read-only preview rendering of those attributes. External button links are restricted to HTTPS; internal links must start with a single slash.

## Local setup

Run `npx prisma migrate dev` and `npx prisma generate`, then `npm run dev`.

## QA and limitations

Test add/remove/select asset, save/reload page, inspect rendered IDs/classes, and verify links. IDs are format-validated but duplicate IDs are not yet prevented. CSS classes are emitted but there is no custom CSS rule editor yet. Images use externally hosted URLs, not managed binary uploads, CDN optimization, or storage quotas. Assets APIs are unauthenticated; do not deploy publicly until authentication/authorization is added. Build/browser testing pending.

## Next architectural priorities

1. Authentication and per-site authorization before any public deployment.
2. Signed uploads to R2/S3, image optimization, MIME checks and storage quotas.
3. Reusable class/style manager, variables and responsive breakpoints.
4. Accessible semantic elements, interactions, forms, link routing and SEO.
5. Versioned publish snapshots, custom domains, redirects, caching and rollback.

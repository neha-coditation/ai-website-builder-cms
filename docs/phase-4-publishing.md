# Phase 4 — Publishing foundation

## Implemented in this branch

Two read-only content delivery endpoints:

- `GET /api/public/sites/:siteSlug/collections/:collectionSlug?page=1&limit=20`
- `GET /api/public/sites/:siteSlug/collections/:collectionSlug/:entrySlug`

Both only return entries with `status: published`. Draft entries return 404 for the single-entry endpoint. The collection endpoint paginates (maximum 100 entries per request) and does not expose CMS field definitions.

## Manual smoke test

1. Apply Prisma migrations and start the local development server.
2. In `/cms`, create a site and a collection with a test entry.
3. Keep the entry as a draft: verify the public list excludes it and its detail URL returns 404.
4. Publish the entry in the CMS: verify the list and detail endpoints now return it.
5. Return it to draft: verify both public endpoints hide it again.
6. Test invalid pagination parameters; expect 400.

## Remaining Phase 4 work

- Page editor, page metadata and SEO schema.
- Draft preview secured by authenticated, expiring tokens.
- Publishing approval workflow and version history.
- Per-site domain mapping and dynamic page rendering.
- Authentication and authorization for all admin endpoints.

**Security:** Existing /api/sites, /api/pages, /api/collections, /api/entries, and /cms admin routes are not authenticated. Do not deploy them publicly until authorization is implemented. These public endpoints are intended only for content explicitly marked published. Avoid storing secrets in published entry data.

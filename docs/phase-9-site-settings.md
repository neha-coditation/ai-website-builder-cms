# Phase 9 — Site-level settings and navigation

Dashboard project cards now have a Settings action. The site settings page provides website name, description, default SEO title, and favicon URL, persisted via scoped GET/PATCH /api/sites/:siteId. The CMS header links back to the same project's designer, and the designer rail links to website settings.

Database: apply the new Prisma migration before running the updated application. If your local migrations history is incomplete, review it before using Prisma Migrate. Run `npx prisma migrate dev` then `npx prisma generate` once migration history is healthy.

Manual QA: open Dashboard → project Settings, edit and save fields; refresh and confirm values. Open CMS from that project and click Back to Designer; confirm the siteId is unchanged. Return to Settings from the designer rail.

Limitations: settings do not yet render into published HTML, and the administration APIs are unauthenticated. Not yet build/browser-tested.

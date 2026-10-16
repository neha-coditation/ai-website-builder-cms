# Phase 7 — SEO metadata and navigation (initial)

The visual designer now shows real project page names in its header instead of hardcoded Home/About/Contact labels. Selecting a page in design mode switches the current editor page.

The right inspector includes a page SEO tab: title (70 chars), description (320 chars), social image URL, and noindex flag. The values are saved inside the page content JSON, without a Prisma schema migration. The scoped page update API validates this optional SEO object.

**Limitations:** This is metadata editing only. No public HTML metadata rendering, sitemap, reusable components, or real published navigation yet. The navigation in preview is deliberately non-interactive. Existing admin endpoints remain unauthenticated. The branch has not been build-tested or browser-tested.

Local smoke test: create a second page, open its SEO tab, enter metadata, Save, refresh, and confirm values persist. Switch pages and verify their metadata is independent.

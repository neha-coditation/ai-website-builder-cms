# Phase 6 — Multi-page website editing (initial implementation)

The designer now has a Pages panel for listing and switching between pages, creating pages, and deleting non-home pages. Each page stores its own blocks and styles in the existing Prisma Page table.

API:
- GET /api/projects/:siteId/pages — list pages for a project
- POST /api/projects/:siteId/pages — create page with unique slug
- PUT /api/projects/:siteId/pages/:pageId — save selected page
- DELETE /api/projects/:siteId/pages/:pageId — delete non-home page

Test locally: create a project, open Designer, add an About page, add a heading, save, refresh, switch between pages, and verify independent content. The Home page remains available through the Phase 5 endpoint.

Known limitations: No page SEO metadata editor, reusable components, site navigation bindings, unsaved-changes warning, page templates, authentication or publishing in this iteration. The editor is not yet build- or browser-verified. Do not deploy unauthenticated administration APIs publicly.

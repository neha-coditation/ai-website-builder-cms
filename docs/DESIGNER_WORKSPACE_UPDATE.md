# Designer workspace update — 2026-10-21

The Designer now has a compact toolbar, vertical tool rail, neutral panels, canvas controls, and a selected-element breadcrumb trail. Controls connect to the existing element, page, asset, CMS, and settings workflows.

- Desktop, 768px tablet, and 390px mobile viewport previews
- Canvas zoom from 25% to 150%, with one-click reset to 100%
- Breadcrumb selection for nested elements
- Page title and URL editing in Page settings; homepage URL remains fixed
- Page duplication after flushing pending edits, including blocks, tab content, and SEO
- Duplicate URL conflicts return 409; invalid URLs and cross-site page access are rejected

Validation: eight route regression tests, TypeScript checks, and OpenNext Cloudflare build pass. Browser checks cover desktop layout, tablet width, zoom, and page settings controls. Parallel read checks for pages, classes, components, assets, and collections return 200. Live page rename/duplicate mutations were tested with database doubles rather than changing existing user pages.

Viewport previews do not yet implement breakpoint-specific style overrides. Atomic publishing, domains, revisions, and collaboration remain future work.

# Migration Studio — dedicated product scope

This branch is for the **website migration** product, not database migrations. It was forked from the CMS prototype to preserve reusable infrastructure; existing builder/CMS files have not yet been removed or refactored.

## Product experience
A guided migration wizard requiring no prompt writing:
1. **Connect** — choose source (public URL, Webflow, Framer, WordPress, GitHub repository) and destination (Webflow, Framer, Astro/static, Cloudflare Pages, AWS S3/CloudFront). Display actual connector permissions and supported capabilities.
2. **Discover** — crawl sitemap and internal links; enumerate pages, assets, templates, forms, CMS entities, scripts, integrations, SEO, responsive behavior and redirects. Provide a coverage report with unknowns and inaccessible content.
3. **Map** — preview source-to-destination routes, content types, field relationships, global components, design tokens and asset references; flag unsupported functionality and conflicts.
4. **Build** — generate target files/configuration in a versioned workspace; never overwrite a live destination.
5. **Compare** — side-by-side source/target screenshots at mobile, tablet and desktop widths; DOM/links/SEO checks, broken asset detection, CMS data counts and interaction smoke tests.
6. **Approve** — show a migration readiness scorecard, manual review queue, differences and risk warnings; require explicit human approval.
7. **Deploy** — staging first, then production with backups, redirect manifest, audit log, rollback plan and post-publish verification.

## Main application screens
- Migration dashboard: migrations, source/target, stage, blockers, last check, actions.
- New migration wizard: source, destination, authentication and permissions.
- Site analysis: sitemap tree, page inventory, templates, CMS, design system, scripts, integrations, SEO, accessibility.
- Mapping studio: route map, CMS field mapper, component mapper, assets and forms.
- Visual QA: paired screenshots, responsive breakpoints, diff severity, issue assignment.
- Publish center: staging URL, readiness checklist, approvals, deployment and rollback history.

## Security and accuracy
- Source credentials encrypted and scoped; no secrets in client bundles or logs.
- Treat imported HTML, scripts and data as untrusted. Do not execute imported custom code in the CMS admin interface.
- Sandboxed previews with strict isolation/CSP, explicit approvals and controlled deployment.
- Respect site ownership, permissions, robots policies and API limits.
- Never claim pixel-perfect equivalence without viewport-based visual regression evidence.
- Do not publish or alter source sites without user approval.

## Implementation sequence and acceptance gates
### M0 — Extract migration app
- Move shared UI/API/DB into reusable packages or isolate migration routes.
- Remove unrelated builder screens from migration navigation without deleting shared dependencies prematurely.
- Add migration entities: job, source, destination, crawl snapshot, page, asset, CMS mapping, issue, QA run, deployment.
- Gate: migrations app builds, authenticates, persists a job and lists jobs.

### M1 — URL-to-inventory
- Crawl a user-authorized public site; normalize canonical URLs and discover sitemaps/internal links.
- Extract metadata, headers, structured data, assets, scripts and link graph; save reproducible crawl snapshot.
- Gate: inventory export and coverage report agree with a fixture website.

### M2 — Import and mapping
- Start with static/HTML -> Astro/Cloudflare Pages; then GitHub -> static hosting.
- Add authenticated Webflow, Framer and WordPress adapters only where API/export capabilities permit.
- Gate: migrated pages render, asset URLs resolve, SEO/redirect manifests validated.

### M3 — Visual and functional QA
- Automated screenshots at three widths, route/asset/link/form checks, actionable diffs.
- Gate: CI fails on critical regressions; reviewer can approve or reject.

### M4 — Safe publishing
- Deploy staging, require approval for production, store release manifest and support rollback.
- Gate: repeatable staging deployment and verified rollback.

### M5 — AI assistance
- AI suggests component/CMS mappings and code changes with confidence and evidence; user reviews all destructive actions.
- Gate: reproducible tests and no silent loss of content or SEO.

## Current status
This document is a target architecture and implementation backlog. Creating the branch does **not** mean the migration wizard, adapters, visual QA or deployment pipeline are implemented. The original CMS code remains as the starting point until migration-only extraction is completed.

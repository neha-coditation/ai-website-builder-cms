# Studio CMS — Webflow/Framer parity delivery plan

Updated 2026-10-16. Target: a reliable production-grade visual website platform, not a superficial copy of another product. Current feature claims are provisional until automated builds and browser QA pass.

## Non-negotiable quality gates (every phase)
- `npm ci && npx prisma generate && npm run build` passes.
- Test create/edit/save/reload/publish and mobile/desktop views; no silent data loss.
- Each feature has functional APIs, error/empty/loading states, keyboard accessibility and responsive UI.
- Authentication, authorization, validation, rate limits and audit logging before any public deployment.
- Migrations are forward-only; never reset existing user databases to make tests pass.
- A phase is **implemented** only after test evidence; otherwise label **code committed / QA pending**.

## Execution sequence

| Phase | Priority | Deliverable | Exit criteria |
|---|---|---|---|
| 38 | P0 | Site workspace UI foundation + roadmap | Unified navigation for Overview, Designer, CMS, Forms, SEO, Assets, Settings, Publishing; honest feature states |
| 39 | P0 | Authentication & tenant/site permissions | Owner/editor/viewer roles; all sensitive project APIs guarded; CSRF/origin protection; regression tests |
| 40 | P0 | Build stabilization & autosave | Typecheck/CI, no editor 500s, save queue flush on navigation, draft recovery |
| 41 | P0 | Forms Manager v2 | Configurable form fields, inbox filters/status/delete, notification delivery, server-side rate limiting, retention, CSV |
| 42 | P1 | SEO Manager | Page and site SEO, redirects, canonical, sitemap, robots, schema, audit diagnostics |
| 43 | P1 | Publishing foundation | Staging, domain verification, deployment history, atomic publish, rollback |
| 44 | P1 | Designer interaction polish | Reliable layer drag/drop, nesting, selection, zoom, keyboard shortcuts, canvas scrolling |
| 45 | P1 | Responsive design engine | Custom breakpoints, cascading styles, flex/grid controls, previews |
| 46 | P1 | Component system | Master editor, linked instances, variants, properties, overrides |
| 47 | P2 | Assets & media | Uploads, transforms, alt metadata, video, reuse, quotas |
| 48 | P2 | Interactions & animation | Triggers, timelines, transitions, reduced motion |
| 49 | P2 | CMS & content workflows | Dynamic templates, references, validation, draft/publish, bulk import |
| 50 | P2 | Collaboration | Comments, approvals, roles, activity, version history |
| 51 | P2 | AI build & migration | Structured input, design import, platform adapters, validation and approval gates |
| 52 | P0 for launch | Security, accessibility & performance hardening | Pen test, load test, WCAG audit, recovery drills, launch checklist |

## UI information architecture
- **Workspace**: all websites, templates, teams, billing (future).
- **Site overview**: project status and links to functional modules.
- **Designer**: canvas, Elements / Sections / Components / Assets / Layers, right inspector, responsive toolbar.
- **CMS**: collections, entries, drafts.
- **Forms**: inbox, field definitions, notifications, spam controls.
- **SEO**: page metadata, redirects, indexing, sitemap, structured data.
- **Publishing**: preview, staging, domains, deployment history.
- **Settings**: general, design system, SEO defaults, forms defaults, integrations, access.

## Known current blockers
1. Sensitive project endpoints and form inbox lack authentication and site authorization.
2. No demonstrated end-to-end build/browser QA for recent phases.
3. Forms notifications, robust spam protection, retention and custom field definitions incomplete.
4. Sitewide SEO settings are partly drafts, not all connected to publishing.
5. Components sync can overwrite instance-specific edits.
6. Site publishing and custom domains are incomplete.
7. UI interactions need systematic testing against real Webflow/Framer workflows.

## Implementation rule
Ship a vertical slice at a time: schema/API -> UI -> tests -> docs. Do not claim full Webflow parity until each workflow passes its exit criteria.

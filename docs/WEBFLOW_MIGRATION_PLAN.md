# Webflow migration: implementation gates

## Safety contract
- Source Webflow site stays unchanged throughout migration.
- Import into a new isolated site, never overwrite an existing site.
- Never run fetched HTML, scripts, or embedded code in the admin origin.
- Never fetch arbitrary user-supplied URLs server-side without SSRF protections.
- Preserve original assets and CMS entries; require explicit approval before publish.
- Never claim pixel-perfect fidelity without screenshot and interaction QA.

## Phase 43A — Intake and inventory (in progress)
- [x] Accept user-supplied HTML for read-only page inventory via POST /api/migration/inspect.
- [ ] Add authenticated upload UI and per-site migration job records.
- [ ] Parse HTML robustly (use a vetted parser), normalize URL references and handle malformed markup.
- [ ] Add size/rate limits, content sanitization, audit logging, and permission checks.
- [ ] Add unit tests and GitHub CI validation.

## Phase 43B — Webflow extraction
- [ ] Webflow OAuth/token connection with scoped permissions and secure secrets.
- [ ] Export or obtain pages, CSS, JS, images, fonts, redirects and SEO.
- [ ] Import CMS collection definitions and entries using supported Webflow APIs.
- [ ] Track unsupported or unavailable content with explicit migration warnings.

## Phase 43C — Editable reconstruction
- [ ] Map DOM elements and CSS into Designer's native block model.
- [ ] Extract reusable components and design tokens.
- [ ] Handle desktop/tablet/mobile breakpoints and navigation.
- [ ] Provide safe isolated preview for unconverted custom scripts and interactions.

## Phase 43D — QA and launch
- [ ] Screenshot comparisons at 3+ breakpoints and human-reviewed diffs.
- [ ] Validate navigation, forms, CMS, accessibility, SEO, and redirects.
- [ ] Deploy to preview environment with publish approval, version history, and rollback.
- [ ] Test against a nonproduction Webflow site before attempting any live transfer.

## Explicit non-goals for 43A
No automatic Webflow URL scraping, remote code execution, database writes, asset downloads, or publishing.

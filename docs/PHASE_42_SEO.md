# Phase 42 — SEO Manager foundation

Implemented:
- Site SEO settings: redirect rule editor, persisted in `siteConfig.seo.redirects`, validated for internal paths only.
- Page metadata: existing title/description/OG image, now with HTTPS canonical URL when configured.
- Preview-only redirect handling for missing site pages, confined to `/sites/:siteSlug`.
- Preview-only `/sites/:siteSlug/sitemap.xml` and `/sites/:siteSlug/robots.txt`. The preview robots endpoint disallows indexing regardless of stored robots draft.
- Existing per-page metadata remains editable in Designer.

Not yet production-ready:
- No custom-domain publishing or production sitemap/robots integration; do not submit preview sitemap to Google.
- No visual redirect loop detection beyond direct self-redirect validation.
- No schema.org JSON-LD editor or structured-data output yet.
- No SEO diagnostic crawler or bulk redirect import.
- No verified end-to-end browser/build test for this branch.

Local verification:
```sh
git fetch origin
git switch phase-42-seo-manager-foundation
npx prisma generate
npm run typecheck
npm run build
npm run dev
```
Then test Settings > SEO & indexing: add `/old-test` → `/home` (use an existing non-home slug as destination if needed), save, reload, and inspect preview URL; check preview sitemap and robots endpoints. Preview pages are intentionally noindex.

# Phase 16 — Site rendering preview

New read-only routes: `/sites/[siteSlug]` (home) and `/sites/[siteSlug]/[pageSlug]` for existing project pages. They render saved page content, global design settings, header/footer and navigation with Next.js server rendering.

**Security:** These URLs are explicitly preview-only and must not be treated as public publishing. All routes return `noindex,nofollow`. They do not expose CMS entries, because the existing CMS and admin APIs have no authentication. No publishing switch or custom domain setup is included.

**Supported blocks:** headings, paragraphs, images with HTTPS URLs, buttons displayed as non-interactive labels, and nested containers (up to four levels). CMS lists are not rendered yet. The implementation deliberately does not generate actionable links from unvalidated text.

**QA:** Check existing site and page slugs; inspect HTML metadata; verify navigation; test nested layout and mobile behavior; verify unknown slugs return 404. Build and browser testing remain pending.

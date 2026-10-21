# Migration Import Studio

Standalone website migration application based on the test branch's product direction, with its own isolated application tree.

## Run
npm install
npm run typecheck
npm run dev

Visit http://localhost:3000/import to analyze a public website URL.

## Working scope
- Migration dashboard and project planning (browser-local storage)
- Read-only source HTML analysis API: POST /api/import/analyze with JSON {"url":"https://example.com"}
- URL, DNS and redirect validation; HTML size/time limits; title, description, canonical, headings, links and image inventory
- Responsive source-import UI

## Not yet supported
- Full-site crawler and sitemap enumeration
- Webflow, Framer and WordPress authenticated API connections
- CMS mapping, asset downloading, AI conversion, visual regression or publishing
- Database-backed jobs and multiuser authorization

## Security note
The analysis endpoint fetches third-party public URLs. Its DNS precheck is a basic guard, not sufficient protection against DNS rebinding in production. Before deploying publicly, add network-level egress restrictions, authentication, quotas and rate limiting. Never expose this endpoint as an unrestricted public fetch proxy.

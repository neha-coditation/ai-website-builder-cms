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

### Unified source export (`migration-import-test`)

On `/import`, enter a public URL and optionally both a Webflow site ID and a
read-only token, then select **Download combined ZIP**. Analyze previews the
entry page only; it is not required for export. Existing CSS classes are retained.
The ZIP contains `index.html`, `pages/`, `assets/`, optional `webflow/data.json`,
and `manifest.json` with omissions, limits and partial API failures.

Crawl bounds: 20 same-origin pages, depth 3, 80 asset attempts, 1.5 MB per HTML,
2 MB per asset, 30 MB downloaded resources and a 120-second scheduling budget
(an in-flight request may take up to 12 seconds longer). Discovered candidate
queues are capped. API bounds: 60 requests, 200 pages, 20 collections, 500 items
per collection, 4 MB per response, 10 MB total API responses, within the shared
time budget. Webflow uses sites:read, pages:read and cms:read as authorized.
Invalid site access fails the export; unavailable page/CMS scopes produce manifest
notes and partial data. Tokens are held in component memory until export, cleared
after every attempt, sent only in the export POST, and forwarded only in headers
to the fixed Webflow API origin. They are not logged, stored, or added to the ZIP.

HTML, CSS dependencies, linked scripts, images, fonts and supported media are
best-effort resources. JavaScript is not executed. Query-string page variants,
unlinked pages, runtime requests, backend behavior and native Designer structures
are not recreated. CMS/API SEO data and published HTML metadata retain their
source structure; this does not perform CMS field mapping. Serve the extracted
folder over HTTP and review `manifest.json` before using it.

Verification: `node --test tests/import-export.cjs`, `npm run typecheck`, `npm run build`.

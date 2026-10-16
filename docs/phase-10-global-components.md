# Phase 10 — Shared header and footer

Each website has a globalDesign JSON field on Site. The site settings screen edits header brand text, header background/text colors, footer text, and footer background/text colors. The designer loads globalDesign from the project pages API and applies it across pages. These values are shared across the website, not copied into individual pages.

Apply migration: `npx prisma migrate dev` then `npx prisma generate` before starting the app. Do not reset the database if migration history is inconsistent.

Manual QA: open Dashboard > Website Settings; change header/footer settings and Save. Open Designer and switch between Home and another page; confirm the shared design stays consistent. Refresh to confirm persistence.

Limitations: shared text/colors only; no reusable component library, header/footer layout editor, global style tokens, or public publishing yet. The branch is not build/browser-tested. Admin APIs are unauthenticated and must not be deployed publicly.

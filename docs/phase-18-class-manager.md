# Phase 18 — Reusable class manager

Adds site-scoped class rules persisted under `Site.globalDesign.classes`, with a dedicated GET/PUT API at `/api/projects/[siteId]/classes`. The Designer inspector supports creating named classes, applying/removing them on selected elements, and editing text color, background, font size, padding and border radius. Saved class rules are also applied in read-only site previews. Existing site settings updates preserve the class map.

No database migration. Local: `git switch phase-18-class-manager && npm run dev`.

**Important limitations:** This is a first-pass class manager, not a full CSS engine. No selector hierarchy, pseudo-states, breakpoint-specific overrides, class deletion/renaming, CSS custom properties, atomic design tokens or bulk editing yet. The current implementation saves class edits immediately, which may issue many requests during rapid changes. Per-element inline styles take precedence over class styles. The API is not authenticated. Build and browser QA pending.

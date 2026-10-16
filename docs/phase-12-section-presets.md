# Phase 12 — Section presets

The Designer Elements sidebar now includes four ready-made page sections: Hero, Features, Call to action, and Editorial. Selecting a preset inserts a group of existing supported elements, selects the first new element, and opens Layers for editing. Presets use the same block model and existing save endpoint, so no schema migration is needed. Existing pages and CMS collections are unchanged.

**Manual smoke test:** open a project Designer, select Elements, insert each preset, edit individual blocks, save, refresh, and verify persistence. Check desktop and mobile layouts.

**Limitations:** These are multi-block presets, not nested containers or reusable synchronized components. No independent section-level drag/reorder, responsive grids, publishing, or template marketplace. This branch has not been built or browser-tested; admin endpoints are not authenticated.

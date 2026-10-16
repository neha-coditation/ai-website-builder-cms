# Phase 14 — Nested layout containers (initial)

Adds a Container element to the Designer palette. Drag a new element or existing top-level element onto a container to assign its `parentId`. Select a container in the canvas or Layers, open Style, and choose Column, Row, or Grid, plus gap and grid column count. Container children render within the selected layout. Mobile preview stacks children vertically. Container membership and settings persist through the existing page APIs; no database migration required.

Manual QA: create container; drag heading and image into it; change layout; save; refresh; check mobile view. Test deletion of a container: its children return to top level.

Limitations: one level of nesting is supported in the canvas; no recursive nested containers, tree-based layer controls, cross-container drag-out, undo/redo, or breakpoint-specific persisted values. Changes not build/browser-tested. Admin APIs remain unauthenticated.

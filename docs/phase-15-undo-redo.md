# Phase 15 — Undo and Redo

Designer now has Undo and Redo buttons and keyboard shortcuts: Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z (outside editable form controls). History records page-content state changes and keeps up to 50 previous states in memory. Switching pages starts a separate history session; undo does not cross page boundaries. Undo/redo changes remain unsaved until Save is clicked. No database migration required.

Manual QA: add/edit/delete blocks, undo/redo; switch pages and verify history does not affect another page; save and reload. Test shortcuts on Mac and Windows, and confirm text-field native undo still works.

Limitations: in-memory history resets on refresh, edits are recorded per state update (typing may create many history entries), no cross-session version history or collaborative conflict handling. Not build/browser-tested; admin APIs remain unauthenticated.

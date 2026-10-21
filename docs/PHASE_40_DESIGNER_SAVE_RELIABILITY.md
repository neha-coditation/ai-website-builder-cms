# Designer save reliability

Implemented 2026-10-21; browser interaction QA pending.

- Manual save and debounced autosave share one ordered request queue.
- Switching or creating pages flushes edits before navigating; a failed save keeps the current page open.
- Successful autosaves update the page list's content so reopening a page uses the saved document.
- Designer navigation links flush pending edits. Closing or reloading with unsaved edits invokes the browser's unsaved changes warning.
- Page deletion waits for queued writes before deleting, preventing a late save from writing after deletion.
- Both homepage and page save APIs preserve tab panel content and SEO metadata.
- Local mode autosaves to browser storage and reports storage failures.

Validation: `npm run test:designer` covers page/homepage field preservation, tab content size validation, and refusing a page outside the requested site. Typecheck and production build pass.

Manual QA: edit a heading and immediately switch pages; reopen the original page and reload. Repeat with tabs and SEO. Simulate an offline save, verify navigation remains on the current page, then reconnect and retry Save. Verify manual Save during autosave preserves the newest edit. Test desktop/mobile preview and closing a tab while edits are pending.

This change does not add draft recovery, multi-user conflict resolution, or production publishing.

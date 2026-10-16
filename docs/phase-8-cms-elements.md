# Phase 8 — CMS Elements

The Elements palette now contains a draggable **CMS List** block, similar in workflow to a Framer collection list. Drop it into a page, select it, and choose a collection and card heading field from the right Content inspector. The canvas shows up to 12 published entries as cards. Drafts are excluded. The block stores collectionId and displayField with the page's other blocks in PostgreSQL.

Test locally: create a CMS collection with a text field and at least one published entry; open a project in Designer; drag CMS List onto the canvas; select the collection and heading field; save and refresh. The cards should remain bound to the chosen collection.

**Limitations:** The canvas uses existing admin APIs for entries; this is an editor-only rendering, not public publishing. No pagination, collection detail page templates, dynamic routes, or rich visual card template customization yet. Admin endpoints remain unauthenticated and must not be publicly deployed. This branch has not been built or browser-tested.

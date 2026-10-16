# Phase 5: database-backed project designer

This branch connects the existing drag-and-drop home-page designer to PostgreSQL.

## What changed
- `GET /api/projects/:siteId/home` returns the project and saved home page, if one exists.
- `PUT /api/projects/:siteId/home` validates and upserts the project's `home` page using the existing Prisma `Page` model.
- The designer now loads saved blocks from the database and saves changes to PostgreSQL when **Save** is clicked.
- If the database has no saved home page, the designer uses the per-project browser draft or starter template.
- Browser localStorage is kept as a convenience cache, not the source of truth after a database page exists.

## Local verification
1. Confirm PostgreSQL is running and `DATABASE_URL` points to the correct database.
2. Run `npx prisma migrate dev` and `npx prisma generate`.
3. Run `npm run dev`; open the dashboard and create a website.
4. Open Designer for that project; edit a heading and drag a block.
5. Click Save. Confirm the request to `/api/projects/<siteId>/home` succeeds.
6. Refresh the page. Verify the saved content and block order are restored.
7. Open another project and verify its content is independent.

## Limitations / security
- The page editor currently edits only the `home` page.
- There is no multi-user editing, autosave, version history, or conflict resolution.
- Existing admin APIs and these new endpoints are unauthenticated. **Do not deploy this app publicly** until authorization is added.
- This branch was committed remotely but has not been locally built or browser-tested.

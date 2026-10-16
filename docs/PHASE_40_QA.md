# Phase 40 — Build stability and Designer QA

## Local verification

Run from the repository root:

```bash
npm install
npx prisma generate
npm run typecheck
npm run build
```

`npm run check` runs both typecheck and build.

## Manual Designer acceptance checklist

- [ ] Login and navigate to Designer without a redirect loop.
- [ ] Load a site, switch pages, and reload without losing blocks.
- [ ] Add, select, edit, reorder, and delete blocks.
- [ ] Test nested containers and responsive widths.
- [ ] Test tabs and forms in preview.
- [ ] Save a change, reload, and verify persistence.
- [ ] Open CMS, Assets, Settings and Forms without HTTP errors.
- [ ] Verify published site routes remain public.
- [ ] Check browser console for hydration and runtime errors.

## Security and deployment

CI uses dummy values for database and admin secrets; no live credentials should be committed.
Production deployment requires secure secret storage, authenticated admin access, and additional hardening.
A green build does not replace browser interaction testing.

## Local troubleshooting

If Next.js reports multiple lockfiles, inspect the parent-level lockfile before deleting anything.
Avoid committing local `.env` files or exposing passwords.

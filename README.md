# Migration Studio

Dedicated **website migration** workspace. This branch intentionally excludes the CMS designer, forms, SEO manager, and unrelated application routes.

## Run locally

```bash
npm install
npm run typecheck
npm run dev
```

Open http://localhost:3000.

## Currently working
- Premium responsive migration dashboard
- New migration wizard with source URL validation and destination selection
- Migration project list and six-stage progress overview
- Local browser persistence for planning records

## Not implemented yet
Real crawling, connector authentication, page/CMS mapping, website generation, visual comparison, production database persistence, and publishing. These require secure backend services and testing. The UI intentionally marks them as unavailable.

## Planned workflow
Connect → Analyze → Map → Build → Compare → Publish.

## Safety
Do not paste private credentials into the migration URL field. The app does not modify source or destination sites.

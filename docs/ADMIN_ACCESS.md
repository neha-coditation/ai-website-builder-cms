# Phase 39: private admin access gate

This phase introduces a **single-admin development gate**, not a complete multi-user authentication system.

## Configure
Set these in your local `.env` (do not commit them):
```
STUDIO_ADMIN_PASSWORD=choose-a-long-unique-password
STUDIO_SESSION_SECRET=replace-with-at-least-32-random-characters
```
Generate a strong session secret with `openssl rand -hex 32`.

Restart `npm run dev`. Visit `/login`, sign in, then access the dashboard. Admin sessions expire after 8 hours and use HttpOnly SameSite=Lax cookies.

## Protected
- Dashboard, Designer, CMS, Forms inbox, project overview, settings
- `/api/*` except public form submission and login
- State-changing project APIs check same-origin when Origin header is present

## Deliberately public
- `/sites/*` preview pages
- `/api/form-submit` visitor submission endpoint

## Limitations / blockers
- One shared admin password; no users, site memberships, invitations, RBAC, SSO, or audit log.
- Login has **no server-side rate limiting** or lockout. Use only in local/private staging environments.
- Public form endpoint needs rate limiting and additional anti-spam protections.
- Existing preview pages may contain content that should not be public; access-control design required.
- This is not ready for public multi-tenant deployment. Production requires a mature identity provider, per-site permissions, password reset, session revocation, MFA and security testing.
- Browser/build QA not yet performed.

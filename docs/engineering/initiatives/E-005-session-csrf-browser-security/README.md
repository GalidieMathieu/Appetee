# E-005 — Session, CSRF, and Browser Security

## Initiative Information

- **Status:** In progress — backend/frontend CSRF slices implemented locally; browser/deployment and remaining initiative work pending
- **Type:** Engineering initiative
- **Priority:** High
- **Implementation order:** 5
- **Last updated:** 2026-10-06

## Goal

Make cookie authentication revocable and protect every state-changing request and browser response against ambient-cookie and browser-policy risks.

## Problem

The cross-origin authentication cookie uses `SameSite=None`, while state-changing operations do not require an antiforgery token or equivalent request-intent proof. Authentication tickets can remain valid after account or permission changes because there is no server-side session version or revalidation. Frontend hosting and sensitive API responses also lack a complete application-owned browser-header and cache policy.

## Why This Matters

Catalogue corruption or forced logout under a victim's authority; impact becomes especially serious once real admin roles are introduced. Ambient credential replay from an untrusted origin.

Prolonged unauthorized access after account or privilege changes and weak incident containment. Authentication tickets become the sole long-lived source of truth.

Increased browser attack impact and possible sensitive-response retention on shared/intermediary caches. Browser policy depends on unverified App Service/edge defaults rather than application-owned configuration.

## Current Behavior

- The cookie is Secure, HttpOnly, and SameSite=None; production CORS allows credentials from configured origins; the Angular interceptor always includes credentials for the API prefix. No antiforgery token/header, Origin/Referer validation, or Fetch Metadata policy was found.
- Sign-in creates a persistent ticket with a hard-coded ExpiresUtc of 14 days while Program separately reads configurable expiry and enables sliding expiration. Claims contain no security stamp/version. No server session store, OnValidatePrincipal, disabled-user check, password-change invalidation, absolute maximum, or sensitive-action reauthentication exists.
- The API adds nosniff, X-Frame-Options DENY, Referrer-Policy no-referrer, and production HSTS. Express only serves static/fallback content and sets no explicit CSP/Trusted Types, frame-ancestors/XFO, nosniff, Referrer-Policy, Permissions-Policy, or cache policy. Auth/session/user responses do not explicitly use Cache-Control: no-store.

## Target Behavior

Cookie topology is explicitly chosen. Every mutation proves request intent, session tickets have idle and absolute limits, security state is periodically revalidated, and sensitive browser responses use restrictive cache and security policies on both frontend and API origins.

## Scope

### Included

- Final frontend/API origin topology
- Antiforgery token/header flow
- Origin and Fetch Metadata checks
- Cookie SameSite/domain/path settings
- Idle and absolute session limits
- Security version and revocation
- Sensitive-action reauthentication
- Data Protection key persistence
- CSP and browser headers
- Sensitive response no-store policy
- Hostile-origin and stale-cookie tests

### Excluded

- Admin permission definitions, E-002
- General login throttling, E-004
- Full telemetry platform, E-012

## Systems Affected

- Cookie authentication and principal validation
- CORS and middleware
- Angular HTTP interceptor and bootstrap
- Logout and all mutation endpoints
- Express frontend host
- Data Protection storage
- Custom domains and App Service settings

## Required Change Summary

### Backend

- Choose same-origin reverse proxy/BFF or keep cross-origin with a documented threat model.
- Issue a bound antiforgery token and require a custom header for every `POST`, `PUT`, `PATCH`, and `DELETE`.

Remaining backend implementation details are maintained in [`backend.md`](./backend.md).

### Frontend

- Retrieve and send the antiforgery token through the API interceptor.
- Handle expired/revoked sessions by clearing all user-scoped state and returning to a safe route.

Remaining frontend implementation details are maintained in [`frontend.md`](./frontend.md).

### Infrastructure

- Persist and protect Data Protection keys across restarts, instances, and slot swaps.
- Verify real custom-domain cookie, CORS, preflight, and header behavior at the public edge.

### Tests

- Use a real hostile-origin browser page for form, multipart, JSON/preflight, logout, upload, and destructive requests.
- Test idle/absolute expiry, password/role change, disabled user, copied cookie, restart, multi-instance, and slot swap.

Remaining tests implementation details are maintained in [`backend.md`](./backend.md).

### Documentation

- Record the domain topology, cookie contract, reauthentication rules, and key-persistence design.

## Implementation Phases

Phases are completed in order unless a documented dependency requires otherwise. A phase that changes code is not complete until its listed tests pass. A phase containing only configuration, documentation, or operational work must attach equivalent validation evidence.

### Phase 1 — Define request-intent and session invariants

**Status:** In progress — CSRF flow/origin invariants selected; broader session work remains.

#### Changes

- Choose the antiforgery token flow and trusted-origin policy.
- Define idle lifetime, absolute lifetime, security/session version, and invalidation events.
- Add failing hostile-origin and stale-session tests first.

#### Tests and validation

- [ ] Real-browser hostile-origin matrix for form, FormData, JSON, logout, upload, PUT, PATCH, and DELETE.
- [ ] Session tests for expiry, disabled/deleted user, role/password changes, restart, and copied cookie.

#### Phase completion rule

- [ ] All scoped changes are implemented or explicitly documented as not applicable.
- [ ] Every required automated test passes.
- [ ] Required manual, staging, migration, or operational evidence is attached.
- [ ] The initiative `Work Status` section is updated with verified evidence.

### Phase 2 — Implement backend CSRF and session validation

**Status:** In progress — backend CSRF verified; remaining session/key-persistence work pending.

#### Changes

- Require antiforgery plus Origin/Fetch Metadata checks for state changes.
- Add server-side active-account/session-version validation.
- Persist data-protection keys safely for multi-instance deployment.

#### Tests and validation

- [ ] Backend integration tests for valid/missing/invalid tokens and origins.
- [ ] Cookie lifecycle and revocation tests across application restart.

#### Phase completion rule

- [ ] All scoped changes are implemented or explicitly documented as not applicable.
- [ ] Every required automated test passes.
- [ ] Required manual, staging, migration, or operational evidence is attached.
- [ ] The initiative `Work Status` section is updated with verified evidence.

### Phase 3 — Implement frontend token lifecycle

**Status:** In progress — frontend integration and automated verification complete; browser E2E pending.

#### Changes

- Acquire, attach, refresh, and clear antiforgery state.
- Handle expired/rejected sessions and identity changes safely.

#### Tests and validation

- [x] Interceptor/unit tests.
- [ ] Browser E2E from the allowed frontend origin and hostile origins.

#### Phase completion rule

- [x] All scoped frontend CSRF code changes are implemented.
- [x] Required interceptor/unit and frontend regression tests pass.
- [ ] Required browser/staging evidence is attached.
- [x] The initiative `Work Status` section is updated with verified evidence.

### Phase 4 — Validate production browser topology

**Status:** Not started

#### Changes

- Verify SameSite, domain, CORS, cache, and security-header settings in staging.
- Document any same-origin/reverse-proxy migration.

#### Tests and validation

- [ ] Staging smoke matrix for cookie creation, expiry, logout, CSRF, CORS, and deep links.
- [ ] Manual evidence for live domain/cookie configuration.

#### Phase completion rule

- [ ] All scoped changes are implemented or explicitly documented as not applicable.
- [ ] Every required automated test passes.
- [ ] Required manual, staging, migration, or operational evidence is attached.
- [ ] The initiative `Work Status` section is updated with verified evidence.

## Work Status

### Completed

- Backend CSRF slice: anonymous/current-identity `GET /api/auth/csrf` bootstrap,
  ASP.NET Core antiforgery cookie/header validation on unsafe `/api` methods,
  explicit trusted Origin/Fetch Metadata checks, OpenAPI headers, and no-store
  auth/profile responses. Existing backend mutations now require the protocol.
- CSRF/auth/profile focused integration run passed 69/69. Dedicated CSRF run
  passed 34/34 before the final unauthorized-response cache test was added.
  Build passed with zero errors and six NU1900 warnings (NuGet vulnerability
  feed unreachable). Final full backend suite passed 417/417 with zero skipped
  or failed tests, duration 10m43s. Final dedicated CSRF filter passed 35/35,
  zero failed/skipped, duration 1m27s; final build again passed with zero errors.
- The backend evidence above does not claim frontend or deployment verification.
  No production database action, schema/migration, session-version, Data Protection
  persistence, or broad CSP implementation is claimed by either CSRF slice.
- Frontend CSRF slice (2026-10-06): existing Core `authInterceptor` now uses
  parsed exact-origin and `/api`-segment matching for credentials/token transport.
  One root in-memory `CsrfTokenService` uses the existing HttpClient and coalesces
  credentialed anonymous/authenticated bootstrap, with the existing ten-second
  Core read timeout. Safe requests never acquire/attach a token, so bootstrap
  cannot recursively bootstrap itself. Multipart bodies/content boundaries remain
  browser-owned; no Origin header is manufactured.
- The token service joins existing-instance `SESSION_RESETTERS`. Successful
  login/signup/logout/restoration, account profile update/deletion and password
  confirmation invalidate/refetch tokens. Reset cancels older bootstrap waiters;
  generation checks prevent stale tokens or old-identity CSRF failures from
  replacing/invalidating new token state. A failed background handshake leaves
  state empty; a later explicit intent can bootstrap again.
- Confirmed 400 `csrf_invalid` refreshes only the safe handshake and returns the
  original failure. Shared/recovery error mappers distinguish it from input/reset
  link validation and uncertain transport outcomes. Mutations are never replayed,
  and Meal Plan revisions are neither replaced nor upgraded by CSRF handling.
- Frontend verification: 11 focused files / 90 tests passed; full suite 72 files /
  459 tests passed, 1 pre-existing skip; production build passed with the same
  three existing SCSS budget warnings (admin recipes, recipe list, cooking mode).
  Git diff whitespace checks passed. No browser/staging/backend test run is claimed.

### In Progress

- Real-browser allowed/hostile-origin and public-edge CSRF validation; remaining
  session/key-persistence/hosting initiative phases. Local backend/frontend CSRF
  verification is not a claim of staging or deployment readiness.

### Frontend CSRF file manifest and verification

Paths relative to `appetee_front`; existing unrelated changes were preserved.

- Added: `src/app/core/api/api-url.ts`, `api-url.spec.ts`;
  `src/app/core/auth/csrf-token.service.ts`, `csrf-token.service.spec.ts`,
  `csrf-error.ts`, `csrf-error.spec.ts`, `auth.interceptor.spec.ts`.
- Modified: `src/app/core/auth/auth.interceptor.ts`,
  `src/app/core/auth/data-access/password-recovery-error-message.ts`,
  `src/app/core/shared/data-access/generic-template/api-error-message.ts`,
  `src/app/app.config.ts`, `src/app/app.config.spec.ts`.
- Documentation: this initiative README only. Backend code/contract documentation,
  Express/CSP, infrastructure, and Meal Plan UI were not modified by this slice.

Commands executed from the frontend root:

```powershell
npm test -- --watch=false --include='**/auth.interceptor.spec.ts' --include='**/csrf*.spec.ts' --include='**/api-url.spec.ts' --include='**/auth.facade.spec.ts' --include='**/api-error.interceptor.spec.ts' --include='**/password-recovery-error-message.spec.ts' --include='**/session*.spec.ts' --include='**/account-closure.service.spec.ts' --include='**/app.config.spec.ts'
npm test -- --watch=false
npm run build
git diff --check
```

Remaining release checks (not executed): HTTPS frontend/API including development;
exact trusted frontend origins and credentialed CORS/preflight for `X-CSRF-TOKEN`
and existing headers such as `X-Meal-Plan-Revision`; observed Secure/HttpOnly/
SameSite=None host-only antiforgery cookie creation and browser third-party-cookie
behavior; real allowed/hostile-origin form/JSON/multipart/logout/upload/destructive
request matrix; login/logout/expiry/restoration/account-switch browser races;
public-edge no-store/proxy/domain behavior. Deploy compatible frontend/backend
clients together. Session-version/revocation, durable keys and broader browser
headers/CSP remain separate E-005 work.

### Remaining

- [ ] Every cookie-authenticated mutation has antiforgery and request-intent protection.
- [ ] Session lifecycle has revocation, revalidation, idle, and absolute limits.
- [ ] Data Protection keys are durable and verified.
- [ ] Frontend and API header/cache policies are deployed and tested.
- [ ] Real-browser custom-domain tests pass.

## Risks and Edge Cases

- CORS does not prevent a simple cross-origin form submission.
- A stale role inside a cookie can outlive permission removal.
- Incorrect slot-specific Data Protection configuration can invalidate all sessions or accept inconsistent tickets.
- An overly strict CSP can break legitimate assets if not deployed in report-only stages first.

## Product Features Affected

- All authenticated mutations
- Login/logout/session restoration
- Administrative tools
- Account deletion
- Image uploads
- Frontend hosting

## Validation

- A hostile origin cannot cause any authenticated mutation.
- Valid Angular requests succeed with the required token/header.
- Password, permission, account-state, and explicit revocation changes invalidate sessions within the documented bound.
- Idle and absolute expiry work across restart and multiple instances.
- Sensitive responses are not publicly or intermediately cached.
- Both public origins expose the intended security headers.

## Completion Criteria

- [ ] Every cookie-authenticated mutation has antiforgery and request-intent protection.
- [ ] Session lifecycle has revocation, revalidation, idle, and absolute limits.
- [ ] Data Protection keys are durable and verified.
- [ ] Frontend and API header/cache policies are deployed and tested.
- [ ] Real-browser custom-domain tests pass.

## Decisions

- Preserve the current credentialed cross-origin topology for the CSRF slice.
  Explicit `Cors:AllowedOrigins` plus the API's own origin are trusted; no
  wildcard/prefix trust. Empty development origins mean same-origin only.
- Bootstrap returns `{requestToken,headerName}` with header `X-CSRF-TOKEN` and
  Secure/HttpOnly/SameSite=None host-only `__Host-appetee-csrf` cookie (Path=/).
  Anonymous bootstrap supports login/signup/recovery; tokens are bound to the
  identity observed at issuance and must be refreshed after identity changes.
- Every unsafe `/api` request requires a trusted Origin and matching cookie plus
  header; non-browser clients must also provide Origin. Missing/invalid tokens
  return 400 `csrf_invalid`; disallowed Origin/Fetch Metadata returns 403, before
  action/body execution. Existing authorization failures can return 401 first.
- Trusted cross-site SPA fetches remain valid. Supplied metadata must describe
  API fetch (`cors`/`same-origin`, destination `empty`); untrusted origins,
  navigation/no-cors/frame contexts, and malformed metadata are rejected.
- Frontend transport is implemented and unit/regression verified locally.
  Real-browser and public-edge topology tests, session revocation, key persistence,
  and remaining initiative phases are still release work. Do not deploy
  token-enforcing backend without compatible browser clients.
- Backend file manifest, client handshake and exact verification commands are
  recorded in the backend repository's `docs/e005-csrf.md`.
- CORS is not treated as CSRF protection.
- Session authorization state is not trusted indefinitely from a long-lived ticket.
- Browser security headers are application-owned and tested at the public edge.

## Detailed Implementation Documents

- [Backend implementation](./backend.md)
- [Frontend implementation](./frontend.md)

## Traceability

The codes below are retained only to map this implementation plan to the historical problem register.

| Reference | Problem |
|---|---|
| SEC-005 | Cookie-authenticated mutations lack CSRF protection |
| SEC-008 | Cookie lifecycle lacks server-side revocation, absolute limits, and revalidation |
| SEC-010 | Browser headers and sensitive-response cache controls are incomplete |

# E-002 — Administrative Permissions and Audit Trail

## Initiative Information

- **Status:** Backend and frontend implemented with scoped verification; authenticated live integration/deployment pending, backend full-run limitations recorded
- **Type:** Engineering initiative
- **Priority:** High
- **Implementation order:** 2
- **Last updated:** 2026-10-12

## Goal

Create a real permission model for catalogue administration and record who changed authoritative recipe and ingredient data.

## Problem

Administrative endpoints currently require only a signed-in cookie. An ordinary newly registered account can reach recipe and ingredient creation or update operations. The issued authentication ticket contains no durable role or permission source, and the Angular guard only controls navigation, not API authority.

## Why This Matters

Catalogue defacement, unsafe or false nutrition/allergen content, storage cost, moderation burden, and loss of integrity. Broken function-level authorization and vertical privilege escalation.

## Current Behavior

- Before E-002, administrative operations required only authentication and ordinary
  accounts could mutate the catalogue. That historical behavior motivated this initiative.
- The implemented backend now enforces independent named permission policies,
  live server-side checks, security-version revocation, actor audit and ETag
  preconditions. Current-user session retrieval now exposes durable capabilities
  for the frontend. Frontend capability/ETag integration is implemented; authenticated live integration and deployment remain pending.

## Target Behavior

Every administrative operation requires a named backend policy backed by current server-side permission state. Permission removal takes effect within a bounded period, sensitive mutations record the actor and version, and the frontend reflects permissions without granting them.

## Scope

### Included

- Role/permission storage and assignment
- Named authorization policies
- Administrative route protection
- Permission revalidation and stale-cookie behavior
- Actor audit fields/events
- Optimistic concurrency for catalogue changes
- Frontend permission-aware navigation and pages
- Authorization tests

### Excluded

- Authentication rate limiting, E-004
- CSRF implementation details, E-005
- Full moderation workflow for user-created content, E-015

## Systems Affected

- Admin controller and catalogue endpoints
- Cookie claims/current-user authorization services
- User/account schema
- Recipe and ingredient write paths
- Angular admin routes, navigation, and state
- Audit records and operational logs

## Required Change Summary

### Backend

- Use the approved independent `Catalog.ReadAdmin` and `Catalog.Write` permissions
  rather than a broad role string. No support-user permission is implemented here.
- Require a named policy on every administrative controller/action.

Remaining backend implementation details are maintained in [`backend.md`](./backend.md).

### Frontend

- Load effective capabilities from a current-session/profile response.
- Hide unavailable administrative navigation, but preserve backend denial as the security boundary.

Remaining frontend implementation details are maintained in [`frontend.md`](./frontend.md).

### Database

- Add explicit account/permission state, security version, and audit/version fields through versioned migrations.
- Decide whether permissions are direct, role-based, or both; enforce uniqueness and foreign keys.

### Tests

- Test anonymous, ordinary user, read-only moderator, administrator, removed administrator, disabled administrator, forged claim, and stale cookie.
- Test concurrent updates and audit actor accuracy.

### Documentation

- Document permission meanings, assignment process, emergency removal, and access review cadence.

## Implementation Phases

Phases are completed in order unless a documented dependency requires otherwise. A phase that changes code is not complete until its listed tests pass. A phase containing only configuration, documentation, or operational work must attach equivalent validation evidence.

### Phase 1 — Define the permission model

**Status:** Backend implemented and scoped tests verified (2026-10-12); deployment evidence remains pending.

#### Changes

- Define administrator permissions, active-account requirements, and revocation behavior.
- Add failing tests proving ordinary users cannot administer catalogue data.

#### Tests and validation

- [ ] Authorization matrix: anonymous, normal user, admin, removed admin, disabled user, forged/stale claims.

#### Phase completion rule

- [ ] All scoped changes are implemented or explicitly documented as not applicable.
- [ ] Every required automated test passes.
- [ ] Required manual, staging, migration, or operational evidence is attached.
- [ ] The initiative `Work Status` section is updated with verified evidence.

### Phase 2 — Enforce backend policies and audit actors

**Status:** Backend implemented and scoped tests verified (2026-10-12); frontend/deployment are not completed here.

#### Changes

- Require named policies on every administrative operation.
- Resolve current permission from a server-controlled source.
- Record actor, operation, target, result, and correlation ID without sensitive payloads.

#### Tests and validation

- [ ] Backend policy-handler tests.
- [ ] Integration tests for every admin endpoint and audit-event assertions.

#### Phase completion rule

- [ ] All scoped changes are implemented or explicitly documented as not applicable.
- [ ] Every required automated test passes.
- [ ] Required manual, staging, migration, or operational evidence is attached.
- [ ] The initiative `Work Status` section is updated with verified evidence.

### Phase 3 — Reflect permissions in the frontend

**Status:** Frontend implemented and automated checks verified (2026-10-12); authenticated live integration and rollout pending. This is not full frontend release completion.

The capability-retrieval gap was approved for implementation on 2026-10-12:
`/api/auth/session` now adds current durable `permissions: string[]` to its
existing identity fields. See [the frontend handoff](./frontend.md) and
[backend contract](./backend.md#frontend-capability-retrieval--approved-session-extension).
Deploy and verify this additive backend change before rolling out the frontend.

#### Changes

- Hide or disable administrative navigation for unauthorized users.
- Handle 401/403 without treating UI checks as security.
- Clear permission state when session identity changes.

#### Tests and validation

- [x] Frontend guard/navigation tests, independent permission matrix, invalid capability states and identity races.
- [x] Controlled browser E2E for ordinary/read-only/write-only/both-permission accounts, stale-edit review and permission removal.
- [ ] Authenticated browser E2E against real granted/revoked accounts and CORS-exposed resource ETags.

#### Phase completion rule

- [ ] All scoped changes are implemented or explicitly documented as not applicable.
- [ ] Every required automated test passes.
- [ ] Required manual, staging, migration, or operational evidence is attached.
- [ ] The initiative `Work Status` section is updated with verified evidence.

### Phase 4 — Validate revocation and concurrent edits

**Status:** Backend implemented and scoped tests verified (2026-10-12); full-run/rerun outcomes documented above.

#### Changes

- Invalidate stale permission state.
- Add optimistic concurrency to authoritative administrative writes where required.

#### Tests and validation

- [ ] Stale-cookie and removed-role tests.
- [ ] Concurrent update/conflict tests and audit verification.

#### Phase completion rule

- [ ] All scoped changes are implemented or explicitly documented as not applicable.
- [ ] Every required automated test passes.
- [ ] Required manual, staging, migration, or operational evidence is attached.
- [ ] The initiative `Work Status` section is updated with verified evidence.

## Work Status

### Completed

Backend-only scope implemented on 2026-10-12 against the approved backend
contract: independent direct permissions, current server checks, stale/disabled
cookie rejection, trusted audited assignment/revocation, catalogue actor/version
metadata and atomic ETag/If-Match updates (428 missing, 412 mismatched).

`dotnet build Appetee.sln --no-restore --verbosity minimal` passed with zero
errors/warnings. Combined scoped E002/Admin/AuthCookie/B01-recipe/E005/B08/B09
tests passed 192/192, zero failed/skipped, 9m04s, on explicitly opted-in guarded
loopback appetee_backend_tests. Migration 010 was tested there only; it has not
been applied to the developer or production database. No automatic grants.

Detailed backend verification and limitations:
[`Backend/docs/e002-b08-b09-verification.md`](../../../../Backend/docs/e002-b08-b09-verification.md).
At that backend-only checkpoint, frontend work and production rollout were not marked complete. Subsequent frontend implementation evidence is recorded below.

Subsequent approved session-capability extension (2026-10-12): current-user
`GET /api/auth/session` preserves identity fields and adds live durable
`permissions: string[]`, including `[]` for ordinary accounts. Generated OpenAPI
is aligned; selectors are rejected and stale/disabled sessions return `401`.
Build passed with zero warnings/errors (19.83s); scoped E-002/session/auth/CSRF
regression passed 107/107, zero failed/skipped (4m18s), including all 15 new
session integration cases. Exact commands, files and database actions are in
`Backend/docs/e002-session-permissions-verification.md`; TRX artifact is
`.dotnet/test-results/e002-session-permissions.trx` in Backend. No additional
migration is needed for this extension. The frontend handoff/prompt now targets
this implemented contract; authenticated frontend/browser rollout completion is still pending.

#### Frontend implementation and verification — 2026-10-12

Frontend-only implementation preserves existing Meal Plan, profile and E-005 changes. No backend code, database migrations, account creation, grants, revocations or deployment configuration were changed.

- Core `CapabilitiesStore`/`CapabilitiesFacade` validate the current-session response, expose explicit capability states, coalesce/bound reads and reject previous-identity or pre-denial completions. Login/signup fetch the session endpoint; restoration reuses that capability read. Unknown/loading/failed capability state enables no administrative controls. Codes remain independent and unknown codes are ignored.
- Existing desktop/mobile navigation, authoring routes and success actions are capability-aware. Existing-record editing requires both permissions and a protected admin detail read; it never uses a public detail projection for its ETag. Write-only creation can use its authorized ingredient-create receipt without gaining access to protected ingredient reads.
- Core catalogue records retain complete admin resources, exact response ETags, string versions and independent request state. Read epochs reject pre-write completions. Metadata and actor fields are not form inputs; normal recipe DTOs remain unchanged. Admin multipart transport preserves the existing credentialed/CSRF pipeline.
- `401` uses existing session-expiration cleanup; configured-API admin `403` clears restricted state and forces a new capability read, not a denied-request retry. Identity reset/permission loss clears records, drafts, image references and ETags. Ordinary recipe/planner caches are not replaced by admin projections.
- `412`/`428` require an authorized fresh read and explicit review. A different version observed after an own confirmation also requires review. `404` invalidates unavailable records/tokens. Unknown mutation outcomes require inspection before another explicit submission; no authentication, CSRF, network or stale-precondition failure automatically replays a write. Later local edits are not cleared or labeled saved by an older acknowledgment.

Files added: `core/auth/catalogue.guard.*`, `core/auth/data-access/capabilities.*`, `core/shared/data-access/catalogue/catalogue-resource.model.*`, `catalogue-state.store.ts`, navigation/denial tests, `e2e/e002-administrative-permissions.spec.ts` and `playwright.e002.config.ts`. Existing auth/session registration, API-error handling, private header, recipe/ingredient admin clients/facades, authoring/dialog/success components and their tests were updated. Paths are relative to `appetee_front/src/app` unless marked `e2e` or configuration.

Commands from the frontend root:

```powershell
$env:VITEST_MAX_WORKERS = '1'
npm test -- --watch=false --include='src/app/core/auth/**/*.spec.ts' --include='src/app/core/api/*.spec.ts' --include='src/app/core/layout/private-layout/*.spec.ts' --include='src/app/core/shared/data-access/recipes/admin/*.spec.ts' --include='src/app/core/shared/data-access/ingredients/admin/*.spec.ts' --include='src/app/core/shared/data-access/catalogue/*.spec.ts' --include='src/app/features/admin-recipes/**/*.spec.ts'
npm test -- --watch=false
npm run build
npm run e2e -- --config=playwright.e002.config.ts
```

Actual results:

- Focused frontend suites: **159 passed across 21 files**.
- Final full frontend suite: **628 passed, 1 existing skip across 103 files**.
- Final production build: **passed**, initial bundle **515.19 kB vs 500 kB** warning plus the three existing SCSS warnings (admin recipes, recipes list and cooking mode). Budgets and test timeouts were not changed.
- An E-002 browser run passed **8/8**: seven controlled-response scenarios plus one real, non-mocked local Swagger/credentialed anonymous-session check. The real check confirmed required `permissions:string[]`, `401` and `no-store` from `https://localhost:5001`. A dedicated HTTPS frontend configuration matches the backend's existing `https://localhost:4200` CORS allowlist; no backend CORS settings were changed. Browser tracing is disabled so live cookies/antiforgery tokens are not retained in traces.
- Latest browser rerun: **7 controlled scenarios passed; the live check failed with ECONNREFUSED** because the local backend was no longer listening. Both localhost/IPv6 and 127.0.0.1 checks confirmed refusal. This is recorded as an external availability limitation, not a live pass. Restart the existing backend before rerunning that check.
- Initial implementation runs exposed compiler/fixture issues; browser fixtures were corrected to expose ETag and to target the existing `alertdialog` role. The HTTP frontend origin was not allowed by the running backend; the dedicated HTTPS test configuration corrected the frontend test origin. These failed attempts are not counted as verification passes.

Remaining release gates: real authenticated permission arrays for ordinary/read-only/write-only/both-permission accounts, real revocation/disabled-session journeys and successful resource-specific ETag updates with browser-readable CORS headers. No existing account credentials were supplied and no accounts/grants were created for these checks. Azure production contract/migration/operator-grant readiness, staging, zoom/reduced-motion and assistive-technology acceptance remain unverified. Frontend release completion is not claimed until these required checks pass.

### In Progress

The backend checkpoint excluded frontend/deployment; frontend code verification is recorded above, with authenticated live integration and rollout still pending. Initial backend
full regression passed 883/885: one fixture-reset timeout and one older upgrade
fixture mismatch. The fixture was corrected; affected rerun passed 9/9, zero
skipped, 26s. Final rebuild passed with zero errors/warnings, 16.63s. A fresh
entirely green full-suite rerun is not claimed. Reports and resume details:
Backend/docs/e002-f011-progress.md.

### Remaining

- [x] All administrative endpoints require explicit named policies.
- [x] Permission state and revocation behavior are documented and tested.
- [x] Angular reflects capabilities without being treated as an authority (frontend implementation and automated checks).
- [ ] Authenticated live browser/capability/ETag integration and deployment verified.
- [x] Catalogue writes have actor audit and optimistic concurrency.
- [x] Access-review and emergency-revocation procedures exist.

## Risks and Edge Cases

- A role copied into a long-lived cookie can remain valid after removal.
- Frontend capability caching can display stale controls.
- An audit trail containing full request bodies can create a second privacy problem.
- A single `Admin` role may become too broad as pricing, moderation, and support functions grow.

## Product Features Affected

- Ingredient administration
- Recipe administration
- Diet and badge administration
- Nutrition and pricing management
- Future moderation and import tools

## Validation

- Ordinary users receive `403` for every administrative mutation.
- Removed permissions stop authorizing within the documented bound.
- Forged client fields or UI changes cannot grant access.
- Every successful sensitive mutation records the correct actor and version.
- Concurrent edits produce a controlled conflict instead of silent overwrite.

## Completion Criteria

- [x] All administrative endpoints require explicit named policies.
- [x] Permission state and revocation behavior are documented and tested.
- [x] Angular reflects capabilities without being treated as an authority (frontend implementation and automated checks).
- [ ] Authenticated live browser/capability/ETag integration and deployment verified.
- [x] Catalogue writes have actor audit and optimistic concurrency.
- [x] Access-review and emergency-revocation procedures exist.

## Decisions

- Authorization is permission-based at the backend.
- Authentication alone never grants catalogue administration.
- Audit records contain identifiers and change metadata, not secret-bearing payload serialization.
- Backend permission persistence, revocation, trusted assignment, audit/version
  fields and ETag/If-Match contracts were approved on 2026-10-12 and are defined
  in [the backend contract](backend.md#approved-backend-contract-2026-10-12).
  Approval is not implementation or release verification.

## Detailed Implementation Documents

- [Backend implementation](./backend.md)
- [Frontend implementation](./frontend.md)

## Traceability

The codes below are retained only to map this implementation plan to the historical problem register.

| Reference | Problem |
|---|---|
| SEC-002 | Any authenticated user can invoke administrative catalogue operations |
| DB-003 | Concurrency, audit, ownership, and several integrity/index controls are missing |
| SEC-008 | Cookie lifecycle lacks server-side revocation, absolute limits, and revalidation |
| TEST-001 | Backend suite is red and existing tests encode broken authorization |

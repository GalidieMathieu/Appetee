# E-001 — User Account Authorization and Ownership

## Initiative Information

- **Status:** In progress — Phases 1–3 complete; Phase 4 backend/frontend implemented, integrated staging verification pending
- **Type:** Engineering initiative
- **Priority:** Critical
- **Implementation order:** 1
- **Last updated:** 2026-09-16

## Goal

Restrict every account operation to the authenticated account and remove anonymous or cross-account access to personal data and destructive user operations.

## Problem

The user API does not consistently require authentication or bind operations to the current principal. General user routes accept ordinary numeric identifiers and allow callers to list users, read profiles, update accounts, and delete accounts without a reliable ownership boundary. Because account deletion cascades through user-owned relational data, this is both a personal-data exposure and a destructive data-loss path.

## Why This Matters

Personal-data exposure, account corruption, destructive data loss, user trust loss, and incident/notification burden. Broken object-level authorization and unrestricted destructive CRUD over user records.

## Current Behavior

- The controller has no class-level Authorize. GET /api/users/{id}, GET /api/users, PUT /api/users/{id}, and DELETE /api/users/{id} have no action authorization or ownership check. Integration tests intentionally call these operations anonymously.

## Target Behavior

Normal account operations use claim-derived identity through current-user endpoints. Public callers cannot enumerate accounts. A signed-in user cannot access another user's record by changing an ID. Administrative support access, if introduced later, is a separate policy-protected capability with a minimal response model and an audit trail.

## Scope

### Included

- `GET`, `PUT`, and `DELETE` account operations
- Removal or restriction of general user listing
- Claim-derived current-user identity
- Purpose-specific user DTOs
- Account deletion authorization and cleanup
- Cross-user and anonymous regression tests
- Frontend removal of user-ID-based account calls

### Excluded

- Administrator catalogue permissions, handled by E-002
- General session revocation, handled by E-005
- Complete privacy export/retention policy, handled by E-016

## Systems Affected

- `UsersController` and account routes
- Application user services and commands
- Dapper user repositories/queries
- Authentication claims and current-user abstraction
- Angular session/profile state and data access
- User-owned relational records and profile media

## Required Change Summary

### Backend

- Make authentication the default for account routes.
- Replace consumer-facing `/api/users/{id}` account mutations with `/api/users/me` operations.

Remaining backend implementation details are maintained in [`backend.md`](./backend.md).

### Frontend

- Use current-user endpoints only.
- Remove stored or route-provided account IDs from profile mutations.

Remaining frontend implementation details are maintained in [`frontend.md`](./frontend.md).

### Database

- Review delete cascades and document which records are deleted, retained, anonymized, or handled asynchronously.
- Add account state/security version fields through E-005/E-008 where required.

### Tests

- Run an authorization matrix for anonymous, user A, user B, disabled/deleted user, support/admin, and stale session.
- Verify user A cannot infer whether user B exists through response differences.

Remaining tests implementation details are maintained in [`backend.md`](./backend.md).

### Documentation

- Document the current-user route contract and account-deletion semantics.

## Implementation Phases

Phases are completed in order unless a documented dependency requires otherwise. A phase that changes code is not complete until its listed tests pass. A phase containing only configuration, documentation, or operational work must attach equivalent validation evidence.

### Phase 1 — Contain unsafe account routes

**Status:** Completed — 2026-08-06

#### Changes

- Add failing authorization tests for anonymous and cross-user access.
- Disable or protect general user list/read/update/delete routes.
- Define non-leaking 401/403/404 semantics.

#### Tests and validation

- [x] Backend integration tests: anonymous, user A, user B, and missing user.
- [x] Contract assertions for status code and ProblemDetails shape.

#### Phase completion rule

- [x] All scoped changes are implemented or explicitly documented as not applicable.
- [x] Every required automated test passes.
- [x] No manual, staging, migration, or operational steps apply to this containment phase.
- [x] The initiative `Work Status` section is updated with verified evidence.

### Phase 2 — Introduce claim-scoped current-user operations

**Status:** Completed — 2026-08-06

#### Changes

- Implement GET/PUT current-user operations using the validated principal.
- Remove userId/ownerId from self-service request contracts.
- Use minimal purpose-specific response DTOs.

#### Tests and validation

- [x] Backend integration tests for valid update, invalid input, overposting, and identity tampering.
- [x] Repository/service tests for ownership-scoped writes.

#### Phase completion rule

- [x] All scoped changes are implemented or explicitly documented as not applicable.
- [x] Every required automated test passes.
- [x] No manual, staging, migration, or operational steps apply to this API-contract phase.
- [x] The initiative `Work Status` section is updated with verified evidence.

### Phase 3 — Migrate frontend account flows

**Status:** Completed (2026-08-07)

#### Changes

- Replace ID-based profile calls with current-user endpoints.
- Clear user-scoped stores when identity changes or logout completes.
- Handle unauthorized, missing-account, and validation states.

#### Tests and validation

- [x] Frontend unit tests for data access and store reset.
- [x] Browser E2E for login, profile update, logout, and user-switch isolation.

#### Phase completion rule

- [x] All scoped changes are implemented or explicitly documented as not applicable.
- [x] Every required automated test passes.
- [x] No manual, staging, migration, or operational evidence is required for this frontend-only phase.
- [x] The initiative `Work Status` section is updated with verified evidence.

### Phase 4 — Complete account closure behavior

**Status:** In progress — backend/frontend implemented 2026-09-11; integrated staging verification pending

#### Changes

- Define relational, session, media, log, and backup handling.
- Revoke sessions and coordinate durable cleanup.
- Document retained/anonymized data.
- Add a claim-scoped frontend closure flow using only `DELETE /api/users/me`.
- Require an explicit destructive-action confirmation and keep failed requests retryable.
- Clear all browser identity state and show a one-time completion notice only after confirmed success.

#### Tests and validation

- [x] Deletion integration tests including session invalidation and relational cleanup.
- [x] Fault tests for partial cleanup and retry/reconciliation behavior.
- [x] Frontend unit tests for the ID-free API contract, success-only session reset, confirmation, retry, and completion notice.
- [x] Browser E2E for a failed deletion attempt followed by successful retry and client-session cleanup.

#### Phase completion rule

- [x] All scoped changes are implemented or explicitly documented as not applicable.
- [x] Every required automated test passes.
- [x] Required migration and local operational evidence is attached.
- [ ] Integrated frontend/backend staging closure flow passes.
- [x] The initiative `Work Status` section is updated with verified backend and frontend evidence.

#### Frontend closure contract implemented

| Concern | Frontend behavior |
|---|---|
| Identity | Calls `DELETE /api/users/me`; no route, query, or request-body account/owner ID is accepted or sent. |
| Confirmation | Requires the signed-in user to type `DELETE` exactly before enabling permanent deletion. |
| Pending state | Disables competing profile changes, confirmation cancellation, and duplicate deletion submissions while the request is active. |
| Failed/ambiguous response | For non-authentication failures, keeps the browser state and confirmation visible, presents a safe error, and allows retry. A `401` follows the existing global session-expiration flow. The frontend does not claim that deletion completed. |
| Confirmed success | Resets every store registered in `SESSION_RESETTERS`, ends logout-sensitive streams, clears stale expiration feedback, replaces the protected route with `/auth/login`, and announces closure once. |
| Authorization | Treats the UI confirmation as a usability safeguard only. Ownership and authorization remain server responsibilities derived from the validated principal. |

The frontend deliberately uses non-specific deletion wording. The backend contract below defines the
verified relational, session, media, log, backup, and retry guarantees behind a successful response.

#### Frontend implementation record — 2026-09-16

This frontend version completed the browser-owned portion of Phase 4 without adding or accepting a
client-selected account identifier:

- `src/app/core/shared/data-access/user/user_auth.api.ts` adds the bodyless, claim-scoped
  `DELETE /api/users/me` request.
- `src/app/core/shared/data-access/user/user.facade.ts` exposes `deleteMe$()`, maps safe errors, and
  finalizes local account closure only after the delete request succeeds.
- `src/app/core/auth/account-closure.service.ts` resets every registered identity-scoped store,
  clears stale session-expiration state, notifies logout-sensitive streams, and holds the one-time
  successful-closure notice.
- `src/app/features/profile/profile.page.*` adds the danger zone, exact `DELETE` confirmation,
  cancellation, duplicate-submission protection, pending state, safe retry feedback, and successful
  redirect to `/auth/login` with protected-route history replacement.
- `src/app/features/auth/login/login.page.*` consumes and announces the successful-closure notice
  once after redirect.
- Unit coverage was added to the user API, user facade, account-closure service, profile page, and
  login page. It verifies that no account ID or request body is sent, local identity is cleared only
  after success, failures remain retryable, confirmation is exact, and the completion notice is
  consumed once.
- `e2e/account-authorization.spec.ts` now exercises a failed deletion followed by a successful retry,
  verifies both requests target only `/api/users/me` with no body, confirms the failed attempt does
  not navigate or report success, and confirms the successful attempt clears the browser session.
- No backend source, migration, database, media-cleanup, or server-session code was changed by this
  frontend version.

Verification recorded for this version:

- `npx --no-install tsc --noEmit -p tsconfig.app.json` passed.
- `npx --no-install tsc --noEmit -p tsconfig.spec.json` passed.
- Targeted Angular tests passed 29/29 across five files.
- The full Angular suite passed 321/321 executed tests across 53 files; one pre-existing sign-up test
  remained explicitly skipped.
- `npm run e2e -- e2e/account-authorization.spec.ts` passed 5/5 Chromium scenarios.
- `npm run build` passed. Existing style-budget warnings in Cooking Mode, Admin Recipes, and Recipes
  List remained unrelated to this work.

#### Backend closure contract implemented

| Concern | Backend behavior |
|---|---|
| Identity and response | Authenticated `DELETE /api/users/me` derives the account ID only from the validated principal. A committed closure returns `204` and clears the current cookie; a missing/deleted principal receives `401 ProblemDetails`. |
| Relational data | One MySQL transaction locks the current account, writes a durable cleanup job, and deletes the account. Existing foreign keys cascade password-recovery tokens, diets, ingredient restrictions, favorites, collections, and collection entries. A failed transaction commits neither deletion nor cleanup work. |
| Other sessions | Cookie validation verifies that the claimed account still exists. Cookies held by other browsers are rejected and cleared on their next request after deletion. General session-version and disabled-account controls remain owned by E-005. |
| Profile media | Only HTTPS Blob URLs in the configured container and the exact `users/{formerUserId}/` namespace are eligible for deletion. External URLs, recipe media, and another account's Blob namespace are never deleted. Blob deletion uses `DeleteIfExists` and is replay-safe. |
| Partial failure | Relational deletion remains committed when Blob Storage is unavailable. The pending cleanup job records a bounded error type and retry time, and a bounded background reconciliation worker retries it. |
| Retained cleanup data | While pending, the job temporarily retains the former numeric user ID and profile URL needed to prove media ownership. Completion clears both fields and any error code, retaining only non-identifying operational status, attempt count, and timestamps. |
| Logs | Closure/retry logs contain only the cleanup job ID and bounded exception type. They do not contain user ID, username, email, profile URL, cookie, or token. Existing platform-log retention remains governed by E-016. |
| Backups | Live relational rows and managed media are deleted as above. Existing encrypted backups are not rewritten and retain historical bytes until their configured expiration. An older recovery point must not serve traffic until it is advanced/reconciled through the closure point; retention periods and restore governance remain owned by E-012/E-016. |

## Work Status

### Completed

- Phase 1 — Contain unsafe account routes (2026-08-06)
  - All `/api/users` routes now require authentication.
  - Legacy user-list, user-controller email-discovery, and ID-based read/update/delete routes are disabled, hidden from OpenAPI, and return a uniform non-leaking `404 ProblemDetails` response to authenticated callers.
  - Authentication challenges and access denials return RFC 7807 `ProblemDetails` (`401` and `403`) rather than empty responses or redirects.
  - Cross-user mutation tests verify that the target account is unchanged and remains usable.
  - Validation evidence: `dotnet build src/Appetee.Api/Appetee.Api.csproj --configuration Release --no-restore` passed with 0 warnings and 0 errors.
  - Validation evidence: `dotnet test tests/Appetee.Api.Tests/Appetee.Api.Tests.csproj` passed 37/37 tests with 0 failures and 0 skips.
- Phase 2 — Introduce claim-scoped current-user operations (2026-08-06)
  - `GET /api/users/me` and `PUT /api/users/me` derive the account ID exclusively from the validated authentication principal.
  - The current-profile response contains only `username` and `imageUrl`; generic account DTOs and ID-based application operations were removed.
  - The update request contains only editable profile fields and rejects unknown JSON members, including attempted `userId`, `ownerId`, email, and preference overposting.
  - Service and repository contracts name and scope writes by `currentUserId`; tests verify another account is not modified.
  - Validation evidence: `dotnet build src/Appetee.Api/Appetee.Api.csproj --configuration Release --no-restore` passed with 0 warnings and 0 errors.
  - Validation evidence: `dotnet test tests/Appetee.Api.Tests/Appetee.Api.Tests.csproj --no-restore` passed 46/46 tests with 0 failures and 0 skips.
  - Follow-up (2026-08-07): restored the unauthenticated email-availability check under `GET /api/auth/exists-by-email`; the legacy user-controller route remains disabled. `dotnet test tests/Appetee.Api.Tests/Appetee.Api.Tests.csproj --no-restore` passed 50/50 tests with 0 failures and 0 skips.
- Phase 3 — Migrate frontend account flows (2026-08-07)
  - Added the authenticated `/profile` route with loading, retry, validation, submitting, error, and success states.
  - Profile reads and updates use only `GET /api/users/me` and `PUT /api/users/me`; update payloads contain only `username` and `imageUrl` and cannot carry an account or owner ID.
  - The private header now reads the resettable current-profile store so profile changes and identity switches cannot retain a previous username.
  - Login, sign-up, failed session restoration, and logout clear every registered user-scoped store at the identity boundary.
  - Validation evidence: `npx --no-install tsc --noEmit -p tsconfig.app.json` and `npx --no-install tsc --noEmit -p tsconfig.spec.json` passed.
  - Validation evidence: `npm run test -- --watch=false` passed 47/47 executed tests across 13 files; one pre-existing sign-up test remains explicitly skipped.
  - Validation evidence: `npm run e2e` passed the Chromium login, claim-scoped profile update, logout, and user-switch isolation scenario (1/1).
  - Validation evidence: `npm run build` passed; the existing `admin-recipes.page.scss` component-style budget warning remains unrelated to this phase.

### In Progress

- Phase 4 — Complete account closure behavior
  - Implemented an accessible profile danger zone with exact `DELETE` confirmation, pending-state protection, cancellation before submission, and retryable error feedback.
  - Added an ID-free `DELETE /api/users/me` data-access operation. No account or owner identifier is accepted by the API method, facade, component, or browser request.
  - Non-authentication failures preserve local authentication and profile state; the UI does not claim success and permits the same confirmation to be retried. A `401` continues through the global session-expiration behavior.
  - A confirmed success resets every registered identity-scoped store, notifies logout-sensitive streams, clears stale session-expiration feedback, and replaces browser history with the login route.
  - The login page consumes and announces a one-time account-closure success notice.
  - Added unit coverage for the HTTP contract, success-only local cleanup, safe failure handling, exact confirmation, navigation, and one-time notice consumption.
  - Added Chromium coverage that returns a cleanup failure once, verifies no navigation or false success, retries the same claim-scoped request, and verifies successful sign-out feedback.
  - Validation evidence (2026-09-11): `npx --no-install tsc --noEmit -p tsconfig.app.json` and `npx --no-install tsc --noEmit -p tsconfig.spec.json` passed.
  - Validation evidence (2026-09-11): targeted Angular tests passed 29/29 across 5 files.
  - Validation evidence (2026-09-11): full `npm run test -- --watch=false` passed 321/321 executed tests across 53 files; one pre-existing sign-up test remains explicitly skipped.
  - Validation evidence (2026-09-11): `npm run e2e -- e2e/account-authorization.spec.ts` passed 5/5 Chromium scenarios, including the Phase 4 failure/retry path.
  - Validation evidence (2026-09-11): `npm run build` passed. Existing component-style budget warnings remain in Cooking Mode, Admin Recipes, and Recipes List styles and are unrelated to this phase.
  - Backend added authenticated `DELETE /api/users/me`; no request or route account ID is accepted.
  - Account deletion and cleanup-job creation commit in one MySQL transaction; all current user-owned foreign-key rows cascade.
  - Every authenticated cookie now verifies that its account still exists, invalidating other-browser cookies on their next request after closure.
  - Profile media deletion is restricted to the exact `users/{formerUserId}/` namespace in the configured Blob container.
  - A privacy-minimized durable outbox and bounded background worker retry partial Blob failures; successful jobs scrub the former user ID, profile URL, and error code.
  - Migration evidence (2026-09-11): `20260911_007_e001_phase4_account_closure.sql` was applied from the integration harness and its columns/index/privacy shape passed.
  - Validation evidence (2026-09-11): targeted Phase 4 and Blob ownership tests passed 10/10.
  - Validation evidence (2026-09-11): full backend suite passed 322/322 with 0 failures and 0 skips.
  - Dataset/schema evidence (2026-09-11): generation completed, tooling tests passed 48/48, and validation passed for 121 ingredients and 1,699 recipes with 0 errors (existing advisory warnings remain).
  - Integrated frontend/backend staging verification remains pending because no staging environment was provided for this backend-only task.

### Remaining

- [x] All consumer account operations are claim-scoped.
- [x] The general user list is absent from the consumer API.
- [x] Cross-account and anonymous requests are denied without distinguishable personal-data leakage.
- [x] Frontend code no longer supplies an account owner ID for self-service operations.
- [x] Deletion semantics and tests cover database, session, media, logs, and retained backups.
- [ ] Integrated frontend/backend staging closure flow passes.
- [x] Backend provides `DELETE /api/users/me` and returns success only after its documented durable-closure boundary is satisfied.
- [x] Backend/operations define and verify relational deletion, server-session revocation, media cleanup, retained/anonymized logs, backups, and retry/reconciliation behavior.
- [ ] Run the frontend flow against the integrated backend in staging after the closure contract is available.

## Risks and Edge Cases

- Returning `403` versus `404` inconsistently may leak account existence.
- Deleting a relational account without revoking cookies can leave stale access.
- Blob/profile media cleanup can fail independently of MySQL.
- Future support tooling may accidentally reuse consumer routes.

## Product Features Affected

- Authentication and session restoration
- Profile viewing and editing
- Diet and ingredient restrictions
- Favorites and collections
- Account deletion
- Future household membership

## Validation

- Anonymous requests cannot list, read, update, or delete user accounts.
- Changing route or body IDs never changes which account is operated on.
- A cross-user test matrix is required in CI.
- Frontend profile state is cleared during identity transitions.
- Account closure revokes sessions and verifies relational/media handling.

## Completion Criteria

- [x] All consumer account operations are claim-scoped.
- [x] The general user list is absent from the consumer API.
- [x] Cross-account and anonymous requests are denied without distinguishable personal-data leakage.
- [x] Frontend code no longer supplies an account owner ID for self-service operations.
- [x] Deletion semantics and tests cover database, session, media, logs, and retained backups.

## Decisions

- Current-user identity is derived only from the validated principal.
- Consumer account operations use `/me` semantics.
- Administrative user search is a separate permissioned capability, not a parameter added to consumer routes.
- Account closure commits relational deletion and durable cleanup intent atomically; external cleanup is idempotent and retryable.
- Cleanup may delete only media in the closing account's server-derived Blob namespace.

## Detailed Implementation Documents

- [Backend implementation](./backend.md)
- [Frontend implementation](./frontend.md)

## Traceability

The codes below are retained only to map this implementation plan to the historical problem register.

| Reference | Problem |
|---|---|
| SEC-001 | Anonymous callers can read, update, and delete arbitrary users |
| DB-003 | Concurrency, audit, ownership, and several integrity/index controls are missing |
| PRIV-001 | Data lifecycle, export, deletion verification, and privileged-access operations are undefined |
| TEST-001 | Backend suite is red and existing tests encode broken authorization |

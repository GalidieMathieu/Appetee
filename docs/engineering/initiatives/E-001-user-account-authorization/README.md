# E-001 — User Account Authorization and Ownership

## Initiative Information

- **Status:** In progress — Phases 1–2 complete
- **Type:** Engineering initiative
- **Priority:** Critical
- **Implementation order:** 1
- **Last updated:** 2026-08-07

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

**Status:** Not started

#### Changes

- Define relational, session, media, log, and backup handling.
- Revoke sessions and coordinate durable cleanup.
- Document retained/anonymized data.

#### Tests and validation

- [ ] Deletion integration tests including session invalidation and relational cleanup.
- [ ] Fault tests for partial cleanup and retry/reconciliation behavior.

#### Phase completion rule

- [ ] All scoped changes are implemented or explicitly documented as not applicable.
- [ ] Every required automated test passes.
- [ ] Required manual, staging, migration, or operational evidence is attached.
- [ ] The initiative `Work Status` section is updated with verified evidence.

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

None.

### Remaining

- [ ] All consumer account operations are claim-scoped.
- [x] The general user list is absent from the consumer API.
- [x] Cross-account and anonymous requests are denied without distinguishable personal-data leakage.
- [x] Frontend code no longer supplies an account owner ID for self-service operations.
- [ ] Deletion semantics and tests cover database, session, media, logs, and retained backups.

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

- [ ] All consumer account operations are claim-scoped.
- [ ] The general user list is absent from the consumer API.
- [ ] Cross-account and anonymous requests are denied without distinguishable personal-data leakage.
- [x] Frontend code no longer supplies an account owner ID for self-service operations.
- [ ] Deletion semantics and tests cover database, session, media, logs, and retained backups.

## Decisions

- Current-user identity is derived only from the validated principal.
- Consumer account operations use `/me` semantics.
- Administrative user search is a separate permissioned capability, not a parameter added to consumer routes.

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

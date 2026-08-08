# E-002 — Administrative Permissions and Audit Trail

## Initiative Information

- **Status:** Ready for implementation
- **Type:** Engineering initiative
- **Priority:** High
- **Implementation order:** 2
- **Last updated:** 2026-08-06

## Goal

Create a real permission model for catalogue administration and record who changed authoritative recipe and ingredient data.

## Problem

Administrative endpoints currently require only a signed-in cookie. An ordinary newly registered account can reach recipe and ingredient creation or update operations. The issued authentication ticket contains no durable role or permission source, and the Angular guard only controls navigation, not API authority.

## Why This Matters

Catalogue defacement, unsafe or false nutrition/allergen content, storage cost, moderation burden, and loss of integrity. Broken function-level authorization and vertical privilege escalation.

## Current Behavior

- AdminController uses Authorize with its Roles argument commented out. Issued cookies contain ID/name claims but no role. Tests register an ordinary user and successfully call administrative create/update endpoints.

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

- Define permissions such as `Catalog.ReadAdmin`, `Catalog.Write`, and `Users.SupportRead` rather than relying only on a broad role string.
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

**Status:** Not started

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

**Status:** Not started

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

**Status:** Not started

#### Changes

- Hide or disable administrative navigation for unauthorized users.
- Handle 401/403 without treating UI checks as security.
- Clear permission state when session identity changes.

#### Tests and validation

- [ ] Frontend guard/navigation tests.
- [ ] Browser E2E for ordinary user, admin, and permission removal.

#### Phase completion rule

- [ ] All scoped changes are implemented or explicitly documented as not applicable.
- [ ] Every required automated test passes.
- [ ] Required manual, staging, migration, or operational evidence is attached.
- [ ] The initiative `Work Status` section is updated with verified evidence.

### Phase 4 — Validate revocation and concurrent edits

**Status:** Not started

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

None. Creating this plan does not count as implementation.

### In Progress

None.

### Remaining

- [ ] All administrative endpoints require explicit named policies.
- [ ] Permission state and revocation behavior are documented and tested.
- [ ] Angular reflects capabilities without being treated as an authority.
- [ ] Catalogue writes have actor audit and optimistic concurrency.
- [ ] Access-review and emergency-revocation procedures exist.

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

- [ ] All administrative endpoints require explicit named policies.
- [ ] Permission state and revocation behavior are documented and tested.
- [ ] Angular reflects capabilities without being treated as an authority.
- [ ] Catalogue writes have actor audit and optimistic concurrency.
- [ ] Access-review and emergency-revocation procedures exist.

## Decisions

- Authorization is permission-based at the backend.
- Authentication alone never grants catalogue administration.
- Audit records contain identifiers and change metadata, not secret-bearing payload serialization.

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

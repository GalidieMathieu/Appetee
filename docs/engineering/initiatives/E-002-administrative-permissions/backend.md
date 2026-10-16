# E-002 — Administrative Permissions and Audit Trail: Backend Implementation

## Purpose

This file contains backend-specific implementation detail. The canonical problem, target behavior, scope, status, risks, validation, and completion criteria remain in [`README.md`](./README.md).

## Engineering Rules

- Keep identity, authorization, ownership, server-owned fields, transaction behavior, and failure recovery explicit.
- Map HTTP and infrastructure types at the boundary; application use cases remain neutral where the initiative touches architecture.
- Use versioned migrations, bounded I/O, cancellation, purpose-specific contracts, and negative tests.
- Do not make unrelated refactors while implementing this initiative.

## Backend

- Use the approved independent `Catalog.ReadAdmin` and `Catalog.Write` permissions
  rather than a broad role string. No support-user permission is implemented here.
- Require a named policy on every administrative controller/action.
- Resolve permission state from a durable server source and define revalidation frequency.
- Reject removed, disabled, or stale administrators.
- Record actor ID, operation, target, timestamp, result, and version for sensitive mutations without logging secrets or full payloads.
- Return a conflict for stale catalogue updates using optimistic concurrency.

## Database

- Add explicit account/permission state, security version, and audit/version fields through versioned migrations.
- Decide whether permissions are direct, role-based, or both; enforce uniqueness and foreign keys.

## Documentation

- Document permission meanings, assignment process, emergency removal, and access review cadence.

## Tests

- Test anonymous, ordinary user, read-only moderator, administrator, removed administrator, disabled administrator, forged claim, and stale cookie.
- Test concurrent updates and audit actor accuracy.

## Delivery Order

Follow the implementation phases in the initiative README. Update status and completion evidence only there so the two documents cannot drift.

## Approved backend contract (2026-10-12)

User approval establishes the following backend-only contract before implementation.
Frontend permission-aware navigation is not implemented in this work.

### Frontend capability retrieval — approved session extension

Approved and implemented on 2026-10-12: `GET /api/auth/session` preserves `userId`
and `username` and adds a required non-null `permissions: string[]`. Return only
the authenticated current account's durable `Catalog.ReadAdmin`/`Catalog.Write`
grants, independently, without duplicates in ordinal order. Ordinary accounts
return `[]`. No query parameters are accepted (`400`), including `userId`,
`ownerId` and client permission input. Anonymous sessions retain the existing
`401` authentication contract; disabled, missing or security-version-stale
accounts also return `401`. All session responses are `no-store`.

The permission lookup uses one bounded cancellable SQL statement joining the
account and grants, checking active status and the ticket security version in
the same statement. Distinguish valid/no-grants from invalid/stale account,
including a change occurring after cookie validation. Never use role/permission
claims as the capability source. This read grants nothing, creates no audit
mutation, and introduces no schema change or permission-assignment API.
Existing per-request admin authorization and transactional mutation checks
remain authoritative; returned capabilities are frontend usability hints only.

`UserSessionDto` and generated OpenAPI expose the additive field. The frontend
must verify the deployed API implements it and handle identity changes and
revocation as defined in [frontend.md](./frontend.md). Frontend implementation
and end-to-end rollout are not completed by this backend extension.
Sign-up/login response contracts are unchanged; frontend clients fetch the
current-session response after authentication to retrieve capabilities.

### Permissions and revocation

Use direct durable per-account permissions, not cookie role claims. Admin reads
require `Catalog.ReadAdmin`; catalogue mutations require `Catalog.Write`.
Neither permission implies the other. No account receives either automatically,
including existing accounts. No self-service or public permission-assignment API.
Check current server-side permissions on every administrative request, without
a permission cache. Recheck the active account and write permission inside the
catalogue mutation transaction, serialized on the actor's user row. Revocation
therefore takes effect on the next request; a transaction already holding that
lock can finish before a revocation obtains the lock.

Add `users.is_active` (BOOLEAN, default true) and `users.security_version`
(nonnegative signed BIGINT, default 0). New authenticated tickets carry the
observed security version; reject disabled accounts and mismatched versions.
Existing tickets without the new claim are rejected and require sign-in.
Permission assignment/revocation increments that account's security version
under its user-row lock, so an old ticket cannot regain authority after a grant.

`account_permissions`: `(user_id, permission)` composite primary key; signed INT
user FK with delete cascade; permission ASCII binary, restricted to the two
approved codes; `granted_at` DATETIME(6) UTC, `granted_by_user_id` nullable signed
INT metadata. The latter is nullable only for an externally authenticated trusted
operator, not for anonymous application requests.

`administrative_audit`: BIGINT identity, nullable actor_user_id, actor_reference
VARCHAR(120), operation VARCHAR(40), resource_type VARCHAR(20), resource_id
signed INT, resource_version nullable BIGINT, permission nullable VARCHAR(40),
occurred_at DATETIME(6) UTC, correlation_id VARCHAR(128), outcome VARCHAR(20)
(successful committed records use succeeded). Permission changes use
operation permission_granted/permission_revoked, resource_type account and the
affected account as resource_id; record the authenticated operator reference and
optional actor account. Catalogue mutations record their session actor and
resulting version in the same transaction. No body, name, nutrition, tokens or
secrets in audit records. Audit identifiers deliberately have no user/resource
FK: account closure must not erase audit history or block deletion. Catalogue
rejections are recorded as structured outcome/trace logs without payloads.

Trusted assignment/revocation uses an operator-only database-migrator command,
not an HTTP endpoint. It requires the separate migration connection, an explicit
operator reference and target account ID; grant/revoke the two permissions
separately. Record permission changes and security version atomically. Never
infer the first administrator or run a grant during application startup/seed.

### Catalogue versions, audit metadata and HTTP preconditions

`recipes` and `ingredients` receive `resource_version` BIGINT default 1,
positive CHECK, plus nullable signed INT `created_by_user_id` and
`updated_by_user_id`. Existing seeded/legacy rows retain null actors and version
1; new administrative creates set both actors. Actor columns are metadata
without user FK so deleting an author does not delete catalogue records.
Existing timestamps retain their definitions. Version and actor fields are
server-owned and are not accepted from form bodies.

Admin ingredient-detail reads and admin recipe-detail reads return `ETag` with
a strong opaque quoted token `"catalog-ingredient-<id>-v<version>"` or
`"catalog-recipe-<id>-v<version>"`. Admin recipe detail is exposed at
`GET /api/admin/recipe-details/{id:int}`; it is protected by Catalog.ReadAdmin.
Admin-only resource envelopes are `{resource,resourceVersion,createdByUserId,
updatedByUserId}`. Resource is the existing ingredient detail, recipe detail, or
mutation summary DTO; resourceVersion is a decimal string and actor IDs nullable
numbers. Existing ordinary recipe,
discovery, favorites and preview DTOs are unchanged. Successful admin creates
and updates return the resulting ETag. Credentialed CORS exposes ETag.

Existing catalogue update endpoints require a single matching strong `If-Match`
token obtained from that resource's admin read. Missing header returns 428
`catalog_precondition_required`; malformed, weak, wildcard, multiple, wrong
resource or stale tokens return 412 `catalog_precondition_failed`. Missing
resources return 404 after authorization and valid header syntax. Atomically
lock/check the resource and perform the full update, related-row changes, actor
metadata, version increment and audit write in one transaction. No stale update
changes are saved. Creates require no If-Match. Exhausted versions fail rather
than wrap. Catalogue versioning is independent of X-Meal-Plan-Revision.

Changing canonical recipe membership/nutrition advances the catalogue version,
not every owner's Meal Plan revision. Referenced ingredient updates are outside
the current endpoint inventory; do not invent an ingredient-update route.

# E-002 — Administrative Permissions and Audit Trail: Backend Implementation

## Purpose

This file contains backend-specific implementation detail. The canonical problem, target behavior, scope, status, risks, validation, and completion criteria remain in [`README.md`](./README.md).

## Engineering Rules

- Keep identity, authorization, ownership, server-owned fields, transaction behavior, and failure recovery explicit.
- Map HTTP and infrastructure types at the boundary; application use cases remain neutral where the initiative touches architecture.
- Use versioned migrations, bounded I/O, cancellation, purpose-specific contracts, and negative tests.
- Do not make unrelated refactors while implementing this initiative.

## Backend

- Define permissions such as `Catalog.ReadAdmin`, `Catalog.Write`, and `Users.SupportRead` rather than relying only on a broad role string.
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

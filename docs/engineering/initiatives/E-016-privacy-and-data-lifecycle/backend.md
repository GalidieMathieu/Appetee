# E-016 — Privacy, Data Lifecycle, and Account Closure: Backend Implementation

## Purpose

This file contains backend-specific implementation detail. The canonical problem, target behavior, scope, status, risks, validation, and completion criteria remain in [`README.md`](./README.md).

## Engineering Rules

- Keep identity, authorization, ownership, server-owned fields, transaction behavior, and failure recovery explicit.
- Map HTTP and infrastructure types at the boundary; application use cases remain neutral where the initiative touches architecture.
- Use versioned migrations, bounded I/O, cancellation, purpose-specific contracts, and negative tests.
- Do not make unrelated refactors while implementing this initiative.

## Backend

- Create a data inventory with category, purpose, source, destination, owner, sensitivity, retention, and deletion/export behavior.
- Minimize each API response to its purpose.
- Implement a current-user export with stable schema and authorization.
- Implement account closure as a workflow that revokes sessions, applies relational policy, handles Blob/media, and records verification.
- Decide hard delete, soft delete, anonymization, and legal/operational retention per data class.
- Restrict and audit privileged support access.
- Avoid placing diet/allergy-like preferences in general logs or public responses.

## Operations

- Define log and backup retention/access, access reviews, and privacy incident handling.

## Tests

- Use synthetic accounts to verify complete export and active-system deletion.
- Test cross-user export/delete denial, stale sessions, missing Blob, partial failure, retries, backup/log disclosures, and privileged-access audit.

## Delivery Order

Follow the implementation phases in the initiative README. Update status and completion evidence only there so the two documents cannot drift.

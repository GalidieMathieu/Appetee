# E-008 — Database Migrations, Integrity, and Concurrency: Backend Implementation

## Purpose

This file contains backend-specific implementation detail. The canonical problem, target behavior, scope, status, risks, validation, and completion criteria remain in [`README.md`](./README.md).

## Engineering Rules

- Keep identity, authorization, ownership, server-owned fields, transaction behavior, and failure recovery explicit.
- Map HTTP and infrastructure types at the boundary; application use cases remain neutral where the initiative touches architecture.
- Use versioned migrations, bounded I/O, cancellation, purpose-specific contracts, and negative tests.
- Do not make unrelated refactors while implementing this initiative.

## Backend

- Adopt a versioned migration mechanism with an immutable history table.
- Mark rebuild/seed scripts as local/test-only and add environment guards.
- Use expand/contract changes when old and new application versions can overlap.
- Add row version or compare-and-swap conditions to mutable authoritative records.
- Return `409 Conflict` for stale updates.
- Add actor/time/version audit fields or append-only audit records where needed.
- Add normalized unique username/email/token constraints after collision analysis.
- Design ownership/state/visibility fields before exposing shared or user-created content.
- Set command timeouts and document deadlock/retry/isolation behavior.

## Infrastructure

- Use separate least-privileged application and migration identities.
- Verify a usable backup/PITR point before risky migrations.
- Capture immutable migration evidence in deployment.

## Documentation

- Document migration creation, review, deployment, failure recovery, and prohibited production scripts.

## Tests

- Apply all migrations to an empty database.
- Apply N-1 to N on representative data and run twice to prove history/idempotency behavior.
- Inject migration failure and verify safe recovery.
- Test duplicate identifiers/tokens, concurrent updates, delete cascades, deadlocks, and target query plans.

## Delivery Order

Follow the implementation phases in the initiative README. Update status and completion evidence only there so the two documents cannot drift.

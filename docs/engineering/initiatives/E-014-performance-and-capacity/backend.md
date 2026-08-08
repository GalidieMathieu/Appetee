# E-014 — API, Frontend, and Capacity Performance: Backend Implementation

## Purpose

This file contains backend-specific implementation detail. The canonical problem, target behavior, scope, status, risks, validation, and completion criteria remain in [`README.md`](./README.md).

## Engineering Rules

- Keep identity, authorization, ownership, server-owned fields, transaction behavior, and failure recovery explicit.
- Map HTTP and infrastructure types at the boundary; application use cases remain neutral where the initiative touches architecture.
- Use versioned migrations, bounded I/O, cancellation, purpose-specific contracts, and negative tests.
- Do not make unrelated refactors while implementing this initiative.

## Backend

- Define bounded page sizes and opaque/stable cursor contracts.
- Use a unique tie breaker such as `(created_at,id)` and add matching indexes only after EXPLAIN.
- Return purpose-specific list projections rather than hydrating detail per item.
- Batch related data or use deliberate joins to eliminate N+1 calls.
- Set command timeouts, propagate cancellation, and define per-instance connection-pool budget.
- Measure slow queries and endpoint latency under representative data.

## Infrastructure

- Capacity-test App Service/MySQL, define scale limits, and verify pool size across instances.
- Set budgets and anomaly alerts where appropriate.

## Tests

- Test maximum page sizes, malformed cursors, stable pagination under concurrent inserts, representative EXPLAIN plans, load, slow dependency, memory, and browser performance.

## Delivery Order

Follow the implementation phases in the initiative README. Update status and completion evidence only there so the two documents cannot drift.

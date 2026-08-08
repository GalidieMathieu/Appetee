# E-004 — Authentication Abuse Protection: Backend Implementation

## Purpose

This file contains backend-specific implementation detail. The canonical problem, target behavior, scope, status, risks, validation, and completion criteria remain in [`README.md`](./README.md).

## Engineering Rules

- Keep identity, authorization, ownership, server-owned fields, transaction behavior, and failure recovery explicit.
- Map HTTP and infrastructure types at the boundary; application use cases remain neutral where the initiative touches architecture.
- Use versioned migrations, bounded I/O, cancellation, purpose-specific contracts, and negative tests.
- Do not make unrelated refactors while implementing this initiative.

## Backend

- Enforce minimum/maximum password length and maximum email/username sizes before expensive work.
- Reject known breached/common passwords using a reviewed approach that does not disclose credentials.
- Normalize email consistently and apply uniqueness to the normalized value.
- Remove or strictly constrain exact email-existence behavior.
- Perform a dummy password hash verification for absent users.
- Partition limits by normalized account and source/network with bounded memory.
- Define progressive delay or temporary lock behavior that avoids easy account-denial abuse.
- Return generic `401` and controlled `429` responses with `Retry-After`.
- Emit privacy-safe counters and alerts without logging credentials.

## Documentation

- Document policy, thresholds, recovery behavior, and alert ownership.

## Tests

- Measure timing distributions for absent account, wrong password, and valid login.
- Test repeated attempts from one account, one source, and distributed sources.
- Bypass the UI with short, long, common, malformed, and oversized credentials.
- Verify rate-limit storage cannot grow without bound.

## Delivery Order

Follow the implementation phases in the initiative README. Update status and completion evidence only there so the two documents cannot drift.

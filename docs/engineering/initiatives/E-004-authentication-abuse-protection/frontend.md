# E-004 — Authentication Abuse Protection: Frontend Implementation

## Purpose

This file contains frontend-specific implementation detail. The canonical problem, target behavior, scope, status, risks, validation, and completion criteria remain in [`README.md`](./README.md).

## Engineering Rules

- The frontend improves usability and state management but never grants authorization or owns authoritative business truth.
- All user-scoped state is cleared on identity change and network waits are bounded.
- Use generated/validated API contracts, documented error states, strict typing, and accessible interaction patterns.
- Do not duplicate the business rules from the initiative README; reference and implement them.

## Frontend

- Apply matching client validation for usability while treating the backend as authoritative.
- Show generic login failure messages.
- Handle `429` and retry timing without revealing whether the account exists.
- Avoid repeatedly calling an existence endpoint during typing.

## Documentation

- Document policy, thresholds, recovery behavior, and alert ownership.

## Delivery Order

Follow the implementation phases in the initiative README. Update status and completion evidence only there so the two documents cannot drift.

# E-001 — User Account Authorization and Ownership: Frontend Implementation

## Purpose

This file contains frontend-specific implementation detail. The canonical problem, target behavior, scope, status, risks, validation, and completion criteria remain in [`README.md`](./README.md).

## Engineering Rules

- The frontend improves usability and state management but never grants authorization or owns authoritative business truth.
- All user-scoped state is cleared on identity change and network waits are bounded.
- Use generated/validated API contracts, documented error states, strict typing, and accessible interaction patterns.
- Do not duplicate the business rules from the initiative README; reference and implement them.

## Frontend

- Use current-user endpoints only.
- Remove stored or route-provided account IDs from profile mutations.
- Clear all user-scoped stores when identity changes, logout occurs, or session restoration fails.
- Do not treat route guards or hidden controls as authorization.

## Documentation

- Document the current-user route contract and account-deletion semantics.

## Delivery Order

Follow the implementation phases in the initiative README. Update status and completion evidence only there so the two documents cannot drift.

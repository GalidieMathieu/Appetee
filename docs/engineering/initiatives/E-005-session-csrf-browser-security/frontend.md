# E-005 — Session, CSRF, and Browser Security: Frontend Implementation

## Purpose

This file contains frontend-specific implementation detail. The canonical problem, target behavior, scope, status, risks, validation, and completion criteria remain in [`README.md`](./README.md).

## Engineering Rules

- The frontend improves usability and state management but never grants authorization or owns authoritative business truth.
- All user-scoped state is cleared on identity change and network waits are bounded.
- Use generated/validated API contracts, documented error states, strict typing, and accessible interaction patterns.
- Do not duplicate the business rules from the initiative README; reference and implement them.

## Frontend

- Retrieve and send the antiforgery token through the API interceptor.
- Handle expired/revoked sessions by clearing all user-scoped state and returning to a safe route.
- Do not retry state-changing requests blindly after authentication or CSRF failure.
- Avoid inline/eval patterns that prevent a restrictive CSP.
- Configure the Express host with matching browser headers and cache rules.

## Documentation

- Record the domain topology, cookie contract, reauthentication rules, and key-persistence design.

## Delivery Order

Follow the implementation phases in the initiative README. Update status and completion evidence only there so the two documents cannot drift.

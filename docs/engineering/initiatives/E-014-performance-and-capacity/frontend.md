# E-014 — API, Frontend, and Capacity Performance: Frontend Implementation

## Purpose

This file contains frontend-specific implementation detail. The canonical problem, target behavior, scope, status, risks, validation, and completion criteria remain in [`README.md`](./README.md).

## Engineering Rules

- The frontend improves usability and state management but never grants authorization or owns authoritative business truth.
- All user-scoped state is cleared on identity change and network waits are bounded.
- Use generated/validated API contracts, documented error states, strict typing, and accessible interaction patterns.
- Do not duplicate the business rules from the initiative README; reference and implement them.

## Frontend

- Use pagination/infinite loading with cancellation and deduplication.
- Avoid requesting details for every card unless needed.
- Serve hashed assets with immutable caching and HTML with short/no-cache behavior.
- Enable compression and responsive/canonical images.
- Self-host or deliberately govern external fonts/images and avoid layout shifts.
- Measure LCP, INP, CLS, bundle budgets, and retry behavior.

## Delivery Order

Follow the implementation phases in the initiative README. Update status and completion evidence only there so the two documents cannot drift.

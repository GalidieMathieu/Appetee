# E-009 — Server-Authoritative Nutrition and Cost Calculations: Frontend Implementation

## Purpose

This file contains frontend-specific implementation detail. The canonical problem, target behavior, scope, status, risks, validation, and completion criteria remain in [`README.md`](./README.md).

## Engineering Rules

- The frontend improves usability and state management but never grants authorization or owns authoritative business truth.
- All user-scoped state is cleared on identity change and network waits are bounded.
- Use generated/validated API contracts, documented error states, strict typing, and accessible interaction patterns.
- Do not duplicate the business rules from the initiative README; reference and implement them.

## Frontend

- Submit ingredient ID, quantity, and unit only for authoritative calculation.
- Display server-returned totals.
- Optionally calculate a clearly nonauthoritative preview using shared/generated rules where practical.
- Handle recalculation differences and server validation errors.

## Documentation

- Document formulas, units, rounding, source precedence, and versioning.

## Delivery Order

Follow the implementation phases in the initiative README. Update status and completion evidence only there so the two documents cannot drift.

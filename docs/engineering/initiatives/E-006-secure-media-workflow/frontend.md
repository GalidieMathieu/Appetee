# E-006 — Secure Media Upload and Storage Consistency: Frontend Implementation

## Purpose

This file contains frontend-specific implementation detail. The canonical problem, target behavior, scope, status, risks, validation, and completion criteria remain in [`README.md`](./README.md).

## Engineering Rules

- The frontend improves usability and state management but never grants authorization or owns authoritative business truth.
- All user-scoped state is cleared on identity change and network waits are bounded.
- Use generated/validated API contracts, documented error states, strict typing, and accessible interaction patterns.
- Do not duplicate the business rules from the initiative README; reference and implement them.

## Frontend

- Validate size/type early for user feedback, while documenting that server validation is authoritative.
- Show upload progress, rejection reasons, retry state, and final processing state.
- Do not construct trusted Blob URLs or assume upload success before the server confirms active media.

## Documentation

- Document the media state machine, limits, accepted formats, and repair procedure.

## Delivery Order

Follow the implementation phases in the initiative README. Update status and completion evidence only there so the two documents cannot drift.

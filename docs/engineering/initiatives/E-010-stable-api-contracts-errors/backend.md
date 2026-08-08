# E-010 — Stable API Contracts and Error Responses: Backend Implementation

## Purpose

This file contains backend-specific implementation detail. The canonical problem, target behavior, scope, status, risks, validation, and completion criteria remain in [`README.md`](./README.md).

## Engineering Rules

- Keep identity, authorization, ownership, server-owned fields, transaction behavior, and failure recovery explicit.
- Map HTTP and infrastructure types at the boundary; application use cases remain neutral where the initiative touches architecture.
- Use versioned migrations, bounded I/O, cancellation, purpose-specific contracts, and negative tests.
- Do not make unrelated refactors while implementing this initiative.

## Backend

- Use one exception-handler/ProblemDetails pipeline in Testing, Development, and Production; vary detail disclosure only.
- Define status semantics for validation, authentication, authorization, missing resources, conflict, rate limit, unsupported media, and payload too large.
- Apply maximum lengths, counts, ranges, precision, and body sizes server-side.
- Use request DTOs containing only client-owned fields.
- Publish a versioned OpenAPI contract and remove unavailable placeholder routes.
- Add compatibility/deprecation rules and an automated breaking-change diff.

## Documentation

- Document API conventions once; feature docs reference them rather than restating global behavior.

## Tests

- Restore all backend tests to green and add schema assertions for ProblemDetails.
- Test malformed JSON, unknown fields, overposting, boundary sizes, environment parity, serialization names, and N-1 compatibility.
- Compile the generated Angular client in CI.

## Delivery Order

Follow the implementation phases in the initiative README. Update status and completion evidence only there so the two documents cannot drift.

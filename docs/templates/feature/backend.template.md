# F-XXX — Feature Name — Backend

## Canonical Contract

The feature [`README.md`](./README.md) owns shared data requirements, database-impact requirements, API routes, request/response contracts, and product error semantics.

This document describes how the backend implements that approved contract.

Do not redefine incompatible API or persistence behavior here.

## Backend Goal

Describe the backend responsibility for this feature.

## Authorization and Ownership

Document:

- authentication requirement;
- actor/role requirements;
- ownership rules;
- how current-user identity is derived;
- any administrative policy.

Do not trust a browser-supplied user ID when the operation is for the authenticated user.

## API Layer

### Controller responsibilities

- Parse/map HTTP input.
- Use authenticated principal.
- Call application use case.
- Map result to documented HTTP response.
- Expose OpenAPI contract.

## Application Layer

Describe relevant commands, queries, handlers/services, validation and policies.

## Domain Rules

Document significant invariants or state transitions.

## Persistence

### Tables

Canonical schema requirements are defined in `README.md`.

Explain how this backend uses them.

### Repository/read-store responsibilities

- 

### SQL access patterns

Document significant query shapes.

### Index validation

For indexes specified by the feature README:

- verify they exist through E-008 migration;
- validate significant access plans with `EXPLAIN`;
- record evidence when performance matters.

Do not add undocumented speculative indexes during implementation.

## Transactions

Describe transaction boundaries.

If multiple resources such as MySQL and Azure Blob Storage are involved, document failure/reconciliation behavior and relevant engineering initiative.

## Concurrency

When mutable shared data is involved, define:

- stale-update behavior;
- optimistic concurrency/version check;
- duplicate request behavior;
- conflict response.

State `Not applicable` if unnecessary.

## Idempotency

Describe mutation replay behavior when relevant.

## Validation

Document server-authoritative limits:

- string lengths;
- numeric ranges;
- collection counts;
- file limits;
- referenced ID validation;
- cross-field validation.

Frontend validation is not trusted as the backend boundary.

## Mapping

Describe relevant mappings:

```text
Persistence row
→ domain/application result
→ API DTO
```

Avoid frontend-driven N+1 hydration when the backend can return the required aggregate/projection efficiently.

## External Services

When applicable, document timeout, retry, failure and consistency behavior.

## Error Mapping

Implement the outcomes defined by the feature README.

Use the common E-010 ProblemDetails/error contract.

## Logging and Observability

Document important privacy-safe logs, metrics and traces.

Never log passwords, authentication tokens, verification/reset tokens, secrets, or unnecessary personal payloads.

## Database Migration

When schema changes exist, document migration ID/name, forward migration, backfill, compatibility, rollback/roll-forward considerations and migration tests.

Migration mechanics are owned by E-008.

## Testing

### Unit

- [ ]

### Integration

- [ ]

### Authorization/ownership

- [ ]

### Contract

- [ ]

### Migration/database

- [ ]

### Concurrency/idempotency

- [ ]

### Failure/retry

- [ ]

## Implementation Notes

Add backend-specific guidance that does not change the shared feature contract.

## Dependencies

List relevant engineering initiatives.

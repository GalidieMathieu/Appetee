# E-XXX — Engineering Initiative Name — Backend

## Canonical Plan

The initiative [`README.md`](./README.md) owns the technical goal, scope, phases and cross-system decisions.

This document contains backend implementation detail only.

## Current Backend Architecture

Describe relevant API controllers, application services/handlers, domain logic, infrastructure repositories/query services, database, and external integrations.

## Target Backend Architecture

Describe the intended dependency direction.

Preferred Appetee direction:

```text
API
    ↓
Application
    ↓
Domain

Infrastructure implements application/domain ports
```

Do not introduce layers or modules that provide no useful separation.

## Module Ownership

Identify which module owns each capability.

Do not create placeholder modules for unapproved future features.

## API Boundary

Describe request mapping, authentication, authorization, validation, status mapping and OpenAPI impact.

## Application Boundary

Describe use cases, commands, queries, handlers/services, transaction intent and neutral interfaces.

## Domain Rules

Describe meaningful invariants or state transitions.

## Persistence

Describe repository/read-store ownership, SQL responsibilities, transaction boundaries, query projections and pagination.

## Database Impact

Canonical cross-system requirements belong in the initiative README or related feature README.

Here describe implementation mechanics:

```text
Migration:
Tables:
Constraints:
Indexes:
Backfill:
EXPLAIN evidence:
```

## Concurrency and Idempotency

Describe optimistic concurrency, duplicate submissions, retry behavior, race conditions, and background processing where applicable.

## External Resource Consistency

When MySQL plus Blob/email/external API is involved, describe ordering, partial failure, compensation, reconciliation and retry.

## Security Boundaries

Document identity source, authorization policy, ownership, sensitive fields and logging/redaction.

## Observability

Document metrics, traces, structured logs and relevant alerts.

## Migration Strategy

Prefer incremental refactoring over a complete rewrite.

Describe old/new compatibility and removal order.

## Testing

- [ ] Unit.
- [ ] Application/use-case.
- [ ] MySQL integration.
- [ ] Authorization matrix.
- [ ] Contract/OpenAPI.
- [ ] Migration.
- [ ] Concurrency/idempotency.
- [ ] Failure/reconciliation.
- [ ] Performance/query-plan.

## Completion Evidence

Record:

```text
Files changed:
Migration:
Tests:
Commands:
Results:
EXPLAIN/performance evidence:
Manual evidence:
Remaining migration:
```

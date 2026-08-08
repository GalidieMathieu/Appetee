# E-015 — Backend Module Boundaries and Domain Model Refactoring: Backend Implementation

## Purpose

This file contains backend-specific implementation detail. The canonical problem, target behavior, scope, status, risks, validation, and completion criteria remain in [`README.md`](./README.md).

## Engineering Rules

- Keep identity, authorization, ownership, server-owned fields, transaction behavior, and failure recovery explicit.
- Map HTTP and infrastructure types at the boundary; application use cases remain neutral where the initiative touches architecture.
- Use versioned migrations, bounded I/O, cancellation, purpose-specific contracts, and negative tests.
- Do not make unrelated refactors while implementing this initiative.

## Backend

- Define allowed dependencies: API → Application/Domain; Infrastructure implements Application ports; Domain/Application do not depend on ASP.NET, Dapper, MySQL, or Azure SDK types.
- Map `IFormFile`, HTTP claims, route values, and multipart forms at the API boundary into neutral commands and media streams/metadata.
- Introduce focused handlers such as `CreateRecipeHandler`, repositories/read stores, calculators, media ports, and current-user services.
- Split large query classes by use case and persistence responsibility without creating one interface per SQL statement.
- Organize by business module while preserving one deployable application.
- Add architecture tests for forbidden dependencies and module boundaries.
- Define integration events/outbox use only for durable cross-module or background work.

## Domain/Data

- Model Accounts/Households/membership before shared ownership.
- Model creator, owner, visibility, moderation, version, and actor before user-created recipes.
- Model canonical units, source, currency, store/product/package, effective dates, and calculation versions before Walmart/multi-store pricing.
- Model meal plan, entries, generation state, locked overrides, grocery list/item/source, and idempotent background operations before implementation.

## Documentation

- Maintain one backend architecture document and ADRs only for expensive-to-reverse decisions.

## Tests

- Unit-test handlers with neutral ports.
- Run integration tests for adapters and failure boundaries.
- Use architecture tests to reject ASP.NET/Azure/Dapper references from inner modules.
- Write domain examples for ownership, substitutions, price history, regeneration, and partial job failure.

## Delivery Order

Follow the implementation phases in the initiative README. Update status and completion evidence only there so the two documents cannot drift.

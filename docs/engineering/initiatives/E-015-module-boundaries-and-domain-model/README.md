# E-015 — Backend Module Boundaries and Domain Model Refactoring

## Initiative Information

- **Status:** Ready for implementation
- **Type:** Engineering initiative
- **Priority:** Medium
- **Implementation order:** 15
- **Last updated:** 2026-08-06

## Goal

Evolve the existing layered backend into a modular monolith with transport-neutral use cases and explicit domain concepts for planned product features.

## Problem

The three-project backend is a useful starting point, but `Application` depends on ASP.NET types and large infrastructure query classes mix SQL, mapping, transactions, Blob lifecycle, cleanup, and business orchestration. The current data model also lacks store/time/source/unit, ownership, household, moderation, planning, and background-work concepts required by the roadmap.

## Why This Matters

Slower feature delivery, harder review/testing, and rising defect rate. Dependency direction and use-case boundaries are blurred; domain rules are tied to transport and infrastructure.

Expensive rework, unreliable recommendations/prices, and inability to explain or recalculate results. Missing domain concepts force transport/UI code to become the de facto model.

## Current Behavior

- Application references Microsoft.AspNetCore.App and exposes HttpContext/IFormFile in application abstractions/services. RecipeQueries is roughly 500 lines and combines SQL orchestration, mapping, transaction control, Blob lifecycle, and cleanup; IngredientQueries follows the same pattern. Naming alternates among queries and repositories.
- Pricing/nutrition are flattened into recipe/ingredient values without store, currency, source, effective date, normalized unit/conversion, provenance, or calculation version. There is no meal-plan/grocery schema despite 501 routes; recipes lack creator/household/moderation lifecycle; user roles and background-job/idempotency concepts are absent.

## Target Behavior

Appetee remains one deployable modular monolith. Business modules expose neutral commands/queries and ports. API code maps HTTP into those use cases, Infrastructure implements Dapper/Blob adapters, and planned domains are modeled before features are added rather than appended as nullable columns and UI logic.

## Scope

### Included

- Modular monolith boundaries
- Dependency direction and architecture tests
- Removal of `HttpContext`/`IFormFile` from application contracts
- Use-case handlers and focused ports
- Decomposition of large query classes
- Consistent repository/read-store vocabulary
- Accounts/Households/Catalog/Recipes/Nutrition/Pricing/Favorites/MealPlanning/Grocery/Media modules
- Ownership/visibility/moderation
- Durable background-work state and integration events

### Excluded

- Microservice extraction without measured need
- Immediate security containment, which precedes broad refactoring
- Full implementation of each future product feature

## Systems Affected

- `Appetee.Api`, `Appetee.Application`, `Appetee.Infrastructure`
- Potential `Appetee.Domain` project or domain namespaces
- Recipe/ingredient query classes
- Dapper and Blob adapters
- MySQL schemas and future workers
- Angular feature boundaries as consumers of API modules

## Required Change Summary

### Backend

- Define allowed dependencies: API → Application/Domain; Infrastructure implements Application ports; Domain/Application do not depend on ASP.NET, Dapper, MySQL, or Azure SDK types.
- Map `IFormFile`, HTTP claims, route values, and multipart forms at the API boundary into neutral commands and media streams/metadata.

Remaining backend implementation details are maintained in [`backend.md`](./backend.md).

### Domain/Data

- Model Accounts/Households/membership before shared ownership.
- Model creator, owner, visibility, moderation, version, and actor before user-created recipes.

Remaining domain/data implementation details are maintained in [`backend.md`](./backend.md).

### Tests

- Unit-test handlers with neutral ports.
- Run integration tests for adapters and failure boundaries.

Remaining tests implementation details are maintained in [`backend.md`](./backend.md).

### Documentation

- Maintain one backend architecture document and ADRs only for expensive-to-reverse decisions.

## Implementation Phases

Phases are completed in order unless a documented dependency requires otherwise. A phase that changes code is not complete until its listed tests pass. A phase containing only configuration, documentation, or operational work must attach equivalent validation evidence.

### Phase 1 — Define module boundaries and characterization tests

**Status:** Not started

#### Changes

- Document target feature modules and allowed dependencies.
- Choose one high-value module for incremental migration.
- Protect current behavior with characterization tests.

#### Tests and validation

- [ ] Architecture dependency tests.
- [ ] Existing API/integration behavior remains green before refactor.

#### Phase completion rule

- [ ] All scoped changes are implemented or explicitly documented as not applicable.
- [ ] Every required automated test passes.
- [ ] Required manual, staging, migration, or operational evidence is attached.
- [ ] The initiative `Work Status` section is updated with verified evidence.

### Phase 2 — Decouple application use cases from HTTP and Azure types

**Status:** Not started

#### Changes

- Replace HttpContext/IFormFile/Azure concerns with neutral commands and ports in the selected module.
- Keep mapping at API/infrastructure boundaries.

#### Tests and validation

- [ ] Application/domain compile-time dependency tests.
- [ ] Use-case unit tests without web host or Azure SDK.

#### Phase completion rule

- [ ] All scoped changes are implemented or explicitly documented as not applicable.
- [ ] Every required automated test passes.
- [ ] Required manual, staging, migration, or operational evidence is attached.
- [ ] The initiative `Work Status` section is updated with verified evidence.

### Phase 3 — Split persistence and orchestration responsibilities

**Status:** Not started

#### Changes

- Break large query classes into focused repositories/adapters and use-case orchestration.
- Make transaction and external-resource boundaries explicit.

#### Tests and validation

- [ ] Repository integration tests, transaction/failure tests, and regression API tests.

#### Phase completion rule

- [ ] All scoped changes are implemented or explicitly documented as not applicable.
- [ ] Every required automated test passes.
- [ ] Required manual, staging, migration, or operational evidence is attached.
- [ ] The initiative `Work Status` section is updated with verified evidence.

### Phase 4 — Evolve the domain model for planned capabilities

**Status:** Not started

#### Changes

- Add normalized units, provenance/effective dates, ownership/visibility, workflow state, idempotency, and calculation versions as required by features.
- Avoid premature microservices.

#### Tests and validation

- [ ] Domain examples for pricing, planning, ownership, and workflow.
- [ ] Migration, concurrency, and recalculation tests for introduced primitives.

#### Phase completion rule

- [ ] All scoped changes are implemented or explicitly documented as not applicable.
- [ ] Every required automated test passes.
- [ ] Required manual, staging, migration, or operational evidence is attached.
- [ ] The initiative `Work Status` section is updated with verified evidence.

## Work Status

### Completed

None. Creating this plan does not count as implementation.

### In Progress

None.

### Remaining

- [ ] Mandatory dependency rules are documented and enforced.
- [ ] High-risk/touched use cases use neutral commands and focused ports.
- [ ] Large mixed-responsibility query workflows are decomposed incrementally.
- [ ] Domain concepts required by each planned feature exist before that feature ships.
- [ ] The system remains a modular monolith unless measured evidence justifies extraction.

## Risks and Edge Cases

- A large-bang clean-architecture rewrite can stop product delivery without reducing immediate risk.
- Too many tiny interfaces/handlers can create ceremony without useful boundaries.
- A domain model invented before product rules are known can be as harmful as no model.
- Microservices would add distributed failure and operations before there is measured need.

## Product Features Affected

- Recipe and ingredient administration
- Meal planning and grocery
- Favorites and collections
- Households and sharing
- Walmart/multi-store pricing
- Imports, recommendations, notifications, and background jobs

## Validation

- Application/domain modules compile without ASP.NET/Azure/Dapper dependencies for migrated use cases.
- Controllers contain transport mapping rather than business orchestration.
- Handlers are unit-testable with neutral ports.
- Architecture tests enforce module dependencies.
- Planned feature examples have explicit ownership, units, provenance, version, and failure behavior.

## Completion Criteria

- [ ] Mandatory dependency rules are documented and enforced.
- [ ] High-risk/touched use cases use neutral commands and focused ports.
- [ ] Large mixed-responsibility query workflows are decomposed incrementally.
- [ ] Domain concepts required by each planned feature exist before that feature ships.
- [ ] The system remains a modular monolith unless measured evidence justifies extraction.

## Decisions

- The target architecture is a modular monolith, not microservices.
- Feature/use-case boundaries take precedence over large technical-layer classes.
- Refactoring is incremental and follows active feature/security work.

## Detailed Implementation Documents

- [Backend implementation](./backend.md)

## Traceability

The codes below are retained only to map this implementation plan to the historical problem register.

| Reference | Problem |
|---|---|
| ARC-001 | Layer boundaries are coupled to HTTP/storage and query classes mix responsibilities |
| ARC-003 | Current domain model cannot safely support planned pricing, planning, and multi-user features |

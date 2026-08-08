# E-014 — API, Frontend, and Capacity Performance

## Initiative Information

- **Status:** Ready for implementation
- **Type:** Engineering initiative
- **Priority:** Medium
- **Implementation order:** 14
- **Last updated:** 2026-08-06

## Goal

Bound collection work, remove N+1 behavior, optimize delivery, and establish measured capacity and connection budgets before growth.

## Problem

Catalogue endpoints can return unbounded data, recipe hydration causes repeated calls, matching cursor indexes and performance targets are absent, and static assets/fonts/images lack deliberate caching and compression policy. Azure autoscale, MySQL pool budget, and representative load behavior are unverified.

## Why This Matters

Slow pages, higher Azure cost, timeouts, and reduced concurrent-user capacity. Work scales with the entire catalogue and then multiplies across detail hydration.

Slower UX, unnecessary bandwidth/cost, and inconsistent presentation. Delivery policy is delegated to host defaults and external origins.

## Current Behavior

- GET /api/recipes and GET /api/ingredients accept no pagination/search. RecipeSql loads four broad datasets and assembles results in memory. The frontend then hydrates recipe details sequentially per ID, while stores retain unbounded lists/detail maps.
- Express has no explicit compression or cache policy. Google Fonts is loaded in index.html and again via theme import; home uses a hard-coded Unsplash image. No NgOptimizedImage/lazy-loading/dimension strategy was found.

## Target Behavior

All lists are bounded with stable cursor contracts, queries return purpose-specific projections without N+1 work, indexes are justified by measured plans, frontend assets use correct cache/compression/image behavior, and capacity tests establish safe instance, connection, and latency limits.

## Scope

### Included

- Cursor pagination and caps
- Stable sort/tie breaker
- Query projection and batch hydration
- Query-plan-driven indexes
- Timeout/cancellation and connection budget
- Frontend image/font/cache/compression
- Core Web Vitals
- Representative load/capacity tests
- Autoscale and cost considerations
- Performance telemetry

### Excluded

- General observability platform, E-012
- Pricing domain design, E-015

## Systems Affected

- Recipe and ingredient APIs
- Dapper read queries
- Angular stores/facades and list UI
- Express static host
- Azure App Service and MySQL pool
- Images, fonts, bundles, and external assets

## Required Change Summary

### Backend

- Define bounded page sizes and opaque/stable cursor contracts.
- Use a unique tie breaker such as `(created_at,id)` and add matching indexes only after EXPLAIN.

Remaining backend implementation details are maintained in [`backend.md`](./backend.md).

### Frontend

- Use pagination/infinite loading with cancellation and deduplication.
- Avoid requesting details for every card unless needed.

Remaining frontend implementation details are maintained in [`frontend.md`](./frontend.md).

### Infrastructure

- Capacity-test App Service/MySQL, define scale limits, and verify pool size across instances.
- Set budgets and anomaly alerts where appropriate.

### Tests

- Test maximum page sizes, malformed cursors, stable pagination under concurrent inserts, representative EXPLAIN plans, load, slow dependency, memory, and browser performance.

## Implementation Phases

Phases are completed in order unless a documented dependency requires otherwise. A phase that changes code is not complete until its listed tests pass. A phase containing only configuration, documentation, or operational work must attach equivalent validation evidence.

### Phase 1 — Measure the baseline

**Status:** Not started

#### Changes

- Define key API, database, frontend, and hosting performance metrics.
- Capture representative catalogue/admin/home traces and bundle/asset metrics.

#### Tests and validation

- [ ] Repeatable benchmark script and baseline report.
- [ ] Performance test data and environment documented.

#### Phase completion rule

- [ ] All scoped changes are implemented or explicitly documented as not applicable.
- [ ] Every required automated test passes.
- [ ] Required manual, staging, migration, or operational evidence is attached.
- [ ] The initiative `Work Status` section is updated with verified evidence.

### Phase 2 — Bound and optimize data access

**Status:** Not started

#### Changes

- Add stable pagination and maximum limits.
- Remove N+1 hydration and reduce over-fetching.
- Add indexes only from measured query plans.

#### Tests and validation

- [ ] Pagination/order/boundary tests.
- [ ] Query-count assertions, EXPLAIN evidence, and API load tests.

#### Phase completion rule

- [ ] All scoped changes are implemented or explicitly documented as not applicable.
- [ ] Every required automated test passes.
- [ ] Required manual, staging, migration, or operational evidence is attached.
- [ ] The initiative `Work Status` section is updated with verified evidence.

### Phase 3 — Optimize frontend delivery

**Status:** Not started

#### Changes

- Improve image sizing/formats, fonts, cache headers, compression, and third-party dependency strategy.
- Keep bundle budgets meaningful.

#### Tests and validation

- [ ] Lighthouse/Web Vitals-style lab checks, cache/compression header tests, and bundle-budget gates.

#### Phase completion rule

- [ ] All scoped changes are implemented or explicitly documented as not applicable.
- [ ] Every required automated test passes.
- [ ] Required manual, staging, migration, or operational evidence is attached.
- [ ] The initiative `Work Status` section is updated with verified evidence.

### Phase 4 — Validate capacity and SLOs

**Status:** Not started

#### Changes

- Capacity-test App Service, MySQL, Blob, and critical workflows.
- Define scaling and cost thresholds.

#### Tests and validation

- [ ] Staging load/soak tests with latency/error/resource assertions.
- [ ] Alert tests at capacity thresholds.

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

- [ ] Bounded cursor APIs and matching query plans are deployed.
- [ ] N+1 hydration is removed.
- [ ] Timeout, cancellation, and pool budgets are documented and tested.
- [ ] Frontend asset delivery is optimized and measured.
- [ ] Capacity and scale behavior are validated.

## Risks and Edge Cases

- Offset pagination degrades and shifts under concurrent writes.
- Adding indexes speculatively increases write cost.
- Excess per-instance pools can exhaust MySQL after scale-out.
- Caching personalized responses can expose data.

## Product Features Affected

- Recipe and ingredient catalogue
- Search and browsing
- Meal planning candidate selection
- Administration lists
- Frontend loading performance

## Validation

- Every collection endpoint has a hard cap and stable ordering.
- Representative recipe lists execute without client/server N+1 behavior.
- EXPLAIN and telemetry support each new index.
- Load tests stay within agreed latency/error/connection budgets.
- Core Web Vitals and cache/compression checks meet defined targets.

## Completion Criteria

- [ ] Bounded cursor APIs and matching query plans are deployed.
- [ ] N+1 hydration is removed.
- [ ] Timeout, cancellation, and pool budgets are documented and tested.
- [ ] Frontend asset delivery is optimized and measured.
- [ ] Capacity and scale behavior are validated.

## Decisions

- Performance changes are driven by contracts and measurements.
- Personalized/sensitive responses are never cached publicly.

## Detailed Implementation Documents

- [Backend implementation](./backend.md)
- [Frontend implementation](./frontend.md)

## Traceability

The codes below are retained only to map this implementation plan to the historical problem register.

| Reference | Problem |
|---|---|
| PERF-001 | Catalogue APIs are unbounded and recipe hydration causes N+1 calls |
| PERF-002 | Static asset, external image/font, cache, and compression controls are incomplete |

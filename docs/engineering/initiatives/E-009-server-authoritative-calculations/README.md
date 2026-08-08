# E-009 — Server-Authoritative Nutrition and Cost Calculations

## Initiative Information

- **Status:** Ready for implementation
- **Type:** Engineering initiative
- **Priority:** High
- **Implementation order:** 9
- **Last updated:** 2026-08-06

## Goal

Move authoritative recipe totals out of Angular and model normalized inputs, calculation rules, provenance, and versions on the server.

## Problem

Angular calculates calories, macros, and estimated cost, submits those totals, and the API persists them after only nonnegative checks. A caller can tamper with multipart fields, and future clients can calculate differently. Current ingredient and price data lacks sufficient unit, source, effective-date, and version semantics for reliable recalculation.

## Why This Matters

Users receive misleading dietary/nutrition information, pricing becomes untrustworthy, and catalogue integrity is lost. A lower-trust client controls derived authoritative values without reproducible server calculation or provenance.

## Current Behavior

- Angular calculates calories, macronutrients, and cost using submitted quantities and basis values, then sends totals. The backend validates only nonnegative totals and persists them unchanged; database checks likewise enforce only nonnegativity.

## Target Behavior

Clients submit recipe ingredients with normalized amount and unit. The backend loads versioned nutrition and price facts, converts units, calculates deterministic totals, persists inputs and calculation metadata, and returns computed results. The frontend may show a preview but never supplies authoritative totals.

## Scope

### Included

- Canonical quantity/unit model
- Server calculator
- Rounding and precision rules
- Nutrition and price provenance/version
- Effective dates
- Recipe calculation transaction
- Historical recalculation policy
- Frontend preview and mismatch handling
- Tamper and deterministic tests

### Excluded

- Complete multi-store pricing feature, designed under E-015
- General admin authorization, E-002

## Systems Affected

- Recipe admin form and facade
- Recipe request/response contract
- Recipe application handler and calculator
- Ingredient nutrition/pricing data
- Recipe schema and migrations
- Generated Angular API client

## Required Change Summary

### Backend

- Remove authoritative total fields from create/update commands or explicitly ignore/compare them as previews.
- Define canonical quantity and unit value objects and supported conversions.

Remaining backend implementation details are maintained in [`backend.md`](./backend.md).

### Frontend

- Submit ingredient ID, quantity, and unit only for authoritative calculation.
- Display server-returned totals.

Remaining frontend implementation details are maintained in [`frontend.md`](./frontend.md).

### Database

- Add normalized units/conversions and calculation/provenance fields through versioned migrations.
- Do not flatten changing prices into a single timeless ingredient value.

### Tests

- Tamper with every total, factor, unit, and ingredient field.
- Test conversion boundaries, unsupported units, decimal precision, deterministic rounding, effective dates, and historical recalculation.

Remaining tests implementation details are maintained in [`backend.md`](./backend.md).

### Documentation

- Document formulas, units, rounding, source precedence, and versioning.

## Implementation Phases

Phases are completed in order unless a documented dependency requires otherwise. A phase that changes code is not complete until its listed tests pass. A phase containing only configuration, documentation, or operational work must attach equivalent validation evidence.

### Phase 1 — Define normalized calculation rules

**Status:** Not started

#### Changes

- Define supported units, conversion factors, rounding, serving semantics, source/provenance, and calculation version.
- Write deterministic examples before implementation.

#### Tests and validation

- [ ] Unit-conversion, rounding, missing-fact, invalid-quantity, and impossible-calculation tests.

#### Phase completion rule

- [ ] All scoped changes are implemented or explicitly documented as not applicable.
- [ ] Every required automated test passes.
- [ ] Required manual, staging, migration, or operational evidence is attached.
- [ ] The initiative `Work Status` section is updated with verified evidence.

### Phase 2 — Implement authoritative backend calculation

**Status:** Not started

#### Changes

- Calculate nutrition and estimated cost from stored ingredient facts inside the command workflow.
- Persist calculation inputs/version and ignore client-derived totals.

#### Tests and validation

- [ ] Backend domain/unit tests and integration tests with tampered totals.
- [ ] Transaction and concurrency tests for recipe writes.

#### Phase completion rule

- [ ] All scoped changes are implemented or explicitly documented as not applicable.
- [ ] Every required automated test passes.
- [ ] Required manual, staging, migration, or operational evidence is attached.
- [ ] The initiative `Work Status` section is updated with verified evidence.

### Phase 3 — Align API and frontend previews

**Status:** Not started

#### Changes

- Remove authoritative totals from mutation requests.
- Use server-returned calculations and label estimates correctly.
- Keep client calculation only as a nonauthoritative preview if retained.

#### Tests and validation

- [ ] Contract/OpenAPI tests.
- [ ] Frontend tests proving submitted/tampered totals cannot control stored values.

#### Phase completion rule

- [ ] All scoped changes are implemented or explicitly documented as not applicable.
- [ ] Every required automated test passes.
- [ ] Required manual, staging, migration, or operational evidence is attached.
- [ ] The initiative `Work Status` section is updated with verified evidence.

### Phase 4 — Support controlled recalculation

**Status:** Not started

#### Changes

- Define historical behavior when price/nutrition sources change.
- Add controlled recalculation/version migration procedures.

#### Tests and validation

- [ ] Historical-version and recalculation regression tests.
- [ ] Representative recipe/serving/adaptive-nutrition scenarios.

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

- [ ] Recipe mutation contracts no longer trust client totals.
- [ ] Canonical units and deterministic calculators are implemented.
- [ ] Calculation provenance/versioning is persisted as required.
- [ ] Historical recalculation behavior is decided and tested.
- [ ] Frontend uses returned authoritative values.

## Risks and Edge Cases

- Floating-point arithmetic can create inconsistent totals; use defined decimal rules.
- Changing source data can silently alter old recipe values without a version policy.
- Unit conversion errors can produce plausible but wrong nutrition and price results.
- Price estimates may imply accuracy beyond the available store data.

## Product Features Affected

- Recipe administration
- Recipe display
- Diet and nutrition decisions
- Budget filtering
- Walmart and multi-store pricing
- Meal-plan and grocery estimates

## Validation

- Tampered client totals are ignored or rejected.
- The same inputs and calculation version always produce the same result.
- Unsupported or ambiguous units fail clearly.
- Stored results can be traced to inputs and source/version metadata.
- Angular displays server-authoritative values.

## Completion Criteria

- [ ] Recipe mutation contracts no longer trust client totals.
- [ ] Canonical units and deterministic calculators are implemented.
- [ ] Calculation provenance/versioning is persisted as required.
- [ ] Historical recalculation behavior is decided and tested.
- [ ] Frontend uses returned authoritative values.

## Decisions

- The server is authoritative for derived nutrition and cost.
- Calculation inputs and versions are retained sufficiently to explain results.

## Detailed Implementation Documents

- [Backend implementation](./backend.md)
- [Frontend implementation](./frontend.md)

## Traceability

The codes below are retained only to map this implementation plan to the historical problem register.

| Reference | Problem |
|---|---|
| DB-002 | Browser-calculated nutrition and cost are stored as authoritative data |
| ARC-003 | Current domain model cannot safely support planned pricing, planning, and multi-user features |

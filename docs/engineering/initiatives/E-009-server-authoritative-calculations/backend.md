# E-009 — Server-Authoritative Nutrition and Cost Calculations: Backend Implementation

## Purpose

This file contains backend-specific implementation detail. The canonical problem, target behavior, scope, status, risks, validation, and completion criteria remain in [`README.md`](./README.md).

## Engineering Rules

- Keep identity, authorization, ownership, server-owned fields, transaction behavior, and failure recovery explicit.
- Map HTTP and infrastructure types at the boundary; application use cases remain neutral where the initiative touches architecture.
- Use versioned migrations, bounded I/O, cancellation, purpose-specific contracts, and negative tests.
- Do not make unrelated refactors while implementing this initiative.

## Backend

- Remove authoritative total fields from create/update commands or explicitly ignore/compare them as previews.
- Define canonical quantity and unit value objects and supported conversions.
- Load effective nutrition and price facts within a controlled calculation use case.
- Define deterministic decimal precision and rounding at each stage.
- Persist source inputs, calculation version, and effective data references needed to explain results.
- Recalculate totals on every authoritative recipe mutation.
- Define how historical recipes behave when nutrition or prices change.

## Database

- Add normalized units/conversions and calculation/provenance fields through versioned migrations.
- Do not flatten changing prices into a single timeless ingredient value.

## Documentation

- Document formulas, units, rounding, source precedence, and versioning.

## Tests

- Tamper with every total, factor, unit, and ingredient field.
- Test conversion boundaries, unsupported units, decimal precision, deterministic rounding, effective dates, and historical recalculation.
- Compile generated frontend contracts from OpenAPI.

## Delivery Order

Follow the implementation phases in the initiative README. Update status and completion evidence only there so the two documents cannot drift.

# E-008 — Database Migrations, Integrity, and Concurrency

## Initiative Information

- **Status:** Ready for implementation
- **Type:** Engineering initiative
- **Priority:** High
- **Implementation order:** 8
- **Last updated:** 2026-08-06

## Goal

Replace destructive schema scripts with versioned migrations and add the integrity, ownership, audit, and concurrency controls required for safe evolution.

## Problem

The repository contains scripts that drop or delete application data, but no versioned production migration history, compatibility policy, or rollback/roll-forward process. Mutable records use last-write-wins behavior, administrative changes lack actor/version fields, and several identity, token, ownership, and query indexes are missing.

## Why This Matters

Loss of accounts/catalogue data, extended outage, unrecoverable drift, and failed releases. No controlled schema evolution, ordering, idempotency, compatibility window, or auditable migration history.

Silent data loss, disputed administrative changes, security-response limitations, and degraded query performance. Last-write-wins mutation without actor/version invariants and incomplete operational schema.

## Current Behavior

- scriptDatabase.sql selects the application database, disables FK checks, and drops all major tables before recreating them. initObjectDatabase.sql deletes application rows. No migration history/tool, compatibility test, migration identity, backup preflight, or workflow migration step exists.
- Mutable recipes/users have no row version or compare-and-swap condition and administrative content has no created_by/updated_by audit actor. The schema has no user role, security stamp, account state, email verification, server session, recipe creator/moderation state, or meal-plan model. Username is described as unique in a comment but not constrained; reset token_hash lacks a unique/indexed lookup; recipe pagination lacks a composite cursor index.

## Target Behavior

Every schema change is an immutable forward migration tested from clean and representative previous versions. Authoritative mutable records use optimistic concurrency, important mutations record actor/time, and constraints/indexes reflect documented access and ownership rules.

## Scope

### Included

- Migration tool and history
- Nonproduction labeling of rebuild/seed scripts
- Expand/contract deployment compatibility
- Migration identity and permissions
- Backup/PITR preflight
- Optimistic concurrency
- Audit/version fields
- Normalized unique identifiers and token indexes
- Ownership/state columns
- Query-plan-driven indexes
- Delete semantics and migration tests

### Excluded

- Full backup/restore operations, E-012
- Specific pricing/nutrition domain model, E-009/E-015

## Systems Affected

- MySQL schema and scripts
- Dapper repositories and write SQL
- Deployment workflow
- Integration test database setup
- Account, recipe, reset-token, favorite, collection, and future planning tables

## Required Change Summary

### Backend

- Adopt a versioned migration mechanism with an immutable history table.
- Mark rebuild/seed scripts as local/test-only and add environment guards.

Remaining backend implementation details are maintained in [`backend.md`](./backend.md).

### Infrastructure

- Use separate least-privileged application and migration identities.
- Verify a usable backup/PITR point before risky migrations.

Remaining infrastructure implementation details are maintained in [`backend.md`](./backend.md).

### Tests

- Apply all migrations to an empty database.
- Apply N-1 to N on representative data and run twice to prove history/idempotency behavior.

Remaining tests implementation details are maintained in [`backend.md`](./backend.md).

### Documentation

- Document migration creation, review, deployment, failure recovery, and prohibited production scripts.

## Implementation Phases

Phases are completed in order unless a documented dependency requires otherwise. A phase that changes code is not complete until its listed tests pass. A phase containing only configuration, documentation, or operational work must attach equivalent validation evidence.

### Phase 1 — Establish a versioned migration baseline

**Status:** Not started

#### Changes

- Select and configure the migration mechanism.
- Capture the current schema as a controlled baseline.
- Mark rebuild/seed scripts nonproduction.

#### Tests and validation

- [ ] Apply to an empty database and a representative prior snapshot.
- [ ] Repeat application to verify migration history/idempotency behavior.

#### Phase completion rule

- [ ] All scoped changes are implemented or explicitly documented as not applicable.
- [ ] Every required automated test passes.
- [ ] Required manual, staging, migration, or operational evidence is attached.
- [ ] The initiative `Work Status` section is updated with verified evidence.

### Phase 2 — Add integrity and query controls

**Status:** Not started

#### Changes

- Add missing ownership, uniqueness, checks, foreign-key/delete rules, and measured indexes.
- Define normalized timestamps and server-owned fields.

#### Tests and validation

- [ ] Constraint tests, invalid-write tests, cascade tests, and EXPLAIN-based query verification.

#### Phase completion rule

- [ ] All scoped changes are implemented or explicitly documented as not applicable.
- [ ] Every required automated test passes.
- [ ] Required manual, staging, migration, or operational evidence is attached.
- [ ] The initiative `Work Status` section is updated with verified evidence.

### Phase 3 — Add concurrency and audit primitives

**Status:** Not started

#### Changes

- Introduce optimistic concurrency/version fields for authoritative mutable records.
- Record actor and change metadata where required.

#### Tests and validation

- [ ] Stale-write conflict tests, concurrent update tests, and audit-event tests.

#### Phase completion rule

- [ ] All scoped changes are implemented or explicitly documented as not applicable.
- [ ] Every required automated test passes.
- [ ] Required manual, staging, migration, or operational evidence is attached.
- [ ] The initiative `Work Status` section is updated with verified evidence.

### Phase 4 — Integrate safe deployment and recovery

**Status:** Not started

#### Changes

- Use a least-privileged migration identity and backup/PITR preflight.
- Define expand/contract compatibility and roll-forward behavior.

#### Tests and validation

- [ ] N-1/new application compatibility tests.
- [ ] Migration failure and restore rehearsal in isolated resources.

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

- [ ] Versioned forward migrations are the only production schema path.
- [ ] Destructive scripts are guarded and documented as nonproduction.
- [ ] Mutable authoritative records use concurrency control.
- [ ] Identity, ownership, audit, and query constraints are implemented as required.
- [ ] Migration checks block deployment.

## Risks and Edge Cases

- A down migration can be more destructive than a forward fix.
- Adding uniqueness can fail on existing duplicate data.
- Indexing without query evidence can slow writes and waste memory.
- Application and migration users with excessive privilege increase blast radius.

## Product Features Affected

- Every future schema change
- Account and permission lifecycle
- Recipe administration
- Favorites and collections
- Meal planning and grocery
- Pricing and nutrition history

## Validation

- Clean and representative prior-version migration suites pass.
- No production workflow invokes destructive rebuild/seed scripts.
- Concurrent stale updates produce `409` and do not overwrite data.
- EXPLAIN confirms required indexes for bounded list and ownership queries.
- Migration failure and restore/roll-forward procedures are exercised.

## Completion Criteria

- [ ] Versioned forward migrations are the only production schema path.
- [ ] Destructive scripts are guarded and documented as nonproduction.
- [ ] Mutable authoritative records use concurrency control.
- [ ] Identity, ownership, audit, and query constraints are implemented as required.
- [ ] Migration checks block deployment.

## Decisions

- Production recovery favors tested roll-forward and restore over casual down migrations.
- Indexes are added for actual contracts and verified query plans.

## Detailed Implementation Documents

- [Backend implementation](./backend.md)

## Traceability

The codes below are retained only to map this implementation plan to the historical problem register.

| Reference | Problem |
|---|---|
| DB-001 | Destructive rebuild scripts exist without versioned migrations or rollback |
| DB-003 | Concurrency, audit, ownership, and several integrity/index controls are missing |

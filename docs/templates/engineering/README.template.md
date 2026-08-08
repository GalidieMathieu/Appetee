# E-XXX — Engineering Initiative Name

## Initiative Information

- **Status:** Ready for implementation
- **Type:** Engineering initiative
- **Priority:** Medium
- **Implementation order:**
- **Owner:** Mathieu Galidie
- **Last updated:** YYYY-MM-DD
- **Dependencies:** None
- **Related features:** None

## Goal

Describe the technical outcome.

Do not describe only the audit/review activity that discovered the problem.

## Problem

Explain the current technical limitation, defect, risk, or architectural constraint.

## Why This Matters

Describe the practical impact on correctness, maintainability, security, performance, future feature delivery, or operations as applicable.

## Current Behavior

Describe what the current default branches actually do.

- 

## Target Behavior

Describe the architecture/behavior that should exist after completion.

- 

## Architecture Decisions

Document important rules established by this initiative.

Do not duplicate decisions already owned by another initiative.

## Scope

### Included

- 

### Excluded

- 

## Systems Affected

- Frontend
- Backend
- Database
- Infrastructure
- Documentation

Remove systems that do not apply.

## Data and State Impact

When applicable, describe data ownership, state ownership, cache lifetime, invalidation, user/account scoping, and persistence implications.

State `None` when not relevant.

## Database Impact

### Schema

None.

### Indexes

None.

### Migrations

None.

If database changes are required, explain their purpose here and implement them through E-008.

Do not add speculative indexes without an established query/access pattern.

## API/Contract Impact

Describe any impact on routes, shared DTOs, OpenAPI, error formats, or version compatibility.

## Required Change Summary

### Frontend

- 

### Backend

- 

### Database

- 

### Infrastructure

- 

### Documentation

- 

Remove irrelevant sections.

## Implementation Phases

Phases are completed in order unless a documented dependency requires otherwise.

A phase should represent one coherent technical change rather than a list of individual files.

### Phase 1 — Name

**Status:** Not started

#### Changes

- 

#### Tests and validation

- [ ] Unit tests when logic changes.
- [ ] Integration tests when boundaries or persistence change.
- [ ] Authorization/security negative tests when trust boundaries change.
- [ ] Contract/OpenAPI tests when API behavior changes.
- [ ] Migration/database tests when schema/query behavior changes.
- [ ] Frontend tests/E2E when browser behavior changes.
- [ ] Failure/retry/concurrency/reconciliation tests when applicable.
- [ ] Performance/`EXPLAIN` evidence when query/index behavior changes.
- [ ] Manual infrastructure/deployment evidence when source code cannot prove the result.

#### Phase completion rule

- [ ] All scoped changes are implemented or explicitly documented as not applicable.
- [ ] Required tests pass.
- [ ] Required evidence is recorded.
- [ ] Documentation reflects the implemented architecture.
- [ ] Work status contains verified work only.

### Phase 2 — Name

**Status:** Not started

Repeat the same structure.

Add only the phases required by the initiative.

## Work Status

### Completed

None.

Creating this plan does not count as implementation.

### In Progress

None.

### Remaining

- [ ] Phase 1
- [ ] Phase 2

## Risks and Edge Cases

- 

## Validation

- 

## Completion Criteria

- [ ] All implementation phases are complete.
- [ ] Required tests pass.
- [ ] Required manual evidence is attached.
- [ ] Related feature documentation is updated.
- [ ] Related API/OpenAPI contracts are updated.
- [ ] Required migrations are deployed/tested.
- [ ] No superseded architecture pattern remains in newly migrated scope.

## Decisions

- 

## Detailed Implementation Documents

Add only when useful:

- [`frontend.md`](./frontend.md)
- [`backend.md`](./backend.md)
- [`infrastructure.md`](./infrastructure.md)

Do not create empty implementation documents.

## Traceability

Use this section only for historical issues/audit references.

| Reference | Relationship |
|---|---|
| | |

A new initiative created from product/architecture evolution does not require an artificial audit finding ID.

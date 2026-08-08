# F-XXX — Feature Name

**Status:** Draft
**Implementation status:** Not started
**Version:** 0.1
**Owner:** Mathieu Galidie
**Last updated:** YYYY-MM-DD
**Dependencies:** None
**Related engineering initiatives:** None

## Goal

Describe the primary user outcome in one or two sentences.

## User Problem

Explain why the feature exists from the user's perspective.

Do not describe implementation details here.

## Current Behavior

Describe what currently exists in the default frontend/backend branches.

### Implemented

- 

### Missing or incomplete

- 

Remove this section if the feature is completely new.

## Scope

### Included

- 

### Excluded

- 

## Users and Permissions

| Actor | Allowed behavior |
|---|---|
| Guest | |
| Authenticated user | |
| Administrator | |

Frontend visibility is not authorization.

## User Experience

Describe expected page/component behavior, primary actions, content, responsive behavior, empty states, loading behavior, and interaction with shared components.

## User Flows

### Flow 1 — Name

1.
2.
3.

## Business Rules

- 

## Shared Feature Ownership

List significant capabilities this feature consumes but does not own.

## Data Requirements

Describe the data this feature requires.

### Data model

```ts
interface ExampleDto {
  id: number;
}
```

### Data ownership

| State | Ownership | Lifetime |
|---|---|---|
| | Application/session | |
| | Complete entity cache | |
| | Query/list | |
| | Temporary feature/flow | |
| | Component-local | |

Remove categories that do not apply.

### Cache and freshness

When data is cached, define:

- first-load behavior;
- reuse behavior;
- invalidation conditions;
- mutation synchronization;
- logout/identity behavior;
- browser-refresh behavior.

If no cache is needed, state that explicitly.

## Database Impact

### Existing tables used

- None.

### Schema changes

None.

### Index changes

None.

For any proposed index, document the concrete query/access pattern it supports.

Final important indexes should be validated with `EXPLAIN` during implementation.

### Data migration

None.

All schema changes must use E-008.

## API Endpoints

| Method | Endpoint | Purpose | Owner | State |
|---|---|---|---|---|
| `GET` | `/api/...` | | F-XXX | Planned |

Rules:

- use resource-oriented routes;
- derive current-user identity from authentication;
- avoid unnecessary client-supplied user IDs;
- identify another feature as Owner when this feature only consumes its endpoint.

## Request Contracts

### `METHOD /api/example`

```json
{
}
```

Describe important validation, query parameters and limits.

## Response Contracts

### Success

```json
{
}
```

For list endpoints, define cursor/pagination metadata where applicable.

Do not return complete heavy entity data when a lightweight projection is sufficient.

## Error Behavior

Document product-relevant outcomes.

| Situation | Expected behavior |
|---|---|
| Unauthenticated | `401` |
| Not authorized | `403` or owning-feature behavior |
| Entity not found | `404` |
| Validation failure | `400` |
| Stale/concurrent state | `409` |
| Rate limited | `429` |

Exact ProblemDetails formatting is owned by E-010 unless this feature requires additional behavior.

Empty collections are usually successful `200` responses, not errors.

## Responsive Behavior

When applicable:

```text
Large desktop:
Desktop/laptop:
Tablet:
Mobile:
```

Describe behavior rather than speculative exact breakpoints.

## Accessibility Requirements

When applicable:

- keyboard operation;
- visible focus;
- semantic controls;
- accessible names;
- dialog focus behavior;
- responsive zoom/reflow;
- loading/error announcements.

## Delivery Phases

Phases should be coherent implementation units that can reasonably be implemented and tested independently.

### Phase 1 — Name

**Status:** Not started

#### User value delivered

- 

#### Included work

- Frontend:
- Backend:
- Database/API:
- Documentation/assets:

#### Tests and validation

- [ ] Backend unit/integration tests when applicable.
- [ ] Frontend unit/component tests when applicable.
- [ ] API/contract tests when applicable.
- [ ] Database migration/integration tests when applicable.
- [ ] Authorization/ownership negative tests when applicable.
- [ ] Browser E2E test when applicable.
- [ ] Accessibility/manual responsive validation when applicable.
- [ ] Query/index `EXPLAIN` validation when an important index/query is introduced.

#### Phase completion criteria

- [ ] Scoped behavior is implemented.
- [ ] Required tests pass.
- [ ] Relevant contracts/documentation are updated.
- [ ] No unresolved blocking defect remains in the phase scope.

### Phase 2 — Name

**Status:** Not started

Repeat the same structure.

Add only as many phases as the feature actually requires.

## Work Status

### Completed

None.

### In Progress

None.

### Remaining

- [ ] Phase 1
- [ ] Phase 2

Documentation creation alone does not count as implementation completion.

## Acceptance Criteria

- [ ] 

## Risks and Open Questions

- 

Remove resolved questions after their decisions are incorporated into the specification.

## Future Evolution

Document likely future extensions only when they influence today's architecture.

Do not turn speculative ideas into current implementation phases.

## Decisions

Record approved product and architecture decisions.

- 

Create an ADR only for significant expensive-to-reverse decisions.

## Related Documents

- [Frontend implementation](./frontend.md), when present
- [Backend implementation](./backend.md), when present
- [Feature assets](./assets/), when present

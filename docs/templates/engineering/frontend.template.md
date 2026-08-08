# E-XXX — Engineering Initiative Name — Frontend

## Canonical Plan

The initiative [`README.md`](./README.md) owns the problem, target architecture, scope, phases, completion criteria, and cross-system decisions.

This document describes frontend implementation detail only.

## Current Frontend Architecture

Describe the relevant current implementation.

## Target Frontend Architecture

Describe the intended dependency/state/component structure.

Use Mermaid when a diagram improves understanding.

## Folder Ownership

Document expected locations.

Do not move files merely for cosmetic consistency unless the change improves ownership or maintainability.

## State Ownership

Classify relevant state:

```text
Application/session
Complete entity cache
Query/list
Temporary feature/flow
Component-local
```

For each store define:

```text
Owner:
Lifetime:
Created:
Invalidated:
Reset:
Identity scoped:
```

## API/Data Access

Describe the intended boundary:

```text
HttpClient/API
    ↓
Facade/use-case service
    ↓
Store/state
    ↓
Component
```

## Async Behavior

Define Observables, Signals, computed state, concurrency, cancellation, and duplicate-request behavior.

Avoid one global loading state when unrelated operations may run concurrently.

## Cache Rules

Document cache key, stored representation, freshness, invalidation, logout reset and browser refresh.

## Temporary State

For temporary workflow state, document where the provider/store is scoped.

Leaving the owning flow should destroy temporary state unless the product requires persistence.

## Mutation Synchronization

Describe how one mutation affects all relevant state.

Avoid multiple conflicting sources of truth.

## Error Handling

Describe recoverable behavior and integration with common E-010 errors.

## Accessibility Impact

When the architecture changes component behavior, validate accessibility is preserved.

## Migration Strategy

Prefer incremental migration.

Document:

1. old pattern;
2. new pattern;
3. compatibility period;
4. cleanup point.

Do not require a full frontend rewrite unless explicitly approved.

## Testing

- [ ] Store/state tests.
- [ ] Cache/invalidation tests.
- [ ] Concurrent-request tests.
- [ ] Identity reset tests.
- [ ] Component integration tests.
- [ ] Routing/lifecycle tests.
- [ ] E2E regression tests.
- [ ] Subscription/resource cleanup tests.

## Completion Evidence

Record:

```text
Files changed:
Tests:
Commands:
Results:
Remaining migration:
```

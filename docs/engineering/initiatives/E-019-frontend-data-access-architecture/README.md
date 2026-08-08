# E-019 — Frontend Data-Access Architecture

## Initiative Information

- **Status:** In progress — foundational architecture implemented
- **Type:** Engineering initiative
- **Priority:** Medium
- **Implementation order:** Before expanding recipe cards/search/favorites/meal planning on top of the current recipe store
- **Owner:** Mathieu Galidie
- **Last updated:** 2026-08-07
- **Dependencies:** E-010, E-013, E-014
- **Related features:** F-002, F-003, F-006, F-007, Recipe Discovery and Search, Recipe Favorites, Manual Meal Planning, Recipe Administration

## Goal

Establish a stable frontend data/state architecture that separates:

1. application/session state;
2. reusable server-backed domain entity caches;
3. lightweight query/list state;
4. temporary page/flow state;

so future features can be added without replacing the base architecture or turning one global store into a mixture of unrelated caches, filters, forms, and request states.

## Problem

The current frontend has good API/facade/store separation, but the generic store semantics are being stretched beyond what they were designed to represent.

`EntityStore<T>` currently owns one:

- data value;
- loading state;
- error state;
- loaded flag.

`RecipesStore` extends `EntityStore<RecipeSummary[]>` while also maintaining a separate `Record<number, RecipeDetailDto>` detail cache.

This creates several future problems:

- a list/search result can be confused with the canonical recipe entity cache;
- one global `isLoading()` can block unrelated recipe operations;
- one `loaded` flag cannot describe search results, recommendation results, favorites, and individual lazy-loaded details at the same time;
- card/list data and full detail data have different payload sizes and lifetimes;
- temporary forms/filters risk leaking into root singleton stores;
- future features can accidentally duplicate the same recipe/favorite/meal-plan state in several places;
- current recipe detail hydration performs additional ingredient detail calls and is already tracked as an N+1/performance concern under E-014;
- the recipe store is currently not registered in the session resetter list.

## Why This Matters

Recipes, Favorites, Home, Meal Planning, Recipe Administration, and future recommendation work all reuse the same domain objects.

If the ownership/lifetime rules are unclear now, each feature will add its own arrays, loading flags, cached DTOs, and mutation synchronization. That becomes expensive to repair after several features depend on it.

The target architecture must therefore be reusable before the application contains many independent recipe lists and long-lived workflows.

## Research Basis

The target follows current Angular guidance and established state-management patterns:

- Angular's style guide recommends organizing code by feature area and grouping closely related files.
- Angular hierarchical dependency injection allows state/services to be scoped instead of making every service application-global.
- Angular Signals provide granular reactive state; `computed()` should be preferred for derived state.
- Angular's RxJS interoperability supports keeping `HttpClient`/async streams as Observables while exposing signal-based state.
- NgRx's entity-management pattern uses entity IDs plus an entity map rather than duplicating complete entities in every collection.

References:

- https://angular.dev/style-guide
- https://angular.dev/guide/signals
- https://angular.dev/ecosystem/rxjs-interop
- https://angular.dev/guide/di/hierarchical-dependency-injection
- https://ngrx.io/guide/signals/signal-store/entity-management

E-019 does **not** require adopting NgRx. The useful architectural principles can be implemented incrementally with Angular Signals and the existing facade pattern.

## Current Behavior

Verified against frontend `main` on 2026-08-06:

- `EntityStore<T>` uses `BehaviorSubject` for data, state, error, and loaded.
- `RecipesStore extends EntityStore<RecipeSummary[]>`.
- `RecipesStore` separately keeps `recipeDetailsById`.
- Loading one recipe detail marks the whole recipe store loaded/success.
- `RecipesFacade` refuses several operations when the one store-level `isLoading()` is true.
- The facade mixes catalogue reads, detail reads, admin create/update work, and frontend ingredient hydration.
- Home currently contains static page-local filter/card data.
- `RecipesStore` is commented out of `SESSION_RESETTERS`.
- `IngredientsStore` similarly combines the lightweight ingredient catalogue, complete admin
  details, catalogue loading, detail loading, and ingredient creation errors in one whole-value
  store state.

## Target Behavior

### State class 1 — Application/session state

Examples:

- authentication;
- current user;
- identity-scoped domain caches that must survive route navigation.

Lifetime:

```text
application/current authenticated identity
```

Reset when:

- logout;
- failed session restoration;
- identity change;
- revoked/invalid session where E-013 requires account-state reset.

### State class 2 — Complete domain entity cache

Use for fully loaded server entities that are expensive enough to reuse across features.

Recipe example:

```text
recipe 42 detail loaded once
→ cache complete RecipeDetailDto by ID
→ Home/Recipes/Favorites/MealPlan can reuse it
→ fetch again only after invalidation or cache loss
```

This is **not** a complete list of every recipe in the database. It is a lazy cache of complete entities that have actually been requested.

Because that behavior differs from the current `EntityStore<T>` whole-value `loaded` semantics, introduce a separate cache abstraction instead of changing `EntityStore` to mean two incompatible things.

Target concept:

```ts
interface EntityRequestState {
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
}

interface EntityCacheState<TEntity> {
  entitiesById: Record<number, TEntity>;
  requestById: Record<number, EntityRequestState>;
}
```

Suggested abstraction name:

```text
EntityCacheStore<TEntity>
```

For recipes:

```text
RecipeDetailsStore extends/uses EntityCacheStore<RecipeDetailDto>
```

The same rule applies to every domain with lightweight and complete representations. For ingredients:

```text
IngredientsStore          lightweight catalogue only
IngredientDetailsStore   complete IngredientAdminDetailDto cache by ID
AdminIngredientStore     ingredient mutation request state
```

Catalogue, per-ID detail, and mutation requests must have independent loading and error state. One
operation must not block another or clear an unrelated error. Duplicate requests for the same entity
ID are coalesced; requests for different IDs may run concurrently.

An identity reset must also invalidate in-flight cache requests. A response started under an earlier
cache generation must not populate or emit from the next identity's cache after logout, failed session
restoration, or identity change.

Temporary validation requests, such as signup email availability, keep request/error state in their
owning flow. They must not mark the current-user store loading, loaded, successful, or failed.

### State class 3 — Query/list state

Search, recommendations, favorites, and other lists are not complete recipe entities.

They carry:

- lightweight card projections;
- ordered IDs;
- query/filter parameters;
- cursor/page metadata;
- request state.

Examples:

```text
recommended Home recipes
search "chicken"
favorites preview
favorites search "salmon"
admin recipe list
```

Do not put all these results into one `EntityStore<RecipeSummary[]>`.

Start with feature/domain-specific query stores rather than creating a large generic query framework prematurely.

### State class 4 — Temporary page/flow state

Temporary state belongs with the routed feature.

Examples:

```text
features/auth/login/
  state/

features/auth/sign-up/
  state/

features/recipes/
  state/

features/meal-plan/create/
  state/

features/admin-recipes/create/
  state/
```

Examples of temporary data:

- login form UI state when complexity justifies a store;
- signup wizard draft;
- recipe search/filter preferences;
- meal-plan creation options before save;
- recipe creation form draft before submit.

Lifetime rule:

> Temporary state survives only inside the feature/flow that owns it and is destroyed when that owning page/flow is left.

For a multi-step flow, provide the temporary store at a persistent flow shell component so child steps share the same instance and leaving the shell deterministically destroys it.

Do not default every temporary store to `providedIn: 'root'`.

### DTO/model ownership

Keep distinct concepts:

```text
Wire DTO
Domain/cache entity
Query/list item
View model
Temporary form model
```

Do not make one `RecipeSummary` type serve all five jobs.

For recipe-heavy features:

```text
RecipeCardDto       lightweight list projection
RecipeDetailDto     complete API detail projection
RecipeCardViewModel UI-formatted card data if needed
RecipeCreateDraft   temporary admin form state
```

Favorite membership is user relationship state and should not be duplicated as authoritative recipe entity data.

## Scope

### Included

- Define frontend state ownership/lifetime rules.
- Preserve API → facade → store/component boundary.
- Keep `EntityStore<T>` for complete whole-value/load-once state where its semantics fit.
- Introduce lazy entity-cache semantics for complete recipe details and future similar domains.
- Separate query/list state from entity caches.
- Separate temporary route/flow state from root singleton state.
- Introduce independent request state for concurrent entity/query operations.
- Define invalidation and mutation propagation rules.
- Register all account-scoped caches in the identity/session reset lifecycle.
- Separate normal recipe reads from admin recipe mutations as the domain grows.
- Move toward Angular Signals for new state while preserving Observable HTTP boundaries.
- Refactor incrementally; no full frontend rewrite.

### Excluded

- Replacing Angular.
- Mandatory NgRx adoption.
- Backend domain/module redesign, owned by E-015.
- API schema generation/versioning, owned by E-010.
- N+1 backend/frontend payload optimization itself, owned by E-014.
- Accessibility/routing correctness, owned by E-013.
- Product-specific recipe search/favorite/meal-plan behavior.

## Systems Affected

- Angular `core/shared/data-access`.
- Recipe API/facade/store.
- Session reset lifecycle.
- Home state.
- Future Recipe Search state.
- Favorites state.
- Meal Planning state.
- Admin Recipe creation/edit state.
- Feature folder/provider conventions.

## Required Change Summary

### Backend

No backend architecture change is owned by E-019.

E-019 may require lightweight/detail API contracts from E-010/E-014, but backend implementation remains in those initiatives/features.

### Frontend

- Define state categories and provider lifetimes.
- Add `EntityCacheStore` semantics.
- Refactor recipe details into a lazy ID-keyed complete-entity cache.
- Refactor ingredient admin details into a lazy ID-keyed complete-entity cache.
- Create separate lightweight query/list stores.
- Remove the single global loading flag as a gate for unrelated recipe work.
- Add per-ID/per-query request states.
- Keep transient state with its owning feature.
- Use signals/computed selectors for new stores.
- Keep `HttpClient` Observables and explicit async boundaries.
- Split admin recipe mutation data access from user catalogue retrieval as touched.
- Split admin ingredient mutations from ingredient catalogue and detail reads.
- Add identity reset integration.

### Database

None directly.

### Infrastructure

None directly.

### Documentation

- Add frontend data/state ownership rules to future feature specifications.
- Require every feature to identify whether each state object is session, entity-cache, query, or temporary flow state.
- Require API/data-heavy feature `README.md` files to document cache/invalidation expectations.

## Implementation Phases

### Phase 1 — Define and enforce state ownership boundaries

**Status:** Substantially complete

#### Changes

- Document the four state lifetimes in code documentation.
- Create clear naming/folder rules.
- Identify every existing store as session, load-once entity/catalog, lazy entity cache, query state, or temporary state.
- Stop adding new root-scoped temporary feature state.
- Add architecture/lint review checks where practical.

#### Tests and validation

- [x] Existing frontend builds/tests pass.
- [x] Architecture review maps all current stores to one ownership class.
- [ ] No new feature document leaves state lifetime unspecified.

#### Phase completion rule

- [x] Ownership rules are documented.
- [x] Current stores are classified.
- [x] No unrelated product behavior was intentionally added.

### Phase 2 — Introduce lazy complete-entity cache

**Status:** Complete for current recipe and ingredient domains

#### Changes

- Add `EntityCacheStore<TEntity>` or equivalent.
- Store complete recipe details by recipe ID.
- Store complete ingredient details by ingredient ID rather than in `IngredientsStore`.
- Track request state per recipe ID.
- Return cached detail immediately when valid.
- Allow different recipe details to load concurrently.
- Add explicit `upsert`, `invalidate(id)`, and `reset` behavior.
- Do not populate detail cache from lightweight card/list responses.

#### Tests and validation

- [x] First detail request calls API and caches result.
- [x] Reopening cached recipe makes no duplicate request.
- [x] Two different IDs can load concurrently.
- [x] Duplicate concurrent request for the same ID is coalesced.
- [x] Invalidation causes the next access to reload.
- [x] Logout/identity reset clears complete details and rejects stale in-flight responses.
- [x] Ingredient catalogue, detail, and create operations have independent loading/error state.
- [x] Ingredient details cache, coalesce, invalidate, and reset with the same semantics.

#### Phase completion rule

- [x] Recipe detail cache no longer depends on the whole-collection `loaded` flag.
- [x] Per-ID loading/error behavior is proven.

### Phase 3 — Separate recipe query/list state

**Status:** Partial

#### Changes

- Remove recommendation/search/favorite/admin lists from the canonical complete-detail cache.
- Define lightweight `RecipeCardDto`.
- Create recipe-specific query state for ordered card result sets and cursors.
- Keep query parameters and result metadata with the owning feature/domain.
- Avoid premature generic query-store abstraction until at least two proven patterns need it.

#### Tests and validation

- [x] Catalogue/query loading does not mark recipe details loaded.
- [x] Lightweight cards and complete detail entities have separate ownership.
- [ ] Query pagination/cursor state is independent per query.
- [ ] Clearing one feature's temporary query state does not clear the complete recipe detail cache.

#### Phase completion rule

- [x] Full details and lightweight lists have separate ownership and lifetimes.

### Phase 4 — Feature-scoped temporary state

**Status:** Complete for current flows

#### Changes

- Move signup wizard draft to feature/flow scope.
- Introduce the pattern for recipe filters, meal-plan creation, and recipe-creation drafts.
- Prefer component/shell-scoped providers for deterministic destruction.
- Keep simple component-only fields in the component; do not create a store for every textbox.
- Use a flow store only when state must be shared across child components/routes or preserved during a multi-step flow.

#### Tests and validation

- [x] Multi-step wizard preserves state between its child steps.
- [x] Leaving the wizard destroys the temporary draft.
- [x] Returning later begins from the intended initial state.
- [x] Route/page destruction does not clear session/domain caches.

#### Phase completion rule

- [x] Temporary state no longer requires manual global reset for ordinary navigation.

### Phase 5 — Mutation synchronization and invalidation

**Status:** Partial

#### Changes

- Define single source of truth for favorite membership.
- Define meal-plan invalidation signals consumed by Home.
- Update/invalidate recipe detail/card caches after admin edits.
- Upsert confirmed ingredient creation results into the ingredient detail cache and lightweight
  catalogue without coupling their request states.
- Clear recommendation query state after diet/restriction changes.
- Register every account-scoped root store with the session reset lifecycle.

#### Tests and validation

- [ ] Favorite change updates visible cards without duplicate conflicting state.
- [ ] Meal-plan mutation invalidates Home upcoming preview.
- [ ] Preference mutation invalidates Home recommendations/searches as specified.
- [x] Admin recipe edit invalidates cached detail and affected catalogue/query state.
- [x] Current account-scoped caches reset on logout/new identity, including in-flight request safety.

#### Phase completion rule

- [ ] Cross-feature mutations have explicit tested invalidation behavior.

### Phase 6 — Signals/RxJS cleanup and architecture validation

**Status:** Substantially complete

#### Changes

- Use Angular Signals for new store state and `computed()` for derived values.
- Keep `HttpClient` requests as Observables.
- Use Angular RxJS interop only where it reduces boundary duplication.
- Avoid propagation chains built from `effect()` where `computed()` or direct mutation is clearer.
- Remove obsolete BehaviorSubject/store layers only when their owning feature is migrated.
- Add frontend architecture tests/documented import rules if the codebase size justifies them.

#### Tests and validation

- [x] Migrated async flows use bounded/shared requests and component lifecycle cleanup.
- [x] Migrated derived state has one source of truth.
- [ ] Existing E2E behavior is preserved.
- [x] Build and tests pass; no new lint system was introduced.

#### Phase completion rule

- [ ] New features can use the architecture without creating new competing state patterns.

## Work Status

### Completed

- State ownership/lifetime documentation and current-store classification.
- Signal-backed lazy `EntityCacheStore<TEntity>`.
- Recipe and ingredient complete-detail caches with per-ID request state.
- Lightweight recipe/ingredient catalogue separation from complete details.
- Independent admin recipe and ingredient mutation state and `admin/` folder boundaries.
- Signup flow scoping and signup email-check state isolation.
- Identity/session reset registration and stale in-flight response protection.
- Admin recipe invalidation and ingredient creation cache synchronization.
- Regression tests for caching, concurrency, invalidation, errors, flow lifetime, and identity safety.

### In Progress

- Phase 3 query-store adoption for future independent list/search/recommendation contracts.
- Phase 5 cross-feature invalidation as Favorites, Meal Planning, and preference-driven queries are implemented.
- Phase 6 architecture enforcement/E2E evidence.

### Remaining

- [ ] Add feature/domain-specific query stores with parameters, ordered results, cursor/page metadata,
  and per-query request state when those APIs exist.
- [ ] Implement favorite membership as one account-scoped relationship source of truth.
- [ ] Add meal-plan mutation invalidation consumed by Home.
- [ ] Invalidate recommendation/search queries after relevant preference changes.
- [ ] Add architecture/import enforcement if repository growth justifies it.
- [ ] Add required E2E evidence before marking the initiative complete.

## Implementation Evidence — 2026-08-07

Implemented frontend structure:

```text
recipes/
  recipe.api.ts
  recipe.facade.ts
  recipe.model.ts
  recipes.store.ts
  recipe-details.store.ts
  admin/
    admin-recipe.api.ts
    admin-recipe.facade.ts
    admin-recipe.store.ts

ingredients/
  ingredient.api.ts
  ingredient.facade.ts
  ingredient.model.ts
  ingredients.store.ts
  admin/
    admin-ingredient.api.ts
    admin-ingredient.facade.ts
    admin-ingredient.store.ts
    ingredient-details.facade.ts
    ingredient-details.store.ts
```

Verification completed in the frontend repository:

- production Angular build passed;
- application and specification TypeScript checks passed;
- 33 tests passed and 1 pre-existing test remained skipped;
- `git diff --check` passed;
- the pre-existing `admin-recipes.page.scss` component-style budget warning remains.

## Risks and Edge Cases

- A mass rewrite would create unnecessary regression risk; migrations must happen incrementally.
- Over-generalizing `QueryStore` too early can produce a framework harder to understand than feature-specific stores.
- Root-scoped entity caches must never contain another user's relationship state after identity changes.
- Caching complete recipe details without invalidation can show stale admin edits.
- Component-local state should not be promoted into a store unless it needs sharing/lifecycle behavior.
- Route provider lifetime must not be assumed to provide deterministic cleanup across all router/reuse configurations; use a persistent shell/component provider when destruction semantics matter.
- Browser refresh clears in-memory caches; this is acceptable unless a feature explicitly requires durable local persistence.

## Validation

- All current stores have documented ownership/lifetime.
- Recipe details are cached lazily by ID.
- Search/recommendation/favorite result sets are lightweight and independent.
- Temporary multi-step state is destroyed with its owning flow.
- Account-scoped stores reset on identity changes.
- Concurrent requests do not block unrelated operations.
- F-006 Home can implement its documented cache/invalidation rules without expanding one global recipe loading flag.

## Completion Criteria

- [ ] All implementation phases are complete.
- [ ] Required frontend tests and E2E evidence pass.
- [ ] F-006/F-007/Recipe Search/Favorites/Meal Planning use the documented state model.
- [x] No root singleton contains page-only form/filter state in current implemented flows.
- [x] Complete entity details and lightweight catalogue/query results have distinct caches.
- [x] Identity/session reset coverage includes every current account-scoped cache.
- [ ] Documentation is updated when an exception to these rules is intentionally introduced.

## Decisions

- Keep the API → facade → state/component separation.
- Do not perform a full frontend rewrite.
- Keep existing `EntityStore<T>` for whole-value/load-once state where its one `loaded` state is semantically correct.
- Do **not** redefine `EntityStore<T>` to also mean a partial lazy entity cache.
- Introduce a separate lazy complete-entity cache abstraction for recipe details.
- Lightweight recipe lists and full recipe details remain different contracts.
- Temporary page/flow state lives with the owning feature and is not root-scoped.
- New state should prefer Angular Signals; HTTP remains Observable-based.
- NgRx is not required now.
- F-007 owns shared recipe-card/Quick Preview behavior; E-019 owns the state/data architecture that supports it.

## Detailed Implementation Documents

- [`frontend.md`](./frontend.md)

## Traceability

This initiative is a new architecture workstream created from product expansion and current-code review rather than a new production-readiness audit finding.

Related existing initiative ownership:

| Reference | Relationship |
|---|---|
| E-010 | Stable frontend/backend wire contracts |
| E-013 | Session reset, routing/state isolation, frontend reliability |
| E-014 / PERF-001 | Catalogue bounding and recipe hydration N+1 performance |
| E-017 | Required testing/quality gates |

# E-019 — Frontend Data-Access Architecture — Frontend Design

## Canonical Plan

The initiative `README.md` owns the migration phases, architecture decisions, boundaries, and completion criteria.

This document gives the concrete Angular structure to use while implementing those phases.

## Implementation Status — 2026-08-07

The foundational design is implemented for current recipe and ingredient domains:

- `EntityCacheStore<TEntity>` is signal-backed and tracks entities/request state per ID.
- Recipe cards/catalogue data and complete recipe details use separate stores.
- Ingredient catalogue data and complete admin ingredient details use separate stores.
- Recipe and ingredient admin APIs, facades, and mutation stores live in domain `admin/` folders.
- Catalogue, detail, mutation, and temporary validation operations have independent loading/error
  ownership.
- Same-ID detail requests are coalesced; different IDs can load concurrently.
- Cache generations discard stale responses/errors after logout or identity change.
- All current account-scoped stores participate in `SESSION_RESETTERS`.
- Signup draft state is flow-scoped; signup email validation does not change `UserStore` state.

Still pending are independent recipe query stores for search/recommendations/favorites/pagination,
favorite relationship state, meal-plan/Home invalidation, preference-dependent query invalidation,
formal architecture/import enforcement, and final E2E evidence.

## Target State Model

```text
                         ┌────────────────────────────┐
                         │ HttpClient / API services  │
                         └─────────────┬──────────────┘
                                       │ Observable
                                       ▼
                         ┌────────────────────────────┐
                         │ Facade / domain operations │
                         └──────┬─────────┬───────────┘
                                │         │
             complete entity    │         │ query/list response
                                ▼         ▼
                 ┌──────────────────┐   ┌──────────────────────┐
                 │ Entity cache     │   │ Query / feature state│
                 │ keyed by ID      │   │ IDs/cards/cursor     │
                 └────────┬─────────┘   └──────────┬───────────┘
                          │                        │
                          └───────────┬────────────┘
                                      ▼
                            ┌──────────────────┐
                            │ Components / UI  │
                            └──────────────────┘
```

## Stable Ownership Rules

### Root/session-scoped

Use only for information that must survive ordinary route navigation and is meaningful across features:

- authentication;
- current user;
- complete recipe detail cache;
- favorite membership;
- other account-scoped domain relationship state that several features reuse.

These stores must implement/reset through the session reset lifecycle.

### Feature/flow-scoped

Use for temporary state:

- search filters;
- signup draft;
- meal-plan creation options;
- admin recipe creation/edit draft;
- one-page loading/validation/display state.

Prefer a component or persistent flow-shell `providers` scope when deterministic destruction is required.

### Plain component state

Keep simple values directly in a component when they are not shared and do not justify a store.

A local store is not automatically cleaner than a few local signals.

## Recommended Folder Direction

Do not perform a mass move only for naming. Refactor folders when their code is touched.

Target direction:

```text
src/app/
├── core/
│   ├── api/
│   ├── auth/
│   ├── session/
│   └── data-access/
│       ├── generic/
│       ├── recipes/
│       ├── favorites/
│       └── meal-plans/
│
├── shared/
│   ├── ui/
│   └── utils/
│
└── features/
    ├── auth/
    │   ├── login/
    │   │   └── state/          # only if login complexity needs it
    │   └── sign-up/
    │       └── state/          # multi-step temporary wizard draft
    │
    ├── home/
    │   └── state/              # composition/freshness only if feature-scoped
    │
    ├── recipes/
    │   └── state/              # search/filter/cursor/query state
    │
    ├── meal-plan/
    │   └── create/
    │       └── state/
    │
    └── admin-recipes/
        └── create/
            └── state/
```

The current `core/shared/data-access` and `core/shared/ui` paths can move incrementally toward the clearer `core/data-access` + root `shared` split. Do not mix this folder move with unrelated feature behavior unless the touched code benefits from it.

## `EntityStore<T>` Rule

Keep the current abstraction only when one load state can truthfully describe the complete stored value.

Good examples:

```text
DietsStore           complete diet catalogue snapshot
small reference data complete loaded collection
```

Potentially inappropriate:

```text
Recipe search results
Recipe recommendations
Favorite pages
Lazy complete recipe details
```

Those have independent queries/entities and cannot share one global `loaded` flag.

## `EntityCacheStore<TEntity>`

Suggested shape:

```ts
type RequestStatus = 'idle' | 'loading' | 'success' | 'error';

interface RequestState {
  status: RequestStatus;
  error: string | null;
}

interface EntityCacheState<TEntity> {
  entitiesById: Record<number, TEntity>;
  requestById: Record<number, RequestState>;
}

class EntityCacheStore<TEntity extends { id: number }> {
  // signal-backed implementation target

  get(id: number): TEntity | null;
  has(id: number): boolean;
  upsert(entity: TEntity): void;
  invalidate(id: number): void;
  setLoading(id: number): void;
  setError(id: number, message: string): void;
  reset(): void;
}
```

Do not require the store to know how an entity is fetched. API/facade owns fetching.

## Ingredient Detail and Administration Flow

Ingredients use the same entity-cache rule as recipes:

```text
IngredientsFacade         GET lightweight ingredient catalogue
IngredientDetailsFacade  GET complete admin detail by ID
AdminIngredientFacade    POST/PUT ingredient mutations

IngredientsStore          Ingredient[] only
IngredientDetailsStore   IngredientAdminDetailDto by ID and per-ID request state
AdminIngredientStore     mutation loading/error state only
```

Catalogue loading must not prevent a detail request or ingredient creation. A detail failure belongs
to that ingredient ID and must not replace the catalogue error. A mutation failure belongs to the
mutation flow. After confirmed creation/update, upsert the returned complete detail and synchronize or
invalidate the lightweight catalogue projection.

Entity-cache reset advances a cache generation. Detail facades bind each in-flight request to the
generation in which it started and discard stale responses/errors after an identity reset. A new
identity can start a fresh request for the same ID without joining the earlier identity's request.

This separation is required for every current or future domain that exposes both lightweight and
complete DTO shapes; it is not recipe-specific.

Keep normal domain files at the domain root and group privileged/admin-only data access beneath an
`admin/` child. For example, `recipes/recipe.facade.ts` remains the normal read facade while
`recipes/admin/admin-recipe.facade.ts` owns mutations. Ingredient admin detail access and mutations
similarly live under `ingredients/admin/`. This prevents a flat domain folder from becoming ambiguous
as APIs, caches, and feature operations grow.

## Recipe Detail Flow

```text
Recipe card selected
      ↓
RecipesFacade.getDetail(id)
      ↓
RecipeDetailsStore.get(id)
      ├─ hit → return cached complete detail
      └─ miss
           ↓
       request state for this ID
           ↓
       GET /api/recipes/{id}
           ↓
       upsert complete detail
           ↓
       Quick Preview consumes detail
```

Different recipe IDs may load concurrently.

Duplicate concurrent fetches for the same recipe should be coalesced or guarded per ID rather than by one global recipe loading state.

## Query/List State

A query result should store lightweight items/IDs and metadata:

```ts
interface RecipeQueryState {
  items: RecipeCardDto[];
  nextCursor: string | null;
  totalCount: number | null;
  status: RequestStatus;
  error: string | null;
}
```

For search:

```ts
interface RecipeSearchState extends RecipeQueryState {
  search: string;
  filters: RecipeSearchFilters;
}
```

For Home recommendations, the session Home state may store the selected IDs/cards and a loaded flag because it is one deliberately stable recommendation set.

Do not put full instructions/ingredient details in these query states.

## Temporary Flow Example — Sign Up

Provide a store from the sign-up shell:

```text
SignUpShellComponent
  providers: [SignUpDraftStore]

  AccountStep
  DietStep
  IngredientStep
```

The same store survives child-step navigation because the shell remains mounted.

Leaving the sign-up shell destroys the store.

This is preferable to a root singleton plus manual reset.

## Temporary Flow Example — Recipe Creation

```text
AdminRecipeCreateShell
  providers: [RecipeCreateDraftStore]

Recipe info
Ingredients
Instructions
Preview
Submit
```

The draft is not placed in the global complete recipe cache until the server confirms creation.

## Signals and RxJS

Recommended boundary:

```text
HttpClient          Observable
Facade              Observable methods / imperative store updates
Store               signals
Derived state       computed()
UI                   signals / async interop as appropriate
```

Use `effect()` sparingly. Do not use effects merely to copy one signal into another store.

Use `computed()` for:

- `isFavorite`;
- filtered derived labels;
- display counts;
- loading summaries derived from request state.

## DTO Separation

Do not import one large backend object into every component.

Example:

```ts
interface RecipeCardDto {
  id: number;
  name: string;
  imageUrl: string | null;
  prepTimeMinutes: number;
  servings: number;
  difficulty: RecipeDifficulty;
  caloriesPerServing: number | null;
  estimatedCostPerServing: number | null;
}

interface RecipeDetailDto {
  // card/base fields
  // complete ingredient quantities
  // instructions
  // complete detail data required by preview/cooking
}
```

View formatting can remain outside wire DTOs.

## Mutation Rules

### Favorite

```text
Favorite API succeeds
→ FavoritesStore membership changes
→ every card derives current favorite state from the same source
→ Home favorite preview updates/refills
```

Do not mutate independent `isFavorite` booleans in several unrelated cached objects.

### Recipe admin edit

```text
Update succeeds
→ upsert/invalidate RecipeDetail cache
→ invalidate affected card/query results
```

### Diet/restriction update

```text
Preference update succeeds
→ invalidate recommendation/search query state that depends on compatibility
```

### Meal-plan update

```text
Mutation succeeds
→ meal-plan store changes
→ mark Home upcoming preview stale
```

## Cache Persistence

Initial policy:

- memory only;
- no IndexedDB/localStorage persistence for recipe details;
- browser refresh may reload data;
- authentication cookie remains the durable session mechanism.

Add persistent browser cache only after a feature proves it is necessary and privacy/staleness rules are specified.

## Libraries

Do not add NgRx solely to implement E-019.

NgRx SignalStore/entity management is a valid future option if:

- store complexity grows materially;
- many domains repeat the same normalized-entity/query patterns;
- custom state infrastructure becomes more code than product behavior.

Until then, Angular Signals plus small tested stores are sufficient.

## Architecture Review Checklist

Before merging a new feature, answer:

1. Who owns this data?
2. Is it server entity data, query/list data, or temporary UI/flow state?
3. How long should it live?
4. What invalidates it?
5. Does it contain account-specific data?
6. What clears it on identity change?
7. Is a full entity being duplicated in a list unnecessarily?
8. Can two requests run independently?
9. Does a mutation update one source of truth or several copies?
10. Is a store actually needed, or would local component signals be simpler?

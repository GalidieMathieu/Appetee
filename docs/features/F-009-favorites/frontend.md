# F-009 — Favorites — Frontend

## Canonical Contract

[`README.md`](README.md) owns the route, Favorites API contract, ordering semantics, shared Recipe Card usage, list behavior, empty/error/loading behavior, and one-phase delivery scope.

This document describes the Angular implementation of that contract. It must not redefine F-008 Recipe Card/Quick Preview behavior.

## Frontend Goal

Implement a small authenticated `/favorites` feature that:

- loads the current user's complete compatible Favorites list;
- renders the same full-page Recipe Card grid as `/recipes`;
- uses only the shared F-008 Recipe Card/Recipe Experience;
- removes successfully-unsaved recipes from the list;
- provides loading/error/empty states;
- introduces no discovery/search/filter/cursor architecture.

## Route and Feature Boundary

Add a lazy-loaded authenticated feature route following current Angular conventions.

Target concept:

```text
src/app/features/favorites/
├── favorites.routes.ts
├── favorites.page.ts
├── favorites.page.html
├── favorites.page.scss
└── state/
    ├── favorites.store.ts
    └── favorites.facade.ts
```

Exact filenames may follow the conventions already used by neighboring features, but do not create a parallel architectural pattern.

Top-level route integration:

```text
PrivateLayoutComponent
└── authGuard
    └── /favorites
        └── FavoritesPage
```

The feature does not need its own route guard if it is already nested beneath the canonical authenticated route group.

## Shared UI Dependencies

F-009 must consume existing/shared UI rather than copy it.

### Recipe Card

Normal page markup should conceptually be no more complex than:

```html
<app-recipe-card-grid [recipes]="recipes()" />
```

and the grid internally renders:

```html
@for (recipe of recipes(); track recipe.id) {
  <app-recipe-card [recipe]="recipe" />
}
```

The Favorites page must not directly import/open `RecipeQuickPreviewComponent`.

### Recipe Experience

`RecipeCardComponent` remains the public entry point:

```text
RecipeCard
  → RecipeExperienceFacade
  → Quick Preview
  → Cooking Mode later
```

Do not duplicate dialog configuration, preview loading, favorite mutation HTTP logic, or cooking navigation inside F-009.

### Recipe Card grid

The full-page Favorites layout should be the same as Recipe Discovery.

Preferred architecture:

```text
src/app/core/shared/ui/recipe-card-grid/
```

If F-008 already created this component, reuse it unchanged unless a genuinely shared improvement is required.

If `/recipes` still contains private grid markup/styles, extract that existing behavior into the shared grid and refactor `/recipes` to use it before using it in Favorites.

The grid owns presentation only:

- width/fill;
- CSS grid columns;
- gaps;
- responsive layout;
- iteration over `RecipeCardDto[]`.

It does not own fetching, state, routing, filtering, or preview behavior.

## API Integration

Add the list call to the existing shared recipe API service:

```ts
getFavorites(limit?: number): Observable<readonly RecipeCardDto[]>
```

Do not create a second Favorites-specific raw HTTP service if the existing `RecipeApi`/`RecipesApi` is the canonical recipe HTTP boundary.

Conceptual requests:

```text
getFavorites()
→ GET /api/recipes/favorites

getFavorites(4)
→ GET /api/recipes/favorites?limit=4
```

F-009's page calls the no-limit version.

F-006 Home may consume the limit-4 version through Home's own state/facade.

## State Ownership

Favorites list is **query/list state**, owned by F-009.

It is not a canonical recipe entity cache.

Suggested shape:

```ts
interface FavoritesState {
  readonly items: readonly RecipeCardDto[];
  readonly status: 'idle' | 'loading' | 'loaded' | 'error';
  readonly error: unknown | null;
  readonly stale: boolean;
}
```

If Appetee already has a standard request-state type, reuse it instead of inventing the union above.

Do not add:

```text
cursor
nextCursor
hasMore
page
search
filters
sort
seed
criteriaFingerprint
```

## Store Responsibilities

A lightweight `FavoritesStore` should provide operations consistent with the project's signal/store conventions, conceptually:

```text
setLoading
setLoaded(items)
setError(error)
remove(recipeId)
markStale
reset
```

Use signals/computed state according to E-019/current F-008 conventions.

Possible computed values:

```text
recipes
isLoading
isLoaded
hasFavorites
error
```

Do not store Quick Preview data here.

## Facade Responsibilities

`FavoritesFacade` owns page orchestration, not raw UI interaction.

Conceptual methods:

```text
loadIfNeeded()
reload()
retry()
handleFavoriteChanged(change)
reset()
```

Behavior:

- first load fetches all favorites;
- if already loaded and not stale, reuse the list when returning to the page;
- successful unsave removes that recipe;
- successful save elsewhere marks the list stale unless the shared mutation contract already provides enough full card data to insert correctly;
- identity/logout resets;
- compatibility preference changes mark stale/reload according to existing user-preference invalidation patterns.

## Favorite Mutation Synchronization

The Favorites page itself must not call PUT/DELETE favorite endpoints.

Those are owned by F-008's shared Recipe Experience/data-access behavior.

F-009 needs only a way to observe successful favorite-state changes.

Preferred rule:

- reuse the favorite-change signal/observable/event already established by F-008/RecipeExperience;
- if that refactor does not yet expose one, add the smallest read-only shared notification necessary, such as a successful change stream carrying at least:

```ts
interface RecipeFavoriteChange {
  readonly recipeId: number;
  readonly isSaved: boolean;
}
```

Do not introduce a general event bus.

When Favorites receives:

```text
{ recipeId: 42, isSaved: false }
```

remove ID 42 from the current list after the mutation has successfully completed.

When it receives a successful save elsewhere:

```text
{ recipeId: 42, isSaved: true }
```

mark the Favorites list stale unless the complete `RecipeCardDto` is already available through the established shared mutation contract.

## Page Initialization

On page initialization:

```text
FavoritesPage
  → FavoritesFacade.loadIfNeeded()
```

State rendering:

```text
loading
→ title + Recipe Card grid skeleton

error
→ title + standard error/retry

loaded + 0
→ empty state

loaded + >0
→ shared RecipeCardGrid
```

Do not infer empty state from the initial empty array before loading completes.

## Empty State

Suggested product copy from the canonical spec:

```text
Your Favorite Recipes

You haven't saved any recipes yet.
Save recipes you like and they'll appear here.

[ Explore Recipes ]
```

`Explore Recipes` routes to `/recipes` using Angular Router/RouterLink according to current application conventions.

Do not make the empty-state action responsible for search or discovery state.

## Unsave UX

Shared Recipe Card favorite behavior may update its heart optimistically.

F-009 list-removal timing is:

```text
DELETE pending
→ shared card/preview mutation behavior owns pending visual state

DELETE success
→ FavoritesStore.remove(recipeId)

DELETE failure
→ do not remove from FavoritesStore
```

This avoids needing to restore list position after a failed optimistic removal.

If the successful removal leaves zero items, the same loaded state naturally renders the empty state.

Quick Preview unsave follows the same mutation notification path.

## Home Integration

F-006 owns its own Home section state and `RecipeListSection` rendering.

F-009 only provides the canonical list endpoint/semantics.

Home uses:

```text
RecipesApi.getFavorites(4)
```

and:

```text
Your Favorite Recipes     View all → /favorites
```

F-006 hides the entire Home Favorites section when its successful response is empty.

Do not make Home depend on F-009's page store.

This keeps list state feature-owned:

```text
Home preview query state → F-006
Favorites page query state → F-009
canonical API/RecipeCardDto → shared recipe data access/F-008 + F-009 endpoint
```

## Styling

Before adding styles:

- inspect `/recipes` current grid styles;
- inspect shared `_button.scss`;
- inspect `_text.scss`;
- inspect `_theme.scss`;
- inspect existing CSS variables.

Rules:

- reuse `/recipes` full-page card-grid presentation;
- no Home horizontal-carousel behavior on `/favorites`;
- do not create a smaller Favorite card;
- do not copy Tailwind/shadcn/Builder styles;
- do not hard-code Appetee colors where variables exist;
- use existing heading/body/button primitives.

## Responsive Behavior

Do not invent Favorites-specific breakpoints.

Use the same grid behavior as `/recipes` at each supported viewport.

The page scrolls naturally vertically because all Favorites are already loaded.

No `IntersectionObserver` is required for data loading.

Shared Recipe Card image lazy loading remains active where F-008 defines it.

## Accessibility

- Semantic `h1` for the page title.
- Use the shared Recipe Card's keyboard behavior.
- Do not interfere with shared heart-button propagation rules.
- `Explore Recipes` is a semantic link/button consistent with navigation semantics.
- Retry is keyboard accessible.
- Loading/error state announcements follow existing Appetee patterns.
- Grid must reflow under zoom/narrow widths.
- Shared Quick Preview focus/accessibility remains unchanged.

## Testing

### Unit/store/facade

- [ ] First `loadIfNeeded()` issues one Favorites request.
- [ ] Repeated `loadIfNeeded()` reuses valid loaded state.
- [ ] Stale state causes a refresh.
- [ ] Successful unsave event removes the recipe.
- [ ] Successful save event marks loaded Favorites stale when immediate insertion is not possible.
- [ ] Removing final recipe leaves a loaded empty collection.
- [ ] Reset clears previous identity data.

### Component/router

- [ ] `/favorites` renders under the authenticated private route.
- [ ] Loading state does not show false empty state.
- [ ] Empty result renders approved empty state.
- [ ] `Explore Recipes` routes to `/recipes`.
- [ ] Populated result renders shared Recipe Cards.
- [ ] Shared grid matches `/recipes` behavior.
- [ ] Card activation opens shared Quick Preview indirectly through Recipe Card.
- [ ] Heart interaction does not open Preview.
- [ ] Quick Preview unsave causes list removal after success.
- [ ] Retry reloads after request failure.

### Session/auth regression

- [ ] Expired session from `/favorites` follows global redirect/message behavior.
- [ ] Logout/identity change clears Favorites state.
- [ ] Remembered and non-remembered authenticated sessions both protect/access `/favorites` through the existing auth contract.
- [ ] Multi-browser/session checks do not reuse Favorites from the wrong identity.

### Build/manual

- [ ] Frontend tests pass.
- [ ] Type checking/build passes.
- [ ] Desktop/laptop/tablet/mobile manually match `/recipes` grid behavior.
- [ ] Keyboard/focus behavior is validated.

## Implementation Notes

Keep this feature intentionally small.

Do not add pagination merely because `/recipes` uses it. Query semantics differ: Recipe Discovery can span thousands of recipes, while Favorites is a small user-owned collection loaded as one response.

Do not add search/filter controls just because the grid looks like `/recipes`.

The reuse target is:

```text
same RecipeCard
same RecipeExperience
same full-page grid
```

not:

```text
same Recipe Discovery feature state
```

## Dependencies

- F-008 — Recipe Discovery, Recipe Card & Quick Preview
- F-006 — Home Page consumes F-009 list endpoint/route after implementation
- E-019 — Frontend Data-Access Architecture
- E-017 — Testing Strategy

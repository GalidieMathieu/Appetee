# F-009 — Favorites

Status: Active  
Implementation status: Planned  
Version: 1.0  
Owner: Mathieu Galidie  
Last updated: 2026-08-29  
Dependencies: F-008 — Recipe Discovery, Recipe Card & Quick Preview  
Related engineering initiatives: E-010 API Contracts, E-017 Testing Strategy, E-019 Frontend Data-Access Architecture

## Goal

Allow an authenticated user to open a dedicated `/favorites` page and see the recipes they have saved, using the exact same shared Recipe Card → Quick Preview → Cooking Mode experience established by F-008.

The initial Favorites feature is intentionally small: it is a read-only list experience around the existing save/unsave relationship. It does not introduce search, filters, collections, recommendation logic, or paginated discovery.

## User Problem

A user who saves recipes needs one predictable place to return to those recipes later. The page should feel like the existing Recipe Discovery list, but it should contain only saved recipes and should not make the user search for them again.

The user should be able to:

- open `/favorites`;
- see their saved recipes in the same full-page Recipe Card grid used by `/recipes`;
- open any card into the same shared Quick Preview;
- unsave a recipe from either the card or Quick Preview;
- see an unsaved recipe disappear from the Favorites list after the mutation succeeds;
- return to `/recipes` easily when no favorites exist.

## Current Behavior

Implementation baseline is the current development frontend/backend plus the approved F-008 contract.

### Implemented or owned elsewhere

- The `favorite_recipes` relationship already exists in the product data model.
- F-008 owns the canonical `RecipeCardDto` projection.
- F-008 owns the shared Recipe Card component.
- F-008 owns the shared Recipe Experience: Recipe Card → Quick Preview → Cooking Mode later.
- F-008 owns basic favorite save/unsave mutation behavior:
  - `PUT /api/recipes/{recipeId}/favorite`
  - `DELETE /api/recipes/{recipeId}/favorite`
- F-008 owns recipe compatibility filtering based on the authenticated user's diets and ingredient restrictions.
- F-006 Home consumes a small Favorites preview and routes its `View all` action to `/favorites` once this feature exists.

### Missing

- No dedicated `/favorites` frontend route exists.
- No dedicated Favorites list page exists.
- No `GET /api/recipes/favorites` list endpoint exists in the current baseline.
- No Favorites feature-owned list state exists.
- The full-page Recipe Card grid may still be owned directly by `/recipes`; if so, it must be extracted/reused rather than copied.

## Scope

### Included

- Protected `/favorites` route.
- Dedicated Favorites page.
- `GET /api/recipes/favorites` endpoint.
- Optional `limit` query parameter so F-006 Home can request a small preview from the same endpoint.
- Return of the existing F-008 `RecipeCardDto`; no Favorites-specific duplicate recipe DTO.
- Mandatory current-user recipe compatibility filtering.
- Newest-saved-first ordering.
- One bounded request for the complete Favorites page; no cursor pagination.
- Reuse of the full-page Recipe Card grid/layout used by `/recipes`.
- Reuse of the shared Recipe Card and Recipe Experience.
- Loading, error/retry, empty, populated, and unsave behavior.
- Synchronization with shared favorite mutations.
- Home integration contract: `GET /api/recipes/favorites?limit=4` and `View all` → `/favorites`.

### Excluded

- Favorite collections/folders.
- Custom favorite ordering.
- Favorite search.
- Favorite filtering.
- Favorite categories/tags.
- Recommendation scoring.
- Sharing favorite collections.
- Cursor pagination or network infinite-scroll pagination.
- A second Recipe Card, Quick Preview, or Cooking Mode implementation.
- Changes to F-008 favorite mutation semantics unless required to integrate the list.
- Main-navigation changes unless another navigation specification explicitly adds Favorites there.

## Users and Permissions

| Actor | Allowed behavior |
| --- | --- |
| Guest | Cannot access `/favorites`; existing authentication routing applies. |
| Authenticated user | Can view only their own compatible saved recipes, open them, save/unsave them, and use shared Recipe Experience behavior. |
| Administrator | Same Favorites behavior for their own account; admin role does not grant access to another user's favorites. |

Frontend visibility is not authorization. The backend derives the current user from the authenticated session/cookie and never trusts a browser-supplied `userId` for Favorites operations.

## User Experience

### Favorites page

Canonical route:

```text
/favorites
```

The page should visually follow the full Recipe Discovery page's recipe-grid presentation, without its search/filter/discovery controls.

Conceptually:

```text
Your Favorite Recipes
Recipes you've saved for later.

[ RecipeCard ][ RecipeCard ][ RecipeCard ][ RecipeCard ]
[ RecipeCard ][ RecipeCard ][ RecipeCard ][ RecipeCard ]
...
```

The page uses the exact same `RecipeCardComponent` as `/recipes`.

A normal card interaction is therefore already:

```text
RecipeCard
    → RecipeExperienceFacade
    → RecipeQuickPreview
    → Cooking Mode later
```

The Favorites page must not directly open Material dialogs, fetch preview data, implement favorite HTTP calls, or create Favorites-specific recipe-card variants.

### Full-page layout reuse

The full-page grid must look and behave like the current `/recipes` card grid.

If F-008 already provides a reusable grid/layout primitive, use it.

If the current `/recipes` page still owns the grid markup/styles directly, extract the grid into a shared presentation component such as:

```text
src/app/core/shared/ui/recipe-card-grid/
```

The shared grid should own only presentation:

- responsive columns;
- card gaps;
- width/fill behavior;
- consistent vertical spacing;
- rendering `RecipeCardComponent` for each supplied `RecipeCardDto`.

It must not own API requests, query state, Favorites state, Recipe Discovery state, Quick Preview orchestration, or routing.

Both pages then use the same grid:

```text
/recipes   → RecipeCardGrid → RecipeCard
/favorites → RecipeCardGrid → RecipeCard
```

### Scrolling behavior

Favorites intentionally does **not** implement F-008 cursor/infinite network pagination.

The initial product assumption is that an individual user has a small saved collection, approximately no more than ~50 recipes in normal use. The page therefore loads the complete compatible Favorites list in one request and uses normal browser/page scrolling.

This is not a hard user-visible 50-save business cap introduced by F-009. If real usage grows materially beyond this assumption, pagination can be introduced in a future revision.

Recipe images continue to use the lazy-loading behavior owned by the shared Recipe Card.

### Empty state

If the authenticated user has zero compatible favorites, render a dedicated page empty state rather than an empty grid:

```text
Your Favorite Recipes

You haven't saved any recipes yet.
Save recipes you like and they'll appear here.

[ Explore Recipes ]
```

`Explore Recipes` routes to:

```text
/recipes
```

Do not render fake/sample favorite cards.

### Loading state

Initial load:

- retain the page heading;
- show a grid-compatible card skeleton/loading presentation;
- do not show the empty state until the request has successfully completed with zero items.

### Error state

If the initial request fails:

- retain the page shell/title;
- show the standard Appetee error presentation;
- provide Retry;
- do not incorrectly show the empty state;
- authentication expiration continues through the established global expired-session behavior.

### Unsave behavior

If the user unsaves a recipe while on `/favorites`:

1. The shared Recipe Experience performs the normal favorite mutation.
2. Card/Preview favorite state remains synchronized through F-008 behavior.
3. After the DELETE succeeds, the Favorites list removes that recipe.
4. If the removed recipe was the final item, the page transitions to the Favorites empty state.
5. If the mutation fails, the recipe remains in the list and the shared favorite UI reverts/reports the failure according to F-008.

The same rule applies when the user unsaves from Quick Preview: the Favorites page must not leave a successfully-unsaved recipe visible after synchronization completes.

## User Flows

### Flow 1 — Open Favorites from Home

1. The authenticated user opens `/home`.
2. F-006 shows `Your Favorite Recipes` only when at least one favorite exists.
3. The user selects `View all`.
4. Router navigates to `/favorites`.
5. F-009 loads the user's complete compatible Favorites list.
6. Shared Recipe Cards render in the same full-page grid style as `/recipes`.

### Flow 2 — Open a saved recipe

1. The user selects a Recipe Card on `/favorites`.
2. `RecipeCardComponent` delegates to `RecipeExperienceFacade`.
3. The shared Quick Preview opens.
4. Preview caching/loading/favorite behavior is the same as when the card is opened from `/recipes` or `/home`.
5. Cooking Mode remains the shared future continuation owned outside F-009.

### Flow 3 — Unsave a recipe

1. The user selects the favorite heart on a Favorite card or from Quick Preview.
2. F-008 performs the idempotent DELETE mutation for that recipe/current user.
3. On success, shared favorite state becomes unsaved.
4. F-009 removes the recipe from the Favorites list.
5. If no cards remain, render the empty state.

### Flow 4 — No favorites

1. The user opens `/favorites`.
2. API returns `200 []`.
3. Page shows the Favorites empty state.
4. User selects `Explore Recipes`.
5. Router navigates to `/recipes`.

## Business Rules

- Favorites are user-owned. A user can never list another user's favorites through this feature.
- The authenticated user ID comes only from the server-side authenticated session/principal.
- Only recipes still compatible with the user's current diets and ingredient restrictions are returned by normal Favorites views.
- A favorite relationship may remain persisted if a recipe later becomes incompatible; compatibility affects visibility, not relationship deletion.
- Favorites are ordered newest-saved first using `favorite_recipes.created_at DESC` with recipe ID as a deterministic tie-breaker.
- The same recipe cannot appear twice because the existing favorite relationship is unique per user/recipe.
- The full Favorites page fetches its list once; no cursor, `hasMore`, seed, rank, or pagination state exists in F-009.
- Home may request a smaller prefix of the same ordered list with `?limit=4`.
- `isSaved` is always `true` in the list response because every returned recipe is sourced from `favorite_recipes` for the current user.
- F-009 does not create a `FavoriteRecipeDto`; it reuses `RecipeCardDto`.
- F-009 does not create a Home-specific Favorites endpoint.
- F-009 does not create a Favorites-specific Card or Preview implementation.

## Shared Feature Ownership

F-009 consumes but does not own:

| Capability | Owner |
| --- | --- |
| `RecipeCardDto` | F-008 |
| Recipe Card UI | F-008 shared Recipe Experience |
| Quick Preview | F-008 shared Recipe Experience |
| Cooking Mode continuation | Future Cooking Mode feature / shared Recipe Experience |
| Favorite PUT/DELETE mutations | F-008 |
| Shared favorite-state synchronization | F-008 |
| Recipe compatibility predicate | F-008 |
| Badge ordering | F-008 |
| Featured-ingredient hydration | F-008 |
| Recipe image URL behavior | F-008 |
| Home Favorites section layout/visibility | F-006 |
| Home `View all` placement | F-006 |

F-009 owns:

- `/favorites`;
- Favorites list state;
- Favorites full-page UX;
- `GET /api/recipes/favorites`;
- newest-saved-first favorite-list semantics;
- removal of successfully-unsaved recipes from the Favorites list;
- Favorites empty/loading/error states.

## Data Requirements

F-009 requires only existing recipe/favorite data and the F-008 lightweight card projection.

### Canonical response item

Use the existing F-008 `RecipeCardDto` contract. Conceptually:

```ts
interface RecipeCardDto {
  readonly id: number;
  readonly name: string;
  readonly imageUrl: string | null;
  readonly totalTimeMinutes: number;
  readonly caloriesPerServing: number;
  readonly estimatedCostPerServing: number | null;
  readonly badges: readonly RecipeBadge[];
  readonly featuredIngredients: readonly FeaturedIngredientDto[];
  readonly isSaved: boolean;
}
```

Do not redefine different Favorites-specific fields in this feature.

### Frontend data ownership

| State | Ownership | Lifetime |
| --- | --- | --- |
| Authenticated identity/session | Existing application/session auth state | Authenticated session |
| Recipe preview/detail cache | F-008 shared data-access cache | Authenticated session / existing F-008 invalidation rules |
| Favorites list | `features/favorites/state` query/list state | Reused during the authenticated SPA session until invalidated |
| Current page loading/error | Favorites query/list state | Current cached Favorites query lifetime |
| Card internal interaction | Shared Recipe Experience | Component/shared interaction lifetime |

### Cache and freshness

Favorites list behavior:

- First `/favorites` entry loads from the API.
- Returning to `/favorites` during the same authenticated SPA session may reuse the already-loaded list if it has not been invalidated.
- Successful unsave of a displayed favorite removes it from the loaded Favorites list.
- A successful save elsewhere in the application invalidates the Favorites list so the next `/favorites` entry refreshes it; immediate insertion is optional only if the shared mutation event already provides a complete `RecipeCardDto` without extra fetching.
- Diet/restriction changes invalidate the Favorites list because compatibility visibility may change.
- Logout/identity change resets Favorites state completely.
- Browser refresh reloads Favorites from the API.

Do not add an arbitrary time-based TTL.

## Database Impact

### Existing tables used

- `favorite_recipes`
- `recipes`
- `recipe_badges`
- `recipe_ingredients`
- `ingredients`
- `user_diets`
- `diet_recipes`
- `user_ingredient_restrictions`

### Schema changes

None.

### Index changes

None initially.

The existing user/recipe uniqueness/access path on `favorite_recipes` is sufficient for the intended small per-user collection. Ordering a user's bounded set by `created_at` does not justify a speculative new index in this feature.

Implementation must validate the final candidate query with `EXPLAIN`. If the actual schema/access plan contradicts this assumption, document evidence before adding an index.

### Data migration

None.

## API Endpoints

| Method | Endpoint | Purpose | Owner | State |
| --- | --- | --- | --- | --- |
| `GET` | `/api/recipes/favorites` | Return current user's compatible saved recipes as `RecipeCardDto[]` | F-009 | Planned |
| `PUT` | `/api/recipes/{recipeId}/favorite` | Save one recipe | F-008 | Dependency |
| `DELETE` | `/api/recipes/{recipeId}/favorite` | Unsave one recipe | F-008 | Dependency |
| `GET` | `/api/recipes/{recipeId}/preview` | Lazy-load shared Quick Preview | F-008 | Dependency |

## Request Contracts

### `GET /api/recipes/favorites`

Authentication: required.

Query parameters:

```text
limit?: integer
```

Rules:

- `userId` is never accepted from the client.
- Omitted `limit` means return the complete compatible Favorites collection for the current user.
- `limit` is optional primarily for small consumers such as F-006 Home.
- When provided, `limit` must be an integer from `1` through `50`.
- `limit=4` is the F-006 Home preview contract.
- No `cursor`, `offset`, `page`, search, filter, or sort query parameters are supported.
- Ordering is always newest saved first.

Examples:

```http
GET /api/recipes/favorites
```

```http
GET /api/recipes/favorites?limit=4
```

## Response Contracts

### Success

Status:

```http
200 OK
```

Body:

```json
[
  {
    "id": 42,
    "name": "Mediterranean Grilled Salmon",
    "imageUrl": "https://...",
    "totalTimeMinutes": 35,
    "caloriesPerServing": 350,
    "estimatedCostPerServing": 4.25,
    "badges": ["High Protein", "Quick Meal", "Low Carb"],
    "featuredIngredients": [
      { "id": 12, "name": "Salmon", "featuredOrder": 1 },
      { "id": 23, "name": "Lemon", "featuredOrder": 2 },
      { "id": 31, "name": "Garlic", "featuredOrder": 3 }
    ],
    "isSaved": true
  }
]
```

The exact `RecipeCardDto` shape is canonically owned by F-008. The sample above is illustrative and must track that contract rather than fork from it.

### Empty

```http
200 OK
```

```json
[]
```

An empty Favorites collection is not `404`.

### Ordering

The array is ordered by:

```text
favorite_recipes.created_at DESC
recipe.id DESC
```

The second field is only a deterministic tie-breaker when timestamps match.

## Error Behavior

| Situation | Expected behavior |
| --- | --- |
| Missing/expired authentication | `401`; normal application expired-session handling applies |
| `limit < 1` or `limit > 50` | `400` |
| Non-integer `limit` | `400` through normal model binding/validation behavior |
| No favorites | `200 []` |
| Some saved recipes are incompatible | Omit incompatible recipes; request still succeeds |
| Backend/database failure | Standard application ProblemDetails/error behavior |

F-009 does not expose whether another user has favorited a recipe and does not accept another user's identifier.

## Backend Query Contract

The candidate query should follow the existing `RecipesController → IRecipeService/RecipeService → IRecipeQueries/RecipeQueries → SQL` layering from F-008.

Conceptually:

```sql
SELECT
    r.id,
    r.name,
    COALESCE(r.card_image_blob_name, r.image_blob_name) AS image_blob_name,
    r.total_time_minutes,
    r.calories_per_serving,
    r.estimated_cost_per_serving,
    fr.created_at AS favorited_at
FROM favorite_recipes fr
INNER JOIN recipes r
    ON r.id = fr.recipe_id
WHERE fr.user_id = @UserId
  AND {SHARED_F008_COMPATIBILITY_PREDICATE}
ORDER BY
    fr.created_at DESC,
    r.id DESC
{OPTIONAL_LIMIT};
```

Important:

- Use the shared F-008 compatibility SQL/predicate; do not copy a divergent version.
- Parameterize `@UserId` and `@Limit`.
- Do not concatenate user-controlled values into SQL.
- Do not fetch full recipe details/instructions for the Favorites page.
- Do not join badges and featured ingredients into the candidate query in a way that multiplies rows.

After candidate rows are known, reuse the F-008 bounded Recipe Card hydration path for:

- all canonical badges for returned IDs;
- featured ingredients ordered by `featured_order`.

The HTTP request may therefore use the same two bounded DB-call pattern as F-008 card discovery:

```text
DB call 1: favorite candidate/base rows
DB call 2: QueryMultiple hydration for badges + featured ingredients
```

No N+1 queries.

## Responsive Behavior

Favorites should match the existing `/recipes` full-page grid behavior rather than inventing new breakpoints.

```text
Large desktop:
- Use the same maximum content width and card-grid column behavior as /recipes.

Desktop/laptop:
- Use the same responsive Recipe Card grid as /recipes.

Tablet:
- Reduce grid columns using the same shared grid rules as /recipes.

Mobile:
- Use the same mobile Recipe Card presentation as /recipes.
- Natural vertical page scrolling.
- No Home-style horizontal recipe carousel on the full Favorites page.
```

Do not create a smaller Favorites Card variant.

## Accessibility Requirements

- `/favorites` page heading must be semantic and unique.
- Recipe Cards retain the shared F-008 keyboard/focus behavior.
- Favorite heart remains a real accessible button and does not trigger card opening.
- Empty-state `Explore Recipes` is a semantic navigation action.
- Retry is a semantic button.
- Loading state must not incorrectly announce an empty collection before data resolves.
- Grid/reflow must remain usable under browser zoom and narrow widths.
- Shared Quick Preview retains its F-008 focus trap, Escape, focus restoration, and accessible dialog behavior.

## Routing

Canonical routing is documented in [`assets/favorites-routing.svg`](assets/favorites-routing.svg).

Key routes:

```text
/home
  └─ Your Favorite Recipes → View all → /favorites

/favorites
  ├─ RecipeCard → shared Quick Preview
  ├─ empty state → Explore Recipes → /recipes
  └─ RecipeCard heart → shared F-008 favorite mutation
```

`/favorites` lives under the authenticated/private route tree and uses the existing `authGuard` through `PrivateLayoutComponent`.

F-009 does not require a new main-navigation item.

## Delivery Phases

### Phase 1 — Complete Favorites list feature

Status: Not started

#### User value delivered

- Authenticated users can open `/favorites`, see their saved compatible recipes in the same grid/card experience as `/recipes`, open Quick Preview, unsave recipes, and reach `/recipes` from an empty Favorites page.
- F-006 Home can request the first four Favorites from the same canonical endpoint and activate `View all` → `/favorites`.

#### Included work

Product behavior:

- [ ] Add the protected `/favorites` route under the existing private/authenticated layout.
- [ ] Render a Favorites page heading/subtitle consistent with Appetee typography.
- [ ] Render all returned Favorites in the same full-page Recipe Card grid presentation used by `/recipes`.
- [ ] Do not add search, filters, pagination controls, cursor state, or recommendation behavior.
- [ ] Render a real empty state when the successful Favorites response is empty.
- [ ] `Explore Recipes` from the empty state routes to `/recipes`.
- [ ] Successfully-unsaved recipes disappear from the Favorites list.
- [ ] If the last favorite is removed, transition to the empty state.

Backend/API:

- [ ] Add `GET /api/recipes/favorites` to `RecipesController` under the existing `[Authorize]` boundary.
- [ ] Resolve the current user using the same authenticated-session mechanism established by F-008; do not accept `userId` from the request.
- [ ] Add application/query methods following existing recipe layering, using names consistent with the codebase such as `GetFavoritesAsync`.
- [ ] Implement optional `limit` validation `1..50`.
- [ ] Omitted `limit` returns the complete compatible current-user Favorites collection.
- [ ] Reuse the shared F-008 compatibility predicate for diets and ingredient restrictions.
- [ ] Order by `favorite_recipes.created_at DESC`, then recipe ID DESC.
- [ ] Return F-008 `RecipeCardDto[]`; do not introduce `FavoriteRecipeDto`.
- [ ] Reuse F-008 image selection, canonical badge ordering, featured-ingredient ordering, and card hydration behavior.
- [ ] Use bounded set-based hydration; no N+1 queries.
- [ ] Return `200 []` for a user with no compatible favorites.
- [ ] Keep the existing F-008 PUT/DELETE favorite endpoints as the mutation source of truth.

Frontend architecture:

- [ ] Create `src/app/features/favorites/` with route/page files following current feature conventions.
- [ ] Create feature-owned Favorites query/list state under `features/favorites/state/` if the current architecture uses a store/facade for comparable list features.
- [ ] Keep Favorites list state lightweight: items, load status/error, loaded/stale state; no cursor/criteria/search/filter state.
- [ ] Add/reuse `RecipesApi.getFavorites(limit?)` in the existing shared recipe data-access layer rather than creating a second HTTP client abstraction.
- [ ] The Favorites page must not call raw `HttpClient` directly.
- [ ] Reuse the shared `RecipeCardComponent`; do not create a Favorites-specific card.
- [ ] Reuse shared Recipe Experience behavior; the page must not import/open Quick Preview directly.
- [ ] If the `/recipes` full-page grid is not already reusable, extract its layout into a shared `recipe-card-grid` component and refactor `/recipes` to consume the same component.
- [ ] Do not duplicate `/recipes` card-grid CSS into Favorites.
- [ ] Preserve current Recipe Card visual behavior exactly when extracting the grid.
- [ ] Observe the shared favorite mutation synchronization path: successful unsave removes the recipe from Favorites.
- [ ] A successful save elsewhere marks the Favorites list stale so a later `/favorites` entry refreshes it unless the existing shared architecture can insert the complete card without another request.
- [ ] Reset Favorites state on logout/identity change.
- [ ] Invalidate/reload Favorites when diet/restriction changes can alter compatibility.

Home integration:

- [ ] Support F-006 request `GET /api/recipes/favorites?limit=4` with the same ordering and DTO.
- [ ] F-006 may use that response for its `Your Favorite Recipes` shared `RecipeListSection`.
- [ ] F-006 `View all` routes to `/favorites` once this feature is implemented.
- [ ] F-006 continues to hide the entire Favorites section after a successful zero-item result.
- [ ] Do not create a separate Home Favorites endpoint.

Styling/reuse:

- [ ] Inspect and reuse existing `_button.scss`, `_text.scss`, `_theme.scss`, CSS variables, and shared layout primitives before adding styles.
- [ ] Match `/recipes` card-grid spacing/responsive behavior rather than copying Builder/Tailwind/shadcn code.
- [ ] Do not hard-code duplicate Appetee colors or typography tokens.

Documentation/assets:

- [ ] Keep [`assets/favorites-routing.svg`](assets/favorites-routing.svg) aligned with implemented routing.
- [ ] Treat [`assets/home-favorites-section-reference.png`](assets/home-favorites-section-reference.png) only as the F-006 Home Favorites section/layout reference; its historical card internals do not override the F-008 Recipe Card contract.

#### Tests and validation

Backend/API:

- [ ] Authenticated user receives only their own favorites.
- [ ] Unauthenticated request returns `401`.
- [ ] No `userId` query/body parameter can select another user's favorites.
- [ ] A user with zero favorites receives `200 []`.
- [ ] Incompatible saved recipes are omitted using the shared compatibility rules.
- [ ] Compatible saved recipes remain visible.
- [ ] Results are ordered newest-saved first with recipe ID tie-breaking.
- [ ] `?limit=4` returns at most four items in the same order as the full list prefix.
- [ ] `limit=1` succeeds.
- [ ] `limit=50` succeeds.
- [ ] `limit=0` returns `400`.
- [ ] `limit=51` returns `400`.
- [ ] Returned cards use the canonical F-008 badge ordering.
- [ ] Returned cards include featured ingredients in `featured_order` order.
- [ ] Returned cards have `isSaved=true`.
- [ ] Query uses no per-card N+1 database requests.
- [ ] Run `EXPLAIN` against the favorite candidate query with representative data and verify no new speculative index is required.

Frontend/component:

- [ ] `/favorites` is reachable only in the authenticated route tree.
- [ ] Initial loading state is shown before the API resolves.
- [ ] Successful empty result renders the empty state, not a blank grid.
- [ ] Error result renders Retry and not the empty state.
- [ ] Retry can recover from a transient Favorites-load error.
- [ ] Favorite cards use the same shared Recipe Card component as `/recipes`.
- [ ] Favorite page grid uses the same shared grid/layout behavior as `/recipes`.
- [ ] Card click/keyboard activation opens the shared Quick Preview without page-owned dialog logic.
- [ ] Heart click does not open Quick Preview.
- [ ] Successful unsave from the card removes that recipe from the Favorites list.
- [ ] Successful unsave from Quick Preview also removes that recipe from the Favorites list.
- [ ] Failed unsave leaves/restores the recipe correctly and uses standard favorite error feedback.
- [ ] Removing the final recipe transitions to the empty state.
- [ ] Empty-state `Explore Recipes` routes to `/recipes`.
- [ ] Browser refresh reloads Favorites correctly.
- [ ] Returning to Favorites in the same authenticated SPA session may reuse a valid non-stale list.
- [ ] Logout/identity change clears the cached Favorites list.
- [ ] Home `?limit=4` preview integration returns the correct first four favorites.
- [ ] Home Favorites `View all` reaches `/favorites` after route activation.

Auth/session regression coverage:

- [ ] Integration tests cover remembered and non-remembered cookie/session behavior for protected Favorites access where the shared auth test harness supports it.
- [ ] Idle, sliding, and absolute-expiration behavior continues to protect `/favorites` consistently with other authenticated routes.
- [ ] Frontend expired-session redirect/message behavior is validated from `/favorites`.
- [ ] Multi-browser/session behavior does not expose another identity's cached Favorites list after identity changes.

Build/quality:

- [ ] Backend unit/integration/contract tests pass.
- [ ] Frontend unit/component/router tests pass.
- [ ] Frontend type checking/build passes.
- [ ] Backend build/tests pass.
- [ ] Desktop/laptop/tablet/mobile layouts are manually validated.
- [ ] Keyboard/focus behavior is manually validated.
- [ ] No duplicate Recipe Card, Quick Preview, favorite HTTP mutation, or Recipe Card grid implementation remains after refactor.

#### Phase completion criteria

- [ ] `GET /api/recipes/favorites` is implemented according to this contract.
- [ ] `/favorites` is implemented and protected.
- [ ] The page uses F-008 `RecipeCardDto` and shared Recipe Experience only.
- [ ] Favorites load in one request with no cursor/network pagination.
- [ ] Successful unsave removes the card from Favorites.
- [ ] Empty/loading/error states work correctly.
- [ ] F-006 Home can request four favorites and route `View all` to `/favorites`.
- [ ] Required tests/builds pass.
- [ ] Routing asset and documentation match implementation.
- [ ] No unresolved blocking defect remains in the feature scope.

## Work Status

### Completed

None.

### In Progress

None.

### Remaining

- [ ] Phase 1 — Complete Favorites list feature.

Documentation creation alone does not count as implementation completion.

## Acceptance Criteria

- [ ] AC-001: An authenticated user can open `/favorites`.
- [ ] AC-002: A guest/expired session cannot access `/favorites` and follows normal authenticated-route behavior.
- [ ] AC-003: `/favorites` shows only recipes saved by the current authenticated user and still compatible with current diet/restriction rules.
- [ ] AC-004: Favorites are newest-saved first.
- [ ] AC-005: The page uses the exact F-008 `RecipeCardDto` and shared Recipe Card/Quick Preview behavior.
- [ ] AC-006: The page uses the same full-page Recipe Card grid presentation as `/recipes`.
- [ ] AC-007: Favorites has no search, filters, recommendation logic, cursor, or network infinite pagination.
- [ ] AC-008: A successful unsave removes the corresponding recipe from the page.
- [ ] AC-009: Removing the final favorite produces the approved empty state.
- [ ] AC-010: `Explore Recipes` from the empty state routes to `/recipes`.
- [ ] AC-011: `GET /api/recipes/favorites?limit=4` supports the F-006 Home Favorites preview.
- [ ] AC-012: F-006 Home `View all` can route to `/favorites` after F-009 is implemented.
- [ ] AC-013: No duplicate Favorites-specific recipe DTO, card, preview, or favorite mutation implementation is introduced.
- [ ] AC-014: Favorites state is cleared when authenticated identity changes.

## Risks and Open Questions

No blocking product question remains for the initial feature.

The no-pagination decision is based on the intentionally small expected saved-recipe collection. If real usage later grows substantially, pagination should be added as a deliberate feature revision rather than pre-optimizing the initial implementation.

## Future Evolution

Possible future additions, not part of F-009 v1:

- favorite collections/folders;
- collection names and management;
- search within favorites;
- filtering/sorting choices;
- user-controlled order;
- pagination if collection sizes materially exceed the current assumption;
- adding favorite collections to Meal Plan workflows.

These extensions must continue to reuse the shared F-008 Recipe Card/Preview experience.

## Decisions

- `/favorites` is the canonical full Favorites route.
- `GET /api/recipes/favorites` is the canonical Favorites-list endpoint.
- F-009 uses one implementation phase.
- The Favorites page loads the complete collection once and uses normal page scrolling.
- There is no F-008-style cursor pagination in F-009 v1.
- Favorites are newest-saved first.
- `?limit=4` exists for the F-006 Home preview.
- F-009 reuses `RecipeCardDto`; no Favorites-specific recipe DTO exists.
- F-009 reuses the exact shared Recipe Card → Quick Preview → Cooking Mode flow.
- The full-page card grid must be shared with `/recipes`, not copied.
- Incompatible saved recipes are hidden but their favorite relationship is not automatically deleted.
- The Favorites empty state routes users to `/recipes`.
- F-006 hides its Favorites section entirely when its successful favorite preview is empty.

## Related Documents

- [`frontend.md`](frontend.md)
- [`backend.md`](backend.md)
- [`assets/favorites-routing.svg`](assets/favorites-routing.svg)
- [`assets/home-favorites-section-reference.png`](assets/home-favorites-section-reference.png)
- F-008 — Recipe Discovery, Recipe Card & Quick Preview
- F-006 — Home Page

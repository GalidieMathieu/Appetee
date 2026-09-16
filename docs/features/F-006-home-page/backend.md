# F-006 — Home Page — Backend

## Canonical Contract

`README.md` owns Home product behavior, route targets, dependency endpoint usage, counts, and error/empty rules.

## Backend Ownership

F-006 owns **no new backend endpoint, database table, migration, index, or SQL query**.

This is intentional. Home composes bounded data from existing/owning domains:

- F-008 Recipe Discovery for Discover;
- Recipe Favorites for saved-recipe preview;
- Manual Meal Planning for future Upcoming Meals.

Do not implement a `HomeController`, `HomeService`, or Home-specific recipe repository merely because Home consumes multiple domains.

## Removed/Obsolete F-006 Backend Design

The previous F-006 concept proposed a Home-owned random recommendation endpoint and cross-section exclusion logic.

That design is obsolete.

Do not create or retain for F-006:

```text
GET /api/recipes/recommended
excludeRecipeId query parameters
Home recommendation SQL
Home recommendation-history table
Home-specific recipe card DTO
Home favorite cursor/refill endpoint
```

Discover now reuses F-008 directly.

## Discover Dependency — F-008

Home uses:

```http
GET /api/recipes?limit=5
```

Expected owner behavior from F-008:

- authenticated user resolved from cookie/session;
- mandatory diet compatibility;
- mandatory avoided/restricted ingredient filtering;
- current seeded/randomized browse ordering when no text search exists;
- lightweight `RecipeCardDto` projection;
- `isSaved` projection;
- badge ordering and featured ingredients;
- `RecipeDiscoveryPageDto` response.

F-006 supplies no cursor and consumes only the first five items.

F-006 does not alter the F-008 query to exclude recipes already present in Favorites or Meal Planning.

A duplicate recipe across Home sections is acceptable for the initial version.

## Favorites Dependency

Target owned endpoint:

```http
GET /api/recipes/favorites?limit=4
```

This endpoint belongs to the Recipe Favorites feature.

The expected Favorites feature behavior, required by Home, is:

- authenticate from session/cookie;
- derive user ID server-side;
- return only the current user's favorite recipes;
- apply the normal mandatory recipe compatibility predicate unless the Favorites owning spec intentionally establishes a different visibility rule;
- order newest saved first (`favorite_recipes.created_at DESC` intent);
- optional bounded `limit` for Home;
- use existing F-008 `RecipeCardDto` instead of a duplicate favorite DTO;
- no pagination required for Home.

The planned dedicated `/favorites` feature may retrieve the user's bounded collection (approximately maximum 50) in one request. That full-page behavior is not implemented by F-006.

### Favorite mutations

F-006 does not own:

```http
PUT /api/recipes/{recipeId}/favorite
DELETE /api/recipes/{recipeId}/favorite
```

Those remain F-008/shared favorite behavior.

Home components must not call them directly.

## Meal Planning Dependency

Manual Meal Planning owns the eventual endpoint that Home uses for upcoming meals.

The current target from prior product design is conceptually:

```http
GET /api/meal-plans/current/upcoming?limit=4
```

The final owning feature may refine the exact route/contract.

Required Home semantics when that feature exists:

- authenticated user derived server-side;
- active/current plan selection owned by Meal Planning;
- upcoming items ordered chronologically/slot order by Meal Planning;
- up to four Home items;
- each item exposes/contains the shared `RecipeCardDto` projection needed by Home;
- explicit successful no-plan/no-upcoming state so Home can render its CTA;
- F-006 does not query meal-plan tables directly.

Until Meal Planning exists, F-006 renders the no-plan CTA and does not create temporary meal-plan backend infrastructure.

## Database Impact

### F-006 tables

None.

### F-006 schema changes

None.

### F-006 indexes

None.

### F-006 migrations/reset changes

None.

If implementation discovers that F-008/Favorites/Meal Planning need indexes, changes belong to those owning specifications and must be justified by their query patterns.

## Authentication and Authorization

All Home data endpoints are authenticated via existing Appetee cookie/session behavior.

F-006 never sends a user ID query/body value.

Expected responses remain consistent with existing API behavior:

```text
401 → expired/missing authenticated session
400 → invalid endpoint-specific query parameters such as invalid limit (owner-defined)
404 → endpoint-specific resource semantics, not a generic Home error
```

Home does not introduce a separate authentication mechanism.

## Performance Expectations

F-006 intentionally keeps backend work bounded:

```text
Discover:   5 RecipeCardDto items
Favorites:  4 RecipeCardDto items
Upcoming:   4 items later
Preview:    lazy through F-008 only when card opens
```

No Home endpoint joins all three domains.

Do not build a backend aggregator endpoint such as:

```text
GET /api/home
```

for the current version.

Independent domain requests provide simpler ownership, independent failures, and easier future evolution.

## Backend Validation During F-006 Implementation

Although F-006 adds no backend code, Codex must verify integration assumptions against the current branch:

- [ ] Confirm F-008 `GET /api/recipes` supports bounded `limit=5` and returns `RecipeCardDto` items suitable for Home.
- [ ] Confirm F-008 compatibility is server-authoritative and Home does not need user diet/restriction parameters.
- [ ] Confirm Home does not use the obsolete whole-catalog `GetAll` path.
- [ ] Confirm Recipe Favorites endpoint contract before wiring the Home preview; do not invent a competing endpoint if it differs.
- [ ] Confirm favorite mutations remain shared and no Home backend mutation is added.
- [ ] Confirm no Home recommendation endpoint/query remains after cleanup.
- [ ] Confirm no Home database/schema changes are introduced.
- [ ] Confirm 401/session behavior remains the standard application behavior for all consumed endpoints.

## Backend Tests Owned Elsewhere but Required for Home Confidence

F-006 implementation should run/rely on relevant owning-feature tests for:

- F-008 compatible browse with `limit=5`;
- current user diet/restriction enforcement;
- favorite list user scoping;
- favorite list bounded `limit=4`;
- favorite list newest-first ordering when finalized by Favorites;
- unauthorized access;
- favorite PUT/DELETE behavior used by shared Recipe Experience;
- future Meal Plan current/upcoming semantics when that dependency exists.

Do not duplicate these as Home-specific backend unit tests when no Home backend code exists.

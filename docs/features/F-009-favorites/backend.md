# F-009 — Favorites — Backend

## Canonical Contract

[`README.md`](README.md) owns the API route, request/response contract, ordering, compatibility behavior, list sizing, database-impact decision, and product error semantics.

This document describes how the ASP.NET Core/Dapper backend should implement that contract without creating a second recipe-read architecture.

## Backend Goal

Add one authenticated lightweight Favorites-list query:

```http
GET /api/recipes/favorites
```

that returns the current user's compatible saved recipes as the existing F-008 `RecipeCardDto[]`, newest saved first.

The endpoint must reuse the existing recipe layering, compatibility logic, image resolution, badge ordering, and featured-ingredient hydration established by F-008.

## Authorization and Ownership

- Endpoint requires authentication through the existing `[Authorize]` recipe controller boundary.
- Current user ID comes from the authenticated principal/session using the same mechanism established by F-008.
- Never accept `userId` from query/body/route.
- The query must always scope `favorite_recipes.user_id = @UserId`.
- Admin role does not bypass ownership for personal Favorites.
- Normal compatibility rules still apply.

## API Layer

Preferred route placement:

```csharp
[HttpGet("favorites")]
public async Task<ActionResult<IReadOnlyList<RecipeCardDto>>> GetFavorites(
    [FromQuery] int? limit,
    CancellationToken ct)
```

Exact action signature should follow the conventions F-008 establishes for authenticated user resolution and validation.

Controller responsibilities:

- validate/map `limit` or delegate validation consistently to the application layer;
- resolve current user from the authenticated context;
- call `IRecipeService.GetFavoritesAsync(...)` or the equivalent established naming;
- return `200` with an array including for zero results;
- expose the OpenAPI contract;
- never perform SQL or card hydration directly.

## Application Layer

Extend the existing recipe service rather than adding a parallel Favorites service unless current code organization after F-008 clearly separates favorite use cases.

Conceptual contract:

```csharp
Task<IReadOnlyList<RecipeCardDto>> GetFavoritesAsync(
    int userId,
    int? limit,
    CancellationToken ct);
```

Responsibilities:

- enforce `limit` `1..50` when present;
- call the query layer;
- preserve F-008 canonical badge ordering;
- resolve card image URLs through the same mechanism as discovery;
- return immutable/read-only card projection data;
- do not load full recipe details/instructions.

## Domain Rules

- Favorites list is current-user-owned.
- Only compatible recipes are visible.
- Hiding an incompatible recipe does not delete the `favorite_recipes` row.
- Ordering is newest saved first.
- `isSaved` is true for every returned item.
- Empty collection is valid.
- No pagination cursor exists.

## Persistence

### Tables

Canonical tables are documented in `README.md`.

Primary access path:

```text
favorite_recipes(current user)
  → recipes
  → mandatory compatibility predicates
  → ordered base card rows
  → shared card hydration for badges + featured ingredients
```

### Query interface

Extend the existing `IRecipeQueries`/`RecipeQueries` architecture from F-008.

Conceptually:

```csharp
Task<IReadOnlyList<RecipeCardData>> GetFavoritesAsync(
    int userId,
    int? limit,
    CancellationToken ct);
```

Use existing internal row/data types when possible. Do not create duplicate persistence models solely because the caller is Favorites.

## SQL Access Pattern

Candidate/base-row query:

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
  AND {F008_COMPATIBILITY_PREDICATE}
ORDER BY
    fr.created_at DESC,
    r.id DESC
{LIMIT};
```

Implementation rules:

- build the optional limit only from a validated server-side branch;
- parameterize values;
- reuse the F-008 compatibility fragment/helper, not a copy;
- avoid JOINing badges/ingredients in a way that duplicates base recipe rows;
- do not use `ORDER BY RAND()`;
- do not compute discovery ranks/cursors for Favorites.

### Hydration

After base IDs are known, reuse the F-008 Recipe Card hydration path.

Conceptually one `QueryMultipleAsync` call can return:

```sql
SELECT recipe_id, badge
FROM recipe_badges
WHERE recipe_id IN @RecipeIds;

SELECT
    ri.recipe_id,
    i.id,
    i.name,
    ri.featured_order
FROM recipe_ingredients ri
INNER JOIN ingredients i
    ON i.id = ri.ingredient_id
WHERE ri.recipe_id IN @RecipeIds
  AND ri.featured_order IS NOT NULL
ORDER BY
    ri.recipe_id,
    ri.featured_order;
```

F-008 remains canonical for actual table/column names and badge ordering.

Expected DB-call shape:

```text
1. Favorites candidate/base rows
2. Shared card relationship hydration
```

No N+1.

## Index Validation

F-009 proposes no new index initially.

Reason:

- query first scopes by current user;
- favorite collection is intentionally small;
- existing favorite uniqueness/access path should already begin with `user_id`;
- sorting a bounded per-user result by `created_at` is acceptable.

Implementation must:

- inspect the actual post-F-008 schema/indexes;
- run `EXPLAIN` on the candidate query with representative data;
- only propose an index such as `(user_id, created_at, recipe_id)` if measured access plans justify it.

Do not add it speculatively.

## Transactions

Read endpoint requires no explicit multi-statement transaction.

It may perform two bounded reads for candidate rows and card hydration. A recipe being unsaved concurrently may produce a transient read snapshot difference depending on connection/isolation timing; this is acceptable because the client mutation synchronization removes successfully-unsaved recipes and the next reload reconciles state.

Do not introduce locking for this read feature.

## Concurrency

Favorites list itself is a read query.

Concurrent favorite mutation semantics remain owned by F-008.

Expected behavior:

- duplicate save remains idempotent according to F-008;
- repeated delete remains idempotent according to F-008;
- a concurrent successful unsave is reconciled by frontend favorite-change synchronization or next reload;
- no `409` is required for stale Favorites list reads.

## Idempotency

Not applicable to `GET /favorites` beyond normal safe GET semantics.

PUT/DELETE idempotency remains F-008-owned.

## Validation

Server-authoritative query validation:

```text
limit omitted → valid
1 <= limit <= 50 → valid
otherwise → 400
```

No other query criteria are supported.

Do not silently accept:

```text
userId
search
cursor
page
offset
sort
filters
```

Unknown query parameters may follow the application's normal ASP.NET behavior, but they must not affect query semantics.

## Mapping

Conceptual mapping:

```text
Favorite candidate row
+ shared F-008 badge/featured-ingredient hydration
→ RecipeCardData/application projection
→ RecipeCardDto
```

Image URL resolution and canonical badge sorting must reuse F-008 behavior.

Do not return `favoritedAt` in `RecipeCardDto` unless F-008's canonical card contract is deliberately changed. It is an internal ordering field only.

## External Services

No new external service.

Existing image/blob URL behavior is inherited from F-008.

## Error Mapping

- unauthenticated: `401`;
- invalid `limit`: `400`;
- empty list: `200 []`;
- persistence/system failure: common ProblemDetails behavior.

No `404` for the collection endpoint.

## Logging and Observability

Useful low-cardinality diagnostics may include:

- Favorites query duration;
- returned result count;
- whether optional limit was used;
- database failure category.

Do not log:

- authentication/session tokens;
- full user preference payloads;
- unnecessary recipe/favorite lists;
- sensitive personal data.

## Database Migration

None.

No schema or index change is part of the approved initial contract.

## Testing

### Unit

- [ ] Limit validation accepts omitted/1/50 and rejects 0/51.
- [ ] Application mapping preserves canonical RecipeCardDto behavior.
- [ ] Canonical badge order is reused.

### Integration

- [ ] Current user's saved compatible recipes are returned.
- [ ] Another user's favorites are never returned.
- [ ] Zero favorites returns `200 []`.
- [ ] Incompatible favorites are omitted without deleting the relationship.
- [ ] Ordering is `favorite created_at DESC, recipe id DESC`.
- [ ] `limit=4` returns the first four from that order.
- [ ] Returned `isSaved` is true.
- [ ] Badge and featured-ingredient hydration is set-based and correct.

### Authorization/ownership

- [ ] Missing/expired authentication returns `401`.
- [ ] Browser-supplied user ID cannot select another account's favorites.
- [ ] Admin privilege does not expose another user's personal favorites.

### Contract

- [ ] OpenAPI documents `GET /api/recipes/favorites`.
- [ ] Response contract is the existing F-008 `RecipeCardDto[]`.
- [ ] Invalid limit behavior is documented/tested as `400`.
- [ ] Empty response is a JSON array, not null/404.

### Migration/database

- [ ] No migration is generated for F-009.
- [ ] Actual existing indexes are inspected.
- [ ] `EXPLAIN` is captured/reviewed for representative Favorites query.
- [ ] No speculative index is added without evidence.

### Concurrency/idempotency

- [ ] Concurrent list/read + unsave does not require row locks or cause server errors.
- [ ] Existing F-008 repeated PUT/DELETE idempotency remains intact.

### Failure/retry

- [ ] Database failure maps through standard error handling.
- [ ] Cancellation token is honored through controller/service/query layers.

### Auth/session regression

- [ ] Remembered and non-remembered sessions can access the endpoint while valid.
- [ ] Idle/sliding/absolute expiration continues to produce the established auth behavior.
- [ ] Identity changes do not allow cached server-side results to cross users.

## Implementation Notes

Keep Favorites inside the existing recipe query/service stack because the response is a recipe-card projection and depends heavily on F-008 recipe compatibility/hydration.

Do not create a separate repository that duplicates:

- compatibility SQL;
- badge hydration;
- featured ingredient hydration;
- image URL behavior.

The new behavior should look like a small additional recipe read use case, not a second recipe subsystem.

## Dependencies

- F-008 — Recipe Discovery, Recipe Card & Quick Preview
- E-010 — API contracts/error conventions
- E-017 — Testing Strategy

<!--
Purpose: Defines backend architecture, persistence, validation, and verification guidance for F-008.
Change reason: Record F-008 Phase 13 privacy-safe observability and final scale/contract verification.
Created: Existing file; original timestamp was not recorded.
Last updated: 2026-08-28T20:24:31-06:00
-->

# F-008 — Recipe Discovery, Recipe Card, and Quick Preview — Backend

## Canonical Contract

The feature [`README.md`](README.md) owns shared data requirements, schema requirements, API routes, request/response contracts, cursor behavior and product error semantics.

This document describes how the existing ASP.NET Core + Application + Infrastructure architecture implements that approved contract.

Do not redefine incompatible API or persistence behavior here.

## Backend Goal

Replace the temporary whole-catalog recipe read with a bounded authenticated discovery pipeline that:

- always applies user diet and ingredient-restriction compatibility;
- supports stable cursor pagination;
- supports recipe/ingredient text search and advanced filters;
- returns a lightweight Recipe Card projection rather than complete recipe details;
- exposes a dedicated lightweight Preview read path;
- exposes idempotent save/unsave mutations;
- stays inside the existing Dapper/MySQL architecture;
- avoids whole-catalog hydration and N+1 queries.

## Current Backend Baseline

Current `development` structure:

```text
Appetee.Api
└── Controllers/
    └── RecipesController.cs

Appetee.Application
├── Dtos/
│   └── RecipeDto.cs
├── Requests/
├── Services/Recipes/
│   ├── IRecipeService
│   └── RecipeService
├── Abstractions/Recipes/
│   └── IRecipeQueries
├── Models/Recipes/
└── RowData/

Appetee.Infrastructure
└── Recipes/
    ├── RecipeQueries.cs
    ├── RecipeSql.cs
    └── BulkInsertSql.cs
```

Current `RecipeQueries` uses Dapper, `CommandDefinition`, `QueryAsync`, `QueryMultipleAsync`, `ExecuteAsync`, `ExecuteScalarAsync`, a shared `IDbConnectionFactory`, and Blob URL mapping.

F-008 must preserve this layering.

Do not introduce:

- Entity Framework;
- a second ORM;
- MediatR/CQRS infrastructure solely for this feature;
- a new generic repository layer;
- a search service unrelated to the existing query layer;
- a database cache solely to solve a 3,000–5,000 recipe query.

## Authorization and Ownership

All F-008 recipe endpoints are authenticated.

Controller-level expectation:

```csharp
[ApiController]
[Route("api/recipes")]
[Authorize]
```

The current user ID is derived from the existing authentication/session service using the same application convention already used by current-user endpoints such as `UsersController`.

Never accept trusted current-user identity through:

```text
query string
route userId
request body userId
```

### Discovery

Current user ID is required to:

- load user diets;
- enforce recipe diet compatibility;
- enforce ingredient restrictions;
- calculate `isSaved`;
- apply `savedOnly`;
- bind cursor criteria fingerprint to the current account.

### Preview

Current user ID is required to:

- recheck compatibility;
- calculate `isSaved`.

### Favorite

Current user ID is required to own the `favorite_recipes` membership.

## API Layer

### `RecipesController`

Recommended responsibilities after F-008:

```text
GET    /api/recipes
GET    /api/recipes/{id}
GET    /api/recipes/{id}/preview
PUT    /api/recipes/{id}/favorite
DELETE /api/recipes/{id}/favorite

existing placeholder Meal Prep routes remain separate until their feature replaces them
```

Controller responsibilities:

- bind HTTP query/route input;
- obtain current session/user ID;
- call `IRecipeService`;
- map application result to documented HTTP response;
- expose correct OpenAPI response contracts.

Do not put SQL building/cursor decoding/search scoring in the controller.

### Replace temporary GetAll

Delete:

```text
RecipesController.GetAll
IRecipeService.GetAllAsync
IRecipeQueries.GetAllAsync
RecipesApi.getAll consumer semantics
RecipeSql.GetAll
```

once no current implementation consumer requires the old whole-catalog contract.

`GET /api/recipes` keeps its route but becomes the F-008 discovery endpoint.

Do not retain a second hidden unbounded consumer `GetAll` path for convenience.

The existing complete `GET /api/recipes/{id}` remains because current authoring/edit/detail consumers use it. It is not the Preview endpoint.

## Application Layer

### `RecipeService`

Add/replace application use cases conceptually:

```csharp
Task<RecipeDiscoveryPageDto> DiscoverAsync(
    int userId,
    RecipeDiscoveryRequest request,
    CancellationToken ct);

Task<RecipePreviewDto?> GetPreviewAsync(
    int userId,
    int recipeId,
    CancellationToken ct);

Task<bool> SaveFavoriteAsync(
    int userId,
    int recipeId,
    CancellationToken ct);

Task RemoveFavoriteAsync(
    int userId,
    int recipeId,
    CancellationToken ct);
```

Exact return shape for favorite compatibility/not-found may use an existing application result pattern rather than literal `bool`; preserve project conventions.

The service owns:

- public request normalization;
- public validation;
- canonical badge validation;
- search term normalization;
- max-difficulty translation;
- cursor/query coordination boundary;
- mapping of invalid input to existing `ValidationException`/E-010 behavior;
- server-authoritative authoring validation/calculation extensions from Phase 2.

Infrastructure receives a normalized internal query model rather than raw untrusted HTTP input when practical.

### `RecipeDiscoveryRequest`

Conceptual application/API request model:

```csharp
public sealed record RecipeDiscoveryRequest
{
    public string? Search { get; init; }

    public int[] IngredientIds { get; init; } = [];

    public bool RequireAllIngredients { get; init; } = true;

    public string[] Badges { get; init; } = [];

    public int? MaxTotalMinutes { get; init; }

    public RecipeDifficulty? MaxDifficulty { get; init; }

    public bool SavedOnly { get; init; }

    public string? Cursor { get; init; }

    public int Limit { get; init; } = 20;
}
```

If current model-binding conventions use constructor records instead of property records, Codex may follow that local style.

### Normalized internal query model

Recommended internal model:

```text
EffectiveSearchTerms
IngredientIds
RequireAllIngredients
CanonicalBadges
MaxTotalMinutes
AllowedDifficulties or MaxDifficultyLevel
SavedOnly
PageSize
DecodedCursor / null
CriteriaFingerprint
```

Do not make SQL builder repeat high-level request normalization.

## Domain Rules

### Badge canonical values

Canonical stored/API values:

```text
High Protein
Low Calorie
Low Carb
High Fiber
Quick Meal
Meal Prep
Freezer Friendly
Budget Friendly
Few Ingredients
```

Expand the existing application badge validation definition rather than creating a second unrelated list.

Add one canonical display-priority helper/metadata next to the canonical badge definition.

Priority:

```text
High Protein       1
Low Calorie        2
Low Carb           3
High Fiber         4
Quick Meal         5
Meal Prep          6
Freezer Friendly   7
Budget Friendly    8
Few Ingredients    9
```

SQL may return badge rows in arbitrary/native order; application mapping sorts using this one canonical rule.

### Recipe description

- required;
- trimmed;
- nonblank;
- maximum follows the canonical database/API rule, target `VARCHAR(500)`.

### Recipe times

Authoring validates:

```text
prep >= 0
cook >= 0
total > 0
total >= prep
total >= cook
```

Do not require `total == prep + cook`.

### Ingredient display/featured order

For future authored recipes:

- submitted ingredient list order becomes `display_order = index + 1`;
- 1–3 ingredients must have a unique `featuredOrder` in `1..3`;
- selected featured orders must be unique;
- ingredient IDs remain unique per recipe.

For reset dataset:

- source ingredient array order becomes `display_order`;
- source `featuredOrder` becomes persisted `featured_order`.

### Per-serving calories/protein

For generated seed data, use canonical source calculated values.

For normal recipe create/update:

```text
backend-calculated total
/
servings
=
persisted per-serving value
```

Use the same server-authoritative calculation pipeline as F-007.

Browser-submitted nutrition never becomes authoritative write data.

## Persistence

### Tables

F-008 reads/writes:

```text
recipes
recipe_ingredients
ingredients
recipe_badges
favorite_recipes
user_diets
diet_recipes
user_ingredient_restrictions
```

F-007 authoring still uses ingredient nutrition/price tables for recipe calculation.

### Suggested Infrastructure files

Keep existing files and add narrowly scoped helpers only where they improve readability:

```text
Appetee.Infrastructure/Recipes/

RecipeQueries.cs
RecipeSql.cs                       // owns recipe query SQL and server-owned discovery fragments
BulkInsertSql.cs

RecipeCompatibilitySql.cs          // owns the reusable compatibility SQL predicate
RecipeDiscoverySqlBuilder.cs       // validates mode and binds Dapper parameters; no SQL text
RecipeDiscoveryCursorCodec.cs      // cursor encode/decode/fingerprint details
```

These names are recommended rather than contractually required.

Do not split every SQL fragment into a separate file.

### `IRecipeQueries`

Replace/add query responsibilities conceptually:

```text
DiscoverAsync
GetPreviewAsync
SaveFavoriteAsync
RemoveFavoriteAsync

existing GetRecipeWithDetailsByIdAsync
existing CreateRecipeWithDetailsAsync
existing UpdateRecipeWithDetailsAsync
```

Delete `GetAllAsync` when the bounded discovery endpoint replaces it.

## Discovery SQL Architecture

### Principle

Use one discovery candidate query architecture with:

```text
base Recipe Card projection
+
mandatory compatibility
+
optional search predicate/score
+
optional ingredient filter
+
optional badge filter
+
optional max total time
+
optional max difficulty
+
optional saved-only
+
cursor continuation
+
ordering mode
+
Take + 1
```

Do not create separate complete SELECT copies such as:

```text
SearchRecipesSql
FilterRecipesSql
SearchRecipesWithBadgesSql
SearchRecipesWithIngredientsSql
```

that drift from one another.

### Parameterization

Known server-owned SQL fragments may be composed dynamically.

All runtime user values remain Dapper parameters.

Safe pattern:

```csharp
where.Add("r.total_time_minutes <= @MaxTotalMinutes");
parameters.Add("MaxTotalMinutes", query.MaxTotalMinutes);
```

Forbidden pattern:

```csharp
sql += $"r.total_time_minutes <= {userInput}";
```

### Candidate CTE / derived query

Recommended conceptual shape:

```sql
WITH ranked_recipes AS (
    SELECT
        r.id,
        r.name,
        COALESCE(r.card_image_blob_name, r.image_blob_name) AS card_image_blob_name,
        r.total_time_minutes,
        r.calories_per_serving,
        r.estimated_cost_per_serving,

        EXISTS (
            SELECT 1
            FROM favorite_recipes fr
            WHERE fr.user_id = @UserId
              AND fr.recipe_id = r.id
        ) AS is_saved,

        {SORT_EXPRESSION} AS sort_rank

    FROM recipes r

    WHERE
        {COMPATIBILITY_PREDICATE}
        {OPTIONAL_PREDICATES}
)

SELECT
    id,
    name,
    card_image_blob_name,
    total_time_minutes,
    calories_per_serving,
    estimated_cost_per_serving,
    is_saved,
    sort_rank
FROM ranked_recipes
WHERE
    {CURSOR_PREDICATE}
ORDER BY
    {SORT_ORDER}
LIMIT @TakePlusOne;
```

Exact aliases/CTE use may change if MySQL plan/readability is better with an equivalent derived table.

`sort_rank` is internal RowData only and must not enter `RecipeCardDto`.

## Canonical Compatibility SQL

Centralize one reusable predicate equivalent to:

```sql
NOT EXISTS (
    SELECT 1
    FROM user_diets ud
    WHERE ud.user_id = @UserId
      AND NOT EXISTS (
          SELECT 1
          FROM diet_recipes dr
          WHERE dr.recipe_id = r.id
            AND dr.diet_id = ud.diet_id
      )
)

AND NOT EXISTS (
    SELECT 1
    FROM recipe_ingredients ri_restriction
    INNER JOIN user_ingredient_restrictions uir
        ON uir.user_id = @UserId
       AND uir.ingredient_id = ri_restriction.ingredient_id
    WHERE ri_restriction.recipe_id = r.id
)
```

This represents:

- every user diet must exist for the recipe;
- no restricted ingredient may occur in the recipe.

Use the same compatibility predicate for:

- Recipe Discovery;
- Quick Preview;
- favorite PUT compatibility check;
- future Home/recommendation recipe reads where applicable.

Do not duplicate logically different compatibility SQL in each feature.

## Browse Ordering

When no effective text search exists:

```sql
CRC32(CONCAT(@BrowseSeed, ':', r.id))
```

is the approved deterministic pseudo-random rank.

Order:

```sql
sort_rank ASC,
id ASC
```

Continuation:

```sql
sort_rank > @CursorRank
OR (
    sort_rank = @CursorRank
    AND id > @CursorId
)
```

Use a C# numeric type capable of safely holding MySQL unsigned CRC32 values without sign surprises.

### Seed generation

Use a server-side cryptographically strong random generator, e.g. an equivalent to:

```csharp
RandomNumberGenerator.GetInt32(1, int.MaxValue)
```

The seed is internal cursor state only.

Do not use:

```sql
ORDER BY RAND()
```

because it reshuffles between pages and breaks stable pagination.

## Search Predicate

Normalize to at most four effective terms.

For every effective term require:

```sql
(
    r.name LIKE @TermContains ESCAPE '\\'
    OR EXISTS (
        SELECT 1
        FROM recipe_ingredients ri_search
        INNER JOIN ingredients i_search
            ON i_search.id = ri_search.ingredient_id
        WHERE ri_search.recipe_id = r.id
          AND i_search.name LIKE @TermContains ESCAPE '\\'
    )
)
```

All term clauses are ANDed.

Before producing LIKE patterns, escape literal:

```text
\
%
_
```

The current case-insensitive DB/application collation should be used rather than wrapping every column in an unnecessary function unless actual schema/collation requires it.

## Search Relevance

Approved score:

```text
Exact normalized full recipe-name match       +1000
Recipe name starts with full search           +500

For each effective term:
  Recipe title exact term                     +120
  Recipe title starts with term                +90
  Recipe title contains term                   +60

  Ingredient name exact term                  +30
  Ingredient name starts with term             +20
  Ingredient name contains term                +10
```

Implementation can use `CASE` expressions and bounded correlated EXISTS/MAX expressions as appropriate.

Requirements:

- exact formula ordering above is preserved;
- all terms already satisfy the filtering predicate;
- title matches outrank pure ingredient matches;
- score is deterministic;
- score remains internal;
- score can be represented by an integer type.

Search order:

```sql
sort_rank DESC,
id DESC
```

Search continuation:

```sql
sort_rank < @CursorRank
OR (
    sort_rank = @CursorRank
    AND id < @CursorId
)
```

Do not add a browse seed to search cursors.

## Optional Filter SQL

### Ingredient ANY

When selected IDs exist and `RequireAllIngredients == false`:

```sql
AND EXISTS (
    SELECT 1
    FROM recipe_ingredients ri_filter
    WHERE ri_filter.recipe_id = r.id
      AND ri_filter.ingredient_id IN @IngredientIds
)
```

### Ingredient ALL

When selected IDs exist and `RequireAllIngredients == true`:

```sql
AND (
    SELECT COUNT(DISTINCT ri_filter.ingredient_id)
    FROM recipe_ingredients ri_filter
    WHERE ri_filter.recipe_id = r.id
      AND ri_filter.ingredient_id IN @IngredientIds
) = @IngredientCount
```

Maximum selected ingredient count is three.

### Badge AND

```sql
AND (
    SELECT COUNT(DISTINCT rb_filter.badge)
    FROM recipe_badges rb_filter
    WHERE rb_filter.recipe_id = r.id
      AND rb_filter.badge IN @Badges
) = @BadgeCount
```

### Maximum time

```sql
AND r.total_time_minutes <= @MaxTotalMinutes
```

### Maximum difficulty

Prefer translating in Application to allowed values:

```text
Easy   -> ["Easy"]
Medium -> ["Easy", "Medium"]
Hard   -> no predicate
```

When predicate is needed:

```sql
AND r.difficulty IN @AllowedDifficulties
```

Do not depend on lexical string ordering.

### Saved only

```sql
AND EXISTS (
    SELECT 1
    FROM favorite_recipes fr_saved
    WHERE fr_saved.user_id = @UserId
      AND fr_saved.recipe_id = r.id
)
```

only when `SavedOnly == true`.

## Pagination Page Retrieval

### Call 1 — candidate page

For requested `Limit`:

```text
TakePlusOne = Limit + 1
```

Run candidate query.

If returned count:

```text
<= Limit
-> hasMore = false

> Limit
-> hasMore = true
-> remove lookahead row
```

Cursor is built from the last row actually returned to the client.

Do not use `COUNT(*)` for normal discovery pagination.

### Call 2 — bounded card hydration

After candidate IDs are known, hydrate only those returned IDs.

Use one connection and one `QueryMultipleAsync` for child sets when practical:

```sql
SELECT
    rb.recipe_id,
    rb.badge
FROM recipe_badges rb
WHERE rb.recipe_id IN @RecipeIds;

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

Application mapping:

- sort badge values through the canonical badge priority helper;
- map featured ingredients in featured order;
- preserve candidate page ordering.

Two bounded DB round trips are intentionally accepted because they keep candidate pagination/search SQL understandable and avoid N+1.

## Cursor Codec

Phase 4 uses the private application helpers
`src/Appetee.Application/Services/Recipes/RecipeDiscoveryCursorCodec.cs` and
`src/Appetee.Application/Services/Recipes/RecipeDiscoveryCriteriaFingerprint.cs`.
Cursor payload records remain internal application models and do not enter the public API schema.

### Internal payloads

Browse:

```csharp
internal sealed record BrowseCursorV1(
    int V,
    string Mode,
    int Seed,
    long Rank,
    int Id,
    string Criteria);
```

Search:

```csharp
internal sealed record SearchCursorV1(
    int V,
    string Mode,
    long Rank,
    int Id,
    string Criteria);
```

Exact class hierarchy may differ. Do not expose these as API DTOs.

### Encoding

1. Build validated payload.
2. JSON serialize with fixed/stable field semantics.
3. UTF-8 encode.
4. Base64URL encode.
5. Return string as `nextCursor`.

No encryption/HMAC is required for F-008 because:

- cursor contains no secret;
- authorization/compatibility are independently rechecked;
- all decoded fields are treated as untrusted.

### Decode validation

Reject with validation error / `400` when:

- cursor exceeds reasonable maximum encoded length;
- Base64URL is invalid;
- JSON shape is invalid;
- version is unsupported;
- mode is unsupported;
- ID/rank/seed values are invalid for mode;
- cursor mode does not match effective query mode;
- criteria fingerprint differs.

Do not allow cursor parse exceptions to become generic `500`.

## Criteria Fingerprint

Normalize and serialize a canonical representation containing:

```text
authenticated user ID
effective normalized search terms
sorted distinct ingredient IDs
requireAllIngredients
canonical/sorted badge set
maxTotalMinutes
maxDifficulty
savedOnly
```

Hash:

```text
SHA-256
```

Encode to a stable compact string.

Important:

- use effective normalized search terms, not arbitrary original whitespace;
- do not include page limit if changing limit mid-chain is disallowed by implementation; if limit changes are allowed, include limit to preserve page semantics;
- bind to authenticated user ID;
- do not include cursor itself;
- do not rely on this hash for authorization.

For simplicity and deterministic behavior, including `limit` in the fingerprint is recommended so a cursor chain cannot silently change page size.

## Profile Compatibility Changes During Cursor Chain

The backend always uses current database profile rules on each request.

The frontend must invalidate the discovery query when diets/restrictions change.

No long-lived DB snapshot is held.

If profile data changes outside the active frontend and an old cursor is reused, perfect snapshot semantics are not guaranteed. This is accepted for the feature scale/product.

## Quick Preview Persistence

### Endpoint query

Use one DB round trip through one `QueryMultipleAsync`, not one giant JOIN.

Recommended SQL command:

Result set 1:

```text
recipe preview row:
id
name
description
image_blob_name
total_time_minutes
calories_per_serving
protein_per_serving
estimated_cost_per_serving
is_saved
```

with recipe ID + canonical compatibility predicate.

Result set 2:

```text
recipe badges
```

Result set 3:

```text
all ingredient id/name
ordered by recipe_ingredients.display_order
```

Because the recipe ID is known before the query executes, one multi-result command is simple and bounded.

Do not JOIN badges and ingredients into a Cartesian product.

### Not found/incompatible

If result set 1 has no row:

```text
return null from query/service
-> controller 404
```

Do not distinguish incompatible vs missing to the consumer.

### Image

Use full `image_blob_name`, mapped internally as `PreviewImageBlobName`, for public `previewImageUrl`.

Card projection uses `COALESCE(card_image_blob_name, image_blob_name)`, mapped internally as `CardImageBlobName`, for public `cardImageUrl`.

## Favorite Persistence

### PUT behavior

Semantics:

```text
Ensure current user has favorite membership for compatible recipe.
```

Requirements:

- recipe exists;
- recipe currently passes compatibility;
- duplicate request is successful/idempotent;
- unique `(user_id, recipe_id)` prevents duplicate membership.

Implementation may use:

- compatibility existence check + `INSERT IGNORE`; or
- an equivalent parameterized insert-select/upsert pattern.

If implementation cannot distinguish duplicate membership from missing/incompatible with one SQL statement cleanly, favor readable bounded queries over clever ambiguous SQL.

### DELETE behavior

Semantics:

```text
Ensure current user does not have membership for recipe ID.
```

Delete:

```sql
DELETE FROM favorite_recipes
WHERE user_id = @UserId
  AND recipe_id = @RecipeId;
```

Zero affected rows still maps to successful `204`.

Do not require compatibility to remove existing membership.

## Ingredient Autocomplete Persistence

Extend existing Ingredient query/service/controller path, not RecipeQueries.

When search is present:

```text
trim query
bounded limit
case-insensitive ingredient-name match
lightweight IngredientDto only
```

At expected ~5,000 ingredients, a normal bounded substring query is acceptable subject to actual `EXPLAIN`/timing.

Keep existing no-search `GET /api/ingredients` behavior for current onboarding/authoring consumers unless their owning feature is deliberately changed.

Correct current controller return generic from `DietDto` to ingredient DTO.

## Index Validation

Canonical feature requirements live in README.

Implementation must first inspect current DDL before adding indexes.

Expected useful existing/required paths:

```text
user_diets(user_id, diet_id)
diet_recipes(recipe_id, diet_id)

user_ingredient_restrictions(user_id, ingredient_id)
recipe_ingredients(recipe_id, ingredient_id)

recipe_badges(recipe_id, badge)

favorite_recipes(user_id, recipe_id)

UNIQUE recipe_ingredients(recipe_id, display_order)
UNIQUE recipe_ingredients(recipe_id, featured_order)
```

Run `EXPLAIN` for:

- initial seeded browse;
- second-page seeded browse;
- search with one term;
- search with four terms;
- badge filter;
- ingredient ALL;
- ingredient ANY;
- saved-only;
- representative combined search+filters;
- Preview lookup if plan is unexpected.

Do not add speculative reverse indexes merely because a filter can reference that column.

If `EXPLAIN`/timing at 3,000–5,000 recipes demonstrates a meaningful bottleneck, document the concrete access pattern before adding the index.

## Transactions

### Discovery/Preview

Read-only; no explicit multi-request transaction/snapshot is needed.

The two discovery DB calls do not need a database transaction solely to guarantee snapshot consistency for an infinite-scroll page. They operate on a very small catalog and child hydration is by IDs already selected.

### Recipe create/update

Preserve existing transaction behavior across recipe row + diets + badges + ingredients.

Phase 2 extends the same transaction with new persisted fields/orders.

Preserve current Blob cleanup/reconciliation behavior on transaction failure.

### Favorite

Single membership mutation is atomic in MySQL.

No cross-resource transaction.

## Concurrency

### Discovery

No optimistic concurrency entity version is required.

Cursor chain is stable for a stable eligible dataset but not a database snapshot.

### Favorite

Concurrent/repeated save requests are made safe by unique membership and idempotent semantics.

Concurrent/repeated delete requests remain idempotent.

### Recipe authoring

Existing F-007 concurrency behavior remains authoritative.

## Idempotency

| Operation | Behavior |
|---|---|
| `GET /api/recipes` | Safe/idempotent read; first cursor-less browse may intentionally produce a new seed/order |
| `GET /api/recipes/{id}/preview` | Safe/idempotent read |
| `PUT /api/recipes/{id}/favorite` | Idempotent ensure-saved |
| `DELETE /api/recipes/{id}/favorite` | Idempotent ensure-unsaved |
| Ingredient autocomplete GET | Safe/idempotent read |

## Validation

### Discovery

- `limit`: 1–50, default 20.
- `search`: trim/collapse; maximum reasonable raw length, target 100 characters.
- Search uses at most first four effective non-empty terms.
- `ingredientIds`: positive, distinct, maximum three.
- `requireAllIngredients`: default true.
- `badges`: distinct, canonical only.
- `maxTotalMinutes`: positive, sensible upper bound; target <= 1440 unless canonical project policy chooses smaller.
- `maxDifficulty`: Easy/Medium/Hard only.
- `cursor`: bounded length, valid mode/version/fingerprint.
- Current user ID > 0 and sourced from session.

### Preview/Favorite IDs

- route ID > 0.

### Authoring additions

- description nonblank and <= DB/API limit;
- valid prep/cook/total relationship;
- exactly 1–3 featured ingredient positions;
- featured orders unique/in range;
- backend-derived per-serving nutrition.

Frontend validation never replaces these server checks.

## Mapping

### Discovery

```text
Candidate RecipeDiscoveryRowData
+
Badge rows
+
FeaturedIngredient rows
        ↓
application grouping/mapping
        ↓
RecipeCardDto[]
        ↓
RecipeDiscoveryPageDto
```

Preserve candidate order.

Resolve card Blob URL through current Blob service convention.

### Preview

```text
RecipePreviewRowData
+
Badge rows
+
Ingredient identity rows
        ↓
RecipePreviewDto
```

Sort badges with canonical priority.

Resolve full recipe image URL.

### Authoring

```text
RecipeDetailRequest
+
reference/calculation data
        ↓
server-authoritative totals
+
display/featured order
        ↓
transactional persistence
```

## Error Mapping

Use common E-010 ProblemDetails conventions.

| Application outcome | HTTP |
|---|---|
| unauthenticated | `401` |
| invalid discovery fields | `400` |
| invalid/malformed cursor | `400` |
| cursor criteria mismatch | `400` |
| Preview missing/incompatible | `404` |
| favorite PUT missing/incompatible | `404` |
| favorite DELETE already absent | `204` |
| server/database failure | `500` |
| common rate limit | `429` |

Do not map profile incompatibility to `403`.

## Logging and Observability

Use privacy-safe structured logs/metrics.

Useful diagnostics:

```text
discovery mode: browse/search
page size
hasMore
query duration
card hydration duration
Preview duration
favorite mutation result
ingredient autocomplete duration
```

Avoid logging:

- authentication cookie/session token;
- cursor payload contents/fingerprint inputs;
- full user diet/restriction payloads unless already approved observability policy requires aggregate identifiers;
- raw personal search history at high verbosity in production without a defined privacy purpose.

For performance validation, temporary development logging may record query timings/row counts.

## Database Reset / Migration

Current approved development transition:

- update the canonical reset schema/data under E-020;
- run `npm run db:reset:local`;
- do not create a new one-off F-008 data migration document for disposable local data.

Phase 2 must update the actual generator/source of:

```text
data/generated/sql/01-schema.sql
data/generated/sql/04-recipes.sql
```

or their current canonical equivalents.

If a persistent environment with irreplaceable data exists by implementation time:

- stop before destructive reset;
- use E-008 forward migration mechanics;
- backfill/validate the new NOT NULL/order fields;
- keep canonical rebuild schema synchronized.

Do not modify only generated output if the generator/source would overwrite it on the next reset.

## Testing

### Unit

- [ ] Search normalization trims/collapses and selects first four terms.
- [ ] LIKE escaping is correct for `%`, `_`, `\`.
- [x] Badge canonical validation covers all nine values.
- [x] Badge priority produces approved order.
- [x] Difficulty translates to correct allowed values.
- [x] Discovery request validation enforces limits.
- [x] Ingredient autocomplete trims input and enforces search/limit boundaries.
- [x] Ingredient autocomplete escapes SQL LIKE metacharacters as literal input.
- [x] Selected ingredient IDs are positive, raw-input bounded to three, de-duplicated, and canonically sorted.
- [x] Selected ingredient criteria and ALL/ANY mode are bound to the cursor fingerprint.
- [ ] Cursor encode/decode round-trips browse/search payloads.
- [ ] Criteria fingerprint is deterministic for equivalent normalized criteria.
- [ ] Criteria fingerprint changes when user/criteria/limit changes.
- [ ] Invalid cursor version/mode/value fails validation.
- [ ] Recipe time/description/featured-order authoring validation passes/fails correctly.
- [ ] Per-serving calories/protein calculation is server-authoritative.

### Integration

- [ ] Compatible browse page returns expected cards.
- [ ] User diet mismatch excludes recipe.
- [ ] Restricted ingredient excludes recipe.
- [ ] `isSaved` differs correctly by user.
- [ ] Take+1 hasMore behavior.
- [ ] Full stable cursor traversal has no duplicates/skips.
- [ ] Search title vs ingredient relevance order.
- [ ] Four-term search.
- [x] Badge AND filter.
- [x] Ingredient ALL filter.
- [x] Ingredient ANY filter.
- [x] Max total time.
- [x] Max difficulty.
- [ ] Saved-only.
- [x] Combined search + filters.
- [x] Preview returns one recipe + badges + ordered lightweight ingredients.
- [ ] Favorite PUT/DELETE idempotency.
- [x] Ingredient autocomplete bounded results.
- [x] Integration tests for remembered and non-remembered cookie attributes.
- [x] Idle, sliding, and absolute-expiration tests.

### Authorization/ownership

- [ ] Guest discovery -> `401`.
- [x] Guest Preview -> `401`.
- [ ] Guest favorite mutation -> `401`.
- [ ] User A cursor cannot be reused as User B.
- [ ] User A favorite mutation cannot affect User B.
- [x] Preview incompatible with current user -> `404`.
- [ ] Favorite PUT incompatible -> `404`.
- [ ] Favorite DELETE only deletes current-user membership.

### Contract

- [x] `GET /api/recipes` OpenAPI matches RecipeDiscoveryPageDto.
- [x] `GET /api/recipes/{id}/preview` excludes full detail fields.
- [x] Card/Preview collection fields serialize as arrays, not null.
- [x] Cursor/internal rank is absent from public card DTO.
- [x] Favorite successful operations return `204`.
- [x] Ingredient controller declares correct response DTO.
- [x] Legacy whole-catalog `GetAll` contract is absent.

### Migration/database

- [ ] `npm run db:reset:local` succeeds.
- [ ] New recipe columns are populated.
- [ ] display_order uniqueness enforced.
- [ ] featured_order uniqueness/range enforced.
- [ ] canonical badge values accepted and legacy reset values removed.
- [ ] every reset recipe has 1–3 featured ingredients.
- [x] `EXPLAIN` evidence reviewed for important discovery/search/filter queries.
- [x] Representative 3,000–5,000 catalogue timings are acceptable.

### Concurrency/idempotency

- [ ] Duplicate favorite PUT produces one membership and successful response.
- [ ] Duplicate favorite DELETE remains successful.
- [ ] Cursor tie rank uses ID deterministically.
- [ ] No long-lived DB transaction is held across client page requests.

### Failure/retry

- [ ] Invalid cursor produces controlled `400`, not `500`.
- [ ] DB failure produces common E-010 failure contract.
- [x] Blob URL resolution behavior follows existing null/failure handling.
- [x] Preview missing/incompatible does not leak existence distinction.

## Implementation Notes

### Phase 8 implementation (2026-08-27)

- Application validation accepts at most the nine distinct canonical badge categories, bounds `maxTotalMinutes` to 1–1440, and rejects undefined difficulty enum values.
- Persistence receives canonical badges, an optional maximum time, and explicit allowed difficulty strings. Hard and unset difficulty intentionally omit the difficulty predicate.
- Badge, time, and difficulty filters compose with both stable seeded browse and deterministic relevance search. The normalized criteria remain part of the opaque cursor fingerprint.
- Phase 8 did not change schema, reset scripts, generated recipes, or seed data.

### Phase 9 implementation (2026-08-27)

- The existing ingredient catalogue controller/service/query path now supports optional autocomplete without moving ingredient HTTP or SQL behavior into Recipe Discovery classes.
- Search is required to contain 2–100 trimmed characters. Its result bound defaults to 10 and accepts 1–50; no-search reads retain the existing complete lightweight catalogue behavior.
- The parameterized case-insensitive substring query returns only `IngredientDto` identity fields, escapes LIKE metacharacters, and orders exact/prefix matches before other matches.
- OpenAPI, invalid-input behavior, no-search compatibility, literal matching, result bounds, cancellation propagation, `EXPLAIN`, and approximately 5,000-row execution are covered by Phase 9 tests.
- Phase 9 did not change schema, reset scripts, generated ingredient data, or seed data.

### Phase 10 implementation (2026-08-28)

- Discovery accepts up to three repeated positive `ingredientIds` parameters and `requireAllIngredients`, which defaults to `true` and is published with that default in OpenAPI.
- Application validation bounds the raw input before de-duplicating and sorting accepted IDs. An empty selection canonicalizes the mode to ALL because the mode has no query meaning without IDs.
- ALL uses a parameterized distinct-count equality predicate; ANY uses a parameterized relationship `EXISTS` predicate. The SQL is owned by `RecipeSql`, while `RecipeDiscoverySqlBuilder` selects the shape and supplies `IngredientIds` and `IngredientCount`.
- Selected ingredients compose with search and the existing mandatory compatibility predicate. Permanent user ingredient restrictions therefore cannot be bypassed by choosing ANY mode.
- Canonical selected IDs and mode participate in criteria fingerprinting, so changing either invalidates a prior cursor.
- Focused verification covers validation, normalization, default/explicit ALL, ANY, duplicates, search composition, permanent restrictions, cursor binding, OpenAPI, and MySQL `EXPLAIN` access paths.
- Focused Phase 10 verification passed 10 tests; the full Release backend suite passed 266 tests; and the Release solution build completed with zero warnings and zero errors.
- Phase 10 does not change schema, reset scripts, generated SQL, or seed data.

### Phase 12 implementation (2026-08-28)

- The authenticated `GET /api/recipes/{id}/preview` route derives current-user identity from the validated session, validates a positive recipe ID, and returns the same `404` for missing and incompatible recipes.
- Application and persistence contracts use a dedicated `RecipePreviewDto`, `RecipePreviewRowData`, and lightweight ingredient identity projection rather than reusing the complete authoring/detail response.
- `RecipeQueries.GetPreviewAsync` executes one parameterized `QueryMultipleAsync` command. Its independent result sets return the compatibility-filtered recipe plus current-user `isSaved`, all badges, and all ingredient identities in `display_order`.
- `RecipeSql.GetCompatiblePreview` reuses `RecipeCompatibilitySql.Predicate`, selects full `image_blob_name`, and does not select instructions, diets, difficulty, servings, quantities, units, ingredient nutrition, or whole-recipe totals.
- Infrastructure maps badges through canonical priority, preserves authored ingredient order, resolves the Preview Blob URL through the existing safe helper, and emits empty arrays rather than null collections.
- Focused Phase 12 verification passed 12 tests covering route validation, anonymous access, compatibility non-disclosure, saved ownership, full-image selection, field boundaries, ordering, empty collections, SQL shape, and OpenAPI. The full Release backend suite passed 278 tests, and the Release solution build completed with zero warnings and zero errors.
- Phase 12 requires no schema, migration, generated SQL, seed-data, or database-reset change.

### Phase 13 backend hardening (2026-08-28)

- Discovery persistence records aggregate candidate-query and card-hydration durations, discovery mode, bounded counts, and `hasMore`; Preview records aggregate duration and a coarse outcome.
- Recipe diagnostics intentionally omit current-user IDs, raw searches, cursor values, criteria fingerprints, diet/restriction payloads, and selected ingredient IDs. Favorite logs now contain only coarse idempotent results.
- Focused integration coverage inspects the structured log fields emitted by real Dapper/MySQL discovery and Preview calls and rejects sensitive criteria/identity field names.
- Final `EXPLAIN` and execution checks run first-page browse, second-page keyset browse, one-term search, and four-term search against 5,000 recipes. All bounded queries returned the expected 21 candidate rows within the five-second test budget.
- OpenAPI regression coverage verifies the discovery page, dedicated Preview DTO, favorite `204` operations, lightweight ingredient response, and exact Preview property set.
- Existing primary, relationship, display-order, featured-order, and reverse lookup indexes support the approved query paths. No speculative index or schema/reset/generated-data change was introduced.
- No temporary F-008 instrumentation or hidden whole-catalog compatibility route remained to remove. The new duration logs are permanent aggregate observability.
- Focused Phase 13 backend verification passed 3 tests. The full Release backend suite passed 281 tests, and the Release solution build completed with zero warnings and zero errors.

- The exact private cursor helper class/record names are implementation details.
- Prefer readable bounded SQL over a clever one-statement query that obscures correctness.
- Keep SQL text in dedicated `*Sql.cs` owners; runtime values remain parameterized.
- Keep reusable compatibility SQL in `RecipeCompatibilitySql` so discovery and favorite checks share one predicate.
- Do not optimize for millions of recipes; measure the approved 3,000–5,000 maximum catalog.
- Do not add Redis/search infrastructure in F-008.
- Do not make `RecipeCardDto` inherit from/contain complete detail data solely to reuse code.
- Keep Preview, favorite, card hydration and dynamic discovery candidate SQL in `RecipeSql`; the builder only selects the query shape and binds parameters. If SQL ownership grows, group the dedicated `*Sql.cs` files under a `Recipes/Sql` folder rather than placing SQL in service/builder files.
- Preserve current cancellation token propagation and command timeouts/project conventions.
- Keep OpenAPI and README contract synchronized.

## Dependencies

- F-002 authenticated session/current-user resolution
- F-003 user diets/restrictions
- F-007 recipe authoring/calculation
- E-008 persistent-environment migration mechanics when applicable
- E-010 ProblemDetails/OpenAPI
- E-017 testing strategy
- E-019 frontend/data-access contract interaction
- E-020 development dataset/bootstrap/reset
- Dapper / MySqlConnector
- Azure Blob URL service used by current recipe queries

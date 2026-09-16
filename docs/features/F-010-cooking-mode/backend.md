# F-010 — Cooking Mode — Backend

## Canonical Contract

The feature [`README.md`](README.md) owns data requirements, API routes, response contracts, serving semantics, and product error behavior.

This document describes how the backend implements that approved contract.

## Backend Goal

Expose one bounded authenticated Cooking View read that returns exactly the complete recipe data needed by Cooking Mode while enforcing current-user compatibility, reusing the existing RecipesController → RecipeService → RecipeQueries → Dapper/MySQL layering, avoiding heavy admin projections, and returning immutable base recipe values.

## Authorization and Ownership

- Authentication required.
- Current user ID comes from existing cookie/session flow.
- Browser never supplies recipe-read user ID.
- Recipe ID must be positive.
- Reuse F-008 mandatory diet/restriction compatibility predicate.
- Absent and incompatible recipes both map to `404`.
- No admin bypass.

## API Layer

Add:

```http
GET /api/recipes/{id}/cooking-view
```

Controller responsibilities:

1. resolve authenticated current user exactly as current F-008 user-specific recipe endpoints do;
2. call `IRecipeService.GetCookingViewAsync(currentUserId, id, ct)`;
3. null → `404`;
4. result → `200`;
5. let common error infrastructure map validation/auth/server failures.

Do not query Dapper directly from controller and do not reuse a heavy admin/detail response solely because it exists.

## Application Layer

Add:

```csharp
Task<RecipeCookingViewDto?> GetCookingViewAsync(
    int currentUserId,
    int recipeId,
    CancellationToken ct);
```

Service validates positive IDs and delegates to query layer.

No serving-scaling/timer/session logic belongs on backend.

## Domain Rules

- Base servings > 0.
- Valid authored recipes have at least one ingredient and one complete instruction step.
- Ingredients return in authored display order.
- Steps return in authored order.
- Nutrition totals represent full base recipe.
- Backend never scales for selected servings.
- Total time remains authored total time.
- Badges use canonical F-008 priority.
- Incompatible recipe is unavailable (`404`).

## Persistence

### Tables

Use existing:

- `recipes`
- `recipe_badges`
- `recipe_ingredients`
- `ingredients`
- F-008 compatibility tables.

No new table.

### Query-layer responsibilities

Extend existing `IRecipeQueries/RecipeQueries`.

Suggested internal rows:

```text
RecipeCookingRowData
RecipeCookingIngredientRowData
```

Do not map through `IngredientAdminDetailDto`.

### SQL access pattern

One `QueryMultipleAsync` command:

```sql
-- 1. base recipe + compatibility
SELECT
    r.id,
    r.name,
    r.image_blob_name,
    r.description,
    r.total_time_minutes,
    r.servings,
    r.calories_total,
    r.protein_total,
    r.carbs_total,
    r.instructions
FROM recipes r
WHERE r.id = @RecipeId
  AND <shared compatibility predicate>;

-- 2. badges
SELECT rb.badge
FROM recipe_badges rb
WHERE rb.recipe_id = @RecipeId;

-- 3. ingredients
SELECT
    i.id,
    i.name,
    ri.quantity,
    ri.unit,
    ri.display_order
FROM recipe_ingredients ri
INNER JOIN ingredients i
    ON i.id = ri.ingredient_id
WHERE ri.recipe_id = @RecipeId
ORDER BY ri.display_order;
```

Use exact existing alias/parameter conventions in the real code.

Compatibility must reuse the shared F-008 SQL helper.

### Instructions

Deserialize `recipes.instructions` using the existing structured-instruction helper/pattern.

Map array index to explicit one-based `Order` in `RecipeCookingStepDto`.

Do not add a duplicate instruction order column just for Cooking.

### Badges

Read all badges and sort through existing canonical helper. Do not duplicate SQL CASE priority logic.

### Image

Resolve full `image_blob_name` through existing blob URL service. Cooking prefers full image, not compact card image.

Follow current nullable-image failure behavior rather than failing an otherwise valid recipe if that is the established project convention.

### Index validation

No new index planned. Run `EXPLAIN`. Do not add speculative indexes.

## Transactions

Not applicable; read-only.

## Concurrency

Not applicable in F-010. A recipe changed during an active session may leave that session showing the loaded version until invalidation/reload.

## Idempotency

Read-only GET; no mutation side effects.

## Validation

- current user ID > 0;
- recipe ID > 0;
- existing recipe-authoring invariants remain authoritative.

Do not add `?servings=` to the endpoint. Selected serving scaling is temporary frontend presentation.

## Mapping

```text
recipe row
+ badge rows
+ ingredient rows
+ instructions JSON
        ↓
RecipeCookingViewDto
```

Cooking ingredient DTO includes only ID, name, quantity, unit, display order.

Do not return diets, difficulty, cost, ingredient images, admin nutrition, or other fields not used by Cooking Mode.

## External Services

Only existing Azure Blob Storage URL resolution for recipe image.

## Error Mapping

| Condition | Result |
| --- | --- |
| unauthenticated | `401` |
| invalid/nonpositive ID | common `400` validation behavior |
| absent recipe | `404` |
| incompatible recipe | `404` |
| unexpected failure | common ProblemDetails |

## Logging and Observability

Safe logs may include recipe ID, outcome, query duration, and image URL resolution failure according to existing conventions.

Never log auth cookie/token or unnecessary user diet/restriction payloads.

## Database Migration

None.

If required data is missing because F-008 is incomplete, resolve the F-008 dependency rather than inventing duplicate F-010 schema.

## Testing

### Unit

- [ ] invalid current user ID rejected.
- [ ] invalid recipe ID rejected.
- [ ] instruction one-based ordering.
- [ ] canonical badge ordering.

### Integration

- [ ] compatible recipe returns complete Cooking DTO.
- [ ] ingredients ordered by display order.
- [ ] base servings/totals unchanged.
- [ ] structured instruction title/body returned.
- [ ] full image mapping follows existing behavior.
- [ ] one bounded Dapper round-trip.

### Authorization/ownership

- [ ] unauthenticated `401`.
- [ ] incompatible recipe `404`.
- [ ] browser cannot supply another user's compatibility context.

### Contract

- [ ] arrays non-null.
- [ ] no heavy admin ingredient data.
- [ ] no selected-serving scaling fields.
- [ ] no user ID request field.
- [ ] endpoint exactly `/api/recipes/{id}/cooking-view`.

### Migration/database

- [ ] no migration required.
- [ ] `EXPLAIN` recorded.
- [ ] no speculative index introduced.

### Failure/retry

- [ ] blob URL behavior matches current recipe reads.
- [ ] cancellation token reaches Dapper.
- [ ] common exceptions map through ProblemDetails.

## Implementation Notes

Preserve:

```text
RecipesController
    ↓
IRecipeService / RecipeService
    ↓
IRecipeQueries / RecipeQueries
    ↓
RecipeSql / shared compatibility SQL
    ↓
MySQL
```

Do not introduce EF Core, MediatR, CQRS framework, separate Cooking database abstraction, or duplicate compatibility logic.

A dedicated Cooking DTO/query is justified because Cooking is a different read shape from Recipe Card, Preview, and admin/full detail.

## Dependencies

- F-008 recipe data readiness and compatibility predicate
- existing Dapper/MySQL recipe infrastructure
- existing blob-storage URL service
- existing authenticated current-user resolution

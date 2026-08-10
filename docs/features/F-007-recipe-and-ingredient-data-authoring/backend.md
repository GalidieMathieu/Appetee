# F-007 — Recipe and Ingredient Data Authoring — Backend

## Canonical Contract

[`README.md`](./README.md) owns endpoints, request/response contracts and database requirements.

## Goal

Enforce canonical recipe authoring data, including database-derived recipe totals and ordered structured cooking instructions.

## Recipe POST/PUT

Do not trust browser totals.

Load requested ingredient calculation data in a bounded query:

```text
id
basis
basis_unit
price
calories_kcal
protein_g
carbs_g
```

Validate every ingredient is present and calculation-ready.

Calculate:

```text
factor = quantity / basis
calories += calories_kcal × factor
protein += protein_g × factor
carbs += carbs_g × factor
cost += price × factor
costPerServing = cost / servings
```

Persist backend-derived values in the same recipe transaction.

Return derived values in the response.

## Ingredient Create

Price is already non-nullable in the C# request and SQL, but validation must explicitly enforce:

```text
price >= 0
```

Also require known non-negative:

```text
caloriesKcal
proteinG
carbsG
```

Fix calorie validation so `0` is accepted.

## Instructions

**Phase 3 backend status:** Completed

Phase 3 owns the backend migration from an ordered string array to ordered structured instruction objects.

Canonical contract:

```csharp
public sealed record RecipeInstructionStepRequest
{
    public string? Title { get; set; }
    public string? Instruction { get; set; }
}
```

The multipart transport properties are nullable so the backend can distinguish and discard a fully blank pair. After normalization, every persisted and returned step has nonblank `title` and `instruction` values.

Recipe create/update accepts an ordered collection of these steps, and recipe detail responses expose the equivalent structured response type.

Validation/persistence rules:

- trim `Title` and `Instruction`;
- discard a step only when both values are blank;
- reject a step when exactly one required value is blank;
- require at least one complete step;
- preserve relative array order;
- persist the ordered object array in the existing `recipes.instructions` JSON column;
- deserialize reads to the same structured contract;
- do not store a separate `stepNumber`;
- do not create a `recipe_steps` table.

Phase 3 compatibility is implemented with a verified forward migration that converts legacy JSON `string[]` recipe instructions to ordered objects, discards blank legacy entries, and stops on invalid partial/no-step data. Canonical seed data uses meaningful step titles.

## Relationship / Data Cleanup

**Phase 4 backend/data status:** Completed

- retain duplicate recipe-ingredient validation at the application boundary;
- reject non-positive diet and ingredient IDs before database reference loading;
- validate every submitted positive reference against canonical database rows;
- normalize submitted unit whitespace/casing before comparing it with the ingredient basis unit;
- reject semantic unit mismatches such as `g` versus `ml`;
- audit stored recipe-ingredient and recipe-diet references in the forward cleanup migration;
- normalize only safely equivalent stored units to the canonical basis-unit spelling;
- stop the migration rather than guessing a conversion for semantic mismatches;
- transactionally recompute every recipe nutrition/cost total from canonical ingredient data;
- roll back migration writes on failure.

## Endpoint Inventory

Backend must keep contracts aligned for:

- `GET /api/diets`
- `GET /api/ingredients`
- `GET /api/admin/ingredient-details/{id}`
- `POST /api/admin/ingredient-details`
- `GET /api/recipes/{id}`
- `POST /api/admin/recipe-details`
- `PUT /api/admin/recipe-details/{id}`

Correct the `GET /api/ingredients` action response generic so OpenAPI describes ingredient DTOs rather than `DietDto`.

## Database

Phase 2 schema state after the verified cleanup migration:

```text
ingredient_nutrition.calories_kcal → NOT NULL
ingredient_nutrition.protein_g     → NOT NULL
ingredient_nutrition.carbs_g       → NOT NULL

recipes.estimated_cost_per_serving → NOT NULL
```

`ingredient_nutrition.price` is already NOT NULL.

No new index.

Do not restrict `recipe_ingredients.unit` schema to g/ml yet; validate the F-008 authoring contract in the backend so the column remains extensible for future display/conversion units.

## Tests

- canonical calculation;
- price-per-serving;
- forged totals ignored/not accepted;
- zero values accepted;
- negative/missing core data rejected;
- unit mismatch rejected;
- bounded ingredient query count;
- create/update parity;
- transaction rollback;
- OpenAPI response types;
- structured instruction request binding/validation;
- structured instruction JSON persistence/read-back;
- legacy development instruction data removed or converted.
- non-positive recipe reference IDs rejected rather than silently discarded;
- equivalent recipe units normalized;
- semantic stored-unit mismatch rejected without changing recipe totals;
- stored relationship audit and full recipe-total recomputation.

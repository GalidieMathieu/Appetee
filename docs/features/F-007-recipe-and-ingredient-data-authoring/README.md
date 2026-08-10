# F-007 — Recipe and Ingredient Data Authoring

**Status:** Draft  
**Implementation status:** Partially implemented  
**Version:** 1.2  
**Owner:** Mathieu Galidie  
**Last updated:** 2026-08-10  
**Dependencies:** Existing recipe, ingredient and diet data model  
**Related engineering initiatives:** E-008, E-010, E-019, E-020

## Goal

Finish the current internal recipe/ingredient authoring path so Appetee can be populated with trustworthy data before development moves to Home, Recipe Card/Quick Preview, Recipe Discovery and Favorites.

This is a **data-authoring feature**, not the future Admin Console. The current authoring UI is sufficient overall. Phase 3 is the explicit exception: its instruction-schema change requires the recipe-authoring Step 3 UI to expose a title and instruction body for each ordered cooking step. Outside that required change, work should focus on data correctness, validation, calculation authority and persistence.

## Current Behavior

Reviewed against the frontend and backend `development` branches.

### Implemented

- Recipe create.
- Recipe edit for correcting existing authored records.
- Recipe image required on create and optional on edit.
- Existing ingredient search/link.
- Ingredient create from recipe flow.
- Diet selection.
- Recipe badges:
  - `freezer-friendly`
  - `budget-focused`
  - `high-protein`
- Difficulty:
  - `Easy`
  - `Medium`
  - `Hard`
- Ordered frontend instruction groups with required title and instruction controls.
- Ordered structured JSON instruction persistence and structured recipe-detail responses.
- At least one complete instruction step and one ingredient required.
- Fully blank instruction groups discarded; partially completed groups rejected.
- Legacy instruction `string[]` development data covered by a forward structured-step migration.
- Backend Diet/Ingredient reference validation.
- Backend duplicate recipe-ingredient validation.
- Transactional recipe/diet/badge/ingredient writes.
- Frontend recipe nutrition/cost preview calculation.
- Ingredient nutrition basis and price storage.
- Backend-authoritative nutrition and cost calculation during recipe create/update.
- Single bounded ingredient calculation-data query for each recipe write; no per-ingredient query loop.
- Browser-submitted recipe totals excluded from the backend write contract and ignored if forged.
- Backend validation for missing/negative core calculation data and incompatible recipe ingredient units.
- Backend-derived totals persisted on the recipe and returned from POST/PUT.
- Recipe reads use the persisted totals without recalculating unchanged ingredient data.
- Backend ingredient authoring requires price, calories, protein and carbohydrates while accepting explicit zero values.
- Missing or negative core calculation values are rejected before image upload and database writes.
- Canonical and forward-migrated schemas require all ingredient core calculation columns and recipe cost per serving.
- Existing seed recipe totals are synchronized with canonical ingredient calculations.
- Non-positive diet and ingredient IDs are rejected rather than silently discarded before reference validation.
- Equivalent recipe units are normalized for authoring and stored cleanup; semantic unit mismatches remain invalid.
- Phase 4 relationship cleanup audits references and duplicates, then transactionally recomputes every recipe total.

### Deferred

- Full Admin Console.
- Ingredient edit.
- Diet create/edit.
- Badge management.
- Admin list/dashboard pages.
- User/role-management UI.
- Recipe delete/archive.
- Generalized permission system.

## Critical Design Decision — Preview vs Canonical Calculation

The frontend **must continue calculating nutrition and estimated price** because the authoring user needs immediate feedback while composing a recipe.

However:

```text
FRONTEND CALCULATION
= preview only

BACKEND CALCULATION
= canonical value saved in database
```

The frontend preview may display:

- calories;
- protein;
- carbohydrates;
- estimated cost per serving.

When Save is submitted, the backend ignores any browser-calculated totals, loads canonical ingredient nutrition/price from the database, recalculates the recipe totals, and persists only its own results.

After save, the frontend uses the backend response as the authoritative saved values.

This provides both:

```text
good authoring experience
+
trustworthy persisted data
```

## Confirmed Data Problems

### Browser currently controls recipe totals

Current recipe write contracts contain:

```text
caloriesTotal
proteinTotal
carbsTotal
estimatedCostPerServing
```

and the frontend appends them to the multipart request.

Target: remove them from write authority.

### Ingredient price

Price is mandatory for dataset-quality purposes because every recipe needs a deterministic cost estimate.

Current SQL already defines:

```sql
price DECIMAL(10,2) NOT NULL
```

and the backend request currently uses non-nullable `decimal Price`.

The frontend model is currently weaker (`number | null`) and must be corrected.

Target ingredient authoring rule:

```text
price is required
price >= 0
```

A zero price is valid when intentionally used.

### Core recipe-calculation nutrition

For recipe-compatible ingredients, the following must be known:

```text
calories
protein
carbohydrates
price
basis
basis unit
```

`null` means unknown, not zero.

Optional extended nutrition may remain nullable.

### Unit semantics

Current recipe ingredient `unit` is free text, while calculations effectively use:

```text
quantity / ingredient basis
```

For F-008 v1, the authoring API only accepts a recipe quantity in the same normalized unit as the ingredient basis:

```text
g  → g
ml → ml
```

The database column remains general-purpose for future evolution, but F-008 validation prevents incompatible values from being persisted through the authoring endpoints.

### Instructions

Phase 3 changes recipe instructions from ordered JSON strings to ordered structured JSON steps.

Canonical step shape:

```ts
interface RecipeInstructionStep {
  title: string;
  instruction: string;
}
```

Canonical persisted shape:

```json
[
  {
    "title": "Prepare the chicken",
    "instruction": "Season the chicken with salt, pepper, and paprika."
  },
  {
    "title": "Cook the chicken",
    "instruction": "Cook over medium-high heat until cooked through."
  }
]
```

Rules:

- each step contains a required `title` and required `instruction`;
- trim both fields before validation/persistence;
- a fully blank step (`title` and `instruction` blank) may be discarded before submission/persistence;
- a partially completed step is invalid and returns validation failure;
- require at least one complete step after fully blank steps are discarded;
- array order is cooking order;
- preserve the relative order of the remaining complete steps;
- create begins with one step group;
- edit preserves order and values;
- explicit simple reorder is supported;
- array position is the step number; do not persist `stepNumber`;
- keep `recipes.instructions` as JSON; do not create a `recipe_steps` table.

### Duplicate ingredient

Backend already rejects duplicate ingredient IDs.

Frontend should prevent the duplicate earlier so an invalid recipe is not constructed and only rejected at final save.

## Scope

### Included

- Recipe create.
- Recipe edit for correcting dataset records.
- Ingredient create.
- Frontend live nutrition/cost preview.
- Backend authoritative nutrition/cost calculation.
- Mandatory ingredient price.
- Mandatory core calculation nutrition.
- Ordered instruction integrity.
- Duplicate ingredient prevention.
- Diet/badge relationship validation.
- Existing dataset cleanup/recalculation.
- E-020 authorization validation.

### Excluded

- Full Admin Console.
- Ingredient edit.
- Diet editor.
- Role-management UI.
- Arbitrary cup/tbsp/oz/lb/piece conversion.
- Automatic badge/diet inference.
- Major UI redesign.

## Data Requirements

### Ingredient authoring data

```ts
interface IngredientAuthoringRequest {
  name: string;
  basis: number;
  basisUnit: 'g' | 'ml';

  price: number;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;

  image: File;

  fatG?: number | null;
  sugarG?: number | null;
  fiberG?: number | null;
  sodiumMg?: number | null;
  vitaminCMg?: number | null;
  ironMg?: number | null;
}
```

Rules:

```text
basis > 0
price >= 0
caloriesKcal >= 0
proteinG >= 0
carbsG >= 0
```

Preferred new-data basis:

```text
100 g
100 ml
```

### Recipe authoring source request

```ts
interface RecipeInstructionStep {
  title: string;
  instruction: string;
}

interface RecipeAuthoringRequest {
  name: string;
  image?: File | null;
  instructions: RecipeInstructionStep[];
  prepTimeMinutes: number;
  servings: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  badges: Array<'freezer-friendly' | 'budget-focused' | 'high-protein'>;
  dietIds: number[];
  ingredients: Array<{
    ingredientId: number;
    quantity: number;
    unit: 'g' | 'ml';
  }>;
}
```

The frontend may calculate preview values, but these are **not included as canonical write fields**.

## Calculation Contract

For each ingredient, backend loads:

```text
basis
basis_unit
price
calories_kcal
protein_g
carbs_g
```

Then validates:

```text
recipe quantity > 0
recipe unit == ingredient basis_unit
basis > 0
all core calculation values are known and >= 0
```

Then:

```text
factor = recipeQuantity / ingredientBasis

caloriesTotal += caloriesKcal × factor
proteinTotal  += proteinG × factor
carbsTotal    += carbsG × factor
recipeCost    += price × factor

estimatedCostPerServing = recipeCost / servings
```

Persisted totals come only from this backend calculation.

The calculation runs when a recipe is created or modified. Normal recipe reads use the persisted `recipes.estimated_cost_per_serving`, `recipes.calories_total`, `recipes.protein_total` and `recipes.carbs_total` values without loading ingredient calculation data again.

Frontend uses the same formula only for live preview.

## Database Impact

### Existing tables used

- `recipes`
- `ingredients`
- `ingredient_nutrition`
- `recipe_ingredients`
- `diets`
- `diet_recipes`
- `recipe_badges`

### F-008 schema changes

Before the Phase 2 migration, `ingredient_nutrition` permitted nullable core fields:

```sql
calories_kcal DECIMAL(10,2) NULL
protein_g DECIMAL(10,2) NULL
carbs_g DECIMAL(10,2) NULL
```

The canonical and migrated schema now enforce:

```sql
calories_kcal DECIMAL(10,2) NOT NULL
protein_g DECIMAL(10,2) NOT NULL
carbs_g DECIMAL(10,2) NOT NULL
```

`price` is already correct:

```sql
price DECIMAL(10,2) NOT NULL
```

No nullability change is required for price, but frontend/backend validation must explicitly match this database rule.

Because every valid recipe has at least one ingredient, every ingredient has a known price, and servings is positive, recipe cost is always calculable.

Before the Phase 2 migration:

```sql
estimated_cost_per_serving DECIMAL(10,2) NULL
```

The canonical and migrated schema now enforce:

```sql
estimated_cost_per_serving DECIMAL(10,2) NOT NULL
```

The versioned Phase 2 migration:

- refuses to invent missing ingredient nutrition data;
- stops with an explicit error until null core data or invalid recipe-unit relationships are corrected;
- recalculates every existing recipe total from canonical ingredient data;
- applies the four `NOT NULL` constraints only after successful validation/backfill.

The canonical rebuild schema and development seed totals are synchronized with the migrated state.

Existing non-negative checks remain.

### Instruction JSON shape change — Phase 3

Keep the existing column:

```sql
instructions JSON NOT NULL
```

No new table or column is required. Phase 3 changes only the JSON item shape from strings to objects containing `title` and `instruction`.

Phase 3 data compatibility is implemented through the canonical seed and a versioned forward migration:

- canonical development seed data uses the structured shape with meaningful authored titles;
- legacy development instruction arrays are converted to ordered objects;
- blank legacy string entries are discarded while remaining relative order is preserved;
- invalid structured partial steps and recipes with no complete step stop the migration rather than losing data;
- keep step-content validation in the backend/application layer;
- keep array order as the only persisted step-order source.

### Recipe ingredient unit

Keep the existing database column general:

```sql
unit VARCHAR(50) NOT NULL
```

Do not permanently restrict the schema to only `g`/`ml`, because future recipe display/conversion features may add human cooking units.

For F-008, the authoring backend enforces `g`/`ml` matching the ingredient basis.

### Index changes

None required.

### E-020 database change

Separate engineering initiative E-020 adds:

```sql
users.role VARCHAR(20) NOT NULL DEFAULT 'User'
```

with allowed values:

```text
User
Admin
```

### Migration / data cleanup order

Through E-008:

1. Find ingredients with null core calculation values.
2. Fill/correct or remove unusable development records.
3. Make `calories_kcal`, `protein_g`, `carbs_g` NOT NULL.
4. Fix invalid recipe ingredient unit relationships.
5. Recalculate every existing recipe total using backend logic.
6. Fill every `estimated_cost_per_serving`.
7. Make `estimated_cost_per_serving` NOT NULL.
8. Update canonical rebuild SQL to match the migrated schema.
9. E-020 separately adds `users.role`.

Do not change production schema only by editing `scriptDatabase.sql`; use E-008 migration mechanics and keep the rebuild script synchronized.

## Complete Endpoint Inventory

This table is the complete endpoint set F-008 currently requires.

| Method | Endpoint | Used for | Current state | Target authorization |
|---|---|---|---|---|
| `GET` | `/api/diets` | Load diet choices for recipe authoring | Implemented | Shared/public catalogue behavior remains owned by diet/onboarding contract |
| `GET` | `/api/ingredients` | Search lightweight ingredient catalogue | Implemented | Shared/public catalogue behavior remains owned by ingredient/onboarding contract |
| `GET` | `/api/admin/ingredient-details/{id}` | Load full ingredient nutrition/price for preview/linking | Implemented | Admin after E-020 |
| `POST` | `/api/admin/ingredient-details` | Create missing ingredient | Implemented; validation changes | Admin after E-020 |
| `GET` | `/api/recipes/{id}` | Load complete existing recipe for edit | Implemented | Existing authenticated recipe-detail contract |
| `POST` | `/api/admin/recipe-details` | Create recipe | Implemented; request/calculation changes | Admin after E-020 |
| `PUT` | `/api/admin/recipe-details/{id}` | Update/correct recipe | Implemented; request/calculation changes | Admin after E-020 |

No additional endpoint is required for backend calculation. Calculation happens as part of recipe POST/PUT.

No F-008 endpoint is added for ingredient edit, diet edit, delete, badge management or role management.

### Contract correction to verify

The current `GET /api/ingredients` controller action is declared with an `ActionResult<IReadOnlyList<DietDto>>` generic type while returning ingredient data.

Its implemented/OpenAPI response type should be corrected to the actual ingredient DTO contract under E-010/F-008 integration validation.

## Request Contracts

### `GET /api/diets`

No body.

Response:

```json
[
  {
    "id": 1,
    "name": "Vegetarian"
  }
]
```

### `GET /api/ingredients`

No body.

Response is the lightweight ingredient catalogue:

```json
[
  {
    "id": 1,
    "name": "Chicken breast"
  }
]
```

### `GET /api/admin/ingredient-details/{id}`

Returns full canonical ingredient authoring data including:

```text
id
name
basis
basisUnit
price
caloriesKcal
proteinG
carbsG
optional extended nutrition
imageUrl
```

### `POST /api/admin/ingredient-details`

Multipart form.

Required:

```text
name
basis
basisUnit
price
caloriesKcal
proteinG
carbsG
image
```

Optional:

```text
fatG
sugarG
fiberG
sodiumMg
vitaminCMg
ironMg
```

### `GET /api/recipes/{id}`

Returns complete recipe detail including:

- ordered structured instruction steps (`title` + `instruction`);
- ingredients/quantities/units;
- diets;
- badges;
- backend-derived totals.

### `POST /api/admin/recipe-details`

Multipart source-data fields:

```text
name
image
instructions[index].title
instructions[index].instruction
prepTimeMinutes
servings
difficulty
badges[index]
dietIds[index]
ingredients[index].ingredientId
ingredients[index].quantity
ingredients[index].unit
```

Do not persist browser totals.

### `PUT /api/admin/recipe-details/{id}`

Same source-data contract as create, except image is optional when the existing image is retained.

## Response Contracts

Recipe POST/PUT returns the lightweight recipe/card response with **backend-derived**:

```text
caloriesTotal
proteinTotal
carbsTotal
estimatedCostPerServing
```

The frontend replaces its preview values with these saved values after success.

## Error Behavior

| Situation | Result |
|---|---|
| No complete instruction step remains after fully blank steps are removed | `400` |
| Instruction step has title but no instruction body, or instruction body but no title | `400` |
| Instruction step has blank title and blank instruction | Discard the fully blank step; preserve remaining relative order |
| No ingredient | `400` |
| Duplicate ingredient ID | `400` |
| Invalid ingredient/diet ID | `400` |
| Missing mandatory price/core nutrition | `400` |
| Negative price/nutrition | `400` |
| Unit mismatch | `400` |
| Invalid image | existing media error contract |
| Guest calling admin endpoint after E-020 | `401` |
| Normal User calling admin endpoint after E-020 | `403` |
| Admin valid request | normal success |

## Delivery Phases

### Phase 1 — Frontend preview + backend canonical calculation
**Status:** Completed

Frontend:
- [x] keep live nutrition/cost preview;
- [x] remove totals from write authority;
- [x] after save, use returned backend totals.

Backend:
- [x] bounded load of canonical ingredient calculation data;
- [x] calculate totals for POST and PUT;
- [x] persist only backend calculation;
- [x] reject incompatible units/missing core data.

Tests:
- [x] frontend preview still updates;
- [x] recipe POST/PUT `FormData` omits canonical totals;
- [x] backend response replaces the saved frontend display totals;
- [x] forged submitted totals cannot alter DB;
- [x] create/update calculations match;
- [x] price-per-serving calculation correct;
- [x] no N+1 calculation query.

### Phase 2 — Mandatory ingredient calculation data
**Status:** Complete

Frontend:
- [x] price mandatory for ingredient authoring;
- [x] protein/carbs mandatory for recipe-compatible ingredient authoring;
- [x] zero calculation values remain valid;
- [x] negative calculation values are rejected;
- [x] required calculation fields are always included in create `FormData`.

Backend/data:
- [x] enforce mandatory price/calories/protein/carbs;
- [x] preserve zero and reject negative values;
- [x] clean and recalculate current development seed data;
- [x] add and verify the forward `NOT NULL` migration after cleanup;
- [x] synchronize the canonical rebuild schema with the migrated schema.

### Phase 3 — Structured cooking instructions
**Status:** Complete

Goal:
- make recipe instructions directly usable by the future cooking experience by giving every ordered step a title and instruction body;
- keep the existing `recipes.instructions` JSON column and make Phase 3 responsible for the complete `string[]` → structured-step migration.

Canonical contract:

```text
instructions: RecipeInstructionStep[]

RecipeInstructionStep
├── title: string
└── instruction: string
```

Frontend:
- [x] create begins with one instruction step;
- [x] provide accessible Move Up / Move Down controls;
- [x] replace `FormArray<FormControl<string>>` / `FormArray<string>` with ordered step groups containing `title` and `instruction`;
- [x] change the Step 3 authoring UI so every visible cooking step is a distinct step block/card containing:
  - an automatically derived `Step N` label from array position;
  - a required **Title** input;
  - a required **Instructions** textarea sized for multi-line cooking directions;
  - the existing accessible Move Up / Move Down controls;
  - a Remove action where removal is allowed;
- [x] keep the existing **Add step** action and append a new empty structured step group;
- [x] automatically renumber visible `Step N` labels after add, remove or reorder; never store `stepNumber`;
- [x] show title and instruction validation independently and block submission for partially completed steps;
- [x] preserve the current authoring page styling/layout outside the instruction controls; Phase 3 is not a broader UI redesign;
- [x] require and validate both fields for every non-empty step;
- [x] trim both fields before request serialization;
- [x] discard only fully blank step groups;
- [x] reject partially completed steps instead of silently dropping data;
- [x] require at least one complete step;
- [x] serialize multipart fields as `instructions[index].title` and `instructions[index].instruction` in displayed order;
- [x] update recipe read/detail models to expose the same structured step type;
- [x] preserve control instances, values and ordering when steps are moved;
- [x] add focused create/edit/reorder/validation tests for structured steps.

Backend:
- [x] introduce the structured recipe instruction request/response contract with `title` and `instruction`;
- [x] bind POST/PUT multipart fields for ordered complex instruction items;
- [x] trim `title` and `instruction`;
- [x] discard only steps where both fields are blank;
- [x] reject any partially completed step;
- [x] reject when no complete step remains;
- [x] preserve submitted array order;
- [x] serialize/persist the ordered object array in `recipes.instructions`;
- [x] deserialize recipe reads to the same structured response contract;
- [x] ensure create/update/read behavior is identical for the new shape;
- [x] add focused request validation, serialization, persistence and read-back tests.

Database/data:
- [x] keep `recipes.instructions JSON NOT NULL`; no `recipe_steps` table and no new instruction column;
- [x] update canonical seed recipes from legacy JSON strings to `{ title, instruction }` objects with meaningful titles;
- [x] add and verify a forward migration that converts/cleans legacy development instruction arrays;
- [x] require every migrated recipe to retain at least one complete ordered step;
- [x] do not store `stepNumber`; array position remains the cooking order.

### Phase 4 — Relationship/data cleanup
**Status:** Complete

Frontend:
- [x] prevent duplicate ingredient IDs before loading detail data;
- [x] retain a defensive duplicate check before mutating recipe state;
- [x] show accessible inline duplicate feedback;
- [x] preserve successful linking for a unique ingredient.

Backend/data:
- [x] keep backend duplicate defense;
- [x] reject non-positive diet/ingredient IDs instead of silently filtering them;
- [x] validate referenced diets and ingredients against canonical database rows;
- [x] normalize equivalent unit whitespace/casing to the ingredient basis unit;
- [x] reject semantic unit mismatches that would require an unsafe conversion guess;
- [x] audit stored recipe/diet relationships and duplicate recipe ingredients;
- [x] transactionally recompute all persisted recipe totals from canonical ingredient data;
- [x] verify cleanup success and semantic-mismatch rollback against the isolated MySQL database.

### Phase 5 — E-020 authorization validation
**Status:** Not started

- Guest admin API → 401.
- User admin API → 403.
- Admin authoring → success.
- No Admin Console work.

## Dataset Readiness

Dataset should contain enough complete varied records to exercise:

- diets;
- badges;
- avoided ingredients;
- overlapping ingredients;
- recipe-name search;
- ingredient search;
- varying prep times;
- varying servings;
- varying nutrition;
- varying cost;
- recommendations;
- favorites.

No arbitrary recipe count is required.

## Decisions

- Frontend calculation stays for preview.
- Backend recalculates and owns saved totals.
- Ingredient price is mandatory.
- Price already has correct SQL NOT NULL constraint.
- Core calories/protein/carbs become mandatory after data cleanup.
- Saved recipe cost becomes NOT NULL after recalculation/backfill.
- Recipe `unit` DB column remains future-flexible; F-008 authoring validates g/ml.
- Instructions remain in the existing JSON column but Phase 3 stores ordered `{ title, instruction }` objects.
- Full Admin Console and ingredient edit remain deferred.

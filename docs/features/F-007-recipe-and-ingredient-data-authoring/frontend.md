# F-007 — Recipe and Ingredient Data Authoring — Frontend

## Canonical Contract

[`README.md`](./README.md) owns all shared endpoint/request/response/database contracts.

## Goal

Keep the current UI while making frontend calculation explicitly a **live preview**, never the persisted authority. Phase 3 is the intentional UI exception: recipe instruction authoring must visually change from one text field per step to a structured title + instruction layout.

## Phase 1 Delivery Status

**Status:** Completed — 2026-08-08

Implemented:

- recipe write request types contain source data only;
- recipe POST/PUT `FormData` omits `caloriesTotal`, `proteinTotal`, `carbsTotal`, and `estimatedCostPerServing`;
- one live calculation object is recomputed when ingredients or servings change;
- loaded and successfully saved backend totals replace the frontend preview values;
- create success navigation continues to carry the returned backend recipe summary.

Verification:

- focused recipe authoring tests: 3 passed;
- full frontend suite: 50 passed, 1 skipped;
- strict application and specification TypeScript checks passed;
- production frontend build passed;
- the existing `admin-recipes.page.scss` component-style budget warning remains unchanged.

## Recipe Preview

Continue calculating:

```text
calories
protein
carbohydrates
estimated cost per serving
```

from loaded ingredient detail data so the author can see the effect of quantities immediately.

Preview values may temporarily differ from the final backend result if canonical ingredient data changed.

After successful POST/PUT:

```text
backend response totals
→ replace preview/saved display values
```

## Recipe Write Request

Remove canonical write fields:

```text
caloriesTotal
proteinTotal
carbsTotal
estimatedCostPerServing
```

from the request model/FormData.

Submit only source data.

## Ingredient Create

**Phase 2 frontend status:** Completed — 2026-08-08

Change frontend model:

```ts
price: number
proteinG: number
carbsG: number
```

for this authoring contract.

Form fields:

```text
price required, min 0
calories required, min 0
protein required, min 0
carbs required, min 0
```

Extended nutrition stays optional.

Phase 2 verification:

- create request typing requires numeric price, protein, and carbs;
- required calculation values are serialized unconditionally, including zero;
- required/minimum validation feedback is associated with each changed input;
- focused ingredient-authoring tests: 12 passed;
- full frontend suite: 56 passed, 1 skipped;
- strict application and specification TypeScript checks passed;
- production frontend build passed.

## Quantity/Unit

Current link dialog already defaults:

```text
quantity = ingredient.basis
unit = ingredient.basisUnit
```

For F-008, do not allow the unit to drift into an unsupported free-text value.

The backend remains authoritative validation.

## Instructions

**Phase 3 frontend status:** Completed — 2026-08-09

Phase 3 owns the frontend migration from `FormArray<string>` to structured ordered instruction steps.

Canonical type:

```ts
export interface RecipeInstructionStep {
  title: string;
  instruction: string;
}
```

Form shape:

```text
FormArray<FormGroup<{
  title: FormControl<string>;
  instruction: FormControl<string>;
}>>
```

Requirements:

- initialize create mode with one step group;
- change the recipe-authoring Step 3 visual so each cooking step is rendered as a distinct step block/card;
- display an automatically derived `Step N` label based on the current array position;
- each visible step provides a required **Title** input and required **Instructions** textarea;
- size the instructions control for multi-line cooking directions rather than a short single-line value;
- retain the existing accessible Move Up / Move Down controls and provide the existing Remove behavior where allowed;
- retain the existing **Add step** action and append a new empty structured step group;
- renumber the displayed `Step N` labels automatically after add, remove or reorder;
- show validation for title and instructions independently;
- preserve the current surrounding recipe-authoring layout and styling; this is the minimum UI change required by the new contract, not a broader redesign;
- both fields are required for every non-empty step;
- trim both values before serialization;
- fully blank step groups may be removed from the outgoing request;
- a partially completed step must show validation and block submission;
- require at least one complete step;
- retain Move Up / Move Down behavior without recreating controls;
- array position is the step number; do not add `stepNumber`;
- submit `instructions[index].title` and `instructions[index].instruction` in displayed order;
- recipe detail/read models use `RecipeInstructionStep[]` so the future cooking feature consumes the same contract.

Phase 3 verification must cover:

- one structured step exists on create;
- required/trim validation for title and instruction;
- fully blank versus partially completed step behavior;
- ordered multipart serialization;
- edit hydration from structured API data;
- reordering preserves title/instruction values and control state;
- focused recipe-authoring tests;
- strict TypeScript checks and production build.

Verification completed:

- one structured step group is initialized in create mode;
- edit hydration consumes structured API steps;
- title and instruction validation is independent;
- fully blank groups are discarded while partial groups block submission;
- reordered control instances retain their values and state;
- multipart serialization preserves displayed order and uses structured field names;
- focused structured-instruction tests: 10 passed;
- full frontend suite: 60 passed, 1 skipped;
- strict application and specification TypeScript checks passed;
- production frontend build passed.

## Duplicate Ingredient

Prevent appending an ingredient ID already present in the recipe.

**Phase 4 frontend status:** Completed — 2026-08-09

Implementation and verification:

- reject an already-linked ingredient before requesting its full detail;
- recheck the ID immediately before appending to guard against stale concurrent state;
- expose an associated inline error without changing the existing authoring layout;
- clear stale duplicate feedback when reopening the picker, removing an ingredient, or resetting/hydrating the form;
- focused recipe-authoring tests: 7 passed;
- full frontend suite: 62 passed, 1 skipped;
- strict application and specification TypeScript checks passed;
- production frontend build passed.

## Endpoint Use

- `GET /api/diets`
- `GET /api/ingredients`
- `GET /api/admin/ingredient-details/{id}`
- `POST /api/admin/ingredient-details`
- `GET /api/recipes/{id}`
- `POST /api/admin/recipe-details`
- `PUT /api/admin/recipe-details/{id}`

Do not invent additional authoring endpoints.

## Tests

- preview calculation continues to work;
- write FormData omits canonical totals;
- backend response replaces saved totals;
- price required;
- zero price valid;
- protein/carbs required;
- duplicate ingredient prevented;
- unit matches basis;
- structured instruction title/body ordering, validation, serialization and edit hydration.

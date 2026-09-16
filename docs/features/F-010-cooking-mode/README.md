# F-010 — Cooking Mode

**Status:** Draft  
**Implementation status:** Not started  
**Version:** 0.1  
**Owner:** Mathieu Galidie  
**Last updated:** 2026-08-31  
**Dependencies:** F-008 Recipe Discovery, Recipe Card & Quick Preview  
**Related engineering initiatives:** E-019 Frontend Data Access Architecture

## Goal

Let an authenticated user move from the shared Recipe Card → Quick Preview flow into a dedicated Cooking Mode that presents the complete recipe in a large, readable, step-by-step experience.

Cooking Mode must preserve the recipe experience established by F-008: a card opened from Home, Recipe Discovery, Favorites, or a future Meal Plan enters the same Quick Preview and then the same Cooking Mode. The origin feature must not implement its own cooking behavior.

## User Problem

Quick Preview is intentionally lightweight. Once the user decides to cook a recipe, they need:

- full ingredient quantities;
- a clear serving-size control;
- nutrition for the amount they are actually preparing;
- complete ordered cooking steps;
- progress through those steps;
- a simple timer that remains available throughout the cooking session;
- a way to return to the exact page/search/filter position from which they started cooking.

The cooking UI must be readable while actively preparing food and must not require the user to repeatedly reopen Preview or mentally convert per-serving values.

## Current Behavior

### Implemented

- F-008 provides the shared Recipe Card → Quick Preview experience.
- `RecipeExperienceFacade` is the public shared UI-orchestration boundary for Recipe Card and Quick Preview.
- Recipe data access already lives under `core/shared/data-access/recipes`.
- Recipes already persist description, total time, servings, total calories/protein/carbs, ordered ingredients with quantity/unit/display order, and structured instruction steps.
- Authenticated Recipe Discovery/Preview applies current-user diet and ingredient-restriction compatibility.
- Recipe Discovery retains meaningful query/list state independently of the route component.

### Missing or incomplete

- No Cooking Mode route/page exists.
- Quick Preview `Start Cooking` does not yet enter a real Cooking Mode.
- No dedicated current-user-aware cooking read endpoint exists.
- No cooking read-model cache exists.
- No serving-scaled cooking UI exists.
- No cooking-session ingredient checklist exists.
- No real timer exists.
- No origin-return contract exists for returning to the exact previous route/query/scroll position.

## Scope

### Included

- Authenticated frontend route `/recipes/:id/cooking`.
- `GET /api/recipes/{id}/cooking-view`.
- Dedicated `RecipeCookingViewDto`.
- Same mandatory diet/restriction compatibility behavior as Recipe Preview.
- Full recipe image, description, ordered badges, ingredients, and instruction steps.
- Base recipe servings and base recipe nutrition totals.
- Large serving selector.
- Client-side temporary scaling of ingredient quantities and total calories/protein/carbs.
- Total cooking time displayed without scaling.
- Ingredient checklist local to the cooking session.
- Current-step display, progress bar, Previous/Next, direct step navigation, final-step state and `Cook again`.
- One real Cooking Mode timer shared across all steps.
- Exact origin return for same-SPA navigation: route, query parameters, retained feature state, and scroll position.
- Direct-route fallback to `/recipes`.
- Shared Recipe Experience integration.
- Responsive and accessible Cooking Mode.
- User-supplied React/Tailwind page preserved as an implementation asset.

### Excluded

- Persisted cooking sessions.
- Persisting checked ingredients, selected serving count, timer state, or current step.
- Step-specific timers or automatic timer durations parsed from instruction text.
- Timer notifications.
- Step images/video.
- Ingredient substitutions or unit conversion.
- Nutrition recalculation from ingredient nutrition in the browser.
- Meal Plan completion tracking.
- Recommendation behavior.
- `RouteReuseStrategy` or keeping origin page component trees alive.

## Users and Permissions

| Actor | Allowed behavior |
| --- | --- |
| Guest | Cannot access Cooking Mode. API returns `401`; frontend auth guard prevents normal navigation. |
| Authenticated user | Can load and cook an existing recipe only when compatible with current diets/restrictions. |
| Administrator | Same Cooking Mode behavior as authenticated user unless a future admin capability is added. |

Frontend visibility is not authorization.

## Canonical Visual Reference

Codex must use [`assets/cooking-mode-visual-reference.tsx`](assets/cooking-mode-visual-reference.tsx) as the primary visual and interaction reference.

The reference establishes:

- top `Exit Cooking Mode` action and `Cooking mode` badge;
- two-column desktop layout;
- large hero image and recipe title;
- metadata, description, and badges;
- large active-step panel and progress bar;
- Previous/Next controls;
- ingredient checklist and serving control;
- Cooking Progress list;
- final state and `Cook again`.

The React, Tailwind, shadcn, and fake-data architecture in the asset is **not canonical**. Codex must reproduce the intended layout with the existing Angular/Appetee architecture and shared styles.

### Required differences from the reference

1. **Ingredients are not sticky.** Remove the reference `lg:sticky lg:top-24`; Ingredients remains at the top of the right column on desktop but scrolls normally.
2. **Top metadata adds protein and carbs.** Display total time, selected servings, calories, protein, and carbs.
3. **Nutrition describes the amount currently being cooked.** Cooking Mode does not display per-serving nutrition.
4. **Serving selection starts from the actual recipe serving count**, not a multiplier of `1`.
5. **The timer is real and shared by the entire Cooking Mode session** and survives step changes.
6. **Exit returns to the exact origin when possible**, rather than always routing to `/recipes`.

See [`assets/README.md`](assets/README.md).

## User Experience

### Entry

```text
RecipeCard
    ↓
RecipeExperienceFacade
    ↓
RecipeQuickPreview
    ↓ Start Cooking
/recipes/:id/cooking
```

Normal feature pages must not coordinate the cooking route themselves.

### Page header

```text
← Exit Cooking Mode                         [ Cooking mode ]
```

`Exit Cooking Mode` returns to the exact origin when the route was entered through the shared Recipe Experience.

### Recipe summary card

The hero area shows:

- full recipe image;
- recipe name;
- total time;
- selected servings;
- scaled calories;
- scaled protein;
- scaled carbs;
- description;
- canonical recipe badges.

Example:

```text
45 min   6 servings   3600 cal   240 g protein   420 g carbs
```

These values describe the **whole currently selected cooking quantity**, not one serving.

### Serving selector

The Ingredients card contains a prominent serving control.

For a base recipe:

```text
Base servings = 4
Selected servings = 4
```

Changing to 6:

```text
scaleFactor = selectedServings / baseServings
            = 6 / 4
            = 1.5
```

Then:

```text
400 g chicken → 600 g
200 g rice    → 300 g

2400 cal      → 3600 cal
160 g protein → 240 g protein
280 g carbs   → 420 g carbs
```

Rules:

- selected servings initially equals `baseServings`;
- selected servings is always a positive whole number;
- minus is disabled at `1`;
- use an existing shared serving upper bound if one exists; otherwise an implementation may use UI-only max `20`;
- selected servings are not persisted;
- time, badges, and description do not scale;
- units are not automatically converted;
- calorie display rounds to whole kcal;
- protein/carbs display at most one decimal and trim `.0`;
- ingredient quantities use practical display rounding without changing the base DTO.

### Ingredients

Ingredients are ordered by authored `display_order`.

```text
[checkbox] Ingredient name                    scaled quantity unit
```

Checking an ingredient is local UI state only, visually marks it complete, and makes no backend request. The Ingredients card is **not sticky**.

### Cooking steps

Cooking Mode uses the full structured instruction data:

```text
order
title
instruction
```

Example:

```text
Step 2 of 6

Cook the chicken

Heat the pan over medium-high heat...
```

The main step area must be large and easy to read while cooking.

Progress:

```text
(currentStepIndex + 1) / totalSteps * 100
```

The user can use Previous/Next or click a row in Cooking Progress to jump to a step. Previous is disabled on the first step.

On the final step:

- show the completed/ready message from the reference;
- keep the timer available underneath;
- replace Next with `Cook again`.

`Cook again` resets step to 1, clears ingredient checkmarks, stops/resets the timer, and preserves selected servings.

### Cooking Progress

The right-side card lists all steps in order. Each item shows the step number/completed icon, title, and optionally a short instruction preview. Current/previous/future styling follows the supplied reference and Appetee tokens.

### Timer

There is one stopwatch-style timer for the whole Cooking Mode session, underneath the active-step content, available on every step.

```text
00:00

[ Start / Pause ]    [ Reset ]
```

Rules:

- Start begins elapsed timing.
- Pause freezes elapsed time.
- Resume continues from accumulated time.
- Reset returns to `00:00` and stops.
- Step changes, progress-step clicks, serving changes, and ingredient checks do not affect timer state.
- Timer is local state only.
- Calculate elapsed time from timestamps plus accumulated duration rather than trusting interval tick counts.
- A small interval is only for refreshing display.
- Display `MM:SS`; use `HH:MM:SS` after one hour.
- No backend timer request.

## User Flows

### Flow 1 — Start cooking from filtered Recipe Discovery

1. User is at `/recipes?search=chicken&badges=High%20Protein&maxTotalMinutes=45`.
2. Recipe Discovery has loaded cards/cursor state in its feature/session store.
3. User opens a shared Recipe Card and Quick Preview.
4. User selects `Start Cooking`.
5. Recipe Experience captures current internal URL (including query params) and vertical scroll position.
6. Quick Preview closes and app navigates to `/recipes/{id}/cooking`.
7. Cooking Mode loads the dedicated Cooking View.
8. User exits Cooking Mode.
9. App returns to the prior Recipe Discovery history entry.
10. Existing Recipe Discovery state is reused when still valid and scroll position is restored.

### Flow 2 — Start cooking from Favorites

1. User is at `/favorites`.
2. Card → Quick Preview → Start Cooking.
3. App captures `/favorites` and its scroll position.
4. Exit returns to `/favorites` and restores the prior position/state when valid.

### Flow 3 — Change servings

1. Base servings = 4.
2. Cooking View returns base quantities and nutrition totals.
3. Selected servings initializes to 4.
4. User selects 6.
5. Frontend computes one factor `1.5`.
6. Every ingredient quantity and calorie/protein/carb total updates from that same factor.
7. No backend mutation occurs.

### Flow 4 — Timer across steps

1. Start timer on Step 1.
2. Move to Step 2; timer continues.
3. Pause timer.
4. Jump to Step 4; timer remains paused at the same value.
5. Resume.
6. Only explicit Reset or `Cook again` clears it.

### Flow 5 — Direct Cooking URL

1. User directly opens `/recipes/42/cooking` while authenticated.
2. Cooking View loads if recipe exists and is compatible.
3. If no trusted in-app origin context exists, Exit routes to `/recipes`.

## Business Rules

- Cooking Mode is authenticated.
- Current user ID comes from authenticated cookie/session, never browser recipe-read input.
- Recipe must exist and pass shared mandatory diet/restriction compatibility.
- Nonexistent and incompatible recipes both return `404`.
- Cooking Mode uses the full recipe image.
- `totalTimeMinutes` never scales with servings.
- Base servings and nutrition totals come from server.
- Browser may derive temporary scaled display values but never persists them as authoritative recipe data.
- All ingredient and nutrition scaling uses exactly `selectedServings / baseServings`.
- Instructions are not scaled.
- Ingredient sequence is `display_order`; instruction sequence is authored order.
- Badge order uses the shared F-008 canonical priority.
- Timer, checkboxes, servings, and current step are temporary UI state only.
- No `RouteReuseStrategy` is introduced.
- Origin route components may destroy normally; meaningful feature state remains in the owning feature/session store.
- Return context is generic and must not contain Recipe Discovery-specific filter fields.

## Shared Feature Ownership

F-010 consumes but does not redefine:

- **F-008** Recipe Card, Quick Preview, Recipe Experience, shared recipe data access, compatibility SQL, badge priority, and Recipe Discovery retained state.
- **F-009** Favorites list state.
- **F-006** Home state.

Cooking Mode must not inspect those feature-specific stores.

## Data Requirements

### Data model

```ts
export interface RecipeCookingViewDto {
  id: number;
  name: string;
  imageUrl: string | null;
  description: string;
  totalTimeMinutes: number;
  baseServings: number;
  caloriesTotal: number;
  proteinTotal: number;
  carbsTotal: number;
  badges: readonly RecipeBadge[];
  ingredients: readonly RecipeCookingIngredientDto[];
  steps: readonly RecipeCookingStepDto[];
}

export interface RecipeCookingIngredientDto {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  displayOrder: number;
}

export interface RecipeCookingStepDto {
  order: number;
  title: string;
  instruction: string;
}
```

`baseServings` is explicit so it cannot be confused with temporary selected servings.

### Temporary frontend session model

```ts
interface RecipeCookingSessionState {
  selectedServings: number;
  currentStepIndex: number;
  checkedIngredientIds: ReadonlySet<number>;
  timer: {
    accumulatedMs: number;
    startedAtMs: number | null;
    running: boolean;
  };
}
```

This may use component signals rather than a dedicated store.

### Return context

```ts
export interface RecipeReturnContext {
  url: string;
  scrollY: number;
}
```

Rules:

- URL must be internal.
- Query params remain in the URL string.
- Do not decompose it into search/badge/time/favorite fields.
- Scroll Y is nonnegative.
- This is transient navigation state, not backend data.

### Data ownership

| State | Ownership | Lifetime |
| --- | --- | --- |
| `RecipeCookingViewDto` by ID | Shared recipe data-access cache | Authenticated SPA session; reset on logout/identity reset/invalidation |
| Current step | Cooking component-local | Current cooking route |
| Selected servings | Cooking component-local | Current cooking route |
| Checked ingredients | Cooking component-local | Current cooking route |
| Timer | Cooking component-local | Current cooking route |
| Return context | Recipe Experience transient navigation state | Entry → successful exit/fallback |
| Origin list/query state | Owning feature | Existing owning-feature lifetime; not copied into Cooking |

### Cache and freshness

Use an ID-keyed shared Cooking View cache following Preview/detail conventions.

```text
cache miss → GET cooking-view → cache complete DTO
same recipe later → reuse cache
```

Invalidate on logout, identity change, explicit recipe/admin invalidation. No arbitrary TTL.

Cooking-session UI state is never placed in this cache.

Browser refresh resets temporary cooking state. If return context is unavailable after a direct/reloaded route, Exit falls back to `/recipes`.

## Database Impact

### Existing tables used

- `recipes`
- `recipe_badges`
- `recipe_ingredients`
- `ingredients`
- `user_diets`
- `diet_recipes`
- `user_ingredient_restrictions`

### Schema changes

None. F-008 already added the data Cooking Mode requires.

### Index changes

None planned. Validate final query with `EXPLAIN`; do not add speculative indexes.

### Data migration

None.

## API Endpoints

| Method | Endpoint | Purpose | Owner | State |
| --- | --- | --- | --- | --- |
| `GET` | `/api/recipes/{id}/cooking-view` | Complete current-user-compatible Cooking View | F-010 | Planned |
| `GET` | `/api/recipes/{id}/preview` | Quick Preview before cooking | F-008 | Existing |
| `PUT` | `/api/recipes/{id}/favorite` | Shared favorite mutation | F-008 | Existing |
| `DELETE` | `/api/recipes/{id}/favorite` | Shared favorite mutation | F-008 | Existing |

## Request Contracts

### `GET /api/recipes/{id}/cooking-view`

Path `id`: positive integer recipe ID.

No body. No user ID. Authenticated user is resolved from cookie/session.

## Response Contracts

### `200 OK`

```json
{
  "id": 42,
  "name": "Chicken Rice Bowl",
  "imageUrl": "https://...",
  "description": "A high-protein chicken and rice bowl.",
  "totalTimeMinutes": 45,
  "baseServings": 4,
  "caloriesTotal": 2400,
  "proteinTotal": 160,
  "carbsTotal": 280,
  "badges": ["High Protein", "Meal Prep"],
  "ingredients": [
    {
      "id": 8,
      "name": "Chicken breast",
      "quantity": 400,
      "unit": "g",
      "displayOrder": 1
    }
  ],
  "steps": [
    {
      "order": 1,
      "title": "Prepare the chicken",
      "instruction": "Pat the chicken dry and season it."
    }
  ]
}
```

Rules:

- arrays are non-null;
- ingredients ordered by `displayOrder`;
- steps expose explicit one-based order;
- `imageUrl` resolves the full recipe image;
- nutrition totals are persisted totals for `baseServings`;
- backend does not scale for selected servings.

## Error Behavior

| Situation | Expected behavior |
| --- | --- |
| Unauthenticated | `401` |
| Invalid/nonpositive route ID | common `400` validation behavior |
| Recipe absent | `404` |
| Recipe incompatible | `404` |
| Unexpected failure | common ProblemDetails |

## Routing

Canonical frontend route:

```text
/recipes/:id/cooking
```

Normal navigation:

```text
origin feature → RecipeCard → Quick Preview → Start Cooking → /recipes/:id/cooking
```

Return:

```text
valid captured internal origin
→ previous app history entry
→ reuse owning feature state when valid
→ restore scroll

no valid captured origin
→ /recipes
```

See [`assets/cooking-routing.svg`](assets/cooking-routing.svg).

## Responsive Behavior

### Desktop

Preserve the reference two-column layout:

```text
left column                    right column
hero/summary                   ingredients
current step                   cooking progress
```

Ingredients starts at the top of the right column and **is not sticky**. Main instruction text remains large/readable.

### Tablet/mobile

Reflow without a separate implementation. No horizontal page scrolling. Keep serving, ingredient, step, timer, progress, and navigation controls usable with touch and zoom.

## Accessibility Requirements

- semantic controls for Exit, step navigation, Cook again, timer, servings, ingredients, and progress steps;
- accessible names for icons;
- visible focus;
- current-step semantics;
- semantic progress value;
- timer updates not announced every second;
- completed/current state not color-only;
- keyboard-only operation;
- usable touch targets;
- 200%/400% zoom/reflow;
- reduced-motion support;
- loading/error announcements.

## Delivery Phases

The feature is intentionally split into three detailed phases so Codex can run at Medium reasoning without making product or architecture decisions.

### Phase 1 — Cooking read model, endpoint, and shared data access

**Status:** Not started

#### User value delivered

The application can load one complete authorized Cooking View through a dedicated endpoint and shared recipe data-access architecture.

#### Included work

Backend:

- [ ] Add `RecipeCookingViewDto`, `RecipeCookingIngredientDto`, and `RecipeCookingStepDto` beside existing recipe DTOs.
- [ ] Add `GetCookingViewAsync(currentUserId, recipeId, ct)` through existing `IRecipeService/RecipeService → IRecipeQueries/RecipeQueries` layering.
- [ ] Add `GET /api/recipes/{id}/cooking-view` to `RecipesController`.
- [ ] Resolve current user from existing session/cookie auth exactly like F-008 current-user endpoints.
- [ ] Reuse shared F-008 compatibility predicate; do not duplicate it.
- [ ] Return `404` for absent and incompatible recipes.
- [ ] Use one Dapper `QueryMultipleAsync` round-trip: base recipe + badges + ordered ingredients.
- [ ] Base row includes full image blob name, description, total time, base servings, calorie/protein/carb totals, and instructions JSON.
- [ ] Deserialize structured instructions once and map array order to one-based `Order`.
- [ ] Sort badges through existing canonical priority helper.
- [ ] Resolve full recipe image URL.
- [ ] Return non-null arrays and no heavy admin ingredient nutrition/details.
- [ ] Do not accept servings in this endpoint.
- [ ] Add no schema/index unless `EXPLAIN` proves a need.

Frontend data access:

- [ ] Add matching Cooking View interfaces to existing shared recipe models.
- [ ] Add `RecipesApi.getCookingView(recipeId)`.
- [ ] Add ID-keyed `RecipeCookingStore` following existing by-ID cache conventions.
- [ ] Add `RecipesFacade` load/read/retry/invalidation methods.
- [ ] Coalesce duplicate same-ID in-flight loads.
- [ ] Register cache in authenticated session reset lifecycle.
- [ ] Invalidate Cooking View when recipe/admin invalidation invalidates other recipe read models.

#### Tests and validation

- [ ] Compatible authenticated recipe `200`.
- [ ] Nonexistent recipe `404`.
- [ ] Incompatible recipe `404`.
- [ ] Unauthenticated `401`.
- [ ] Invalid ID common `400` behavior.
- [ ] Ingredients preserve display order.
- [ ] Steps preserve authored order with one-based `order`.
- [ ] Badges use canonical priority.
- [ ] Base totals/servings returned unscaled.
- [ ] No admin ingredient payload leaks.
- [ ] Same-ID frontend requests coalesce/cache.
- [ ] Logout/identity reset clears cache.
- [ ] `EXPLAIN` recorded.
- [ ] Remembered/non-remembered cookie behavior regression-tested.
- [ ] Idle/sliding/absolute expiration behavior regression-tested.
- [ ] Expired-session redirect/message behavior regression-tested.
- [ ] Multi-browser auth behavior regression-tested where existing tests cover it.

#### Phase completion criteria

- [ ] Dedicated Cooking View loads through approved architecture.
- [ ] Query is bounded and avoids N+1.
- [ ] Tests pass and no blocking defect remains.

### Phase 2 — Cooking UI, serving scaling, steps, ingredients, and timer

**Status:** Not started

#### User value delivered

The user can follow a real recipe, scale what they are cooking, check ingredients, navigate steps, and use one consistent timer.

#### Included work

Route/page and visual architecture:

- [ ] Add authenticated `/recipes/:id/cooking` to Recipes lazy routes.
- [ ] Create a thin route container under Recipes.
- [ ] Put reusable Cooking presentation under `core/shared/ui/recipe-experience/cooking-mode/`.
- [ ] Route container parses ID, obtains Cooking View through `RecipesFacade`, and owns route loading/error state.
- [ ] Shared Cooking component performs no raw HTTP.
- [ ] Reproduce `assets/cooking-mode-visual-reference.tsx` with Angular/Appetee styling.
- [ ] Reuse CSS variables, `_button.scss`, `_text.scss`, `_theme.scss`, and existing primitives.
- [ ] Keep header, hero/title, description/badges, current-step card, progress, step controls, ingredients, serving control, and Cooking Progress structure.
- [ ] Add selected servings + scaled calories/protein/carbs to top metadata.
- [ ] Remove all sticky behavior from Ingredients.

Serving scaling:

- [ ] Initialize selected servings from `baseServings`.
- [ ] Compute one factor `selectedServings / baseServings`.
- [ ] Derive every ingredient quantity and calorie/protein/carb total from the same factor.
- [ ] Never scale from already-scaled values.
- [ ] Do not mutate cached DTO or call backend on serving change.
- [ ] Time does not scale.
- [ ] Disable decrement at 1; follow existing max bound or UI-only 20 if none exists.
- [ ] Round only for presentation and do not convert units.

Ingredients:

- [ ] Render all ordered ingredients.
- [ ] Keep checkbox state component-local.
- [ ] Checked style uses Appetee completion/success styling and remains accessible.
- [ ] Checkbox changes do not affect timer/steps/servings or call backend.

Steps:

- [ ] Initialize first step.
- [ ] Show `Step X of N`, title, full instruction body.
- [ ] Keep instruction body large/easy to read.
- [ ] Previous/Next bounds correct.
- [ ] Cooking Progress row can directly select a step.
- [ ] Progress uses `(index + 1) / total * 100`.
- [ ] Final step shows completion message, keeps timer, and replaces Next with `Cook again`.
- [ ] `Cook again` resets step/checklist/timer but preserves servings.

Timer:

- [ ] Implement one stopwatch-style Cooking Mode timer under the active step.
- [ ] Timer is available on every step.
- [ ] Start/Pause/Resume/Reset.
- [ ] Step/serving/checklist interactions do not change timer state.
- [ ] Track elapsed from timestamps + accumulated time, not interval tick count.
- [ ] Use interval only for display refresh and clean it up on destroy.
- [ ] Display `MM:SS`, then `HH:MM:SS` after one hour.
- [ ] No backend/persistence.

Loading/error:

- [ ] Initial Cooking skeleton.
- [ ] Retry for recoverable load failure.
- [ ] `404` unavailable state with route back.
- [ ] `401` follows existing expired-session flow.

#### Tests and validation

- [ ] Base 4-serving recipe renders base values.
- [ ] 4 → 6 uses factor 1.5 everywhere.
- [ ] Returning to base restores exact base display.
- [ ] Repeated scaling never compounds rounding.
- [ ] Time unchanged when servings change.
- [ ] Ingredients ordered/checkable and non-sticky.
- [ ] Step navigation/progress correct.
- [ ] Final state/Cook again correct.
- [ ] Timer Start/Pause/Resume/Reset correct.
- [ ] Timer survives step and serving changes.
- [ ] Timer resources clean up on destroy.
- [ ] Keyboard/accessibility validation.
- [ ] Desktop/tablet/mobile/200%/400% zoom validation.
- [ ] Frontend build/type check passes.

#### Phase completion criteria

- [ ] Cooking UI follows supplied reference with documented differences.
- [ ] Serving scaling and timer are correct.
- [ ] Ingredients do not follow viewport.
- [ ] Tests pass and no blocking defect remains.

### Phase 3 — Shared Start Cooking flow, exact return navigation, state reuse, and hardening

**Status:** Not started

#### User value delivered

Starting Cooking from any shared Card/Preview returns the user to the exact page/search/filter/scroll position without retaining full route component trees.

#### Included work

Shared Recipe Experience:

- [ ] Extend `RecipeExperienceFacade` with Cooking navigation orchestration.
- [ ] Add generic `RecipeReturnContext { url, scrollY }`.
- [ ] On Start Cooking, capture current `Router.url` and scroll Y before navigation.
- [ ] Keep URL as one internal URL string including query params.
- [ ] Close only the active Quick Preview dialog, then navigate to `/recipes/{id}/cooking`.
- [ ] Enable Quick Preview `Start Cooking` through this shared flow.
- [ ] Home/Recipes/Favorites pages still only render shared Recipe Card and do not implement Cooking navigation.

Return behavior:

- [ ] Validate return URL as internal before use.
- [ ] With valid shared-experience origin, Exit returns through previous in-app history entry.
- [ ] Restore captured scroll after origin navigation/render is ready.
- [ ] Use one-shot navigation/scroll restoration; dispose subscription/listener.
- [ ] Consume/clear return context after exit.
- [ ] Do not introduce `RouteReuseStrategy`.
- [ ] Origin pages may run normal destroy lifecycle.
- [ ] Rely on owning feature/session stores to retain meaningful data.
- [ ] Recipe Discovery reuses retained state when URL/query key matches rather than automatically restarting page 1.
- [ ] Cooking does not couple to Home/Favorites/Discovery store internals.
- [ ] No valid origin → `/recipes` fallback.
- [ ] Browser Back remains functional.

Search/filter case:

- [ ] Verify exact `/recipes?...` query string capture.
- [ ] Do not decompose/reconstruct filter state in Cooking.
- [ ] Same URL remains source of applied intent on return.
- [ ] Retained loaded cards/cursor reused when valid.
- [ ] Restore prior scroll after cards are available.
- [ ] Do not trigger unnecessary discovery reload solely because route component recreated.

Hardening:

- [ ] Cooking cache resets on logout/identity reset.
- [ ] Admin recipe invalidation clears Cooking View.
- [ ] Expired session follows common auth flow.
- [ ] Invalid/missing ID does not cause uncaught component exception.
- [ ] Direct URL reload remains usable without origin context.
- [ ] Current step/timer/checklist/servings remain intentionally nonpersistent on refresh.

#### Tests and validation

- [ ] E2E Recipes → Card → Preview → Cooking → Exit.
- [ ] E2E filtered/searched Recipes → Cooking → exact query return.
- [ ] E2E multiple loaded Discovery pages + scroll → Cooking → return with retained state/scroll.
- [ ] E2E Favorites → Cooking → return.
- [ ] E2E Home → Cooking → return.
- [ ] Direct Cooking URL exits to `/recipes` when no trusted origin.
- [ ] External/malicious return URL rejected.
- [ ] No RouteReuseStrategy introduced.
- [ ] Origin page destroy/recreate does not lose meaningful retained state.
- [ ] One-shot restoration listener disposed.
- [ ] Preview closes only itself and navigates once.
- [ ] Remembered/non-remembered cookies regression-tested.
- [ ] Idle/sliding/absolute expiration regression-tested.
- [ ] Expired-session frontend behavior regression-tested.
- [ ] Multi-browser/session behavior remains consistent.
- [ ] Relevant frontend/backend suites and production build pass.

#### Phase completion criteria

- [ ] Card → Quick Preview → Cooking is one shared experience everywhere.
- [ ] Exit returns to exact origin route/query/position when valid.
- [ ] No feature-specific return logic in Cooking.
- [ ] No route component tree kept alive unnecessarily.
- [ ] Direct-link fallback is safe.
- [ ] Required tests pass and no blocking defect remains.

## Work Status

### Completed

None.

### In Progress

None.

### Not Started

- Phase 1 — Cooking read model, endpoint, and shared data access
- Phase 2 — Cooking UI, serving scaling, steps, ingredients, and timer
- Phase 3 — Shared Start Cooking flow, exact return navigation, state reuse, and hardening

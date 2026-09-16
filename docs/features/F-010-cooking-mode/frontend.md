# F-010 — Cooking Mode — Frontend

## Canonical Contract

The feature [`README.md`](README.md) owns product behavior, data requirements, API endpoint definitions, response contracts, serving semantics, return-navigation behavior, and error semantics.

This document describes how the Angular frontend implements that contract. Do not redefine an incompatible API or data model here.

## Frontend Goal

Implement one authenticated Cooking Mode route entered through the existing shared Recipe Experience. Keep the route container thin, keep reusable Cooking presentation under `core/shared/ui/recipe-experience`, keep raw HTTP/cache in shared recipe data access, and preserve origin state through URL/store/scroll restoration rather than keeping route component trees alive.

## Routes

| Route | Access | Purpose |
| --- | --- | --- |
| `/recipes/:id/cooking` | Authenticated | Dedicated Cooking Mode for one compatible recipe |

Add the route to the existing Recipes lazy route namespace.

## Page and Component Structure

```text
src/app/

core/shared/
├── data-access/
│   └── recipes/
│       ├── recipe.api.ts
│       ├── recipe.facade.ts
│       ├── recipe.model.ts
│       ├── recipe-cooking.store.ts
│       └── existing preview/detail/discovery data access
│
└── ui/
    └── recipe-experience/
        ├── recipe-experience.facade.ts
        ├── recipe-card/
        ├── recipe-quick-preview/
        └── cooking-mode/
            ├── recipe-cooking-mode.component.ts
            ├── recipe-cooking-mode.component.html
            └── recipe-cooking-mode.component.scss

features/
└── recipes/
    ├── recipes.routes.ts
    └── cooking/
        ├── recipe-cooking.page.ts
        ├── recipe-cooking.page.html
        └── recipe-cooking.page.scss
```

### `RecipeCookingPage`

Own only route/container behavior:

- parse recipe ID;
- request Cooking View through shared `RecipesFacade`;
- expose loading/error/not-found state;
- render shared Cooking component with loaded DTO;
- delegate Exit to shared Recipe Experience return behavior.

It must not perform raw HTTP, own a duplicate recipe cache, or understand Home/Favorites/Recipe Discovery internals.

### `RecipeCookingModeComponent`

Own reusable cooking presentation and temporary cooking-session state:

- current step;
- selected servings;
- scaled display values;
- ingredient checklist;
- stopwatch timer;
- Previous/Next/Cook again;
- Cooking Progress direct-step selection.

Input is the immutable base `RecipeCookingViewDto`.

## State Ownership

### Complete read-model cache

`RecipeCookingStore`:

- keyed by recipe ID;
- stores complete `RecipeCookingViewDto`;
- shared recipe data-access ownership;
- coalesces same-ID in-flight requests;
- reset through authenticated session reset.

### Temporary navigation state

```ts
interface RecipeReturnContext {
  url: string;
  scrollY: number;
}
```

Owned by shared Recipe Experience navigation behavior.

### Component-local state

```text
selectedServings
currentStepIndex
checkedIngredientIds
timer state
```

This intentionally resets when the Cooking Mode component is destroyed/reloaded.

## State Lifetime

### Cooking View cache

```text
Created when:
  first Cooking View request.

Survives:
  navigation in the same authenticated SPA session.

Reset when:
  logout / identity reset.

Invalidated when:
  recipe/admin update invalidates shared recipe read models.
```

### Cooking session state

```text
Created when:
  loaded Cooking View initializes the shared Cooking component.

Survives:
  step changes;
  serving changes;
  ingredient checks;
  timer controls.

Destroyed/reset when:
  Cooking route/component is destroyed;
  browser refresh;
  user exits.

Cook again:
  resets step/checklist/timer;
  preserves selected servings.
```

## Data Flow

```text
RecipeCard
    ↓
RecipeExperienceFacade.openPreview(card)
    ↓
RecipeQuickPreview
    ↓ Start Cooking
RecipeExperienceFacade.startCooking(recipeId)
    ├── capture Router.url
    ├── capture scroll Y
    └── navigate
             ↓
      /recipes/:id/cooking
             ↓
     RecipeCookingPage
             ↓
       RecipesFacade
       ↙         ↘
RecipeCookingStore   RecipesApi
                         ↓
GET /api/recipes/:id/cooking-view
                         ↓
             RecipeCookingViewDto
                         ↓
            RecipeCookingModeComponent
```

## API Integration

| Endpoint | Frontend responsibility |
| --- | --- |
| `GET /api/recipes/{id}/cooking-view` | Load/cache base Cooking View; never send selected servings |
| `GET /api/recipes/{id}/preview` | Existing Preview before Cooking |
| favorite endpoints | Existing shared behavior; Cooking Mode does not duplicate it |

## Serving Scaling

Use immutable base values.

```ts
scaleFactor = selectedServings() / cookingView().baseServings;
scaledCalories = cookingView().caloriesTotal * scaleFactor;
scaledProtein = cookingView().proteinTotal * scaleFactor;
scaledCarbs = cookingView().carbsTotal * scaleFactor;
scaledIngredientQuantity = ingredient.quantity * scaleFactor;
```

Rules:

- never mutate `RecipeCookingViewDto`;
- never scale from already-scaled values;
- one factor drives all ingredients and nutrition;
- total time never scales;
- no backend call on serving change;
- no unit conversion.

Formatting:

- calories: whole number;
- protein/carbs: at most one decimal, trim `.0`;
- ingredient quantities: practical precision, generally max two decimals unless an existing shared formatter defines a better rule;
- preserve original unit.

## Timer Implementation

Use a stopwatch model:

```ts
interface CookingTimerState {
  accumulatedMs: number;
  startedAtMs: number | null;
  running: boolean;
}
```

While running:

```text
elapsed = accumulatedMs + (now - startedAtMs)
```

Pause stores elapsed in `accumulatedMs`, clears `startedAtMs`, sets `running=false`.

Resume sets `startedAtMs=now`, `running=true`.

Reset clears all timer values.

A render interval/scheduler may update display but is not the source of truth. Clean it up on destroy.

## Return Navigation

### Capture

`RecipeExperienceFacade.startCooking(recipeId)` captures:

- current `Router.url` including query params;
- current document scroll Y.

Keep URL as one internal string. Do not store Cooking-specific copies of search/badges/time/saved filters.

### Exit

With valid origin context:

1. prepare one-shot scroll restoration;
2. return through previous app history entry;
3. after origin navigation/render is ready, restore scroll Y;
4. consume/clear return context.

Without valid origin context:

```text
/recipes
```

Do not add `RouteReuseStrategy`.

For Recipe Discovery, the page may destroy and recreate while `RecipeDiscoveryStore` remains the meaningful state owner.

## Loading Behavior

- Initial cache miss: Cooking page skeleton.
- Cache hit: render immediately.
- Failed request: Retry.
- `404`: unavailable/not-found state.
- `401`: existing expired-session flow.

Avoid one global loading boolean for unrelated shared recipe operations.

## Empty States

A valid recipe must have ingredients and at least one instruction step. Do not invent empty Cooking content for corrupted legacy data; fail safely through common error behavior.

## Caching and Invalidation

```text
What is cached?
  complete RecipeCookingViewDto by ID.

Owner?
  shared recipe data access.

Reused?
  repeated same-ID Cooking loads in authenticated SPA session.

Invalidated?
  logout;
  identity reset;
  recipe/admin invalidation.

Cooking-session UI state?
  never cached here.
```

## Responsive Behavior

Use `assets/cooking-mode-visual-reference.tsx` as the reference.

Desktop:

```text
left column                    right column
hero/summary                   ingredients
current step                   cooking progress
```

Ingredients must not be sticky.

Tablet/mobile:

- reflow to one column as needed;
- no separate implementation;
- no horizontal page overflow;
- maintain large step typography and usable touch controls.

## Accessibility

- semantic buttons/checks;
- visible focus;
- keyboard step navigation;
- current-step semantic state;
- progress semantics;
- named timer controls;
- timer does not announce every second aggressively;
- checked/completed state not color-only;
- mobile reflow and 200%/400% zoom;
- reduced motion.

## Testing

### Unit/store

- [ ] same-ID Cooking View requests coalesce.
- [ ] session reset clears cooking cache.
- [ ] recipe invalidation clears cooking cache.
- [ ] scaling derives from immutable base values.
- [ ] one scale factor drives ingredients/nutrition.
- [ ] timestamp-based timer logic.

### Component

- [ ] base serving render.
- [ ] serving +/- and rounding.
- [ ] checklist behavior.
- [ ] Ingredients non-sticky.
- [ ] step navigation/progress.
- [ ] final state/Cook again.
- [ ] timer survives step changes.

### Routing

- [ ] authenticated route.
- [ ] Start Cooking route creation.
- [ ] exact query-string origin preserved.
- [ ] direct-route fallback.
- [ ] scroll restoration.
- [ ] no RouteReuseStrategy.

### E2E

- [ ] filtered Recipes → Preview → Cooking → Exit.
- [ ] Favorites → Preview → Cooking → Exit.
- [ ] Home → Preview → Cooking → Exit.
- [ ] direct Cooking URL.

### Accessibility/manual

- [ ] keyboard-only flow.
- [ ] screen-reader labels/status.
- [ ] desktop/tablet/mobile.
- [ ] 200%/400% zoom.
- [ ] reduced motion.

## Implementation Notes

- React/Tailwind asset is visual reference only.
- Do not copy React Router, fake data, Tailwind classes, or shadcn ownership.
- Reuse Appetee Angular conventions and shared styles.
- Keep normal feature pages unaware of Quick Preview/Cooking orchestration.
- `RecipeExperienceFacade` may gain shared navigation behavior; raw recipe data remains in `RecipesFacade`.
- Do not call browser Back blindly for direct access; only history-return when valid internal origin context proves in-app entry.
- Use Angular Router/Location/ViewportScroller or existing equivalents.

## Dependencies

- F-008 Recipe Discovery, Card, Quick Preview, Recipe Experience
- E-019 Frontend Data Access Architecture
- existing auth/session reset infrastructure

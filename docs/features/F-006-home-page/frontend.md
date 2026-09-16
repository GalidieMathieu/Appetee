# F-006 — Home Page — Frontend

## Canonical Contract

`README.md` owns product behavior, routing, external endpoint usage, empty-state rules, counts, and the three delivery phases.

This file translates that contract into Angular implementation ownership. It must not redefine product behavior.

## Implementation Goal

Implement Home as a small composition feature built from reusable shared recipe UI:

```text
HomePage
├── RecipeSearchBarComponent
├── RecipeListSectionComponent → Discover
├── RecipeListSectionComponent → Upcoming Meals (future populated state)
│   OR MealPlanEmptyStateComponent
├── RecipeListSectionComponent → Favorites (only when > 0)
└── Explore All Recipes CTA
```

Every recipe item remains the canonical F-008 `RecipeCardComponent`, which already owns entry into the shared Recipe Experience.

## Required Repository Inspection Before Code

Codex must inspect the latest frontend `development` branch before implementing each phase because F-008 may move/refactor current files.

At minimum inspect:

- the current `/recipes` page/component and its search form;
- the current shared Recipe Card path after the Recipe Experience refactor;
- `recipe.api.ts`, recipe DTO/model definitions, and current discovery API method;
- current favorite mutation/synchronization implementation;
- current account/session display-name source;
- current logout/identity reset mechanism;
- current shared UI folder conventions;
- `_button.scss`, `_text.scss`, `_theme.scss`, global CSS variables/tokens;
- existing skeleton/loading/error primitives before creating new ones;
- current route registration/private route layout.

Do not assume the old F-006 placeholder files are authoritative.

## Shared UI Structure

Target conceptual structure:

```text
src/app/core/shared/ui/
├── recipe-experience/
│   ├── recipe-experience.facade.ts
│   ├── recipe-card/
│   ├── recipe-quick-preview/
│   └── cooking-mode/              # future
│
├── recipe-search-bar/
│   ├── recipe-search-bar.component.ts
│   ├── recipe-search-bar.component.html
│   └── recipe-search-bar.component.scss
│
└── recipe-list-section/
    ├── recipe-list-section.component.ts
    ├── recipe-list-section.component.html
    └── recipe-list-section.component.scss
```

If F-008 has established a slightly different shared-folder naming convention by implementation time, use that current convention without changing the ownership boundary.

## RecipeSearchBarComponent

### Purpose

One search-input + Search-button implementation for:

- `/recipes` now;
- `/home` now;
- Meal Plan recipe selection/search later.

### Source of truth

Do **not** design a new search bar from the Home screenshots.

Extract/refactor the current Recipes page search input and Search button. Preserve the current Recipes visual implementation exactly unless the feature spec explicitly requires a correction.

The shared component should contain only the reusable form controls:

```text
[ search icon + Search recipes or ingredients... ] [ Search ]
```

Recipes-specific Filters remain outside.

### Required behavior

- semantic search form;
- input type appropriate for search;
- accessible label;
- current placeholder `Search recipes or ingredients...`;
- Search button;
- Enter submits;
- button submits;
- trims surrounding whitespace;
- emits the submitted string;
- no HTTP;
- no Router dependency;
- no knowledge of `/recipes`;
- no filter state;
- width follows parent container;
- supports receiving the current value so Recipes can populate URL search state.

### Conceptual API

Preferred simple shape:

```ts
export class RecipeSearchBarComponent {
  readonly value = input('');
  readonly placeholder = input('Search recipes or ingredients...');
  readonly searchSubmitted = output<string>();
}
```

Codex may adapt implementation details if a form-control/signal pattern already exists. Avoid introducing `ControlValueAccessor` solely for abstraction unless the current frontend convention already uses it and it materially simplifies reuse.

### Recipes integration

The Recipes page must be converted to use this component in the same phase that creates it.

The Recipes page continues owning:

- applied search criteria;
- URL query params;
- discovery calls;
- filters;
- filter panel/draft state;
- cursor pagination.

The shared search bar only provides the interaction surface.

This avoids ending with two visually identical search components.

## RecipeListSectionComponent

### Purpose

Reusable horizontal recipe section with identical layout across Home's recipe-bearing sections.

Canonical visual reference:

```text
assets/home-reference-recipe-list-section.png
```

Use the screenshot for:

- section-title alignment;
- right-side `View all` placement;
- vertical spacing between header and row;
- horizontal-row concept.

Do **not** use the screenshot's old Recipe Card internals as the implementation source. The current F-008 shared card is authoritative.

### Required component behavior

Conceptually:

```html
<section class="recipe-list-section" [attr.aria-labelledby]="headingId">
  <header class="recipe-list-section__header">
    <h2 ...>{{ title() }}</h2>
    <button/link ...>View all</button>
  </header>

  <div class="recipe-list-section__row">
    @for (recipe of recipes(); track recipe.id) {
      <app-recipe-card [recipe]="recipe" />
    }
  </div>
</section>
```

The actual action element may be a button emitting to the parent or another project-consistent accessible implementation. Route ownership must remain outside the shared component.

### Inputs/outputs

Minimum intent:

```ts
title
recipes
actionLabel = 'View all'
actionDisabled
loading
actionTriggered
```

If existing shared request-state patterns make it useful, `error`/`retryRequested` can be part of the generic section. Do not add domain flags such as `isFavoriteSection`, `isMealPlan`, or `discoveryMode`.

### Row layout

- horizontal flex/grid-auto-flow row;
- consistent gap from current layout tokens;
- `overflow-x: auto` or equivalent contained horizontal overflow;
- no page-level horizontal overflow;
- cards keep the canonical Recipe Card width/behavior;
- do not shrink cards to force a count;
- touch-scrollable on mobile;
- keyboard-reachable cards/actions;
- optional scroll snap only if already used by the design system or clearly improves behavior without harming accessibility.

### Loading

A section may render card-shaped skeleton placeholders while loading. Reuse existing skeleton/card sizing; do not build a second fake card design.

### Empty behavior

Feature-specific empties are controlled by Home:

- Discover loaded-empty → Home may pass/show a small Discover-specific message.
- Upcoming Meals no plan → Home renders MealPlanEmptyState instead of RecipeListSection.
- Favorites loaded-empty → Home renders nothing.

Do not make RecipeListSection know these business rules.

## Home Feature Structure

Recommended conceptual placement:

```text
src/app/features/home/
├── home.page.ts
├── home.page.html
├── home.page.scss
├── home.routes.ts                 # only if current routing convention uses feature route files
├── components/
│   └── meal-plan-empty-state/
│       ├── meal-plan-empty-state.component.ts
│       ├── meal-plan-empty-state.component.html
│       └── meal-plan-empty-state.component.scss
└── state/
    ├── home.store.ts
    └── home.facade.ts
```

Do not create a Home-specific recipe-card component.

The final bottom Explore CTA can remain in `home.page.html` unless a real reusable abstraction already exists.

## Home State Ownership

Home owns **query/composition state only**.

It may keep:

```ts
discoverItems: RecipeCardDto[]
discoverRequestState
favoriteItems: RecipeCardDto[]
favoriteRequestState
```

It must not own:

- RecipePreviewDto cache;
- full recipe details;
- recipe instructions;
- favorite persistence/source of truth;
- `/recipes` discovery cursor state;
- recommendation score/history;
- Meal Plan entities.

### Suggested signal state

Follow current E-019 helpers/naming. Conceptually:

```ts
interface HomeSectionState {
  readonly items: readonly RecipeCardDto[];
  readonly status: 'idle' | 'loading' | 'loaded' | 'error';
  readonly error: string | null;
}

interface HomeState {
  readonly discover: HomeSectionState;
  readonly favorites: HomeSectionState;
}
```

Computed signals may expose:

```text
discoverRecipes
favoriteRecipes
isDiscoverLoading
discoverError
isFavoritesLoading
favoritesError
hasFavorites
```

Do not add `nextCursor`/`hasMore` to Home merely because F-008 returns them.

## HomeFacade

`HomeFacade` coordinates Home queries and route-level state, not shared Recipe Experience UI.

Responsibilities:

- initialize Home data if not already valid;
- load/retry Discover independently;
- load/retry Favorites independently when dependency exists;
- preserve Discover result during current authenticated SPA session;
- react to the established identity reset path;
- integrate with shared favorite synchronization so Home preview remains correct;
- expose query state to HomePage.

It should use the shared `RecipesApi`/data-access layer for bounded query calls rather than creating `HomeRecipeApi` for F-008 endpoints.

HomePage should not call HttpClient directly.

## Discover Query Flow

```text
HomePage
  ↓ initialize
HomeFacade
  ↓ if discover not already loaded
RecipesApi.discover({ limit: 5 })
  ↓
RecipeDiscoveryPageDto
  ↓ items only
HomeStore.discover
  ↓
RecipeListSection
  ↓
RecipeCard
```

Do not use the `/recipes` feature's active RecipeDiscoveryStore if it would overwrite its criteria/cards/cursor.

Home and Recipes are separate query contexts even though they call the same endpoint.

## Favorites Query Flow

When Recipe Favorites dependency exists:

```text
HomeFacade
  ↓
RecipesApi.getFavorites(4)   // name follows final data-access convention
  ↓
RecipeCardDto[]
  ↓
HomeStore.favorites
```

Loaded empty means `hasFavorites=false` and no section is rendered.

### Favorite mutation synchronization

Normal card heart interaction remains:

```text
RecipeCard
  ↓
RecipeExperienceFacade
  ↓
shared recipe/favorite data-access mutation
```

Home must not add `(favoriteToggled)` handlers that reimplement mutation HTTP if the new Recipe Experience architecture intentionally encapsulates the interaction.

Home may observe the existing shared mutation/update signal to keep its query list synchronized.

Required outcomes:

- displayed favorite unsaved → remove/update from preview;
- last favorite removed → section disappears;
- newly saved Discover card → Favorites preview may appear/update in newest-first order, max 4, if the shared mutation mechanism exposes enough information;
- mutation failure → shared optimistic rollback remains authoritative.

If the current F-008 implementation already provides a recipe-card patch event/store synchronization abstraction, reuse it. Do not invent another event bus without inspecting the code.

## Account Display Name

Read the current user's display name from the existing authenticated account/session/profile state.

Do not issue a Home-specific profile request if the value already exists in the established account state.

If the application currently exposes username rather than a separate display-name field, use the available canonical user-facing name rather than introducing a new schema field in F-006.

## Home Search Routing

Home consumes `RecipeSearchBarComponent`:

```html
<app-recipe-search-bar
  (searchSubmitted)="onSearchSubmitted($event)"
/>
```

Conceptually:

```ts
onSearchSubmitted(query: string): void {
  if (!query) return;

  void this.router.navigate(['/recipes'], {
    queryParams: { search: query }
  });
}
```

Use Angular Router query-param encoding. Do not manually concatenate unsafe URL strings.

## View-All Routing

Home owns the destination decisions:

```text
Discover          → /recipes
Upcoming Meals    → /meal-plan (when available)
Favorites         → /favorites (when available)
Explore CTA       → /recipes
```

The shared RecipeListSection emits an action. It does not know route names.

### Disabled future actions

Before a route exists:

- keep the layout/action visible if required by the visual design;
- render true disabled semantics;
- do not call `router.navigate`;
- do not intentionally route to a wildcard/404.

Codex should prefer an explicit feature-availability constant/state that can be removed when dependency lands rather than checking route strings dynamically in presentation code, unless the project already has a feature-availability mechanism.

## Meal Plan Empty State

Current implementation, while Manual Meal Planning is absent:

```text
Plan your meals for the week
Create a meal plan based on your preferences and schedule.
Start Meal Planning
```

Reference: `assets/home-reference-meal-plan-empty-state.png`.

Keep this component Home-specific because it is domain onboarding, not generic recipe-section empty UI.

When Meal Planning later exists, Home composition becomes:

```html
@if (hasUpcomingMeals()) {
  <app-recipe-list-section
    title="Upcoming Meals"
    [recipes]="upcomingRecipeCards()"
    ...
  />
} @else {
  <app-meal-plan-empty-state ... />
}
```

F-006 does not implement Meal Plan state/query internals before that feature exists.

## Final Explore CTA

Reference: `assets/home-reference-explore-all-recipes.png`.

Implementation requirements:

- keep the copy `Looking for something else?`;
- action `Explore All Recipes` with forward-arrow treatment consistent with current icon/button system;
- route `/recipes`;
- responsive full-width block;
- reuse shared secondary/outline button treatment if that matches current Appetee styles;
- no new global component unless reused elsewhere.

## Visual Style Rules

Before adding new SCSS:

1. inspect existing CSS variables/theme tokens;
2. inspect `_button.scss`;
3. inspect `_text.scss`;
4. inspect `_theme.scss`;
5. inspect current private-page container spacing;
6. inspect current Recipe Card dimensions/breakpoints;
7. inspect current Recipes search SCSS and extract rather than copy.

Prohibited:

- duplicate hard-coded Appetee orange values;
- Tailwind utilities copied from Builder;
- copied shadcn component architecture;
- Home-specific typography scale if shared text classes fit;
- a second Recipe Card layout;
- a second search bar that merely looks similar.

## Responsive Rules

### Search

Use the exact responsive behavior established by the extracted Recipes search bar.

### RecipeListSection

Desktop:

- title/action on one row;
- cards horizontal;
- normal page width/padding;
- overflow contained in row.

Mobile:

- preserve readable title/action;
- horizontal touch scroll;
- no Home-specific card shrink;
- no page-level overflow.

### CTAs

If horizontal copy + action no longer fits, stack cleanly while preserving hierarchy and button reachability.

## Request State and Error Handling

Do not use one `isLoading` boolean for all Home data.

Discover and Favorites require independent states.

One endpoint failure must leave:

- search usable;
- other successful sections visible;
- Explore All Recipes usable;
- retry local to failed section.

Use current shared request-state helpers if E-019 provides them.

## Session Lifecycle

Home state is account-scoped and may live long enough to survive route navigation.

Reset on:

- logout;
- identity/account change;
- established global session reset.

Do not clear Discover just because HomePage component is destroyed if the intended store scope survives route navigation.

Do not create localStorage/sessionStorage persistence for Home Discover merely to keep five cards stable. In-memory authenticated-session state is sufficient.

## Testing Focus

### Shared search

- Enter and button submit;
- trim;
- initial/current value;
- no Router/HTTP dependency inside component;
- Recipes regression after extraction;
- Home routing from emitted query.

### Shared recipe section

- title/action;
- disabled action;
- RecipeCard rendering;
- loading state;
- horizontal layout at multiple widths;
- no Quick Preview ownership.

### Home

- display name;
- Discover request/response;
- session reuse;
- Favorites conditional render;
- independent failures;
- route destinations;
- disabled dependency actions;
- shared Card → Quick Preview behavior;
- favorite mutation synchronization;
- logout/identity reset;
- mobile/desktop accessibility.

## Explicit Non-Goals

Do not implement in F-006 frontend:

- recommendation scoring;
- recommendation refresh button;
- advanced recipe filters;
- recipe search backend logic;
- Favorites full-page grid;
- Meal Plan page;
- Cooking Mode page;
- Home-specific Preview modal;
- duplicate Recipe Card;
- duplicate favorite mutation HTTP;
- pantry-owned-ingredient Home controls;
- old `All Recipes / Saved` Home view filters;
- old `Prep Meal / Day Meal` Home filters.

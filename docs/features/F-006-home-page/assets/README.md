# F-006 visual assets

These files are implementation references for Codex. They define layout direction, not independent architecture or a new style system.

## `home-reference-recipe-list-section.png`

Use for the shared `RecipeListSectionComponent` layout:

- section title at the left;
- `View all` at the right;
- recipe row directly below;
- general whitespace/section hierarchy.

**Important:** the Recipe Card rendered in this screenshot is an older reference. Do not copy its internal card design, image overlay, badge layout, metadata, or dimensions if they conflict with the current F-008 shared `RecipeCardComponent`. The current shared Recipe Card is canonical.

The same RecipeListSection component is used on Home for:

```text
Discover
Upcoming Meals (when populated)
Your Favorite Recipes (when populated)
```

## `home-reference-meal-plan-empty-state.png`

Use for the Home no-plan CTA:

```text
Plan your meals for the week
Create a meal plan based on your preferences and schedule.
Start Meal Planning
```

Match the hierarchy, broad spacing, bordered/soft container direction, and right-side action placement on desktop. Use Appetee theme variables and shared button/text classes. Do not copy literal pixel colors from the screenshot.

This is a Home-specific state, not a mode inside RecipeListSection.

## `home-reference-explore-all-recipes.png`

Use for the final Home CTA:

```text
Looking for something else?
Explore All Recipes →
```

It remains at the bottom of Home and routes to `/recipes`.

Use shared Appetee styles/tokens. It does not need a global shared component unless another real consumer exists.

## `home-routing.svg`

Canonical navigation map for F-006, serving the same documentation role as F-001's `assets/landing-routing.svg`.

When implementation routes change because a dependency is completed, keep this asset and the feature README synchronized.

# F-006 — Home Page — Frontend

## Canonical Contract

The feature `README.md` owns data models, database impact, endpoint contracts, and error behavior.

## Responsibilities

- Render the authenticated Home composition.
- Read the current display name from account/session domain state.
- Navigate search submissions to `/recipes?search=...`.
- Coordinate favorite/upcoming preview loading before the first recommendation request.
- Cache the recommendation set for the current authenticated browser session.
- Reuse valid favorite/upcoming preview state.
- React to shared-domain invalidation/mutation events rather than blindly reloading all sections.
- Render independent loading, empty, error, and retry states.
- Use F-007 recipe cards/Quick Preview; do not fork card behavior.

## State Ownership

Home composition state is account-scoped shared state because it must survive normal route navigation during the current session.

It is cleared on logout/identity change.

Full recipe details do not belong in Home state.

Favorite membership belongs to the Recipe Favorites domain.

Meal-plan entities belong to Manual Meal Planning.

## First Load

```text
render shell
  ├─ load favorites preview
  └─ load upcoming preview
          ↓
collect visible recipe IDs from successful preview results
          ↓
load recommendations once
          ↓
cache recommendation result for session
```

## Return to Home

- Recommendations: reuse.
- Favorites: reuse unless shared Favorites state reports a missing preview position requiring refill.
- Upcoming meals: reuse while not stale and still temporally valid.
- Do not add one `ngOnInit` function that always reloads every endpoint.

## E-019 Dependency

Do not implement F-006 by expanding the current one-loading-state `RecipesFacade`.

E-019 must establish:

- lazy full-recipe entity cache;
- lightweight query/list state;
- account-scoped reset rules;
- route/feature-scoped temporary state;
- independent request state.

## Tests

- Search navigation.
- Initial preview/recommendation loading order.
- Recommendation session reuse.
- Preference-change invalidation.
- Favorite add/remove/refill behavior.
- Meal-plan stale invalidation/refetch.
- Independent section failures.
- Logout cleanup.
- responsive/swipe behavior.

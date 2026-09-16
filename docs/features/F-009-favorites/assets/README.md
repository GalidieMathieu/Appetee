# F-009 Favorites assets

## `favorites-routing.svg`

Canonical routing/reference diagram for the initial Favorites feature.

It documents:

- F-006 Home `View all` → `/favorites`;
- `/favorites` under the authenticated private layout;
- Recipe Card → shared F-008 Quick Preview/Recipe Experience;
- Favorites empty state → `/recipes`;
- `GET /api/recipes/favorites` and the Home `?limit=4` consumer.

Keep this diagram aligned with the approved routing contract in `../README.md`.

## `home-favorites-section-reference.png`

User-provided reference for the **Home Favorites section layout only**:

- section title on the left;
- `View all` action on the right;
- Recipe Cards beneath it.

The screenshot predates/falls outside parts of the final F-008 Recipe Card contract. Do not copy obsolete card internals, image overlays, badges, or implementation details from the screenshot when they conflict with F-008.

For the full `/favorites` page, use the current `/recipes` full-page Recipe Card grid as the canonical layout reference.

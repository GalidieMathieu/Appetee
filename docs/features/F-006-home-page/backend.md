# F-006 — Home Page — Backend

## Canonical Contract

The feature `README.md` owns the shared endpoint, data, database, and error contracts.

## Responsibilities

F-006 backend work owns only the random compatible recommendation query/endpoint.

Favorite preview is implemented by Recipe Favorites.

Upcoming meals are implemented by Manual Meal Planning.

## Recommended Query

The recommendation query must:

1. derive the current user ID from authenticated server identity;
2. exclude recipes that fail any selected diet requirement;
3. exclude recipes containing any avoided ingredient;
4. exclude the small recipe-ID list provided for Home de-duplication;
5. select a random bounded result;
6. return the lightweight card projection only.

For the current small personal-project catalogue, bounded random ordering is acceptable. If catalogue size later makes random sorting expensive, optimize behind the same endpoint contract.

## Database

The current schema already has useful keys for compatibility checks:

- `user_diets (user_id, diet_id)` primary key;
- `diet_recipes (recipe_id, diet_id)` primary key and diet reverse index;
- `user_ingredient_restrictions (user_id, ingredient_id)` primary key;
- `recipe_ingredients (recipe_id, ingredient_id)` primary key and ingredient reverse index.

Do not create a recommendation-history table for v1.

Do not add speculative indexes without an `EXPLAIN`-validated access pattern under E-008/E-014.

## Tests

- user with no diets/restrictions;
- multiple required diets;
- one avoided ingredient;
- multiple avoided ingredients;
- exclusion-ID list;
- fewer compatible recipes than requested;
- empty result;
- limit bounds;
- unauthorized request;
- no duplicate recipe IDs in response.

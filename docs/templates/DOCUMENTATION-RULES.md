# Appetee Documentation Rules

## Objective

Keep Appetee documentation useful, current, nonrepetitive, and precise enough that a developer or coding agent can implement a feature without inventing architecture or contracts.

Every important decision has one canonical owner.

## Canonical locations

| Information | Canonical location |
|---|---|
| Feature purpose, scope, flows, behavior and acceptance | Feature `README.md` |
| Shared feature data models and API contract | Feature `README.md` |
| Feature database impact, schema/index requirements and migration intent | Feature `README.md` |
| Frontend implementation, state ownership, routing, components and UI behavior | Feature `frontend.md` |
| Backend implementation, controller/use-case/repository/SQL details | Feature `backend.md` |
| Cross-cutting engineering architecture/change | Engineering initiative |
| Implemented API machine contract | Versioned/generated OpenAPI |
| Permanent engineering/security rules | Engineering standards |
| Expensive-to-reverse architecture decision | ADR |
| Historical audit evidence | Source/traceability documentation |
| Project implementation order | `docs/ROADMAP.md` |

## Feature README is the shared contract

The feature README is the document that frontend and backend developers read together.

It must answer, when applicable:

```text
What does the user experience?
What data is required?
Where does the data come from?
Does the database change?
Which existing tables are used?
Are new tables or columns required?
Are indexes required?
Is a migration required?
Which endpoint is called?
What does the request contain?
What does the response contain?
What are the relevant error outcomes?
How is the data cached or invalidated?
Which other feature owns shared behavior?
```

Do not hide these decisions only inside `frontend.md` or `backend.md`.

## API documentation rule

Before implementation, the feature README defines the approved product/application contract.

The README should define enough of the request and response to prevent frontend/backend ambiguity.

Do not reproduce every OpenAPI-generated schema detail when it adds no value.

After implementation, OpenAPI is the mechanically validated HTTP contract.

The approved feature specification and OpenAPI must remain aligned.

Contract drift must be fixed deliberately rather than tolerated.

## Database documentation rule

Database impact belongs in the feature README because schema and index decisions affect the whole application.

Use:

```md
## Database Impact

### Existing tables used

### Schema changes

### Index changes

### Data migration
```

`backend.md` may contain implementation-level SQL and repository details, but it must implement the database contract defined by the feature README.

### Index rules

Do not add indexes speculatively.

For every proposed index, document the access pattern it supports.

The final implementation must validate important indexes with `EXPLAIN` where appropriate.

All production schema changes use E-008 versioned migrations.

## Data-model rule

Different data purposes should not automatically reuse one model.

Distinguish where useful:

```text
Wire DTO
Complete domain/entity data
Lightweight list/card data
View model
Temporary form/draft model
```

Example:

```text
RecipeCardDto
RecipeDetailDto
RecipeCardViewModel
RecipeCreateDraft
```

Do not send complete recipe instructions and ingredient details merely because a recipe card needs a name and image.

## Frontend data ownership

Every meaningful frontend state object must have an explicit owner and lifetime.

### Application/session state

Examples:

- authentication;
- current user.

### Complete entity cache

Fully loaded entities that several features may reuse.

Example:

```text
RecipeDetailDto keyed by recipe ID
```

The cache contains only details actually fetched.

### Query/list state

Results of a specific query or list:

- search results;
- recommendations;
- favorites pages;
- cursor state;
- filtering results.

These are not automatically the canonical complete entity cache.

### Temporary feature/flow state

Examples:

- signup wizard draft;
- recipe-search filters;
- meal-plan creation options;
- unsaved recipe creation;
- multi-step forms.

Temporary state lives with the owning feature/flow.

It should be destroyed when the owning flow is left unless the feature explicitly requires persistence.

### Component-local state

Simple UI state that is not shared should remain in the component.

Do not create a store for every textbox, dialog Boolean, or local UI value.

## Frontend folder ownership

Preferred conceptual separation:

```text
core/
    application-wide services
    session/auth
    reusable server-backed domain data access

shared/
    reusable UI
    pure helpers
    no feature ownership

features/
    routed features
    temporary feature state
    feature-specific query/filter state
```

## Shared component ownership

A significant shared user capability should have one feature owner.

Example:

```text
Recipe Card and Quick Preview
```

Home, Favorites, Recipe Search and Meal Planning may consume that feature.

They should not each redefine card behavior, favorite interaction, preview behavior, or detail-loading rules.

Likewise, an endpoint should have one product-domain owner even if several features consume it.

## Cache and invalidation rule

When feature documentation introduces cached data, it must specify:

```text
When is it first loaded?
How long is it valid?
What mutation changes it?
What invalidates it?
What happens on logout?
What happens on browser refresh?
Does returning to the route refetch?
```

Do not use a vague `loaded` Boolean when several independent entities or queries can load concurrently.

## Authentication and identity

Frontend route guards and hidden controls are user-experience tools, not authorization boundaries.

The backend must derive authenticated identity from the trusted session/claims rather than accepting a user ID from the browser when the operation is for the current user.

All account-scoped frontend caches must be cleared when identity changes or the authenticated session is terminated.

## Product versus engineering work

A user-visible behavior belongs in a product feature.

A codebase/security/architecture defect belongs in an engineering initiative.

A feature may depend on an engineering initiative.

Do not create fake user-facing phases solely to hide technical remediation work.

## Feature changes

If additional behavior belongs naturally to an existing feature, update that feature.

Create a separate feature when the capability:

- has its own substantial user flow;
- is reused by multiple parts of the product;
- has a distinct lifecycle/domain;
- would make the original feature unreasonably large.

## Phase sizing

Implementation phases should be suitable for one coherent development/Codex task.

A phase should normally have a clear goal, scoped changes, validation/tests, and completion criterion.

## Status integrity

Documentation work does not count as application implementation.

`Completed` means the code/configuration/data/deployment behavior exists and its required validation has passed.

## Source-of-truth inspection

When documenting existing behavior:

1. inspect the current default frontend branch;
2. inspect the current default backend branch;
3. inspect the active schema/migration state;
4. distinguish implemented behavior from planned behavior.

A coding defect discovered during inspection belongs in its engineering initiative unless it directly changes the product requirement.

Product specifications describe intended behavior, not accidental implementation bugs.

## Assets

Use `assets/` only when they add value.

Prefer Mermaid in Markdown for maintainable diagrams.

Do not use `.dot` files as normal documentation artifacts.

## ADR threshold

Create an ADR only when a decision:

- has meaningful alternatives;
- affects multiple modules or long-term architecture;
- is expensive to reverse;
- needs its rationale preserved independently.

Ordinary product and implementation decisions remain in the relevant feature or engineering initiative.

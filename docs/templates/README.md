# Appetee Documentation Templates

This directory contains the canonical templates used when creating new Appetee product features and engineering initiatives.

Templates define documentation structure only. They do not determine roadmap priority or imply that implementation has started.

## Structure

```text
templates/
├── README.md
├── DOCUMENTATION-RULES.md
│
├── feature/
│   ├── README.template.md
│   ├── frontend.template.md
│   └── backend.template.md
│
└── engineering/
    ├── README.template.md
    ├── frontend.template.md
    ├── backend.template.md
    └── infrastructure.template.md
```

## Product feature structure

Every product feature uses a folder:

```text
docs/features/
└── F-XXX-feature-name/
    ├── README.md
    ├── frontend.md   # only when frontend implementation detail is useful
    ├── backend.md    # only when backend implementation detail is useful
    └── assets/       # only when useful
```

The feature `README.md` is mandatory.

`frontend.md`, `backend.md`, and `assets/` are created only when they add useful information.

Do not create empty documents merely to satisfy the folder structure.

## Engineering initiative structure

Every engineering initiative uses a folder:

```text
docs/engineering/initiatives/
└── E-XXX-initiative-name/
    ├── README.md
    ├── frontend.md        # when substantial
    ├── backend.md         # when substantial
    └── infrastructure.md  # when substantial
```

The initiative `README.md` is the canonical implementation plan.

## Canonical ownership rule

For product features, `README.md` owns the contract shared between product, frontend, backend, and database work.

When applicable, it must define:

```text
Data Requirements
Database Impact
    Existing tables used
    Schema changes
    Index changes
    Data migration
API Endpoints
Request Contracts
Response Contracts
Error Behavior
```

The frontend and backend documents must not redefine incompatible versions of these contracts. They describe how their side implements the approved contract.

## Frontend state rule

Every feature that introduces frontend state must identify its ownership and lifetime.

State belongs to one of these categories:

```text
Application/session state
Complete entity cache
Query/list state
Temporary feature/flow state
Component-local state
```

Temporary page or workflow state belongs under the owning feature and should not automatically become a root singleton.

Examples:

```text
features/auth/sign-up/state/
features/recipes/state/
features/meal-plan/create/state/
features/admin-recipes/create/state/
```

See E-019 — Frontend Data-Access Architecture for the complete rules.

## Database rule

Every feature that changes database access must evaluate:

- existing tables;
- required new tables or columns;
- existing indexes;
- proposed indexes;
- query access patterns;
- migrations;
- deletion/cascade behavior;
- concurrency implications when applicable.

Do not add speculative indexes simply because a column may be queried.

Indexes should correspond to a defined access pattern and should be validated with `EXPLAIN` when implemented.

Schema changes must use the migration process defined by E-008.

## API rule

Feature documentation defines the intended API contract sufficiently for frontend and backend implementation to agree before coding.

The feature README should include:

- method;
- route;
- purpose;
- ownership;
- authorization expectation;
- important query parameters;
- essential request fields;
- essential response fields;
- pagination/cursor behavior;
- important error semantics.

OpenAPI becomes the mechanically validated implementation contract after the endpoint exists.

If implemented OpenAPI and an approved feature specification disagree, one of them must be deliberately updated. Do not silently allow them to drift.

## Delivery phase rule

A phase should be one coherent implementation unit that can reasonably be given to Codex or another developer.

Avoid one giant phase covering an entire large feature or tiny phases for individual files/trivial functions.

Only these phase statuses are used:

```text
Not started
In progress
Completed
```

## Document status

Product feature document lifecycle:

```text
Draft
Active
Deprecated
```

Product feature implementation status:

```text
Not started
Planned
In progress
Partially implemented
Implemented
Blocked
Possible future
```

Engineering initiatives use:

```text
Ready for implementation
In progress
Blocked
Completed
```

Documentation creation alone never counts as implementation.

## Feature versions

```text
0.1          incomplete draft
0.2, 0.3     meaningful draft revisions
1.0          approved stable specification
1.1+         meaningful approved changes
2.0          major redesign
```

Implementation progress by itself does not change the specification version.

## Owner

Unless intentionally reassigned:

```text
Mathieu Galidie
```

## Diagrams and assets

Prefer Mermaid directly inside Markdown for architecture and flow diagrams.

Use `assets/` for screenshots, design references, externally useful SVG diagrams, and UI comparisons.

Do not store Graphviz `.dot` source files merely for documentation rendering.

## Roadmap separation

Feature documents explain what a feature is and how it should behave.

Engineering initiatives explain technical work.

Priority and overall implementation ordering belong in:

```text
docs/ROADMAP.md
```

Do not duplicate the complete roadmap inside individual feature documents.

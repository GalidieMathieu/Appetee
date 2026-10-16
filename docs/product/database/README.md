# Appetee Database Documentation

This folder contains documentation for the **overall Appetee database**, not for one individual feature.

## Purpose

The ERD in this folder is the high-level reference for how Appetee's database entities relate to each other.

It should include both:
- existing/core Appetee tables
- new tables added by features such as Meal Planner

Feature-specific diagrams can be created separately when a feature needs a more focused view.

## Files

- `Appetee_Database_ERD.md`
  - Mermaid source for the overall Appetee database relationship diagram.
  - Includes the principal tables and relationships relevant to the current schema design.

- `appetee_database_erd.png`
  - Static image version of the overall ERD.

- `appetee_database_erd.svg`
  - Vector version of the ERD for zooming and documentation.

- `appetee_database_erd.dot`
  - Graphviz source used to generate the visual ERD.

## Documentation convention

Use this folder for the global database view:

```text
product/
└── database/
    ├── README.md
    ├── Appetee_Database_ERD.md
    ├── appetee_database_erd.png
    ├── appetee_database_erd.svg
    └── appetee_database_erd.dot
```

Feature-specific database documentation should remain separate.

Example:

```text
product/
├── database/
│   └── ... overall database documentation
│
└── meal-planner/
    ├── README.md
    ├── spec.md
    └── database/
        └── Meal_Planner_ERD.md
```

The global ERD answers:

> How is the Appetee database structured overall?

A future Meal Planner-specific ERD answers:

> How does the Meal Planner portion work in detail?

## Important note

The existing Appetee tables shown in this ERD are still a high-level representation.

Before generating final SQL migrations, compare the diagram against the actual current database/backend schema and preserve the real:
- table names
- column names
- primary-key types
- foreign keys
- indexes
- existing constraints

The Meal Planner-specific schema can then be documented in a separate feature ERD without turning this global diagram into a feature specification.

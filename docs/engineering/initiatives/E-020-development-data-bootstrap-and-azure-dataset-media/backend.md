# E-020 — Backend Implementation

## Canonical Plan

The canonical initiative is [`README.md`](./README.md).

This document removes implementation ambiguity for the backend/data-tooling portion of E-020.

Codex should implement the architecture described here rather than redesigning it.

## Implementation Status

All four phases are implemented and verified. Phases 1 and 2 were accepted on 2026-08-20; live Azure synchronization and the complete end-to-end runbook were accepted on 2026-08-21.

---

## Current Backend Architecture

Relevant current responsibilities:

```text
Appetee.Api
├── loads ConnectionStrings:AppeteeDb
├── loads AzureStorage:AccountUrl / ContainerName
├── constructs DefaultAzureCredential
└── registers Blob Storage services

Appetee.Infrastructure
├── Dapper/MySqlConnector database access
├── recipe/ingredient SQL
└── BlobStorageService
    ├── upload runtime images
    └── resolve Blob name -> URI

data/
├── canonical ingredient JSON
├── canonical recipe JSON
├── local AVIF assets
├── generated SQL
└── Node tooling
    ├── shared deterministic Blob names and layered configuration
    ├── validation and SQL generation
    ├── guarded local MySQL reset and read-only verification
    └── image processing
```

E-020 keeps application runtime and dataset deployment separate. Both branches shown below are implemented; private-media delivery beyond deterministic URL resolution remains owned by E-006.

---

## Target Backend Architecture

```text
                         CANONICAL DATASET
                    ingredient.json / recipe.json
                              + assets
                                  |
                  +---------------+----------------+
                  |                                |
                  v                                v
       deterministic blob names            SQL generation
       shared/blob-names.mjs                     |
                  |                                |
                  v                                v
      Azure dataset sync                 generated/sql/01..04
                                                   |
                                                   v
                                         db:reset:local
                                                   |
                                                   v
                                              local MySQL

Runtime API
    |
    +-- recipe list SQL -> COALESCE(card_blob, main_blob)
    |
    +-- recipe detail SQL -> main_blob
    |
    +-- BlobStorageService.GetUri(blobName)
```

Dataset tooling never calls API endpoints to seed the database or upload the dataset.

---

## Module Ownership

### `data/tools/shared/tool-config.mjs`

Owns only:

- repository/appsettings path resolution;
- BOM-safe JSON parsing;
- environment override lookup;
- normalized DB/Azure config;
- non-secret display labels.

It must not:

- connect to MySQL;
- connect to Azure;
- mutate config files;
- log secrets.

Suggested exports:

```js
loadToolConfig()
loadDatabaseConfig()
loadAzureStorageConfig()
redactDatabaseTarget()
```

Use actual project style, but keep the responsibility this narrow.

### `data/tools/shared/blob-names.mjs`

Single source of truth for deterministic dataset Blob names.

Suggested exports:

```js
getIngredientImageBlobName(seedId)
getRecipeMainImageBlobName(seedId)
getRecipeCardImageBlobName(seedId)
```

Exact return formats:

```text
dataset/ingredients/{seedId}/image.avif
dataset/recipes/{seedId}/main.avif
dataset/recipes/{seedId}/card.avif
```

Validate the seed identity rather than accepting arbitrary path components.

Do not URL-encode or lowercase the seed ID.

### `data/tools/shared/dataset-assets.mjs`

Owns:

- discovering canonical record directories;
- reading image fields from JSON;
- resolving local asset paths;
- containment checks;
- building expected Azure asset inventory;
- reading `productionApproved`;
- computing or attaching expected Blob names;
- asset type classification.

Suggested normalized asset object:

```js
{
  seedId: "REC-0001",
  entityType: "recipe",
  assetType: "recipe-main",
  recordPath: ".../recipe.json",
  localPath: ".../assets/main.avif",
  blobName: "dataset/recipes/REC-0001/main.avif",
  productionApproved: false
}
```

Do not put Azure SDK objects in this module.

### `data/tools/database/mysql-local.mjs`

Owns:

- parsing the Appetee MySQL connection string;
- local-target safety validation;
- creation of MySQL connections;
- executing trusted SQL files;
- query helpers for verification.

It must not know Azure.

### `data/tools/database/reset-local.mjs`

CLI orchestration only.

Owns the ordered reset stages.

Keep business logic in reusable modules so tests do not need to spawn the CLI for every case.

### `data/tools/database/verify-local.mjs`

Read-only CLI plus reusable verification function.

No DDL/DML.

### `data/tools/deployment/azure-blobs.mjs`

Owns Azure SDK interaction:

- credential/client construction;
- container existence/access inspection;
- prefix listing;
- upload/overwrite;
- property normalization;
- bounded worker pool if not placed in a tiny shared helper.

It must not parse recipe JSON directly.

### `data/tools/deployment/sync-azure-images.mjs`

CLI orchestration:

- config;
- local inventory;
- Azure preflight;
- sync plan;
- dry run;
- upload;
- verification;
- exit status.

### `data/tools/deployment/verify-azure-images.mjs`

Read-only CLI plus reusable verification.

---

## API Boundary

No new API endpoint.

Explicitly forbidden:

```text
POST /api/admin/seed
POST /api/admin/reset-database
POST /api/admin/sync-images
```

The data bootstrap process is a developer tool, not remotely callable application behavior.

Existing DTO shape should remain stable.

---

## Application Boundary

No new Application-layer use case is required for data seeding.

The only runtime backend modifications are the minimum persistence changes needed to consume main/card Blob references correctly.

Do not introduce:

- `SeedDataService`;
- background seeding hosted service;
- Azure dataset deployment hosted service;
- startup initializer.

---

## Domain Rules

No recipe/ingredient domain semantics change.

Media mapping rule:

```text
ingredient
  -> one dataset image

recipe
  -> main image
  -> card image
```

Runtime-created recipe:

```text
main required/handled according to existing behavior
card may be null
```

If a runtime main image is changed:

```text
card_image_blob_name = NULL
```

Reason: the old card is semantically derived from the old main image.

E-020 does not create the replacement card.

---

## Persistence

## Recipe schema

Target:

```sql
CREATE TABLE recipes (
    ...
    image_blob_name VARCHAR(500) NULL,
    card_image_blob_name VARCHAR(500) NULL,
    ...
);
```

Use the repository's actual schema conventions.

Do not rename `image_blob_name` to `main_image_blob_name` in E-020 because that would expand migration/API/query churn without functional benefit.

### Seed insert

Generated recipe SQL must insert both values:

```text
image_blob_name
    = dataset/recipes/REC-0001/main.avif

card_image_blob_name
    = dataset/recipes/REC-0001/card.avif
```

### List/search projection

Any query whose image is rendered as a compact recipe card/list preview must project:

```sql
COALESCE(r.card_image_blob_name, r.image_blob_name) AS ImageBlobName
```

Do not put fallback logic in the frontend.

### Detail projection

Recipe detail continues:

```sql
r.image_blob_name AS ImageBlobName
```

### Runtime create

If current create command accepts one runtime recipe image:

```text
image_blob_name = uploaded runtime Blob
card_image_blob_name = NULL
```

### Runtime update

When main image is not changed:

```text
leave card_image_blob_name unchanged
```

When main image is changed:

```text
image_blob_name = new runtime Blob
card_image_blob_name = NULL
```

If the current update uses a single SQL statement with optional image fields, implement this deterministically rather than through a second race-prone update.

---

## Ingredient Persistence

Keep the existing single:

```text
ingredients.image_blob_name
```

Generated value:

```text
dataset/ingredients/{seedId}/image.avif
```

No card variant needed.

---

## Database Impact

### New column

```text
recipes.card_image_blob_name VARCHAR(500) NULL
```

### Nullability

Nullable by design because runtime/admin-created content may have only a main image until E-006 provides a derived-card workflow.

### Index

None.

### Foreign keys

None.

Blob names are external-resource references, not relational entities in E-020.

### Migration coordination

Production migration is governed by E-008.

Do not add a one-off startup `ALTER TABLE`.

Do not make `db:reset:local` detect/patch an existing production schema incrementally.

Local reset always rebuilds from the canonical generated schema.

---

## Generated SQL Contract

Exact paths:

```text
data/generated/sql/01-schema.sql
data/generated/sql/02-reference.sql
data/generated/sql/03-ingredients.sql
data/generated/sql/04-recipes.sql
```

The generator writes them.

The reset tool consumes them.

No other SQL files are automatically executed by E-020.

### Generator media mapping

Ingredient pseudo-logic:

```js
const blobName = getIngredientImageBlobName(ingredient.seedId);
```

Recipe pseudo-logic:

```js
const mainBlobName = getRecipeMainImageBlobName(recipe.seedId);
const cardBlobName = getRecipeCardImageBlobName(recipe.seedId);
```

SQL escaping uses the generator's existing safe literal escaping.

Do not derive from folder numbering.

---

## Local Database Reset Implementation

### Dependencies

Use:

```js
import mysql from "mysql2/promise";
```

### CLI flow

Pseudo-code:

```js
async function main() {
  const config = await loadDatabaseConfig();

  // Absolutely before any destructive call.
  const target = parseAndAssertSafeLocalTarget(config.connectionString);

  await runDatasetValidation();
  await runDatasetGeneration();

  const sqlFiles = await requireGeneratedSqlFiles();

  await recreateLocalDatabase(target);
  await executeSeedFiles(target, sqlFiles);

  const result = await verifyLocalDatabase(target);

  printSuccess(result);
}
```

### Safety guard

Parse semicolon-separated MySQL connection-string keys case-insensitively.

Support aliases only where the existing project actually uses them, e.g.:

```text
Server / Host
Port
Database / Initial Catalog
User ID / User
Password
```

Normalize host for comparison.

Accepted hosts only:

```text
localhost
127.0.0.1
::1
```

Accepted database only:

```text
appetee
```

Reject:

- empty host;
- empty database;
- DNS names;
- private-network IPs;
- public IPs;
- container service names such as `mysql`;
- Azure MySQL hostnames;
- `appetee-dev` or any other DB name.

No override.

### Connection without database

For recreation, create a connection object from the parsed config but omit the database option.

Do not string-replace `Database=...` using regex and hope for correctness.

### Database recreation

After guard:

```sql
DROP DATABASE IF EXISTS `appetee`;
CREATE DATABASE `appetee`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;
```

Then reconnect with database `appetee`.

### SQL execution

For each fixed file:

```text
01-schema.sql
02-reference.sql
03-ingredients.sql
04-recipes.sql
```

- read UTF-8;
- strip BOM if present;
- reject empty file;
- execute with `multipleStatements: true`;
- close connection in `finally`;
- on failure, include filename/stage but do not echo full SQL.

Multiple statements are safe here only because files are generated/tracked application artifacts.

### Validation/generation child execution

Avoid:

```js
exec("npm run validate")
```

Use Node executable and resolved module paths.

Example architecture:

```js
spawn(process.execPath, [resolvedValidateEntry], {
  stdio: "inherit"
});
```

Then generator similarly.

This avoids shell quoting and npm path differences.

If the existing validation/generation modules expose functions cleanly, direct import is acceptable; do not create circular side effects.

### Error exit

All CLI entry points:

```js
main().catch(error => {
  printSanitizedError(error);
  process.exitCode = 1;
});
```

Do not call `process.exit()` in reusable helpers.

---

## Local Database Verification

Verification is an independent read-only operation.

### Expected counts

Compute from canonical JSON inventory at runtime.

Conceptual:

```text
expected ingredients = ingredient JSON record count
expected recipes = recipe JSON record count
expected ingredient nutrition = records with nutrition row expected
expected recipe ingredients = sum(recipe.ingredients.length)
expected diet_recipes = sum(recipe.diets.length after canonical normalization)
expected recipe_badges = sum(recipe.badges.length after canonical normalization)
```

Use actual canonical field names/schema.

Do not hardcode `1170`, `103`, etc.

### Actual counts

Use SQL `COUNT(*)`.

### Relationships

Where appropriate query for orphans even if foreign keys should prevent them, because this is a seed integrity audit.

Examples:

```sql
SELECT COUNT(*)
FROM recipe_ingredients ri
LEFT JOIN recipes r ON r.id = ri.recipe_id
WHERE r.id IS NULL;
```

and equivalent checks for ingredient, diet, badge relationship sides.

### Image mapping verification

Because the application tables do not store `seedId`, use the generator's same validated canonical mapping key to associate a canonical record with the seeded row.

Do not add a DB seed ID just for verification.

For ingredient expected:

```text
dataset/ingredients/{seedId}/image.avif
```

For recipe expected:

```text
main = dataset/recipes/{seedId}/main.avif
card = dataset/recipes/{seedId}/card.avif
```

If a duplicate natural key makes mapping ambiguous, fail during canonical validation.

### Read-only guarantee

`verify-local.mjs` may execute only `SELECT`/metadata inspection.

Do not reuse a connection helper that implicitly creates the DB.

If DB is missing, verification fails with a useful message.

---

## Configuration

Canonical environment keys:

```text
ConnectionStrings__AppeteeDb
AzureStorage__AccountUrl
AzureStorage__ContainerName
```

Fallback files:

```text
src/Appetee.Api/appsettings.Development.json
src/Appetee.Api/appsettings.json
```

Precedence:

```text
environment
> Development
> base
```

For local DB tooling, use the development connection string if no env override exists.

For Azure tooling, merge each key independently; e.g. base may supply AccountUrl while development supplies ContainerName.

### Secret handling

Never log:

- password;
- full connection string;
- bearer token;
- Azure credential internals.

Safe DB display:

```text
localhost:3306/appetee
```

Safe Azure display:

```text
https://<storage-account>.blob.core.windows.net
appetee-images-dev
```

---

## Concurrency and Idempotency

### Database reset

Not designed for two concurrent reset invocations.

At startup, E-020 may optionally use a lightweight process-level lock file only if the existing tooling already has locking conventions. Do not over-engineer distributed locking.

If not implemented, document:

> Do not run two local reset commands concurrently.

Idempotency is semantic:

```text
run N times
=> same canonical local database state
```

### Azure

Blob naming + content hash yields idempotent sync.

Same local bytes and metadata:

```text
skip
```

No random names, so reruns do not create duplicates.

---

## External Resource Consistency

MySQL contains Blob names that may exist remotely independently.

E-020 deliberately avoids pretending MySQL + Azure can be one atomic transaction.

Consistency model:

```text
canonical JSON/assets
        |
        +-- SQL generator -> expected DB references
        |
        +-- Azure sync -> expected Blob objects
```

Verification commands detect divergence.

Developer can run:

```bash
npm run db:verify:local
npm run images:verify:azure
```

Do not make DB reset implicitly upload images to hide this boundary.

---

## Security Boundaries

### Local reset

Highest-risk action is database deletion.

Mitigation is strict target validation with no override.

### SQL

Only repository-owned generated SQL is executed with multiple statements.

No web/request input is accepted.

### Azure

Credentials supplied by Azure Identity.

No secrets stored in dataset JSON.

### Media

Unapproved dataset media cannot be deployed to anonymous public container.

### Runtime

E-020 does not weaken E-006 media validation or authorization.

---

## Observability

CLI output should be human-readable and concise.

Optional machine-readable report files are not required for initial implementation unless existing tooling already standardizes them.

Errors should include:

- phase;
- entity `seedId` when relevant;
- local path or Blob name when relevant;
- sanitized SDK/database error message.

Do not print stacks by default for expected validation errors.

Unexpected programmer errors may include stack in development CLI output if consistent with existing tooling.

---

## Migration Strategy

### Before implementation

Land `/data` cleanup first.

### Phase 1

Change schema/generator/query contract.

### Phase 2

Local bootstrap.

### Phase 3

Azure synchronization.

### Production schema

If E-008 migration framework is present, create migration through it.

Otherwise note pending migration and do not deploy schema-changing backend code to production until migration exists.

---

## Testing

Use Node's built-in test runner for tooling.

### `blob-names.test.mjs`

Must cover:

```text
ING-0001 -> dataset/ingredients/ING-0001/image.avif
REC-0001 -> dataset/recipes/REC-0001/main.avif
REC-0001 -> dataset/recipes/REC-0001/card.avif
```

Invalid seed ID rejected.

### `tool-config.test.mjs`

Must cover:

- env overrides development;
- development overrides base;
- BOM stripped;
- missing required value produces actionable error;
- secret not included in formatted target.

### `mysql-local.test.mjs`

Must cover all accepted/rejected hosts and exact database rule.

Separate pure function:

```js
assertSafeLocalDatabaseTarget(parsed)
```

so tests never need MySQL for safety logic.

### Generator tests

If generator has no existing test harness, add focused checks that generated SQL contains deterministic values and the card column.

### Backend persistence tests

Add/update tests for:

- list uses card;
- list fallback main;
- detail uses main;
- update main clears card.

Follow repository existing backend testing patterns.

---

## Completion Evidence

Verified on 2026-08-20 and re-accepted end to end on 2026-08-21:

```text
Tooling tests:
  command: cd data/tools && npm test
  result: 28 passed, 0 failed

Dataset validation:
  command: npm run validate
  result: 121 ingredients, 1699 recipes, 0 errors, 2791 warnings

Dataset generation:
  command: npm run build
  result: generated schema, SQL, indexes, and distributions for 1699 recipes

Local reset from missing DB:
  command: npm run db:reset:local
  result: passed; fixed SQL files 01-04 and shared verification passed

Local second reset:
  command: npm run db:reset:local
  result: passed against the populated localhost database

Local verify:
  command: npm run db:verify:local
  result: 121 ingredients, 1699 recipes, 12415 recipe ingredients, 4523 diet relationships, 5835 badge relationships; no orphans or image mismatches

Backend tests:
  command: dotnet test tests/Appetee.Api.Tests/Appetee.Api.Tests.csproj --no-restore
  result: 94 passed, 0 failed

Azure dry run:
  account/container: appeteeimages/appetee-images-dev
  access: non-anonymous/private
  result: 3519 unchanged, 0 missing, 0 changed, 0 extras, 0 mutations

Azure sync:
  result: 0 uploaded, 0 updated, 3519 unchanged, 0 failed; automatic verification passed

Azure verify:
  result: 3519/3519 verified, 0 missing, 0 mismatched, 0 extras

Immediate second sync:
  result: 0 uploaded, 0 updated, 3519 unchanged, 0 failed

Runtime URL acceptance:
  recipe list: dataset/recipes/REC-1699/card.avif
  recipe detail: dataset/recipes/REC-1699/main.avif
  ingredient detail: dataset/ingredients/ING-0001/image.avif
```

The runtime check used the normal HTTPS launch profile against the reset local database and removed its temporary local account afterward.

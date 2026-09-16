# E-020 — Development Data Bootstrap and Azure Dataset Media

## Initiative Information

| Field | Value |
|---|---|
| **Status** | Completed — 2026-08-21 |
| **Type** | Engineering / Developer Experience / Infrastructure |
| **Priority** | Medium |
| **Implementation order** | 20 — after the `/data` structure cleanup and coordinated with E-008 / E-006 |
| **Owner** | Mathieu Galidie |
| **Last updated** | 2026-08-21 |
| **Dependencies** | E-008 Database Migrations, Integrity, and Concurrency |
| **Coordination boundary** | E-006 Secure Media Workflow |
| **Related features** | Recipe Discovery/Search, Home, Favorites, Recipe Administration, Ingredient Administration |

---

## Goal

Make Appetee development data reproducible and easy to initialize without manual MySQL Workbench steps or manual Azure Portal image matching.

A developer can now run:

```bash
cd data/tools
npm install
npm run db:reset:local
```

and receive a fully recreated local `appetee` database populated from the canonical dataset.

Dataset images are deployed independently with:

```bash
npm run images:sync:azure -- --dry-run
npm run images:sync:azure
npm run images:verify:azure
```

The same deterministic naming rule must connect:

1. canonical dataset JSON;
2. local AVIF assets;
3. Azure Blob names;
4. generated seed SQL;
5. existing backend image URL resolution.

No manual image-to-row mapping is permitted.

### Delivered outcome

| Area | Implemented result |
|---|---|
| Canonical dataset | 121 ingredients and 1,699 recipes remain the source of truth, with their finalized record-local AVIF assets unchanged |
| Deterministic media | Shared functions map every `ING-####` / `REC-####` seed ID to ingredient, recipe-main, and recipe-card Blob names |
| Generated database state | Ordered schema/reference/ingredient/recipe SQL contains deterministic image mappings and the nullable recipe card-image column |
| Local bootstrap | `db:reset:local` validates, builds, safely recreates only local `appetee`, seeds it, and verifies the result |
| Local verification | `db:verify:local` performs SELECT-only count, relationship, orphan, and image-mapping checks |
| Azure deployment | Dry-run, idempotent synchronization, automatic verification, and separate read-only verification are implemented with `DefaultAzureCredential` |
| Verified Azure target | `https://appeteeimages.blob.core.windows.net/appetee-images-dev`, non-anonymous/private, with all 3,519 dataset assets verified |
| API image behavior | Recipe lists resolve card images with main fallback; recipe details resolve main images; ingredients resolve their deterministic image Blob |
| Safety | Remote DB resets, bypass arguments, path escapes, anonymous publication of unapproved media, container creation, and remote Blob deletion are rejected or excluded |
| Documentation | The data quick start, tool/database/deployment runbooks, initiative index, implementation details, and completion evidence are current |

---

## Original Problem Addressed

Before E-020, the backend had individual development-data pieces but no single safe, reproducible workflow.

The initiative addressed these problems:

- the local MySQL database must be initialized manually;
- schema/reference/ingredient/recipe SQL is generated separately and must be executed in the correct order;
- generated seed SQL still contains placeholder or fixed image Blob names instead of deterministic dataset-specific names;
- local dataset images are not synchronized to Azure Blob Storage through a repository-owned deployment command;
- recipe dataset records contain both `main.avif` and `card.avif`, but the current database model exposes only one recipe image Blob field;
- a destructive database reset must never be able to target a remote database accidentally;
- test/private dataset images must not be silently promoted into anonymously public production media;
- Azure credentials must not be embedded in source code or committed configuration;
- local database reset and Azure Blob synchronization are operationally different actions and must remain separate.

The completed workflow provides the simple developer experience while enforcing the required safety boundaries.

---

## Why This Matters

The Appetee dataset is used to build and test recipe discovery, filtering, favorites, home recommendations, nutrition, pricing, and other data-dependent behavior. Reproducible data makes those features easier to develop and debug.

This initiative also demonstrates engineering patterns that scale beyond the current project:

- deterministic seed identities;
- explicit destructive-operation guards;
- environment-aware configuration;
- idempotent object-storage synchronization;
- hash-based change detection;
- least-privilege cloud authentication;
- separation of canonical data from generated artifacts;
- read-only verification commands;
- recovery by deterministic re-execution rather than manual repair.

This is developer/test infrastructure. It is not a replacement for production migrations, runtime media processing, or application deployment.

---

## Implemented Behavior

### Canonical dataset

The backend `/data` directory owns the development dataset. Canonical ingredient and recipe JSON records contain stable `seedId` values and local image paths.

Conceptual examples:

```text
ING-0001
└── image.path = assets/image.avif
```

```text
REC-0001
├── image.mainPath = assets/main.avif
└── image.cardPath = assets/card.avif
```

JSON is the canonical source; SQL is generated output.

The `/data` cleanup prerequisite is complete. The finalized workspace now keeps only the canonical `ingredients/` and `recipes/` trees, reproducible `generated/sql/` and `generated/reports/` outputs, and maintained validation/generation/database tooling. Completed candidate plans, workflow/checkpoint state, research caches and staging images, manifests, snapshot ZIPs, and one-off acquisition/migration scripts have been retired. The cleanup did not modify the 121 ingredient records, 1,699 recipe records, or their record-local AVIF assets.

### Local database

Local development uses a connection equivalent to:

```text
Server=localhost;Port=3306;Database=appetee;User ID=root;Password=1234;
```

`db:reset:local` safely creates or recreates the guarded local `appetee` database. The generated destructive schema remains development-only and is not a production migration mechanism.

### Azure Blob Storage

The API and dataset tools reuse Azure Blob Storage configuration through:

```text
AzureStorage:AccountUrl
AzureStorage:ContainerName
```

and both use `DefaultAzureCredential`.

The backend stores Blob names in MySQL and resolves those names to a URI when building API responses.

Development appsettings select the verified `appetee-images-dev` container. Environment variables are optional higher-precedence overrides, not required for the normal workflow.

### Recipe image model

The recipe table now has distinct main and optional card fields:

```text
image_blob_name
card_image_blob_name
```

The dataset has two recipe image variants:

```text
main.avif
card.avif
```

### Dataset media approval

Dataset image provenance currently includes test/private assets that may have:

```json
"productionApproved": false
```

These assets must not be treated as approved for anonymous public redistribution merely because this initiative can upload them.

---

## Implemented Workflows

### Local database

A single explicit command:

```bash
npm run db:reset:local
```

does:

```text
load configuration
        ↓
prove target is local
        ↓
validate canonical dataset
        ↓
generate deterministic SQL
        ↓
drop/recreate local `appetee`
        ↓
execute generated SQL in fixed order
        ↓
run read-only verification
        ↓
print concise result
```

No API endpoint and no API startup hook may perform this reset.

### Azure dataset media

A separate explicit command:

```bash
npm run images:sync:azure
```

does:

```text
load Azure configuration
        ↓
authenticate with DefaultAzureCredential
        ↓
discover/validate every canonical local image
        ↓
inspect remote `dataset/` blobs
        ↓
classify missing / changed / unchanged
        ↓
upload only missing or changed blobs
        ↓
verify the final remote state
        ↓
print concise result
```

A dry run must perform all discovery/comparison work but make zero Azure mutations.

### Deterministic media naming

Exact Blob naming contract:

```text
dataset/ingredients/{seedId}/image.avif
dataset/recipes/{seedId}/main.avif
dataset/recipes/{seedId}/card.avif
```

Examples:

```text
dataset/ingredients/ING-0001/image.avif
dataset/recipes/REC-0001/main.avif
dataset/recipes/REC-0001/card.avif
```

Never derive a Blob name from:

- directory ordinal;
- MySQL auto-increment ID;
- ingredient/recipe display name;
- random GUID;
- Azure-returned URL.

### Recipe image database model

Keep the existing recipe field as the main/detail image:

```text
recipes.image_blob_name
```

Add:

```text
recipes.card_image_blob_name VARCHAR(500) NULL
```

The list/search projection must use:

```sql
COALESCE(r.card_image_blob_name, r.image_blob_name) AS ImageBlobName
```

The detail projection continues to use:

```text
r.image_blob_name
```

This preserves the existing frontend/API `ImageUrl` contract while allowing smaller card assets to reduce list-page transfer.

Runtime/admin-created recipes are allowed to have `card_image_blob_name = NULL`.

If a runtime/admin update replaces the main image, clear `card_image_blob_name` to `NULL` so an old derived card cannot remain associated with a new main image.

Runtime card generation belongs to E-006, not E-020.

---

## Architecture Decisions

### AD-01 — Development reset is explicit, never automatic

`npm run db:reset:local` is the only destructive development-data bootstrap command introduced by this initiative.

Do not trigger reset from:

- `dotnet run`;
- API startup;
- migrations at application startup;
- ordinary `npm run build`;
- Azure image synchronization;
- an HTTP endpoint.

Reason: a destructive command must communicate destructive intent clearly.

---

### AD-02 — The reset command has a hard local-only guard with no bypass

Before any destructive SQL, parse the configured MySQL connection string and require:

```text
host ∈ { localhost, 127.0.0.1, ::1 }
database == appetee
```

If either condition fails:

```text
exit non-zero
perform zero destructive SQL
```

Do not implement:

```text
--force
--allow-remote
ALLOW_DB_RESET=true
```

or any equivalent bypass.

If a future use case needs a disposable remote integration database, design a separate command and separate initiative.

---

### AD-03 — Validation/generation happen before database destruction

The reset pipeline must run the existing canonical validation and SQL generator **before** connecting destructively to MySQL.

If either fails, the current local database remains untouched.

Invoke repository Node modules/scripts through Node using `process.execPath` / `child_process`, not shell-dependent command strings.

The command must work from any current working directory by resolving paths relative to `import.meta.url`.

---

### AD-04 — Generated SQL has a fixed ordered contract

After the `/data` cleanup initiative, E-020 assumes generated SQL lives at:

```text
data/generated/sql/
├── 01-schema.sql
├── 02-reference.sql
├── 03-ingredients.sql
└── 04-recipes.sql
```

`db:reset:local` must require all four files and execute them exactly in numeric order.

Do not discover arbitrary `.sql` files and sort them dynamically.

The fixed list is part of the bootstrap contract.

---

### AD-05 — Database creation is owned by the reset tool

The reset tool first connects to MySQL **without selecting a database**.

After the local-only guard passes, execute:

```sql
DROP DATABASE IF EXISTS `appetee`;

CREATE DATABASE `appetee`
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_0900_ai_ci;
```

Then connect/select `appetee` and execute the four trusted generated SQL files.

`multipleStatements: true` is permitted only for these repository-owned generated SQL files.

Never use untrusted/request/user input as SQL script text.

---

### AD-06 — Use `mysql2/promise` for Node database tooling

Add `mysql2` to `data/tools`.

Do not shell out to the `mysql` executable.

Reasons:

- one cross-platform Node workflow;
- structured connection-string handling;
- no dependency on a separately installed CLI binary;
- controlled errors and verification;
- easier automated tests.

---

### AD-07 — MySQL reset is rerunnable recovery, not transactional rollback

MySQL DDL/database recreation is not treated as one fully rollbackable transaction.

If execution fails after `DROP DATABASE`, the command must:

- stop;
- print the stage/file that failed;
- return non-zero;
- instruct the developer to correct the cause and rerun `npm run db:reset:local`.

Do not attempt fragile compensating DDL.

The deterministic reset command is the recovery mechanism.

---

### AD-08 — Database verification is read-only and reusable

Implement a separate:

```bash
npm run db:verify:local
```

The reset command must invoke the same verification implementation after seeding.

Verification must at minimum check:

- expected ingredient count from canonical JSON;
- expected recipe count from canonical JSON;
- expected ingredient nutrition rows;
- expected recipe ingredient relationship count;
- expected diet-recipe relationship count;
- expected recipe-badge relationship count;
- no orphan foreign-key relationships;
- every seeded ingredient image Blob name matches the deterministic contract;
- every seeded recipe main image Blob name matches the deterministic contract;
- every seeded recipe card image Blob name is present and matches the deterministic contract;
- legacy placeholder Blob names are absent.

Expected counts are computed from canonical JSON, not hardcoded constants.

---

### AD-09 — Do not add `seedId` to production tables just for this initiative

The dataset `seedId` is the stable source identity used during generation and Blob naming.

Do not add `seed_id` columns to production application tables solely to support development seeding.

The existing generator may map relationships using its current validated canonical keys.

If canonical duplicate names make deterministic mapping ambiguous, validation must fail and the dataset must be corrected rather than silently selecting one record.

---

### AD-10 — Dataset media owns a separate Blob prefix

All seed-managed images live under:

```text
dataset/
```

This keeps them distinct from runtime/admin uploads.

Examples:

```text
dataset/ingredients/ING-0001/image.avif
dataset/recipes/REC-0001/main.avif
```

E-020 may list/report extras under `dataset/`.

It must never treat non-`dataset/` runtime blobs as seed-managed content.

---

### AD-11 — Use a dedicated development container

Target development architecture:

```text
existing Appetee storage account
└── appetee-images-dev
    └── dataset/
```

Reuse the existing storage account to avoid unnecessary infrastructure cost unless Azure constraints require otherwise.

The actual live account/container must be verified before configuration is changed. Repository configuration is not proof that an Azure resource currently exists.

The development tool must not silently create a container.

---

### AD-12 — Azure configuration reuses backend keys

Do not invent a second Azure configuration namespace.

Use:

```text
AzureStorage__AccountUrl
AzureStorage__ContainerName
```

with fallback to existing appsettings values.

Database tooling similarly uses:

```text
ConnectionStrings__AppeteeDb
```

with fallback to appsettings development/base configuration.

Exact precedence:

```text
environment variable
    ↓
appsettings.Development.json
    ↓
appsettings.json
```

Implement one shared config loader:

```text
data/tools/shared/tool-config.mjs
```

It must:

- locate the backend repository root from `import.meta.url`;
- read JSON as UTF-8;
- strip a UTF-8 BOM before `JSON.parse`;
- never print passwords/tokens/connection strings;
- return normalized validated config values.

---

### AD-13 — Azure authentication uses `DefaultAzureCredential`

Add:

```text
@azure/identity
@azure/storage-blob
```

Use `DefaultAzureCredential`.

Local developer workflow uses a supported developer credential, with Azure CLI login as the documented default:

```bash
az login
```

Azure-hosted execution remains compatible with Managed Identity.

Do not introduce:

- storage account keys in source;
- committed SAS tokens;
- client secrets;
- a separate `.env` secret contract;
- an upload loop implemented by shelling out to `az storage`.

Required Blob data access should be `Storage Blob Data Contributor` at the narrowest practical scope.

E-020 documents required RBAC but does not automatically grant roles.

---

### AD-14 — Local dataset asset validation happens before Azure writes

Build the complete expected asset inventory before performing any upload.

For ingredients:

```text
ingredient.json
└── image.path
```

For recipes:

```text
recipe.json
├── image.mainPath
└── image.cardPath
```

For every asset require:

- valid `seedId`;
- expected `ING-####` / `REC-####` identity format according to existing dataset validation;
- referenced path exists;
- path resolves beneath that record directory after canonical normalization;
- file is a regular file;
- extension is `.avif`;
- existing dataset validation accepts the image.

A path that escapes its record directory is a fatal preflight error.

If preflight fails, no Blob writes occur.

---

### AD-15 — Upload bytes as already-built AVIF; do not convert in deployment

Image conversion/resizing is outside the Azure deployment command. The finalized dataset already owns its built AVIF assets; any approved future canonical-media correction must produce and validate the AVIF before synchronization.

Azure deployment uploads the validated AVIF file bytes and sets:

```text
Content-Type: image/avif
```

Do not copy the runtime behavior of merely renaming arbitrary bytes to `.avif`.

---

### AD-16 — Sync is hash-based and idempotent

For every local asset compute:

```text
SHA-256 lowercase hexadecimal
```

Managed Blob metadata:

```text
sha256
seedid
assettype
datasetversion
```

Allowed `assettype` values:

```text
ingredient
recipe-main
recipe-card
```

If `data/version.json` is available, use its dataset version for `datasetversion`.

`datasetversion` is audit metadata only; a dataset-version mismatch by itself does **not** require byte re-upload.

Remote classification:

```text
remote missing
    => upload

remote present AND
sha256 matches AND
Content-Type == image/avif AND
seedid matches AND
assettype matches
    => unchanged / skip

otherwise
    => changed / overwrite
```

---

### AD-17 — List remote dataset blobs once, do not HEAD every expected blob

At sync/verification start, list Blob objects beneath:

```text
dataset/
```

including metadata.

Build an in-memory map:

```text
blobName -> remote metadata/properties
```

Use it to classify expected assets.

This avoids one remote metadata request per dataset file.

If the Azure SDK cannot expose a required property in the list result, add the minimum targeted property fetch only for records where it is necessary.

---

### AD-18 — Bounded upload concurrency is 8

Use an internal bounded worker pool with default concurrency:

```text
8
```

Do not add a dependency solely for concurrency control.

Do not start thousands of promises simultaneously.

If an upload fails:

- collect the failure;
- allow already-scheduled/bounded independent uploads to finish;
- print failed Blob names;
- exit non-zero.

Never print success if required uploads failed.

---

### AD-19 — Remote extras are reported, never deleted

For Blob names beneath `dataset/` that are not part of the current expected inventory:

```text
report as remote extra
do not delete
```

E-020 introduces no prune/delete command.

Deletion requires separate explicit design because remote storage may contain historically relevant or manually managed content.

Non-`dataset/` blobs are outside this tool's ownership.

---

### AD-20 — Dry run performs reads and planning only

Support:

```bash
npm run images:sync:azure -- --dry-run
```

Dry run may:

- load configuration;
- authenticate;
- inspect container properties/access;
- list remote blobs;
- hash local files;
- classify changes;
- print a plan.

It may not:

- create a container;
- upload;
- overwrite;
- delete;
- mutate metadata.

---

### AD-21 — Azure verification is a separate read-only command

Implement:

```bash
npm run images:verify:azure
```

It verifies every expected Blob for:

- existence;
- SHA-256 metadata;
- `seedid`;
- `assettype`;
- `Content-Type: image/avif`.

Missing/mismatched expected assets cause non-zero exit.

Remote extras are warnings and do not fail verification.

The sync command runs the same verification logic after uploads.

An immediate second sync against an unchanged dataset must report:

```text
uploaded: 0
updated: 0
```

---

### AD-22 — Test/private assets cannot be uploaded into an anonymously public container

Before writes, inspect the target container's public access configuration.

If any asset selected for deployment has:

```text
productionApproved !== true
```

and the target container allows anonymous public Blob/container access:

```text
fail before writes
```

There is no force/license bypass in E-020.

This initiative may deploy test/private assets only to a non-anonymous development storage boundary.

Production/public media approval remains a content/licensing concern outside E-020.

---

### AD-23 — Preserve the existing API image contract

Do not add `MainImageUrl` / `CardImageUrl` to the frontend API as part of E-020.

Existing recipe list/detail DTOs may continue exposing:

```text
ImageUrl
```

The persistence query chooses the appropriate Blob variant:

```text
list/search/card surface
    -> COALESCE(card, main)

detail
    -> main
```

This provides the intended bandwidth benefit without broad frontend changes.

---

## Scope

### Included

- deterministic dataset Blob naming;
- shared Blob-name helper used by SQL generation and Azure tooling;
- generated ingredient image Blob references;
- generated recipe main/card Blob references;
- nullable recipe card Blob column;
- recipe list projection fallback to main image;
- clearing runtime card Blob when runtime main image changes;
- Node configuration loader;
- local-only database reset tool;
- read-only local database verification;
- Azure dataset image dry run;
- Azure dataset image sync;
- Azure dataset image verification;
- SHA-256 Blob metadata;
- bounded concurrency;
- development container architecture/runbook;
- package scripts/dependencies;
- tests for all non-network decision logic;
- documentation and initiative index update.

### Excluded

- frontend redesign;
- API contract redesign;
- image resizing or AVIF conversion;
- runtime/admin media validation;
- runtime/admin card generation;
- runtime media outbox/reconciliation;
- public production redistribution approval for test-only images;
- CDN/image caching;
- Azure App Service deployment;
- CI/CD deployment pipeline;
- Terraform/Bicep unless separately approved;
- automatic Azure container creation;
- Azure Blob deletion/pruning;
- remote/prod database reset;
- production seed database rebuilds;
- HTTP seed/reset endpoints;
- automatic reset or Blob sync on application startup;
- combining DB reset and Azure sync into one destructive mega-command.

---

## Systems Affected

| System | Impact |
|---|---|
| `data/tools` | New database, deployment, shared, and test tooling |
| Dataset generator | Deterministic media Blob references; recipe card column output |
| Generated SQL | New fixed ordered output contract and deterministic image values |
| MySQL local development | One-command destructive reset |
| MySQL schema | Nullable `recipes.card_image_blob_name` |
| Recipe SQL/query layer | Card image used for list projection with fallback |
| Runtime recipe update persistence | Clear stale card Blob when main image changes |
| Azure Blob Storage | Development dataset prefix and sync metadata |
| Backend configuration | Reused existing DB/Azure keys |
| Documentation | E-020 plus developer runbook/index |

---

## Data and State Impact

### Canonical source

No recipe or ingredient semantic data is modified by E-020.

Canonical JSON remains source-of-truth data.

### Generated state

Generated SQL contains deterministic Blob names.

### Local MySQL

`db:reset:local` destroys and recreates only the explicitly validated local `appetee` database.

### Azure

Dataset assets are copied to deterministic Blob names beneath `dataset/`.

Azure is not a new source of truth. Canonical JSON + local AVIF files remain the dataset source.

---

## Database Impact

### Schema

Implemented in the canonical/local schema and forward migration:

```sql
ALTER TABLE recipes
    ADD COLUMN card_image_blob_name VARCHAR(500) NULL;
```

For local rebuild schema, place this field adjacent to `image_blob_name`.

Final exact column order is not semantically important, but generated schema should be consistent.

### Indexes

No index on either image Blob-name field.

These fields are projections, not filter/sort/join keys.

### Migrations

E-008 owns the production migration mechanism.

E-020 added `migrations/20260820_004_e020_phase1_recipe_card_image.sql` for the schema change and updated the canonical/local generated schema. E-008 continues to own the production migration runner, rollout order, integrity policy, and operational deployment mechanics; E-020 did not introduce a competing framework.

`db:reset:local` is never a production migration command.

---

## API / Contract Impact

No intentional frontend contract change.

Recipe list/search returns the existing `ImageUrl`, but its underlying Blob comes from:

```sql
COALESCE(card_image_blob_name, image_blob_name)
```

Recipe detail returns the existing `ImageUrl` from:

```text
image_blob_name
```

Ingredient contracts continue using existing image URL behavior.

---

## Implemented Change Summary

### Added files

Implemented tooling layout:

```text
data/tools/
├── shared/
│   ├── tool-config.mjs
│   ├── blob-names.mjs
│   └── dataset-assets.mjs
│
├── database/
│   ├── mysql-local.mjs
│   ├── reset-local.mjs
│   └── verify-local.mjs
│
├── deployment/
│   ├── azure-blobs.mjs
│   ├── sync-azure-images.mjs
│   └── verify-azure-images.mjs
│
└── test/
    ├── blob-names.test.mjs
    ├── dataset-assets.test.mjs
    ├── tool-config.test.mjs
    ├── mysql-local.test.mjs
    └── azure-sync-plan.test.mjs
```

The maintained implementation keeps these responsibilities within this structure.

### Package dependencies

Added:

```text
mysql2
@azure/identity
@azure/storage-blob
```

Use Node's built-in:

- `node:test`;
- `node:assert`;
- `node:crypto`;
- `node:fs/promises`;
- `node:path`;
- `node:child_process`.

Do not add test, hashing, concurrency, or config libraries without a demonstrated need.

### Package scripts

Implemented:

```json
{
  "scripts": {
    "test": "node --test",
    "db:reset:local": "node database/reset-local.mjs",
    "db:verify:local": "node database/verify-local.mjs",
    "images:sync:azure": "node deployment/sync-azure-images.mjs",
    "images:verify:azure": "node deployment/verify-azure-images.mjs"
  }
}
```

Preserve existing dataset scripts.

### Generator

Placeholder media Blob values were replaced with shared deterministic functions.

Conceptual functions:

```js
getIngredientImageBlobName(seedId)
getRecipeMainImageBlobName(seedId)
getRecipeCardImageBlobName(seedId)
```

They return exactly:

```text
dataset/ingredients/{seedId}/image.avif
dataset/recipes/{seedId}/main.avif
dataset/recipes/{seedId}/card.avif
```

### Documentation index

E-020 is present in the engineering initiative index and marked completed on 2026-08-21.

---

# Implementation Phases

## Phase 1 — Deterministic media and schema contract

**Status:** Completed — 2026-08-20

### Changes implemented

1. Added `shared/blob-names.mjs`.
2. Added unit tests for exact Blob names and invalid IDs.
3. Added `recipes.card_image_blob_name VARCHAR(500) NULL` to the development/canonical schema representation.
4. Updated generated ingredient SQL to use deterministic ingredient Blob names.
5. Updated generated recipe SQL to populate:
   - `image_blob_name` with main Blob;
   - `card_image_blob_name` with card Blob.
6. Removed legacy hardcoded placeholder Blob names from generated seed SQL.
7. Updated recipe list/search SQL projection to:
   ```sql
   COALESCE(r.card_image_blob_name, r.image_blob_name) AS ImageBlobName
   ```
8. Kept the recipe detail projection on the main image.
9. Made runtime/admin main-image replacement set `card_image_blob_name = NULL`.
10. Regenerated SQL.
11. Ran complete dataset validation.

### Tests / validation

- Blob naming unit tests.
- Existing dataset validation passes.
- Existing backend tests pass.
- Generated SQL contains no known legacy placeholder media names.
- Every ingredient seed row has expected deterministic image Blob name.
- Every recipe seed row has expected deterministic main and card Blob names.
- Recipe list query falls back correctly when card is null.
- Recipe detail remains main image.
- Runtime recipe image replacement cannot leave a stale card reference.

### Completion rule

Phase 1 is complete when one deterministic naming implementation drives both generated seed references and the database/API projection strategy, with no frontend contract break.

---

## Phase 2 — Safe local database bootstrap

**Status:** Completed — 2026-08-20

### Changes implemented

1. Added `mysql2`.
2. Implemented `shared/tool-config.mjs`.
3. Implemented the project MySQL connection-string parser.
4. Implemented the immutable local-target guard.
5. Implemented `database/mysql-local.mjs`.
6. Implemented read-only `database/verify-local.mjs`.
7. Implemented `database/reset-local.mjs`.
8. Added npm scripts.
9. Ordered validation and generation before destruction.
10. Executed fixed generated SQL files 01–04.
11. Reused the read-only verifier from reset.
12. Added concise structured console output.

### Required reset output stages

Example structure:

```text
Appetee local database reset

[1/6] Configuration
  Target: localhost:3306/appetee
  Safety: local target verified

[2/6] Dataset validation
  Passed

[3/6] SQL generation
  Passed

[4/6] Database recreation
  Created: appetee

[5/6] Seed execution
  01-schema.sql       passed
  02-reference.sql    passed
  03-ingredients.sql  passed
  04-recipes.sql      passed

[6/6] Verification
  Ingredients: ...
  Recipes: ...
  Relationships: passed
  Image mappings: passed

Local database ready.
```

Never print the password or complete connection string.

### Tests / validation

Automated coverage includes:

- `localhost` accepted;
- `127.0.0.1` accepted;
- `::1` accepted;
- remote hostname rejected;
- remote IP rejected;
- wrong DB name rejected;
- no bypass flag accepted;
- config environment override precedence;
- BOM-containing JSON config parses;
- SQL file list/order is fixed;
- generator/validation failure path never reaches destructive function;
- verification count computation uses canonical records.

Recorded integration evidence:

1. Reset from an absent local `appetee` database succeeded.
2. Reset from the populated database succeeded and recreated it.
3. A non-local target exited before SQL.
4. `npm run db:verify:local` passed with canonical counts, relationships, and image mappings.

### Completion rule

Phase 2 is complete when a fresh developer with local MySQL can initialize or fully reset Appetee with one safe command and no GUI/manual SQL execution.

---

## Phase 3 — Azure dataset image synchronization

**Status:** Completed — 2026-08-21

### Changes implemented

1. Added Azure SDK dependencies.
2. Implemented `shared/dataset-assets.mjs`.
3. Implemented local path containment and asset preflight.
4. Implemented SHA-256 hashing.
5. Implemented `deployment/azure-blobs.mjs`.
6. Integrated `DefaultAzureCredential` authentication.
7. Resolved only an existing account/container; the tool never creates either.
8. Inspected container anonymous-access configuration before writes.
9. Rejected unapproved dataset media targeting an anonymously public container.
10. Listed remote `dataset/` Blobs with metadata once per operation.
11. Built deterministic sync planning.
12. Implemented zero-mutation dry-run.
13. Implemented upload/overwrite concurrency bounded at eight workers.
14. Set `Content-Type: image/avif`.
15. Set managed metadata.
16. Reported remote extras without deleting them.
17. Implemented the read-only verify command.
18. Ran verification automatically after successful synchronization.
19. Added npm scripts and the operator runbook.

### Required sync output

Example:

```text
Azure dataset image sync

Account: https://<account>.blob.core.windows.net
Container: appetee-images-dev
Prefix: dataset/
Mode: DRY RUN

Ingredients
  expected: ...
  missing: ...
  changed: ...
  unchanged: ...

Recipes — main
  expected: ...
  missing: ...
  changed: ...
  unchanged: ...

Recipes — card
  expected: ...
  missing: ...
  changed: ...
  unchanged: ...

Remote extras: ...

Would upload: ...
Would update: ...
Would skip: ...

No Azure data modified.
```

Normal run uses equivalent categories:

```text
uploaded
updated
unchanged
failed
```

### Tests / validation

Automated coverage includes:

- exact ingredient/main/card Blob names;
- path traversal rejection;
- missing asset detection;
- non-file asset rejection;
- `.avif` requirement;
- stable SHA-256;
- remote missing classification;
- remote unchanged classification;
- changed hash classification;
- wrong content type classification;
- wrong managed metadata classification;
- dataset version mismatch alone does not classify bytes as changed;
- remote extra classification;
- dry-run plan has zero mutations;
- concurrency helper never exceeds configured limit;
- unapproved media + anonymous container is rejected before upload.

Recorded live evidence:

1. Dry run succeeded against the private `appetee-images-dev` container with all 3,519 assets unchanged.
2. Normal synchronization succeeded with zero failures and automatic verification passed.
3. Separate read-only verification confirmed 3,519/3,519 assets with no mismatches or extras.
4. Immediate second synchronization reported `uploaded: 0`, `updated: 0`, and `failed: 0`.
5. Changed-asset and remote-extra behavior is covered by automated classification tests; canonical AVIF bytes were not modified solely to manufacture live evidence.

### Completion rule

Phase 3 is complete only after deterministic, idempotent Azure synchronization is proven against the intended non-anonymous development container and verification passes.

---

## Phase 4 — Runbook, traceability, and end-to-end evidence

**Status:** Completed — 2026-08-21

### Changes implemented

1. Updated `/data/README.md`.
2. Updated the dataset specification for deterministic Blob naming and guarded deployment.
3. Updated the engineering initiative index.
4. Documented prerequisites and commands.
5. Documented the E-006 and E-008 boundaries.
6. Recorded the verified Azure development container name and private access mode.
7. Attached completion evidence to the E-020 documents.
8. Ran the complete development workflow.

### Required developer runbook

#### Fresh/reset local DB

```bash
cd data/tools
npm install
npm run db:reset:local
```

Then:

```bash
dotnet run --project ../../src/Appetee.Api
```

#### Sync changed dataset media

```bash
cd data/tools
az login
npm run images:sync:azure -- --dry-run
npm run images:sync:azure
npm run images:verify:azure
```

Azure sync is not required every time the local DB is reset because deterministic Blob names make existing unchanged media reusable.

### End-to-end validation

- [x] Clean dataset validation.
- [x] Clean generator run.
- [x] Local DB reset from absent DB.
- [x] Local DB reset from existing populated DB.
- [x] Local verification.
- [x] Backend tests.
- [x] Tooling tests.
- [x] Azure dry run.
- [x] Azure sync.
- [x] Azure verify.
- [x] Second unchanged Azure sync.
- [x] Backend start against the reset DB.
- [x] Recipe list image URL resolves to the card Blob when available.
- [x] Recipe detail image URL resolves to the main Blob.
- [x] Ingredient image URL resolves correctly.

### Completion rule

E-020 is complete when another developer can follow the documented commands without MySQL Workbench, Azure Portal media matching, or undocumented manual corrections.

---

## Work Status

| Phase | Status | Notes |
|---|---|---|
| `/data` cleanup prerequisite | Completed — 2026-08-20 | Final canonical dataset retained; completed transition state and one-off tooling retired |
| Phase 1 — Deterministic media and schema contract | Completed — 2026-08-20 | Deterministic names, schema/migration, query behavior, generated SQL, and tests implemented |
| Phase 2 — Safe local database bootstrap | Completed — 2026-08-20 | Guarded reset and read-only verification implemented and exercised against local MySQL |
| Phase 3 — Azure dataset image synchronization | Completed — 2026-08-21 | `appetee-images-dev` verified private; 3,519 assets verified and immediate resync had zero changes |
| Phase 4 — Runbook and end-to-end evidence | Completed — 2026-08-21 | Full local, Azure, test, runtime URL, and documentation acceptance recorded |

---

## Verified Implementation Evidence — 2026-08-20 through 2026-08-21

### Dataset cleanup prerequisite

```text
Canonical data retained:
  ingredients: 121
  recipes: 1699
  record-local AVIF assets: retained

Retired transition surfaces:
  candidates, fixtures, workflow/checkpoint state, research/cache staging,
  image manifests, snapshot ZIPs, and one-off acquisition/migration scripts

Maintained surface:
  canonical records/assets, deterministic generated SQL/reports,
  validation, generation, tests, and guarded local database commands
```

### Phase 1

```text
Deterministic Blob-name tests:
  command: cd data/tools && npm test
  result: passed

Generated ingredient mappings:
  expected/present: 121/121

Generated recipe main mappings:
  expected/present: 1699/1699

Generated recipe card mappings:
  expected/present: 1699/1699

Legacy generated placeholders:
  present: 0

Backend tests:
  command: dotnet test tests/Appetee.Api.Tests/Appetee.Api.Tests.csproj --no-restore
  result: 94 passed, 0 failed
```

The production forward migration is `migrations/20260820_004_e020_phase1_recipe_card_image.sql`. Recipe list projections use the card image with main-image fallback, detail projections retain the main image, and runtime main-image replacement clears a stale card reference.

### Phase 2

```text
Tooling tests:
  command: cd data/tools && npm test
  result at Phase 2 acceptance: 28 passed, 0 failed

Dataset validation:
  command: npm run validate
  result: 121 ingredients, 1699 recipes, 0 errors, 2787 warnings

Dataset generation:
  command: npm run build
  result: generated schema, SQL, indexes, and distributions for 1699 recipes

Local reset from missing DB:
  command: npm run db:reset:local
  target: localhost:3306/appetee
  result: passed; all four fixed SQL files executed and verification passed

Local reset from populated DB:
  command: npm run db:reset:local
  target: localhost:3306/appetee
  result: passed; rerun recreated the canonical database

Local verification:
  command: npm run db:verify:local
  result: passed
  ingredients: 121
  recipes: 1699
  recipe ingredients: 12415
  diet relationships: 4523
  badge relationships: 5835
  orphan relationships: 0
  image mappings: passed

Safety rejection:
  remote target: 10.0.0.5/appetee rejected before SQL
  bypass argument: --force rejected before configuration or SQL
  secret-bearing connection string printed: no
```

### Phase 3

```text
Azure SDK dependencies:
  @azure/identity: 4.13.2
  @azure/storage-blob: 12.33.0
  authentication: DefaultAzureCredential

Tooling tests:
  command: cd data/tools && npm test
  result: 46 passed, 0 failed

Canonical Azure inventory preflight:
  total: 3519
  ingredients: 121
  recipe main: 1699
  recipe card: 1699
  productionApproved false: 3519

Dataset generation:
  command: npm run build
  result: generated schema, SQL, indexes, and distributions for 1699 recipes

Local database verification:
  command: npm run db:verify:local
  result: passed; counts, relationships, and deterministic image mappings verified

Live Azure acceptance:
  command: npm run images:sync:azure -- --dry-run
  account: https://appeteeimages.blob.core.windows.net
  container: appetee-images-dev
  access: non-anonymous/private
  expected: 3519
  missing: 0
  changed: 0
  unchanged: 3519
  remote extras: 0
  dry-run mutations: 0

Normal synchronization:
  command: npm run images:sync:azure
  uploaded: 0
  updated: 0
  unchanged: 3519
  failed: 0
  automatic post-sync verification: passed

Separate read-only verification:
  command: npm run images:verify:azure
  verified: 3519/3519
  missing: 0
  mismatched: 0
  remote extras: 0

Immediate second synchronization:
  command: npm run images:sync:azure
  uploaded: 0
  updated: 0
  unchanged: 3519
  failed: 0
```

The implementation includes one-prefix remote inventory, SHA-256/content-type/managed-metadata classification, dataset-version no-op behavior, eight-worker bounded uploads, failure collection, non-deleting extra reporting, automatic post-sync verification, and the separate read-only verifier. Changed-asset classification and zero-mutation dry-run behavior are covered by automated tests; the canonical media was not altered merely to produce live evidence.

### Phase 4

```text
Dataset validation:
  command: cd data/tools && npm run validate
  result: 121 ingredients, 1699 recipes, 0 errors, 2787 warnings

Dataset generation:
  command: npm run build
  result: generated schema, SQL, indexes, and distributions for 1699 recipes

Local reset from populated database:
  command: npm run db:reset:local
  result: passed; all four fixed SQL files executed and verification passed

Local verification:
  command: npm run db:verify:local
  result: passed; canonical counts, relationships, and image mappings matched

Tooling tests:
  command: npm test
  result: 46 passed, 0 failed

Backend tests:
  command: dotnet test tests/Appetee.Api.Tests/Appetee.Api.Tests.csproj --no-restore
  result: 94 passed, 0 failed

Runtime acceptance against reset local DB:
  launch: dotnet run --project src/Appetee.Api/Appetee.Api.csproj --no-build --no-restore --launch-profile Appetee.Api
  recipe list count: 1699
  list image: .../dataset/recipes/REC-1699/card.avif
  detail image: .../dataset/recipes/REC-1699/main.avif
  ingredient image: .../dataset/ingredients/ING-0001/image.avif
  temporary account/cookie: removed after verification
```

The main data runbook now uses `appsettings.Development.json` for the normal Azure target, documents optional environment overrides, and records the verified private-container boundary. E-006 still owns authenticated/private media delivery and E-008 still owns production migrations.

---

## Risks / Edge Cases

### Accidental remote database deletion

**Control:** immutable localhost-only safety guard and exact database name; no override.

### Validation fails after an existing local DB is useful

**Control:** validation/generation happen before database destruction.

### Reset fails after database has been dropped

**Control:** deterministic rerun is recovery; print exact failed stage.

### MySQL CLI differences across developer machines

**Control:** Node `mysql2`, no CLI dependency.

### Current working directory differs

**Control:** all repository paths derived from module location.

### UTF-8 BOM in appsettings

**Control:** config loader strips BOM before JSON parsing.

### Dataset image path traversal

**Control:** resolve/canonicalize and require path remains under record directory.

### Thousands of unnecessary Azure operations

**Control:** one prefix listing plus hash metadata and unchanged skipping.

### Too much upload concurrency

**Control:** bounded worker pool at 8.

### Stale remote dataset Blob

**Control:** report extra; never auto-delete.

### Runtime/admin Blob collision

**Control:** dataset-owned `dataset/` prefix.

### Test-only images become public

**Control:** inspect anonymous container access and block unapproved media before writes.

### Main recipe image updated but card remains old

**Control:** runtime main replacement clears card Blob reference.

### Production migration rollout uses the wrong mechanism

**Control:** E-020 provides the forward migration file; E-008 owns its production runner and rollout mechanics, and E-020 does not create a second framework.

---

## Validation

### Tooling

```bash
cd data/tools
npm test
npm run validate
npm run build
npm run db:reset:local
npm run db:verify:local
npm run images:sync:azure -- --dry-run
npm run images:verify:azure
```

`images:sync:azure` requires authentication and a verified target environment. Phase 4 exercised the complete sequence, including the real sync and immediate unchanged resync.

### Backend

The repository backend suite passed with 94 tests and no failures. The exact command and results are recorded in the evidence section above.

---

## Completion Criteria

E-020 is complete only when all of the following are true:

- [x] `/data` cleanup prerequisite is implemented.
- [x] Shared deterministic Blob naming exists and is tested.
- [x] Seed SQL no longer uses legacy placeholder image names.
- [x] Recipe main/card persistence model is implemented.
- [x] Existing API image contract remains compatible.
- [x] `npm run db:reset:local` exists.
- [x] Reset refuses every non-local target.
- [x] Reset validates/generates before destruction.
- [x] Reset creates `appetee`, executes fixed SQL, and verifies data.
- [x] `npm run db:verify:local` is read-only.
- [x] Azure sync uses `DefaultAzureCredential`.
- [x] Azure sync uses deterministic `dataset/` Blob names.
- [x] Azure sync skips unchanged bytes.
- [x] Azure sync has dry-run support.
- [x] Azure sync never deletes remote extras.
- [x] Azure verification is read-only.
- [x] Test/private assets cannot be uploaded to an anonymously public container.
- [x] Immediate second sync has zero uploads/updates.
- [x] Tooling and backend tests pass for all implemented phases.
- [x] Developer documentation is updated for all implemented phases.
- [x] E-020 is added to the initiative index.
- [x] Completion evidence records real command results.

---

## Decisions

| ID | Decision |
|---|---|
| E020-D01 | One explicit local reset command; never automatic |
| E020-D02 | Hard localhost + `appetee` target guard; no bypass |
| E020-D03 | Validate/generate before destructive DB action |
| E020-D04 | Fixed generated SQL order `01`–`04` |
| E020-D05 | Node `mysql2/promise`, not MySQL CLI |
| E020-D06 | DB verification is separate/read-only and reused by reset |
| E020-D07 | Dataset Blob prefix is `dataset/` |
| E020-D08 | Blob names derive exclusively from canonical `seedId` |
| E020-D09 | Existing recipe image field remains main; add nullable card field |
| E020-D10 | List uses `COALESCE(card, main)`; detail uses main |
| E020-D11 | No frontend API contract change |
| E020-D12 | Runtime main image replacement clears stale card reference |
| E020-D13 | Reuse existing config keys with env > dev JSON > base JSON |
| E020-D14 | `DefaultAzureCredential`; no embedded Azure secrets |
| E020-D15 | Use dedicated `appetee-images-dev` container in the existing account |
| E020-D16 | Azure container is not automatically created |
| E020-D17 | Local assets preflight completely before writes |
| E020-D18 | Deployment uploads already-validated AVIF; no conversion |
| E020-D19 | SHA-256 metadata determines byte changes |
| E020-D20 | One remote `dataset/` listing used for sync planning |
| E020-D21 | Upload concurrency fixed/defaulted to 8 |
| E020-D22 | Remote extras are warnings; never auto-delete |
| E020-D23 | Dry-run has zero mutations |
| E020-D24 | Unapproved media is blocked from anonymous public containers |
| E020-D25 | E-006 retains ownership of runtime media workflow |
| E020-D26 | E-008 retains ownership of production migration mechanics |

---

## Detailed Implementation Documents

- [`backend.md`](./backend.md) — exact modules, SQL/persistence changes, reset implementation, data verification, tests.
- [`infrastructure.md`](./infrastructure.md) — Azure target model, identity/RBAC, configuration, media synchronization, safety and operational runbook.

---

## Traceability

### E-006 — Secure Media Workflow

E-020 does **not** own:

- validating arbitrary runtime uploads;
- canonical AVIF conversion for arbitrary uploaded bytes;
- runtime media operation state/outbox;
- orphan reconciliation;
- runtime/admin card derivation.

E-020 only uploads already-built canonical dataset assets.

### E-008 — Database Migrations, Integrity, and Concurrency

E-020's `db:reset:local` is explicitly destructive local/test tooling.

It is not a production migration mechanism.

Any production schema rollout for `card_image_blob_name` must use the migration mechanism established by E-008.

### Dataset tooling cleanup prerequisite

The cleaned `/data` layout and generated-output contract are implemented. E-020 targets that stable structure directly; do not add compatibility branches or recreate retired transition paths.

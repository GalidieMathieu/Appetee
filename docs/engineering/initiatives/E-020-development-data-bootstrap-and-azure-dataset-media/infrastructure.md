# E-020 — Infrastructure Implementation

## Canonical Plan

The canonical initiative is [`README.md`](./README.md).

This document defines the Azure and operational configuration for E-020.

Repository configuration must not be treated as proof of current live Azure state. Before changing Azure-facing configuration, verify the actual resource/container/access mode.

## Implementation Status

The local MySQL bootstrap boundary was implemented and verified on 2026-08-20. The Azure development boundary, dry run, synchronization, verification, idempotent resync, and runtime URL mapping were verified on 2026-08-21.

---

## Systems

E-020 touches:

```text
Developer workstation
├── Node 24 / data tooling
├── local MySQL :3306
├── Azure developer identity
└── Appetee backend repo

Azure
└── existing Appetee Storage Account
    └── development image container
        └── dataset/
            ├── ingredients/
            └── recipes/
```

E-020 does not provision or deploy App Service.

---

## Current Configuration

Repository configuration currently uses the backend namespace:

```text
AzureStorage:AccountUrl
AzureStorage:ContainerName
```

and local MySQL through:

```text
ConnectionStrings:AppeteeDb
```

The application already uses Azure Identity rather than requiring the dataset tool to invent a credential model.

Live Azure facts such as:

- exact storage account existence;
- current container existence;
- current anonymous access setting;
- current developer RBAC assignments;
- App Service managed identity assignments;

must be verified against Azure before they are documented as completed state.

---

## Target Configuration

### Storage account

Prefer reusing the existing Appetee storage account.

Reason:

- E-020 adds development dataset objects, not a workload that inherently requires a separate account;
- avoids an unnecessary additional Azure resource/cost;
- identity/container isolation is sufficient for this development use case.

If organization policy or an existing Azure design requires a separate account, record the exception in E-020 before implementation.

### Container

Verified target:

```text
appetee-images-dev
```

The container exists in the `appeteeimages` storage account and was verified as non-anonymous/private on 2026-08-21.

Required properties:

- exists before sync;
- non-anonymous/private access while it contains any `productionApproved:false` dataset assets;
- developer identity has Blob data write access;
- backend development environment can resolve/read it according to the application's actual media delivery model.

Do not automatically create the container from `images:sync:azure`.

Resource creation is an intentional infrastructure action, not a side effect of running the dataset uploader.

### Prefix

Managed dataset prefix:

```text
dataset/
```

Exact object tree:

```text
dataset/
├── ingredients/
│   ├── ING-0001/
│   │   └── image.avif
│   └── ...
└── recipes/
    ├── REC-0001/
    │   ├── main.avif
    │   └── card.avif
    └── ...
```

Runtime/admin uploads must remain outside the seed-owned prefix.

---

## Environments

### Local MySQL development

Target:

```text
host: localhost / 127.0.0.1 / ::1
port: configured (currently typically 3306)
database: appetee
```

`db:reset:local` must reject every other database target.

### Azure development media

Use the configured development container.

Do not upload test/private media to a production/public container.

### Production

E-020 does not establish a production dataset-image deployment workflow.

If production assets become license/approval ready later, create a controlled production deployment plan using approved media and production environment controls.

Do not simply point `images:sync:azure` at production and bypass the content approval boundary.

---

## Identity and Access

## Local developer identity

Use:

```text
DefaultAzureCredential
```

Document Azure CLI login as the standard explicit developer preparation:

```bash
az login
```

The SDK may use another supported credential in its normal chain, but E-020 does not manage those credentials itself.

### Required RBAC

Dataset sync needs Blob data read/write capability.

Target role:

```text
Storage Blob Data Contributor
```

Assign at the narrowest practical scope, preferably the development container when operationally supported; otherwise storage account scope.

E-020 does not auto-assign the role.

### App Service identity

No new App Service role is automatically required merely because the developer uploader exists.

If the development API must read a private Blob container directly as part of the existing architecture, verify its managed identity already has the necessary read role.

Do not broaden to Contributor/Owner for convenience.

### Principle of least privilege

Avoid:

- Azure subscription Owner;
- Storage Account Contributor when only Blob data access is required;
- storage account keys;
- permanent SAS in config.

Management-plane and data-plane permissions are different; use a Blob data role for Blob operations.

---

## Configuration and Secrets

## Existing config keys

Use exact existing hierarchy.

Environment variables:

```text
ConnectionStrings__AppeteeDb
AzureStorage__AccountUrl
AzureStorage__ContainerName
```

No new:

```text
APPETEE_AZURE_KEY
AZURE_STORAGE_CONNECTION_STRING
DATASET_SAS
```

unless an existing project-wide architectural decision later requires one.

### Appsettings

Target development configuration after the Azure container is actually created/verified may be conceptually:

```json
{
  "ConnectionStrings": {
    "AppeteeDb": "Server=localhost;Port=3306;Database=appetee;User ID=root;Password=..."
  },
  "AzureStorage": {
    "ContainerName": "appetee-images-dev"
  }
}
```

Base configuration may continue providing the storage AccountUrl.

Do not write a guessed container value to documentation/config and claim deployment success before Azure verification.

### Secret output

CLI output must not include:

- MySQL password;
- Azure token;
- credential environment values;
- full secret-bearing connection strings.

---

## Networking

No custom VNet/private endpoint work is introduced by E-020.

The developer must be able to:

- reach local MySQL;
- reach the configured Azure Storage data endpoint;
- authenticate to Azure.

If the existing storage account later becomes private-endpoint-only, the developer workflow must be revisited; do not silently work around network policy by enabling public network access.

---

## Deployment

## Database

Database reset is not cloud deployment.

Required command:

```bash
cd data/tools
npm run db:reset:local
```

It affects local MySQL only.

## Dataset Blob deployment

### Preflight / dry run

Mandatory before first real deployment to a newly configured target:

```bash
npm run images:sync:azure -- --dry-run
```

Dry run must display:

- AccountUrl;
- container name;
- `dataset/` prefix;
- public/private access result;
- expected asset totals;
- missing/changed/unchanged;
- remote extras;
- zero-mutation confirmation.

### Real sync

```bash
npm run images:sync:azure
```

### Verification

```bash
npm run images:verify:azure
```

### Repeatability acceptance

Immediately rerun:

```bash
npm run images:sync:azure
```

Expected:

```text
uploaded: 0
updated: 0
failed: 0
```

Assuming no local file/config changes occurred.

This is a required acceptance test for idempotency.

---

## Azure Client Construction

Conceptual implementation:

```js
const credential = new DefaultAzureCredential();
const service = new BlobServiceClient(accountUrl, credential);
const container = service.getContainerClient(containerName);
```

Do not use a storage connection string/account key.

Before sync:

```text
verify container exists
inspect access policy
list dataset prefix
```

Do not call:

```text
createIfNotExists()
```

in E-020.

If container is missing, fail with:

- target account;
- target container;
- clear instruction that infrastructure must be created/verified first.

---

## Blob Properties

Each upload:

```text
Content-Type: image/avif
```

Managed metadata:

```text
sha256=<lowercase hex>
seedid=<canonical seed id>
assettype=<ingredient|recipe-main|recipe-card>
datasetversion=<version when available>
```

Do not put:

- display names;
- URLs;
- filesystem paths;
- licensing prose;
- credentials;

in Blob metadata.

Content/license provenance remains canonical dataset metadata.

---

## Remote Inventory Strategy

Use one prefix listing:

```text
container.listBlobsFlat({
  prefix: "dataset/",
  includeMetadata: true
})
```

or the exact equivalent supported by the installed Azure SDK version.

Normalize needed remote data into:

```js
Map<string, {
  contentType,
  metadata
}>
```

If content type is not included in the listing result in the actual SDK, do not abandon the one-list strategy. Use targeted property requests only where necessary, and document why.

Do not issue a HEAD/property request for every object by default when a listing can supply the required data.

---

## Synchronization Plan

For each expected local object:

```text
local SHA-256
local seedId
local assetType
expected Content-Type
```

Compare to remote.

### Missing

```text
no remote object
=> upload
```

### Unchanged

```text
remote exists
AND remote metadata.sha256 == local hash
AND remote metadata.seedid == local seedId
AND remote metadata.assettype == local assetType
AND Content-Type == image/avif
=> skip
```

### Changed

Any other managed-property mismatch:

```text
=> overwrite
```

Exception:

```text
datasetversion mismatch only
```

must not re-upload identical bytes solely to update audit metadata.

If desired, leave old `datasetversion` until another upload changes that Blob. Do not perform metadata-only churn across thousands of objects.

---

## Upload Method

Use Azure SDK Blob upload from local file/stream.

Set overwrite explicitly for changed deterministic objects.

Use conditional behavior only if the SDK implementation can do so simply and correctly. E-020 does not require ETags/version-concurrency for a single-developer seed deployment.

Bounded workers:

```text
8
```

Do not `Promise.all()` the entire dataset.

---

## Public Access / Licensing Guard

This is a release-blocking safety requirement.

Canonical dataset inventory carries approval state.

Before Blob writes:

```text
if any selected/local dataset asset is not productionApproved
AND container grants anonymous public access
THEN fail
```

The error should identify:

- target container;
- public access mode;
- count of unapproved assets;
- sample seed IDs (bounded, not thousands);
- instruction to use a private development container or approved media.

Do not add:

```text
--ignore-license
--force-public
```

This guard is not meant to provide legal advice; it prevents tooling from silently turning expressly test/private data into public content.

---

## Database Migration Integration

`db:reset:local` always rebuilds from the current generated schema and does not run versioned production migrations.

For the new recipe card column:

- local generated schema can include it directly;
- production rollout must use E-008's migration mechanism;
- E-020 must not create production tables by running `01-schema.sql`.

This boundary must remain explicit in documentation.

---

## Monitoring

No persistent Azure Monitor dashboard is required for E-020.

Operational visibility is command output.

Required sync summary dimensions:

```text
ingredients expected
recipe-main expected
recipe-card expected
uploaded
updated
unchanged
failed
remote extras
```

Required verification:

```text
expected
present
missing
hash mismatch
metadata mismatch
content-type mismatch
remote extras
```

Exit code is the automation signal:

```text
0 = requested operation/verifications succeeded
non-zero = failure
```

---

## Backup & Recovery

## Local database

No backup is required for `db:reset:local` because its explicit purpose is to discard local Appetee data.

Hard local-only guard protects non-disposable databases.

Recovery from partial reset:

```bash
npm run db:reset:local
```

again after correcting the failure.

## Azure dataset media

No delete behavior exists in E-020.

Overwrites can replace changed deterministic dataset blobs.

If Azure Blob versioning is already enabled, it may provide extra recovery but E-020 does not require enabling it.

Canonical local AVIF assets remain the authoritative bytes for this dataset and can be resynchronized.

---

## Rollback / Roll-forward

### Tooling code

Normal Git rollback.

### Database schema

Local reset can rebuild from whatever checked-out revision's generated schema is intended.

Production rollback follows E-008; never use local reset.

### Blob contents

Preferred recovery is roll-forward:

1. restore the correct canonical local asset from source/controlled dataset storage;
2. run dry-run;
3. run sync;
4. verify.

E-020 does not create an automated remote restore command.

---

## Security

Required controls:

- no Azure secrets in source;
- no DB reset bypass;
- no remote DB target;
- no anonymous-public deployment of unapproved media;
- no automatic remote deletion;
- no runtime HTTP trigger;
- no automatic container creation;
- no arbitrary path read from dataset outside record folder;
- no arbitrary SQL execution;
- sanitized output.

---

## Validation

## Infrastructure preflight checklist

Before first real Azure sync:

- [x] Actual storage account verified.
- [x] `appetee-images-dev` exists.
- [x] Container is non-anonymous/private.
- [x] Developer identity verified.
- [x] `Storage Blob Data Contributor` assigned at the storage resource.
- [x] `AzureStorage__AccountUrl` resolves intended account.
- [x] `AzureStorage__ContainerName` resolves intended dev container.
- [x] Dataset local image validation passes.
- [x] Dry run identifies intended prefix and expected counts.
- [x] No credential/secrets are printed or stored by the tooling.

## Commands

```bash
cd data/tools

npm test
npm run validate
npm run build

npm run db:reset:local
npm run db:verify:local

az login
npm run images:sync:azure -- --dry-run
npm run images:sync:azure
npm run images:verify:azure
npm run images:sync:azure
```

Capture concise outputs for completion evidence.

---

## Completion Evidence

### Azure resource

```text
Storage account: appeteeimages
Container: appetee-images-dev
Container anonymous access: disabled/private
Dataset prefix: dataset/
Verified date: 2026-08-21
```

### Identity

```text
Developer identity: Mathieu Galidie
RBAC role: Storage Blob Data Contributor
RBAC scope: storage resource
Verified by: Azure RBAC and successful data-plane list/sync/verify operations
```

Do not record tokens/secrets.

### Dry run

```text
Ingredients: 121 unchanged
Recipe main: 1699 unchanged
Recipe card: 1699 unchanged
Missing: 0
Changed: 0
Unchanged: 3519
Remote extras: 0
Mutations: 0
```

### First sync

```text
Uploaded: 0
Updated: 0
Unchanged: 3519
Failed: 0
Verification: passed automatically; 3519/3519 verified separately
```

### Immediate second sync

```text
Uploaded: 0
Updated: 0
Failed: 0
Unchanged: 3519
```

### Local DB

```text
Target: localhost:3306/appetee
Reset from missing database: passed
Reset from populated database: passed
Verification result: passed
Ingredients: 121
Recipes: 1699
Recipe ingredients: 12415
Diet relationships: 4523
Badge relationships: 5835
Orphan relationships: 0
Image mappings: passed
Remote-target rejection tested: passed with 10.0.0.5; exited before SQL
Bypass-argument rejection tested: --force rejected
Verified date: 2026-08-21
```

E-020 was marked complete only after these live facts replaced the earlier design assumptions.

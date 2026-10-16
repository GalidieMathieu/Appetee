# F-011 — Meal Plan — Backend — Phase B01

**Phase title:** Recipe fat and picker projection readiness

## Canonical Contract

The feature [README](../README.md) owns shared product behavior, data requirements, database impact, API/request/response contracts and error semantics. This file applies the backend template to one bounded phase. It does not redefine the shared contract.

**Phase:** B01
**Status:** Not started
**Specification:** Ready for implementation; no production code was written by this documentation task.

## Backend Goal

Make canonical recipe fat and picker card nutrition reliable before the planner consumes them. Preserve existing discovery ranking, compatibility and favorites while adding the dedicated Meal Plan recipe projection endpoint.

## Authorization and Ownership

Session derives the owner. Join item→meal→day→user for child IDs; also match route date where supplied. Current requires scoped plan plus composite FK. A route guard/disabled button is never authorization. All unsafe browser calls use E-005 CSRF transport/validation and exact allowed API boundary. Use Dapper parameters, strict DTOs and named enum codes; escape displayed text through normal Angular binding. Pure calculation/GETs do not create persistent state.

## API Layer

Controllers bind/map request, session identity and revision, call the Application use case, map the canonical HTTP result and expose OpenAPI. No SQL or target calculation in controllers.

Add `GET /api/recipes/meal-plan` with the canonical RP01 contract. Preserve `GET /api/recipes`, favorites and their existing `RecipeCardDto` response unchanged. The new endpoint returns `RecipeCardAdvance` items and reuses the existing discovery criteria, cursor, ranking and compatibility behavior.

## Application Layer

Implement the named Application/Infrastructure/HTTP slice through the flow below. Controllers only bind/authenticate/delegate; services have no SQL; repositories own the entire atomic use case. Pure helpers contain the business rules. Register new use cases in existing DI extensions, not Program.cs ad-hoc service blocks.

## Domain Rules

- Known zero recipe fat is valid; missing is NULL, not zero.
- Reject incompatible units as existing calculator does; no conversion guessing.
- Per-serving carbs/fat are round2(total/servings); planner will use the same rule.
- No per-card preview calls or recipe detail hydration.
- Update both create and update SQL and every affected Dapper constructor mapping.

## Persistence

Add recipes.fat_total DECIMAL(10,2) NULL DEFAULT NULL and nonnegative-or-null CHECK. Backfill only complete valid ingredient fat/unit input. Existing IDs and rows remain. Extend bootstrap and generator, regenerate outputs.

Use the [canonical schema/index requirements](../README.md#canonical-database-model) and [backend repository/read-store map](./Phase_B03_write_protocol_and_errors.md#shared-backend-architecture). Validate significant access patterns with EXPLAIN during implementation; no speculative indexes.

## Transactions

Apply the common user-row lock/revision protocol for every W endpoint in this phase: one connection/transaction, scoped validation, entire write, one revision increment, captured readback, then commit. Every command carries transaction and cancellation. Roll back first-created parents/settings too. Reads use coherent snapshot, and pure preview has no DB transaction. Schema DDL follows E-008 recovery, not a false promise of application rollback.

## Concurrency

For each W command lock the owner user row, validate ownership and originating expected revision under the lock, make the entire change, increment revision once if changed, capture readback and commit. Foreign/missing objects remain indistinguishable. A stale precondition returns 409 and writes nothing. Coherent GETs do not create rows. Pure preview has no persistence. See the [shared write protocol](../README.md#shared-system-architecture).

## Idempotency

Same-value updates/reorders may be no-ops after validating ownership and revision. Structural POSTs have no blind retry contract. Never replay a possibly committed command with a freshly substituted revision. Follow the documented bounded deadlock-only retry and unknown-outcome reconciliation rules.

## Validation

Apply the exact numeric/name/date/enum/union bounds in the endpoint cards and canonical contracts. Client checks help the user; server checks remain authoritative. Reject missing or unknown JSON fields rather than accept overposting. Dynamic checks (ownership, current slot, counts, duplicate recipe, complete reorder membership, replacement confirmation) must be rechecked under the mutation lock, not only in an earlier GET. A no-op still requires a valid current precondition and owned object.

For UI forms, put typed controls/validators in the dedicated form factory/draft state; preserve failed values and map field-path errors. Never bind an editable form directly to a cached DTO. No silent unit conversion, clamping, fractional-serving acceptance or unknown-to-zero coercion.

## Mapping

1. Inspect actual production schema/version and record rows with missing/invalid fat; use read-only preflight before migration.
2. Recipe create/update loads ingredient fat in its existing transaction with core nutrition inputs.
3. RecipeCalculator scales fat by quantity/basis, propagates unknown, rounds known total2dp AwayFromZero; SQL persists it.
4. Add a bounded Meal Plan projection query for `GET /api/recipes/meal-plan` that returns `RecipeCardAdvance` with description, proteinPerServing, carbsPerServing and nullable fatPerServing; reuse discovery criteria/cursor/rank/compatibility. Do not add these fields to ordinary discovery/favorites `RecipeCardDto`.
5. Regenerate canonical SQL through data/tools and compare outputs; never reset a nonlocal database.

Data ownership at each crossing is explicit: UI intent → separate feature flow/draft controller → core domain facade/coordinator → core API → controller → Application → atomic Infrastructure operation. Confirmed response returns through core SyncService/store once before feature navigation/status. For read-only phases there is no write/coordinator transaction; for pure preview its ephemeral result belongs to the unsaved draft, not saved-plan cache.

## External Services

No new external service is introduced by this phase. Reuse existing canonical recipe/auth capabilities. MySQL commands use the documented operation timeout/cancellation rules; no per-item HTTP enrichment or external nutrition API is introduced.

## Error Mapping

Use existing ProblemDetails with traceId/code and field errors.400 keeps the draft/invalid operation visible;401 invokes central session handling;404 uses non-leaking unavailable behavior;409 pauses dependent work and requires refresh/review; unexpected/transport failure preserves confirmed state. A possibly committed request is unknownOutcome, not proof of rollback. Never automatically attach a newer GET revision and replay a mutation. No sensitive request/body/token logging. Read-only retries are bounded and do not retry auth/validation failures.

Common ProblemDetails formatting remains owned by E-010; this feature specifies its additional stable business codes and field errors in the README.

## Logging and Observability

Record operation type, status/outcome, elapsed time, row counts and trace ID without bodies, profile measurements, food names, search text, tokens or secrets. Do not expose SQL/exception details in HTTP errors.

## Database Migration

Follow E-008 for the schema changes named in Persistence and the phase file manifest. Reconcile proposed migration numbering with actual history; preserve existing IDs/data. Verify backfill completeness and constraints on isolated MySQL. MySQL DDL needs explicit deployment recovery; do not promise application rollback of DDL. If this phase adds no schema change, do not create a migration.

## Testing

### Testing requirements

- Golden scaling with basis100 and quantities150/250; zero and missing fat; invalid unit; overflow limit.
- Real MySQL migration/backfill verifies NULL survives and existing recipes/IDs/favorites remain.
- Meal Plan endpoint serialization returns RecipeCardAdvance without changing ordinary discovery/favorites, cursor behavior or compatibility.
- Generator validation/build/tests produce deterministic nutrition values and no unrelated canonical changes.

Negative cases must assert unchanged data/revision/confirmed state, not just the returned status. Use synthetic two-user fixtures. Real MySQL is required for FK/CHECK/lock/rollback behavior; controlled Observables and HttpTestingController are appropriate for client races/serialization. Existing critical auth/discovery/profile behavior must remain compatible.

### Acceptance criteria

- [ ] Make canonical recipe fat and picker card nutrition reliable before the planner consumes them. Preserve existing discovery ranking, compatibility and favorites.
- [ ] Golden scaling with basis100 and quantities150/250; zero and missing fat; invalid unit; overflow limit.
- [ ] Real MySQL migration/backfill verifies NULL survives and existing recipes/IDs/favorites remain.
- [ ] `GET /api/recipes/meal-plan` returns RecipeCardAdvance while ordinary discovery/favorites remain unchanged; cursor behavior and compatibility are preserved.
- [ ] Generator validation/build/tests produce deterministic nutrition values and no unrelated canonical changes.
- [ ] All owned object operations scope to the session user and all multi-row writes share the common transaction/version protocol.
- [ ] No deferred approved scope or unrelated refactor is introduced.
- [ ] Build and named meaningful tests pass, with real results recorded; do not mark unrun integration tests passed.

### Completion verification

Working directory: Appetee_v2_BackEnd repository root. Use the repository’s installed SDK/package versions. Commands are for implementation, not commands executed while preparing this specification.

```bash
dotnet build Appetee.sln
dotnet test tests/Appetee.Api.Tests/Appetee.Api.Tests.csproj --filter 'FullyQualifiedName~F011B01'
# From data/tools, separately:

npm test
npm run validate
npm run build
```

Before any integration test that can rebuild data, prove isolated test host/database and explicit opt-in. Add the named tests from this phase before running its filter; a zero-test match is not success. For frontend, run the meaningful phase tests plus build; use the configured runner’s supported file selection when available rather than inventing a lint script. Inspect imports/state location and exercise the specified error path manually. Record actual result and limitations in the phase completion evidence; do not change specification-ready into implemented without evidence.

## Implementation Notes

### Existing code involved

Audited current files (paths relative to the backend repository):

- `scriptDatabase.sql`
- `initObjectDatabase.sql`
- `data/tools/generation/generate.mjs`
- `data/generated/sql/01-schema.sql`
- `data/generated/sql/04-recipes.sql`
- `src/Appetee.Application/Models/Recipes/RecipeCalculation.cs`
- `src/Appetee.Application/Dtos/RecipeDto.cs`
- `src/Appetee.Application/RowData/RecipeRowData.cs`
- `src/Appetee.Application/Services/Recipes/RecipeService.cs`
- `src/Appetee.Infrastructure/Recipes/RecipeQueries.cs`
- `src/Appetee.Infrastructure/Recipes/RecipeSql.cs`
- `src/Appetee.Infrastructure/Recipes/RecipeDiscoverySqlBuilder.cs`
- `tests/Appetee.Api.Tests/Unit/RecipeCalculatorTests.cs`
- `tests/Appetee.Api.Tests/Infrastructure/ApiTestDatabase.cs`
- `src/Appetee.Infrastructure/Data/IDbConnectionFactory.cs`
- `src/Appetee.Api/Controllers/ErrorsController.cs`
- `src/Appetee.Application/Abstractions/Recipes/IRecipeQueries.cs`
- `data/AGENTS.md`

Earlier-phase files to extend, not falsely assumed present at the audited snapshot:

None. Do not create speculative files for future phases.

The [File Manifest](../README.md#implementation-file-manifest) names first creator and subsequent editors. Preserve existing project/namespace conventions. Consult [repository audit](../README.md#preserved-repository-audit) before adapting changed source.

### Files to create

- `migrations/20261004_007_f011_recipe_fat.sql`
- `tests/Appetee.Api.Tests/Integration/F011B01RecipeNutritionTests.cs`

Each production class/module uses the responsibility/dependency rules in [backend map](Phase_B03_write_protocol_and_errors.md#shared-backend-architecture) or [frontend ownership map](../frontend/Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture). Test companions exercise behavior, not implementation-only snapshots. Do not create similarly named duplicate files elsewhere.

### Files to modify

- `scriptDatabase.sql`
- `initObjectDatabase.sql`
- `data/tools/generation/generate.mjs`
- `data/generated/sql/01-schema.sql`
- `data/generated/sql/04-recipes.sql`
- `src/Appetee.Application/Models/Recipes/RecipeCalculation.cs`
- `src/Appetee.Application/Dtos/RecipeDto.cs`
- `src/Appetee.Application/RowData/RecipeRowData.cs`
- `src/Appetee.Application/Services/Recipes/RecipeService.cs`
- `src/Appetee.Infrastructure/Recipes/RecipeQueries.cs`
- `src/Appetee.Infrastructure/Recipes/RecipeSql.cs`
- `src/Appetee.Infrastructure/Recipes/RecipeDiscoverySqlBuilder.cs`
- `tests/Appetee.Api.Tests/Unit/RecipeCalculatorTests.cs`
- `tests/Appetee.Api.Tests/Infrastructure/ApiTestDatabase.cs`

### Frontend changes

F01 adds `RecipeCardAdvance` and `RecipesApi.discoverForMealPlan`; F10 consumes that dedicated method. UI must display unknown fat honestly; no new cache in picker/page. Existing recipe cards and ordinary discovery/favorites remain on `RecipeCardDto`.

### UI states

This backend phase does not implement Angular views. Its frontend handoff above defines the required consumer behavior. Preserve typed loading/empty/error/stale/pending/confirmed states and map errors by stable code, not English detail text.

For any affected data consumer distinguish not loaded/loading, loaded-empty, ready, stale-refreshing and error; mutations additionally expose pending/failed/conflict/unknownOutcome. Saved means acknowledged latest intent. NULL target is no-target mode; NULL nutrient means unknown, not zero. Keep query errors independent from mutation errors.

### Responsive behavior

No UI implementation in this backend slice; preserve device-independent contracts for the paired frontend phase. Test long names, full item lists and narrow width without changing business behavior. Final visual references do not override the written layout rules.

### Accessibility

Backend returns stable field paths, warning/availability codes and explicit null states so the paired UI can announce meaningful errors and status. Validate the applicable keyboard/focus/error behavior in [UX and accessibility](../README.md#ux-and-accessibility-contract); do not rely only on color or tooltips.

### Out of scope

All other phase implementations unless explicitly listed as modifications; no broad migration of unrelated stores/services. No Templates, persisted weeks, target/recipe snapshots, fractional servings, flexible ingredients, recommendations, training-day model, recovery modifier, shopping list, batches or reusable foods/meals. Do not add a generic state/transaction framework as a substitute for the concrete slice.

### Common implementation mistakes

- COALESCE missing fat to0
- Editing generated SQL directly
- Changing seeded discovery ordering
- Adding fat only to creates but not updates
- Running reset scripts in production

## Dependencies

Approved contracts; inspect E-008 migration path and data/AGENTS.md. Do not run production rebuild scripts.

Mandatory accompanying contracts: [Decisions](../README.md#approved-decisions), [API](../README.md#canonical-api-contracts), [Data Model](../README.md#canonical-database-model), [Architecture](../README.md#shared-system-architecture), and [Frontend Data Flow](../frontend/Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture). Calculator phases also read [Nutrition Policy](../README.md#nutrition-calculation-policy). These are normative contract sections, not optional background. If a prerequisite is absent, implement that prerequisite first; do not bypass it with local component state, a new API, or an unsafe database reset.

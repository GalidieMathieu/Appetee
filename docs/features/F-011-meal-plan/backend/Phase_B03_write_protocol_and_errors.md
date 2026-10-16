# F-011 — Meal Plan — Backend — Phase B03

**Phase title:** Revision, ownership lock and write protocol

## Canonical Contract

The feature [README](../README.md) owns shared product behavior, data requirements, database impact, API/request/response contracts and error semantics. This file applies the backend template to one bounded phase. It does not redefine the shared contract.

**Phase:** B03
**Status:** Implemented — B03 backend foundation verified; later-phase endpoints remain out of scope.
**Specification:** Implementation follows this phase's bounded foundation scope. Verification evidence is recorded below.

## Backend Goal

Provide one tested transaction/revision mechanism used by every feature write and separate nutrition-profile updates.

## Authorization and Ownership

Session derives the owner. Join item→meal→day→user for child IDs; also match route date where supplied. Current requires scoped plan plus composite FK. A route guard/disabled button is never authorization. All unsafe browser calls use E-005 CSRF transport/validation and exact allowed API boundary. Use Dapper parameters, strict DTOs and named enum codes; escape displayed text through normal Angular binding. Pure calculation/GETs do not create persistent state.

## API Layer

Controllers bind/map request, session identity and revision, call the Application use case, map the canonical HTTP result and expose OpenAPI. No SQL or target calculation in controllers.

No new endpoint is introduced in this phase. Implement only the foundation/projection/test changes named above. Preserve existing public contracts; relevant complete endpoint shapes are in the canonical API appendix.

## Application Layer

Implement the named Application/Infrastructure/HTTP slice through the flow below. Controllers only bind/authenticate/delegate; services have no SQL; repositories own the entire atomic use case. Pure helpers contain the business rules. Register new use cases in existing DI extensions, not Program.cs ad-hoc service blocks.

## Domain Rules

- No connection types cross Application abstraction boundary.
- Missing/foreign target404; invalid session user401.
- No-op returns unchanged revision; real change increments exactly1.
- Missing/invalid revision400; stale409; no strong ETag claim.
- 15s per-command,30s overall copy; at most1 retry only after known deadlock rollback.
- No ambiguous commit retry, partial retry, hidden second connection or HTTP inside transaction.

## Persistence

No further schema. User row is the stable first lock even before settings exists. Lazily create settings within successful transaction only; increment revision once for actual change.

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

1. Parse expected revision as nonnegative signed BIGINT decimal header, no JSON numeric roundtrip.
2. Open one connection/READ COMMITTED transaction and lock users row FOR UPDATE.
3. Resolve owned target, read settings effective0, compare version; reject stale before mutation.
4. Execute Infrastructure-local callback with same connection/transaction and timestamp; ensure every Dapper command carries transaction and cancellation.
5. Read confirmed result before commit; commit once; return captured rows/version. Roll back with cleanup token on any failure.
6. Extend existing errors with optional stable code/field details, preserving callers and namespaces.

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

- Two independent connections submit same revision: exactly one changes data, other409.
- Concurrent first writes cannot create duplicate settings or days; aborted first write leaves no settings.
- Injected mid-callback/readback failure restores all rows/revision.
- Cancellation rollback completes; returned result cannot observe later transaction.
- Existing ApiException consumers compile/retain response status; new field errors and codes serialize with traceId.

Negative cases must assert unchanged data/revision/confirmed state, not just the returned status. Use synthetic two-user fixtures. Real MySQL is required for FK/CHECK/lock/rollback behavior; controlled Observables and HttpTestingController are appropriate for client races/serialization. Existing critical auth/discovery/profile behavior must remain compatible.

### Acceptance criteria

- [ ] Provide one tested transaction/revision mechanism used by every feature write and separate nutrition-profile updates.
- [ ] Two independent connections submit same revision: exactly one changes data, other409.
- [ ] Concurrent first writes cannot create duplicate settings or days; aborted first write leaves no settings.
- [ ] Injected mid-callback/readback failure restores all rows/revision.
- [ ] Cancellation rollback completes; returned result cannot observe later transaction.
- [ ] Existing ApiException consumers compile/retain response status; new field errors and codes serialize with traceId.
- [ ] All owned object operations scope to the session user and all multi-row writes share the common transaction/version protocol.
- [ ] No deferred approved scope or unrelated refactor is introduced.
- [ ] Build and named meaningful tests pass, with real results recorded; do not mark unrun integration tests passed.

### Completion verification

Implementation verified on 2026-10-06 in the backend repository: `dotnet build
Appetee.sln` succeeded with zero errors; the named `F011B03` filter passed 32/32;
the full backend suite passed 382/382, with no skipped tests. Database tests used
explicit opt-in and the guarded loopback `appetee_backend_tests` database only.
Six NU1900 build warnings report an unreachable NuGet vulnerability feed.
No new schema, migration, production database action, endpoint, or frontend
change was introduced by B03. The backend's `docs/f011-b03-verification.md`
records the file manifest, exact commands, prior interrupted-run timeout and
successful rerun, fault-injection limitations, and later E-005 deployment gate.

Working directory: Appetee_v2_BackEnd repository root. Use the repository’s installed SDK/package versions. Commands are for implementation, not commands executed while preparing this specification.

```bash
dotnet build Appetee.sln
dotnet test tests/Appetee.Api.Tests/Appetee.Api.Tests.csproj --filter 'FullyQualifiedName~F011B03'
```

Before any integration test that can rebuild data, prove isolated test host/database and explicit opt-in. Add the named tests from this phase before running its filter; a zero-test match is not success. For frontend, run the meaningful phase tests plus build; use the configured runner’s supported file selection when available rather than inventing a lint script. Inspect imports/state location and exercise the specified error path manually. Record actual result and limitations in the phase completion evidence; do not change specification-ready into implemented without evidence.

## Implementation Notes

### Existing code involved

Audited current files (paths relative to the backend repository):

- `src/Appetee.Application/Utils/ApiException.cs`
- `src/Appetee.Api/Controllers/ErrorsController.cs`
- `src/Appetee.Api/Extensions/InfrastructureServiceCollectionExtensions.cs`
- `src/Appetee.Api/Extensions/ApplicationServiceCollectionExtensions.cs`
- `src/Appetee.Infrastructure/Data/IDbConnectionFactory.cs`
- `src/Appetee.Infrastructure/Auth/AuthRepository.cs`
- `src/Appetee.Infrastructure/Properties/AssemblyInfo.cs`
- `tests/Appetee.Api.Tests/Infrastructure/AdjustableTimeProvider.cs`

Earlier-phase files to extend, not falsely assumed present at the audited snapshot:

None. Do not create speculative files for future phases.

The [File Manifest](../README.md#implementation-file-manifest) names first creator and subsequent editors. Preserve existing project/namespace conventions. Consult [repository audit](../README.md#preserved-repository-audit) before adapting changed source.

### Files to create

- `src/Appetee.Application/Models/MealPlans/MealPlanRules.cs`
- `src/Appetee.Application/Models/MealPlans/MealPlanWriteResult.cs`
- `src/Appetee.Infrastructure/MealPlans/MealPlanTransaction.cs`
- `src/Appetee.Infrastructure/MealPlans/MealPlanSql.cs`
- `src/Appetee.Api/Helpers/MealPlanRevisionHeader.cs`
- `tests/Appetee.Api.Tests/Unit/F011B03RevisionHeaderTests.cs`
- `tests/Appetee.Api.Tests/Integration/F011B03WriteProtocolTests.cs`

Each production class/module uses the responsibility/dependency rules in [backend map](Phase_B03_write_protocol_and_errors.md#shared-backend-architecture) or [frontend ownership map](../frontend/Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture). Test companions exercise behavior, not implementation-only snapshots. Do not create similarly named duplicate files elsewhere.

### Files to modify

- `src/Appetee.Application/Utils/ApiException.cs`
- `src/Appetee.Api/Controllers/ErrorsController.cs`
- `src/Appetee.Api/Extensions/InfrastructureServiceCollectionExtensions.cs`
- `src/Appetee.Api/Extensions/ApplicationServiceCollectionExtensions.cs`

### Frontend changes

F02 core MutationCoordinator/SyncService use these statuses and revision strings. UI drafts remain feature-local; no component is allowed to replace stale base revision with the newest context. Read/write/error state remains separate.

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

- Using singleton/open shared connection
- Incrementing revision on GET
- Treating scoped DI as a transaction
- Returning a fresh unlocked read after commit
- Retrying unknown outcome with new revision

### Shared backend architecture

All paths are relative to Appetee_v2_BackEnd. The generated [File Manifest](../README.md#implementation-file-manifest) lists exact create/modify paths by phase. Nothing in this package creates application classes or executable migrations.

#### Layer ownership

Api controllers obtain current user, bind DTOs/revision, call one use-case service and return status. No SQL, calculator or UI-dependent rule. Application services validate input and orchestrate a complete repository command; no DbConnection, MySqlConnector or Dapper. Pure Application models own policy, default names, arithmetic, copy structure and limits. Infrastructure owns SQL and transactional checks of current state; it returns typed RowData/write results. It can call pure Application helpers inside a transaction without opening a second connection.

Service interfaces remain alongside their implementation in Services/MealPlans. Persistence interfaces are Abstractions/MealPlans. DTOs, Requests and RowData are separate under their corresponding MealPlans subdirectories. Namespaces follow paths; preserve the existing lowercase `Appetee.Application.utils` when extending ApiException rather than making an unrelated namespace migration.

#### Service map

| Files under src/Appetee.Application/Services/MealPlans | Methods | Dependencies | Forbidden |
|---|---|---|---|
| INutritionCalculationService.cs / NutritionCalculationService.cs | Calculate(validated input, calculation date) | NutritionPolicy, calculation records | DB/HTTP/profile mutation |
| INutritionPlanService.cs / NutritionPlanService.cs | List/Get/Create/Update/Duplicate/Delete/SetCurrentAsync | plan queries/repository, calculator, mapper, TimeProvider | SQL, ad-hoc target constants, day rewriting |
| IMealPlannerService.cs / MealPlannerService.cs | GetRangeAsync | planner queries, read-model builder | writes on GET, frontend defaults |
| IMealService.cs / MealService.cs | Create/Rename/Delete/ReorderAsync | meal repository, pure rules/read-model builder | unrelated plan lifecycle |
| IMealItemService.cs / MealItemService.cs | AddRecipe/SetRecipeQuantity/AddManual/UpdateManual/Remove/ReorderAsync | item repository, pure rules/read-model builder | HTTP per recipe, client nutrient trust |
| IPlannerCopyService.cs / PlannerCopyService.cs | CopyDay/CopyWeekAsync | copy repository, date/copy rules/read-model builder | separate transaction per day |
| NutritionPlanMapper.cs | map summary/detail/context | RowData, policy warning presentation | recalculating metadata-only edits |
| MealPlanReadModelBuilder.cs | normalized range/affected-day DTOs | MealDefaults, MealPlanNutrition, rows | SQL or persistent virtual rows |

Existing Services/Users/IUserService.cs and UserService.cs add GetNutritionProfileAsync and UpdateNutritionProfileAsync. They use existing IUserQueries/IUserRepository extended with separate nutrition methods. Existing username/image methods remain intact. Profile write uses the same Infrastructure user-lock/revision protocol as plans; no independent commit before a plan create/recalculation.

#### Persistence map

Interfaces: INutritionPlanQueries (list/detail contexts), INutritionPlanRepository (all atomic plan/Current writes), IMealPlannerQueries (range snapshot), IMealRepository (complete meal commands), IMealItemRepository (complete item commands), IPlannerCopyRepository (copy). No controller/service combines primitive table repositories into a transaction it cannot own.

Under Infrastructure/MealPlans: corresponding Queries/Repository classes use purpose-specific NutritionPlanSql, MealPlannerSql, MealSql, MealItemSql and PlannerCopySql. Shared MealPlanSql owns user lock/settings/version SQL. Internal MealPlanTransaction owns one connection/transaction and the common protocol, accepting Infrastructure-local operation callbacks only; do not leak connection types into Application interfaces. Internal NutritionPlanReader and MealPlannerReader accept the existing connection/transaction for readback and are reused by public queries that own read connections.

Use CommandDefinition for cancellation, transaction and timeout. Default max15s per SQL command, max30s whole copy. Batch operations respect max_allowed_packet with a bounded parameter chunk size verified against deployment; this is not a reason for per-item queries. Never infer generated IDs by LAST_INSERT_ID()+offset; select newly inserted owner/date and parent/order mappings after bulk insert.

#### Application models

Models/MealPlans/NutritionPolicy.cs: versioned constants and code tables. NutritionCalculation.cs: pure input/output/warnings. MealPlanRules.cs: caps, names, static validation and structural predicates. MealDefaults.cs: exact1–8 names. MealPlanNutrition.cs: canonical per-serving rounding, aggregate unknown propagation, remaining. MealPlanWriteResult.cs: generic persistence-neutral `{revision,changed,payload}` wrapper. PlannerCopyBuilder.cs: source saved/absent classification and exact deep-copy structure independent of DB IDs.

No helper may quietly read repositories; keep pure helpers unit-testable. Resource ownership is expressed in Application intent and enforced by Infrastructure scoped lookup under lock. Validation depending on counts/default existence/type belongs under that lock, not only in a preflight query.

#### Controllers and error integration

NutritionPlansController owns plan/preview routes. MealPlannerController owns range/meal/item/order/copy routes with thin actions. MealPlanSettingsController owns Current PUT. UsersController adds separate nutrition-profile actions. API Helpers/MealPlanRevisionHeader.cs parses header values; do not copy parsing into each action.

Extend ValidationException and ConflictException with optional code/field information while preserving existing constructor usage. ErrorsController maps field errors consistently and keeps traceId; no feature-specific parallel envelope. Preserve existing 401 session semantics. Register scoped services/repositories in the existing ApplicationServiceCollectionExtensions and InfrastructureServiceCollectionExtensions. Register TimeProvider.System once in composition; tests inject a fake date. Configure strict request JSON mapping without changing unrelated wire enums globally.

#### Recipe prerequisite and generated data

RecipeCalculation.cs adds nullable FatG/FatTotal without weakening existing required core nutrients. RecipeSql and RecipeQueries must load fat, persist totals on both create/update, and project picker description/macros. Extend RecipeDto, RecipeRowData and RecipeService mapping. RecipeDiscoverySqlBuilder selects necessary columns without changing seeded ordering/cursor semantics. API favorites/discovery share compatible projected cards; no per-card preview query.

Change scriptDatabase.sql and relevant bootstrap seed source, then the canonical generator at data/tools/generation/generate.mjs. Regenerate data/generated/sql/01-schema.sql and04-recipes.sql; follow data/AGENTS.md. Do not rewrite canonical recipe IDs, images, unrelated instructions, or manually edit generated SQL. Production migration is separate and nondestructive.

#### Transaction flow for copy

Validate dates → lock user → compare revision → read source saved graph/sparse state → validate source references → check overwrite confirmation → remove destinations → insert saved destination dates → batch meals → obtain meal mappings → batch items → obtain item mappings → batch manual details → increment revision → read destination normalized context → commit. Source is fully captured before any removal. Week starts distinct Monday dates, so overlap is excluded. Cancellation/fault in any step rolls back all seven dates. Use existing recipe compatibility; do not silently skip unavailable foods.

#### Read shape and query bounds

Read current/settings, days, meals, items/manual/recipe projections in four result sets under consistent snapshot. Do not hydrate cards/ingredients/instructions because planner needs names and nutrients only. Compatibility must yield an availability flag instead of filtering saved items. Missing manual detail is an integrity error. Missing canonical recipe should be impossible under FK; defensive read still surfaces unavailable rather than data loss.

#### Engineering prerequisites

E-005: antiforgery token/bootstrap/unsafe-method validation and Angular exact-origin transport. E-002: enforce administrative authoring policy. E-008: migration runner/history, deployment evidence, local/test reset guards and least-privileged identities. These are linked at docs/engineering/initiatives in the real docs repository; this portable bundle records prerequisite requirements in the README testing and release contract instead of pretending the initiatives were implemented.

No unit/integration test was executed against production during specification creation. Implementation must verify schema, runtime and migration versions; real-MySQL transaction/constraint tests cannot be replaced by SQLite or in-memory mocks.


## Dependencies

B02. E-005 must be available before deploying any exposed state endpoint; helper tests may run on isolated MySQL.

Mandatory accompanying contracts: [Decisions](../README.md#approved-decisions), [API](../README.md#canonical-api-contracts), [Data Model](../README.md#canonical-database-model), [Architecture](../README.md#shared-system-architecture), and [Frontend Data Flow](../frontend/Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture). Calculator phases also read [Nutrition Policy](../README.md#nutrition-calculation-policy). These are normative contract sections, not optional background. If a prerequisite is absent, implement that prerequisite first; do not bypass it with local component state, a new API, or an unsafe database reset.

# F-011 — Meal Plan — Backend — Phase B06

**Phase title:** Nutrition Plan list/detail/create

## Canonical Contract

The feature [README](../README.md) owns shared product behavior, data requirements, database impact, API/request/response contracts and error semantics. This file applies the backend template to one bounded phase. It does not redefine the shared contract.

**Phase:** B06
**Status:** Implemented and verified (backend only, 2026-10-06)
**Specification:** Implemented against the canonical contract; completion evidence and verification limitations are recorded below.

## Backend Goal

Implement both modes, reproducible provenance, bounded reads and first-Current creation atomically.

## Authorization and Ownership

Session derives the owner. Join item→meal→day→user for child IDs; also match route date where supplied. Current requires scoped plan plus composite FK. A route guard/disabled button is never authorization. All unsafe browser calls use E-005 CSRF transport/validation and exact allowed API boundary. Use Dapper parameters, strict DTOs and named enum codes; escape displayed text through normal Angular binding. Pure calculation/GETs do not create persistent state.

## API Layer

Controllers bind/map request, session identity and revision, call the Application use case, map the canonical HTTP result and expose OpenAPI. No SQL or target calculation in controllers.

### NP04: GET /api/nutrition-plans

Purpose: List owned plans and Current context. Authentication required; owner comes from session, foreign/missing owned objects both 404. Parameters: none. No extra query parameters.

- Request `none`: No request body. Do not invent optional mutation inputs.
- Response `NutritionPlanListDto`: revision,settings,plans:summary[]; summaries omit complete calculation inputs. Success: 200.
- Application: `NutritionPlanService.ListAsync` → Infrastructure: `NutritionPlanQueries.ListAsync`.
- Frontend: core `NutritionPlanFacade.loadList`; feature flow delegates, UI never calls HTTP directly.
- Transaction class **R**: read-only coherent snapshot; never create rows.
- Specific rule: Own max50 plans, Current first then updated_at DESC,id DESC. No pagination needed at this cap.
- UI contract: Core list projection, separate from detail cache; loading/error owned by list query.

Errors include 400 validation,401 session,404 scoped unavailable,409 business/version conflict and500 unexpected; unsafe calls require CSRF. Writes require X-Meal-Plan-Revision; reads/preview do not. Request/response nested fields are the normative API appendix linked above; do not invent a parallel shape.

### NP05: GET /api/nutrition-plans/{planId}

Purpose: Load complete plan for edit. Authentication required; owner comes from session, foreign/missing owned objects both 404. Parameters: planId route int. No extra query parameters.

- Request `none`: No request body. Do not invent optional mutation inputs.
- Response `NutritionPlanDetailDto`: revision,settings,plan:complete NutritionPlanDto,profileDiffers. Only complete plan enters detail cache. Success: 200.
- Application: `NutritionPlanService.GetAsync` → Infrastructure: `NutritionPlanQueries.GetAsync`.
- Frontend: core `NutritionPlanFacade.loadDetail`; feature flow delegates, UI never calls HTTP directly.
- Transaction class **R**: read-only coherent snapshot; never create rows.
- Specific rule: Scoped ID; missing/foreign404. profileDiffers compares current profile to stored inputs, not a forced recalculation.
- UI contract: Core complete detail cache record with observed revision; initialize draft once, never continuously patch it from cache.

Errors include 400 validation,401 session,404 scoped unavailable,409 business/version conflict and500 unexpected; unsafe calls require CSRF. Writes require X-Meal-Plan-Revision; reads/preview do not. Request/response nested fields are the normative API appendix linked above; do not invent a parallel shape.

### NP06: POST /api/nutrition-plans

Purpose: Create Easy/Intermediate plan. Authentication required; owner comes from session, foreign/missing owned objects both 404. Parameters: none. No extra query parameters.

- Request `CreateNutritionPlanRequest`: name1–80, mode easy/intermediate, defaultMealsPerDay1–8; Intermediate requires calculation plus reviewedPolicyVersion and reviewedCalculationYear; Easy omits them.
- Response `NutritionPlanMutationDto`: revision,settings,plan|null,deletedPlanId|null,profile|null,plannerInvalidated. Null profile means unchanged, not erase. Success: 201 + plan Location.
- Application: `NutritionPlanService.CreateAsync` → Infrastructure: `NutritionPlanRepository.CreateAsync`.
- Frontend: core `NutritionPlanFacade.create`; feature flow delegates, UI never calls HTTP directly.
- Transaction class **W**: one complete user-locked, revision-checked transaction including readback before commit.
- Specific rule: Mode shape/name/count/cap; server recomputation and reviewed policy/year. Profile+plan+first Current one commit. Name/cap/preview conflict409.
- UI contract: Explicit Create; disable duplicate submit. Core sync before route navigation; wizard reset only after receipt.

Errors include 400 validation,401 session,404 scoped unavailable,409 business/version conflict and500 unexpected; unsafe calls require CSRF. Writes require X-Meal-Plan-Revision; reads/preview do not. Request/response nested fields are the normative API appendix linked above; do not invent a parallel shape.

## Application Layer

Implement the named Application/Infrastructure/HTTP slice through the flow below. Controllers only bind/authenticate/delegate; services have no SQL; repositories own the entire atomic use case. Pure helpers contain the business rules. Register new use cases in existing DI extensions, not Program.cs ad-hoc service blocks.

## Domain Rules

- Name trimmed NFC1–80, unique per user under database collation; max50; count1–8.
- Easy rejects all calculation/review fields, never copies user’s existing profile into plan.
- Intermediate requires explicit inputs and review tokens; no accepted client targets.
- Current is server-controlled; first whennone, not everycreate.
- Birth-year/age policy frozen in plan; no day rows created.
- List summary is deliberately incomplete compared with detail.

## Persistence

Use nutrition_plans/settings/users. No extra schema. Easy calculation columns all null; Intermediate stores full actual inputs and calculated targets.

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

1. List uses owner filter, bounded summaries and settings/revision; Current first then updated/id descending.
2. Get detail owner-scoped, full provenance, profileDiffers; do not pass another user ID.
3. Create validates mode/name/count/cap and reviewed policy/year; server recomputes Intermediate.
4. Inside one transaction save supplied current profile, plan, and Current pointer only if currently null.
5. Read complete created plan/settings/profile and commit; return201 with canonical plan Location.

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

- Create Easy with/without saved profile produces all-null calc block.
- Create Intermediate atomically updates profile/plan/Current; injected failure leaves none of partial changes.
- Second plan does not replace Current; concurrent creates serialize against caps/names.
- Other-owner GET404; name accent/case collision409; overposted Current/targets400.
- Preview year/version drift409 and no rows; list order/projection correct.

Negative cases must assert unchanged data/revision/confirmed state, not just the returned status. Use synthetic two-user fixtures. Real MySQL is required for FK/CHECK/lock/rollback behavior; controlled Observables and HttpTestingController are appropriate for client races/serialization. Existing critical auth/discovery/profile behavior must remain compatible.

### Acceptance criteria

- [x] Implement both modes, reproducible provenance, bounded reads and first-Current creation atomically.
- [x] Create Easy with/without saved profile produces all-null calc block.
- [x] Create Intermediate atomically updates profile/plan/Current; injected failure leaves none of partial changes.
- [x] Second plan does not replace Current; concurrent creates serialize against caps/names.
- [x] Other-owner GET404; name accent/case collision409; overposted Current/targets400.
- [x] Preview year/version drift409 and no rows; list order/projection correct.
- [x] All owned object operations scope to the session user and all multi-row writes share the common transaction/version protocol.
- [x] No deferred approved scope or unrelated refactor is introduced.
- [x] Build and named meaningful tests pass, with real results recorded; do not mark unrun integration tests passed.

### Completion verification

Working directory: Appetee_v2_BackEnd repository root. Use the repository’s installed SDK/package versions. Commands are for implementation, not commands executed while preparing this specification.

```bash
dotnet build Appetee.sln
dotnet test tests/Appetee.Api.Tests/Appetee.Api.Tests.csproj --filter 'FullyQualifiedName~F011B06'
```

Before any integration test that can rebuild data, prove isolated test host/database and explicit opt-in. Add the named tests from this phase before running its filter; a zero-test match is not success. For frontend, run the meaningful phase tests plus build; use the configured runner’s supported file selection when available rather than inventing a lint script. Inspect imports/state location and exercise the specified error path manually. Record actual result and limitations in the phase completion evidence; do not change specification-ready into implemented without evidence.

### Recorded implementation verification

Implemented in `C:\Users\galid\Documents\Appetee\Backend`. Prior dirty/untracked
B01–B05, security, migration/generated-SQL, and unrelated changes were preserved.
Only backend B06 and its documentation were changed; no frontend or B07+ work.

- `dotnet build Appetee.sln`: passed, 0 errors, 6 NU1900 warnings (NuGet
  vulnerability feed unavailable; vulnerability audit remains unverified).
- `dotnet test tests/Appetee.Api.Tests/Appetee.Api.Tests.csproj --no-build --no-restore --filter FullyQualifiedName~F011B06 --logger 'console;verbosity=normal'`:
  final 75/75 passed, zero failed/skipped; total time 3.2932 minutes, .NET 10.0.11.
- A full regression invocation passed 684/685; its sole failure was a MySQL timeout
  in isolated fixture reset before an auth-test body ran. It is not claimed green.
  The entire auth group subsequently passed 21/21, including that test, in a
  focused B06/auth rerun. A new logging-test assertion failed in that rerun because
  415 short-circuits before the action filter; after correcting the assertion,
  the focused logging test and final 75-case B06 run passed.
- Integration opt-in: `APPETEE_RUN_DB_INTEGRATION_TESTS=true`; fixture enforces
  loopback MySQL and fixed `appetee_backend_tests`. No production/developer DB,
  manual reset script, or new migration was used. Temporary failure triggers,
  synthetic rows, ANALYZE and EXPLAIN were confined to the isolated fixture.
- EXPLAIN covered list/detail/Current/count/name paths on a selective 11-owner,
  50-plans-per-owner fixture; existing indexes suffice. No schema/generated-SQL
  change is required. Existing UserSql profile statements are reused transactionally.

Full file manifest, exact commands, prior failed-run details, and limitations:
[`Backend/docs/f011-b06-verification.md`](../../../../../Backend/docs/f011-b06-verification.md).

## Implementation Notes

### Existing code involved

Audited current files (paths relative to the backend repository):

- `src/Appetee.Api/Extensions/ApplicationServiceCollectionExtensions.cs`
- `src/Appetee.Api/Extensions/InfrastructureServiceCollectionExtensions.cs`
- `src/Appetee.Infrastructure/Users/UserSql.cs`
- `src/Appetee.Infrastructure/Data/IDbConnectionFactory.cs`
- `src/Appetee.Api/Controllers/ErrorsController.cs`

Earlier-phase files to extend, not falsely assumed present at the audited snapshot:

- `src/Appetee.Api/Controllers/NutritionPlansController.cs`

The [File Manifest](../README.md#implementation-file-manifest) names first creator and subsequent editors. Preserve existing project/namespace conventions. Consult [repository audit](../README.md#preserved-repository-audit) before adapting changed source.

### Files to create

- `src/Appetee.Application/Dtos/MealPlans/NutritionPlanDtos.cs`
- `src/Appetee.Application/Requests/MealPlans/NutritionPlanRequests.cs`
- `src/Appetee.Application/RowData/MealPlans/NutritionPlanRowData.cs`
- `src/Appetee.Application/Abstractions/MealPlans/INutritionPlanQueries.cs`
- `src/Appetee.Application/Abstractions/MealPlans/INutritionPlanRepository.cs`
- `src/Appetee.Application/Services/MealPlans/INutritionPlanService.cs`
- `src/Appetee.Application/Services/MealPlans/NutritionPlanService.cs`
- `src/Appetee.Application/Services/MealPlans/NutritionPlanMapper.cs`
- `src/Appetee.Infrastructure/MealPlans/NutritionPlanQueries.cs`
- `src/Appetee.Infrastructure/MealPlans/NutritionPlanRepository.cs`
- `src/Appetee.Infrastructure/MealPlans/NutritionPlanSql.cs`
- `src/Appetee.Infrastructure/MealPlans/NutritionPlanReader.cs`
- `tests/Appetee.Api.Tests/Integration/F011B06NutritionPlansTests.cs`

Each production class/module uses the responsibility/dependency rules in [backend map](Phase_B03_write_protocol_and_errors.md#shared-backend-architecture) or [frontend ownership map](../frontend/Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture). Test companions exercise behavior, not implementation-only snapshots. Do not create similarly named duplicate files elsewhere.

### Files to modify

- `src/Appetee.Api/Controllers/NutritionPlansController.cs`
- `src/Appetee.Api/Extensions/ApplicationServiceCollectionExtensions.cs`
- `src/Appetee.Api/Extensions/InfrastructureServiceCollectionExtensions.cs`
- `src/Appetee.Infrastructure/Users/UserSql.cs`

### Frontend changes

F04 core list and complete detail stores stay separate; F05/F06 explicit Create goes through core coordinator. Receipt updates core plan/profile/settings before navigation. Feature drafts disappear only on acknowledged success.

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

- Accepting browser-calculated targets
- Partial user-profile commit before plan
- Hydrating detail cache from list cards
- Automatically changing Current on everycreate
- Creating all default meals during plan creation

## Dependencies

B03–B05. E-005 for create; actual schema B02.

Mandatory accompanying contracts: [Decisions](../README.md#approved-decisions), [API](../README.md#canonical-api-contracts), [Data Model](../README.md#canonical-database-model), [Architecture](../README.md#shared-system-architecture), and [Frontend Data Flow](../frontend/Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture). Calculator phases also read [Nutrition Policy](../README.md#nutrition-calculation-policy). These are normative contract sections, not optional background. If a prerequisite is absent, implement that prerequisite first; do not bypass it with local component state, a new API, or an unsafe database reset.

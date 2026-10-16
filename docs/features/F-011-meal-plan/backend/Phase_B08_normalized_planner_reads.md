# F-011 — Meal Plan — Backend — Phase B08

**Phase title:** Sparse normalized planner range

## Canonical Contract

The feature [README](../README.md) owns shared product behavior, data requirements, database impact, API/request/response contracts and error semantics. This file applies the backend template to one bounded phase. It does not redefine the shared contract.

**Phase:** B08
**Status:** Implemented and scoped backend tests verified (2026-10-12); full-run/rerun limitations recorded below.
**Specification:** Implemented against the canonical contract and approved warning rules; no frontend work.

## Backend Goal

Return one authoritative projection for every requested date, including virtual defaults, saved empty dates and complete/incomplete nutrition.

## Authorization and Ownership

Session derives the owner. Join item→meal→day→user for child IDs; also match route date where supplied. Current requires scoped plan plus composite FK. A route guard/disabled button is never authorization. All unsafe browser calls use E-005 CSRF transport/validation and exact allowed API boundary. Use Dapper parameters, strict DTOs and named enum codes; escape displayed text through normal Angular binding. Pure calculation/GETs do not create persistent state.

## API Layer

Controllers bind/map request, session identity and revision, call the Application use case, map the canonical HTTP result and expose OpenAPI. No SQL or target calculation in controllers.

### MP01: GET /api/meal-plan/days

Purpose: Load normalized planner range. Authentication required; owner comes from session, foreign/missing owned objects both 404. Parameters: from, through required inclusive ISO dates. No extra query parameters.

- Request `none`: No request body. Do not invent optional mutation inputs.
- Response `MealPlannerRangeDto`: revision,settings,from,through,days:normalized PlannerDayDto[] for every requested date including absent/empty. Success: 200.
- Application: `MealPlannerService.GetRangeAsync` → Infrastructure: `MealPlannerQueries.GetRangeAsync`.
- Frontend: core `MealPlannerFacade.loadRange`; feature flow delegates, UI never calls HTTP directly.
- Transaction class **R**: read-only coherent snapshot; never create rows.
- Specific rule: 1–7 dates; absent settings revision0; absent days virtual, saved-empty distinct. Four bounded result sets, no writes.
- UI contract: Core keyed range query; stale generations discarded; route entry/focus revalidate.

Errors include 400 validation,401 session,404 scoped unavailable,409 business/version conflict and500 unexpected; unsafe calls require CSRF. Writes require X-Meal-Plan-Revision; reads/preview do not. Request/response nested fields are the normative API appendix linked above; do not invent a parallel shape.

## Application Layer

Implement the named Application/Infrastructure/HTTP slice through the flow below. Controllers only bind/authenticate/delegate; services have no SQL; repositories own the entire atomic use case. Pure helpers contain the business rules. Register new use cases in existing DI extensions, not Program.cs ad-hoc service blocks.

## Domain Rules

- No Current means no default slots or targets, while planning remains available.
- Easy has default slots and planned totals, with null targets/remaining.
- A saved empty day gets no virtual defaults.
- Missing fat makes only fat unknown; an unavailable recipe makes all affected nutrient totals incomplete.
- Remaining may be negative; do not clamp its numeric value.
- Default names for counts1–8 are exact; savedMealCount excludes virtual placeholders.

## Persistence

No schema/writes. Range index(user_id,plan_date) plus child parent/order indexes. Use REPEATABLE READ coherent snapshot.

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

1. Validate the inclusive interval of1–7 dates and open a coherent read snapshot.
2. Read settings/current plan, saved days, meals and joined items in four result sets.
3. Preserve incompatible recipes with an availability flag; a missing manual detail is an integrity error.
4. Create virtual projections only for absent dates with Current defaults.
5. Calculate per-serving values, manual totals, parent totals and remaining in Application.
6. Return sorted normalized dates/context without any insert or timestamp update.

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

- Browse past/future dates and assert unchanged row counts/revisions.
- Verify all default counts and saved-empty versus untouched representations.
- Mixed recipe/manual golden totals include33.33×3=99.99, null fat and unavailable placeholders.
- Exclude another user’s data and reject malformed/oversized ranges.
- Verify bounded query count and indexed EXPLAIN; concurrent Current changes cannot mix contexts.

Negative cases must assert unchanged data/revision/confirmed state, not just the returned status. Use synthetic two-user fixtures. Real MySQL is required for FK/CHECK/lock/rollback behavior; controlled Observables and HttpTestingController are appropriate for client races/serialization. Existing critical auth/discovery/profile behavior must remain compatible.

### Acceptance criteria

- [x] Return one authoritative projection for every requested date, including virtual defaults, saved empty dates and complete/incomplete nutrition.
- [x] Browse past/future dates and assert unchanged row counts/revisions.
- [x] Verify all default counts and saved-empty versus untouched representations.
- [x] Mixed recipe/manual golden totals include33.33×3=99.99, null fat and unavailable placeholders.
- [x] Exclude another user’s data and reject malformed/oversized ranges.
- [x] Verify bounded query count and indexed EXPLAIN; concurrent Current changes cannot mix contexts.
- [x] All owned object operations scope to the session user and all multi-row writes share the common transaction/version protocol.
- [x] No deferred approved scope or unrelated refactor is introduced.
- [x] Build and named meaningful tests pass, with real results recorded; do not mark unrun integration tests passed.

### Completion verification

Working directory: Appetee_v2_BackEnd repository root. Use the repository’s installed SDK/package versions. Commands are for implementation, not commands executed while preparing this specification.

```bash
dotnet build Appetee.sln
dotnet test tests/Appetee.Api.Tests/Appetee.Api.Tests.csproj --filter 'FullyQualifiedName~F011B08'
```

Before any integration test that can rebuild data, prove isolated test host/database and explicit opt-in. Add the named tests from this phase before running its filter; a zero-test match is not success. For frontend, run the meaningful phase tests plus build; use the configured runner’s supported file selection when available rather than inventing a lint script. Inspect imports/state location and exercise the specified error path manually. Record actual result and limitations in the phase completion evidence; do not change specification-ready into implemented without evidence.

### Recorded implementation verification (2026-10-12)

Implemented in `C:\Users\galid\Documents\Appetee\Backend`, preserving earlier
B01-B07/security/migrator work, dirty/untracked changes and historical migrations.
Latest authorized scope: E-002 plus B08/B09 only; B10-B15 are not implemented.

- `dotnet build Appetee.sln --no-restore --verbosity minimal`: passed, zero errors
  and warnings, 23.36s.
- Combined E002/Admin/AuthCookie/B01-recipe/E005/F011B08/F011B09 filter with
  `--no-build --no-restore`: 192/192 passed, zero failed/skipped, 9m04s.
  Named phase tests are included; this is not a zero-test filter.
- Database tests explicitly opted in with APPETEE_RUN_DB_INTEGRATION_TESTS=true;
  fixture enforces loopback and appetee_backend_tests. No local appetee or
  production reset/migration/grant occurred. This phase adds no schema/migration.
- Initial full regression: 883/885 passed, two failures (isolated fixture-reset
  timeout and an older upgrade fixture that retained migration 010's schema).
  The synthetic fixture was corrected; affected rerun passed 9/9, zero skipped,
  26s. Final rebuild passed with zero errors/warnings, 16.63s. The original full
  report is preserved; a fresh entirely green full-suite rerun is not claimed.

Exact files, coverage, commands, saved reports and deployment limitations:
[`Backend/docs/e002-b08-b09-verification.md`](../../../../../Backend/docs/e002-b08-b09-verification.md).
Resume checkpoint: `Backend/docs/e002-f011-progress.md`.

## Implementation Notes

### Existing code involved

Audited current files (paths relative to the backend repository):

- `src/Appetee.Api/Extensions/ApplicationServiceCollectionExtensions.cs`
- `src/Appetee.Api/Extensions/InfrastructureServiceCollectionExtensions.cs`
- `src/Appetee.Infrastructure/Data/IDbConnectionFactory.cs`
- `src/Appetee.Api/Controllers/ErrorsController.cs`
- `src/Appetee.Infrastructure/Recipes/RecipeCompatibilitySql.cs`
- `src/Appetee.Application/Models/Recipes/RecipeCalculation.cs`

Earlier-phase files to extend, not falsely assumed present at the audited snapshot:

None. Do not create speculative files for future phases.

The [File Manifest](../README.md#implementation-file-manifest) names first creator and subsequent editors. Preserve existing project/namespace conventions. Consult [repository audit](../README.md#preserved-repository-audit) before adapting changed source.

### Files to create

- `src/Appetee.Application/Dtos/MealPlans/MealPlannerDtos.cs`
- `src/Appetee.Application/RowData/MealPlans/MealPlannerRowData.cs`
- `src/Appetee.Application/Models/MealPlans/MealDefaults.cs`
- `src/Appetee.Application/Models/MealPlans/MealPlanNutrition.cs`
- `src/Appetee.Application/Services/MealPlans/MealPlanReadModelBuilder.cs`
- `src/Appetee.Application/Services/MealPlans/IMealPlannerService.cs`
- `src/Appetee.Application/Services/MealPlans/MealPlannerService.cs`
- `src/Appetee.Application/Abstractions/MealPlans/IMealPlannerQueries.cs`
- `src/Appetee.Infrastructure/MealPlans/MealPlannerQueries.cs`
- `src/Appetee.Infrastructure/MealPlans/MealPlannerSql.cs`
- `src/Appetee.Infrastructure/MealPlans/MealPlannerReader.cs`
- `src/Appetee.Api/Controllers/MealPlannerController.cs`
- `tests/Appetee.Api.Tests/Unit/F011B08ReadModelTests.cs`
- `tests/Appetee.Api.Tests/Integration/F011B08PlannerReadTests.cs`

Each production class/module uses the responsibility/dependency rules in [backend map](Phase_B03_write_protocol_and_errors.md#shared-backend-architecture) or [frontend ownership map](../frontend/Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture). Test companions exercise behavior, not implementation-only snapshots. Do not create similarly named duplicate files elsewhere.

### Files to modify

- `src/Appetee.Api/Extensions/ApplicationServiceCollectionExtensions.cs`
- `src/Appetee.Api/Extensions/InfrastructureServiceCollectionExtensions.cs`

### Frontend changes

F08 stores the full range in core MealPlannerStore keyed by dates, not page.days. Workspace state holds selected date/task only. UI formats server totals, never builds defaults or sums ingredients.

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

- INSERT dayduringGET
- ReturningonlysavedrowsandduplicatingdefaultlogicinTS
- Filtering unavailableitemsout
- UTCconvertingcalendarDateOnly
- Per-recipepreviewquery

## Dependencies

B01/B07, existing compatibility predicate and recipe per-serving rules.

Mandatory accompanying contracts: [Decisions](../README.md#approved-decisions), [API](../README.md#canonical-api-contracts), [Data Model](../README.md#canonical-database-model), [Architecture](../README.md#shared-system-architecture), and [Frontend Data Flow](../frontend/Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture). Calculator phases also read [Nutrition Policy](../README.md#nutrition-calculation-policy). These are normative contract sections, not optional background. If a prerequisite is absent, implement that prerequisite first; do not bypass it with local component state, a new API, or an unsafe database reset.

# F-011 — Meal Plan — Backend — Phase B12

**Phase title:** Dense meal and item reordering

## Canonical Contract

The feature [README](../README.md) owns shared product behavior, data requirements, database impact, API/request/response contracts and error semantics. This file applies the backend template to one bounded phase. It does not redefine the shared contract.

**Phase:** B12
**Status:** Backend implemented and full backend suite verified (2026-10-15). Deployment/frontend pending.
**Specification:** Canonical API retained; no schema change.

## Backend Goal

Persist complete permutations safely in one mutation without unique-position swap failures or parent reassignment.

## Authorization and Ownership

Session derives the owner. Join item→meal→day→user for child IDs; also match route date where supplied. Current requires scoped plan plus composite FK. A route guard/disabled button is never authorization. All unsafe browser calls use E-005 CSRF transport/validation and exact allowed API boundary. Use Dapper parameters, strict DTOs and named enum codes; escape displayed text through normal Angular binding. Pure calculation/GETs do not create persistent state.

## API Layer

Controllers bind/map request, session identity and revision, call the Application use case, map the canonical HTTP result and expose OpenAPI. No SQL or target calculation in controllers.

### MP05: PUT /api/meal-plan/days/{date}/meal-order

Purpose: Persist complete saved-meal ordering. Authentication required; owner comes from session, foreign/missing owned objects both 404. Parameters: date route. No extra query parameters.

- Request `ReorderRequest`: orderedIds:unique positive INT array exactly matching current saved parent membership; no virtual IDs or reparenting.
- Response `PlannerMutationDto`: revision,settings,days:confirmed affected date projections,createdMealId|null,createdItemId|null. Current target/default context is included. Success: 200.
- Application: `MealService.ReorderAsync` → Infrastructure: `MealRepository.ReorderAsync`.
- Frontend: core `MealPlannerFacade.reorderMeals`; feature flow delegates, UI never calls HTTP directly.
- Transaction class **W**: one complete user-locked, revision-checked transaction including readback before commit.
- Specific rule: Owned saved day; exact membership; no virtual IDs or reparenting. Empty saved day accepts[] no-op. Absent day404.
- UI contract: Temporary drag preview or move controls; one request after drop; restore confirmed sequence on failure.

Errors include 400 validation,401 session,404 scoped unavailable,409 business/version conflict and500 unexpected; unsafe calls require CSRF. Writes require X-Meal-Plan-Revision; reads/preview do not. Request/response nested fields are the normative API appendix linked above; do not invent a parallel shape.

### MP11: PUT /api/meal-plan/meals/{mealId}/item-order

Purpose: Persist full item ordering. Authentication required; owner comes from session, foreign/missing owned objects both 404. Parameters: mealId route int. No extra query parameters.

- Request `ReorderRequest`: orderedIds:unique positive INT array exactly matching current saved parent membership; no virtual IDs or reparenting.
- Response `PlannerMutationDto`: revision,settings,days:confirmed affected date projections,createdMealId|null,createdItemId|null. Current target/default context is included. Success: 200.
- Application: `MealItemService.ReorderAsync` → Infrastructure: `MealItemRepository.ReorderAsync`.
- Frontend: core `MealPlannerFacade.reorderItems`; feature flow delegates, UI never calls HTTP directly.
- Transaction class **W**: one complete user-locked, revision-checked transaction including readback before commit.
- Specific rule: Owned saved meal; full exact membership both subtypes; reject duplicate, omitted, foreign, other-parent IDs.
- UI contract: One completed move; temporary order overlay only; no canonical store mutation before receipt.

Errors include 400 validation,401 session,404 scoped unavailable,409 business/version conflict and500 unexpected; unsafe calls require CSRF. Writes require X-Meal-Plan-Revision; reads/preview do not. Request/response nested fields are the normative API appendix linked above; do not invent a parallel shape.

## Application Layer

Implement the named Application/Infrastructure/HTTP slice through the flow below. Controllers only bind/authenticate/delegate; services have no SQL; repositories own the entire atomic use case. Pure helpers contain the business rules. Register new use cases in existing DI extensions, not Program.cs ad-hoc service blocks.

## Domain Rules

- Virtual IDs are never accepted.
- An empty list is valid only for an already-empty saved parent.
- Another parent’s ID is invalid even when owned by the same user.
- ID tie-breaking makes reads deterministic but does not replace the dense-order invariant.
- The endpoint accepts a full permutation, not ambiguous before/after pointers.

## Persistence

No new schema in this phase. Use the approved six tables, owner-scoped joins, existing indexes and one revision-checked transaction. Preserve the exact lifecycle/deletion rules in Data_Model.md; do not add helper tables or speculative columns.

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

1. Resolve the owned saved parent under lock and read its exact current IDs.
2. Require a unique ordered list with exactly the same membership.
3. Unchanged order is a no-op; otherwise persist dense positions1..N in a parameterized batch.
4. Touch affected ancestors, increment once and read the confirmed day before commit.
5. Do not move an item or meal to another parent.

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

- Swap endpoints, arbitrary permutations, no-op and empty saved parent.
- Reject duplicates, omissions, unknown IDs, foreign IDs and same-user other-parent IDs atomically.
- Two simultaneous reorders with one revision produce one success and one409.
- Injected failure restores all original order values.
- Add/remove compaction remains compatible with subsequent reorder.

Negative cases must assert unchanged data/revision/confirmed state, not just the returned status. Use synthetic two-user fixtures. Real MySQL is required for FK/CHECK/lock/rollback behavior; controlled Observables and HttpTestingController are appropriate for client races/serialization. Existing critical auth/discovery/profile behavior must remain compatible.

### Acceptance criteria

- [x] Persist complete permutations safely in one mutation without unique-position swap failures or parent reassignment.
- [x] Swap endpoints, arbitrary permutations, no-op and empty saved parent.
- [x] Reject duplicates, omissions, unknown IDs, foreign IDs and same-user other-parent IDs atomically.
- [x] Two simultaneous reorders with one revision produce one success and one409.
- [x] Injected failure restores all original order values.
- [x] Add/remove compaction remains compatible with subsequent reorder.
- [x] All owned object operations scope to the session user and all multi-row writes share the common transaction/version protocol.
- [x] No deferred approved scope or unrelated refactor is introduced.
- [x] Build and named meaningful tests pass, with real results recorded; do not mark unrun integration tests passed.

### Completion verification

Verified 2026-10-15: final build passed with 0 warnings/errors (12.23s); full
backend suite passed 992/992, 0 failed/skipped (41.1526min), including all 49
B12–B15 cases. Initial scoped runs also passed. Exact commands, changed files,
MySQL environment and limitations: `Backend/docs/f011-b12-b15-progress.md`;
TRX: `Backend/.dotnet/test-results/f011-backend-release-full.trx`.
Only the guarded opted-in isolated database was reset/seeded. No schema or
migration changes and no developer/production database actions. Deployment and
frontend/browser acceptance are not claimed complete.

Working directory: Appetee_v2_BackEnd repository root. Use the repository’s installed SDK/package versions. Commands are for implementation, not commands executed while preparing this specification.

```bash
dotnet build Appetee.sln
dotnet test tests/Appetee.Api.Tests/Appetee.Api.Tests.csproj --filter 'FullyQualifiedName~F011B12'
```

Before any integration test that can rebuild data, prove isolated test host/database and explicit opt-in. Add the named tests from this phase before running its filter; a zero-test match is not success. For frontend, run the meaningful phase tests plus build; use the configured runner’s supported file selection when available rather than inventing a lint script. Inspect imports/state location and exercise the specified error path manually. Record actual result and limitations in the phase completion evidence; do not change specification-ready into implemented without evidence.

## Implementation Notes

### Existing code involved

Audited current files (paths relative to the backend repository):

- `src/Appetee.Infrastructure/Data/IDbConnectionFactory.cs`
- `src/Appetee.Api/Controllers/ErrorsController.cs`

Earlier-phase files to extend, not falsely assumed present at the audited snapshot:

- `src/Appetee.Application/Services/MealPlans/IMealService.cs`
- `src/Appetee.Application/Services/MealPlans/MealService.cs`
- `src/Appetee.Application/Services/MealPlans/IMealItemService.cs`
- `src/Appetee.Application/Services/MealPlans/MealItemService.cs`
- `src/Appetee.Application/Abstractions/MealPlans/IMealRepository.cs`
- `src/Appetee.Application/Abstractions/MealPlans/IMealItemRepository.cs`
- `src/Appetee.Infrastructure/MealPlans/MealRepository.cs`
- `src/Appetee.Infrastructure/MealPlans/MealSql.cs`
- `src/Appetee.Infrastructure/MealPlans/MealItemRepository.cs`
- `src/Appetee.Infrastructure/MealPlans/MealItemSql.cs`
- `src/Appetee.Api/Controllers/MealPlannerController.cs`

The [File Manifest](../README.md#implementation-file-manifest) names first creator and subsequent editors. Preserve existing project/namespace conventions. Consult [repository audit](../README.md#preserved-repository-audit) before adapting changed source.

### Files to create

- `src/Appetee.Application/Requests/MealPlans/ReorderRequest.cs`
- `tests/Appetee.Api.Tests/Integration/F011B12OrderingTests.cs`

Each production class/module uses the responsibility/dependency rules in [backend map](Phase_B03_write_protocol_and_errors.md#shared-backend-architecture) or [frontend ownership map](../frontend/Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture). Test companions exercise behavior, not implementation-only snapshots. Do not create similarly named duplicate files elsewhere.

### Files to modify

- `src/Appetee.Application/Services/MealPlans/IMealService.cs`
- `src/Appetee.Application/Services/MealPlans/MealService.cs`
- `src/Appetee.Application/Services/MealPlans/IMealItemService.cs`
- `src/Appetee.Application/Services/MealPlans/MealItemService.cs`
- `src/Appetee.Application/Abstractions/MealPlans/IMealRepository.cs`
- `src/Appetee.Application/Abstractions/MealPlans/IMealItemRepository.cs`
- `src/Appetee.Infrastructure/MealPlans/MealRepository.cs`
- `src/Appetee.Infrastructure/MealPlans/MealSql.cs`
- `src/Appetee.Infrastructure/MealPlans/MealItemRepository.cs`
- `src/Appetee.Infrastructure/MealPlans/MealItemSql.cs`
- `src/Appetee.Api/Controllers/MealPlannerController.cs`

### Frontend changes

F12 stores a temporary ordered-ID overlay in feature state. Core arrays remain confirmed. CDK drop and Move up/down produce the same single command; errors remove the overlay and preserve focus.

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

- Unique order constraints during in-place swaps
- One request per position
- Sorting a core array optimistically
- Reparenting through reorder
- Mouse-only ordering

## Dependencies

B09–B11 andcommonwriteprotocol.

Mandatory accompanying contracts: [Decisions](../README.md#approved-decisions), [API](../README.md#canonical-api-contracts), [Data Model](../README.md#canonical-database-model), [Architecture](../README.md#shared-system-architecture), and [Frontend Data Flow](../frontend/Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture). Calculator phases also read [Nutrition Policy](../README.md#nutrition-calculation-policy). These are normative contract sections, not optional background. If a prerequisite is absent, implement that prerequisite first; do not bypass it with local component state, a new API, or an unsafe database reset.


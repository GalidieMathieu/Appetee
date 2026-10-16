# F-011 — Meal Plan — Backend — Phase B11

**Phase title:** Manual entry subtype and complete edits

## Canonical Contract

The feature [README](../README.md) owns shared product behavior, data requirements, database impact, API/request/response contracts and error semantics. This file applies the backend template to one bounded phase. It does not redefine the shared contract.

**Phase:** B11
**Status:** Backend implemented and scoped regression verified (2026-10-13). Frontend/deployment pending.
**Specification:** Implemented against the canonical contract; evidence recorded below.

## Backend Goal

Implement strict-positive total-entry manual foods as atomic parent/detail records, preserving the locked product rule.

## Authorization and Ownership

Session derives the owner. Join item→meal→day→user for child IDs; also match route date where supplied. Current requires scoped plan plus composite FK. A route guard/disabled button is never authorization. All unsafe browser calls use E-005 CSRF transport/validation and exact allowed API boundary. Use Dapper parameters, strict DTOs and named enum codes; escape displayed text through normal Angular binding. Pure calculation/GETs do not create persistent state.

## API Layer

Controllers bind/map request, session identity and revision, call the Application use case, map the canonical HTTP result and expose OpenAPI. No SQL or target calculation in controllers.

### MP08: POST /api/meal-plan/days/{date}/manual-items

Purpose: Add complete manual entry. Authentication required; owner comes from session, foreign/missing owned objects both 404. Parameters: date route. No extra query parameters.

- Request `AddManualItemRequest`: meal:{mealId} OR {defaultSlot}; manualItem:{name1–120,caloriesKcal .01–20000,proteinG/carbsG/fatG .01–5000 each}; all required, max2 decimals.
- Response `PlannerMutationDto`: revision,settings,days:confirmed affected date projections,createdMealId|null,createdItemId|null. Current target/default context is included. Success: 201 + one-date Location.
- Application: `MealItemService.AddManualAsync` → Infrastructure: `MealItemRepository.AddManualAsync`.
- Frontend: core `MealPlannerFacade.addManual`; feature flow delegates, UI never calls HTTP directly.
- Transaction class **W**: one complete user-locked, revision-checked transaction including readback before commit.
- Specific rule: Target/date/cap; strict positive fields; atomic parent+detail and optional sparse materialization.
- UI contract: Explicit Add commits completed action; no writes per field; remain in editor on invalid/network failure.

Errors include 400 validation,401 session,404 scoped unavailable,409 business/version conflict and500 unexpected; unsafe calls require CSRF. Writes require X-Meal-Plan-Revision; reads/preview do not. Request/response nested fields are the normative API appendix linked above; do not invent a parallel shape.

### MP09: PUT /api/meal-plan/manual-items/{itemId}

Purpose: Replace complete manual detail values. Authentication required; owner comes from session, foreign/missing owned objects both 404. Parameters: itemId route int. No extra query parameters.

- Request `ManualItemRequest`: name1–120,caloriesKcal .01–20000,proteinG/carbsG/fatG .01–5000 each; all required, max2 decimals; total-entry values.
- Response `PlannerMutationDto`: revision,settings,days:confirmed affected date projections,createdMealId|null,createdItemId|null. Current target/default context is included. Success: 200.
- Application: `MealItemService.UpdateManualAsync` → Infrastructure: `MealItemRepository.UpdateManualAsync`.
- Frontend: core `MealPlannerFacade.updateManual`; feature flow delegates, UI never calls HTTP directly.
- Transaction class **W**: one complete user-locked, revision-checked transaction including readback before commit.
- Specific rule: Owned Manual subtype; complete fields required; type immutable; touch item/meal/day.
- UI contract: Feature draft copied from core once; Update action; confirmed receipt replaces core projection.

Errors include 400 validation,401 session,404 scoped unavailable,409 business/version conflict and500 unexpected; unsafe calls require CSRF. Writes require X-Meal-Plan-Revision; reads/preview do not. Request/response nested fields are the normative API appendix linked above; do not invent a parallel shape.

### MP10: DELETE /api/meal-plan/items/{itemId}

Purpose: Remove either item subtype. Authentication required; owner comes from session, foreign/missing owned objects both 404. Parameters: itemId route int. No extra query parameters.

- Request `none`: No request body. Do not invent optional mutation inputs.
- Response `PlannerMutationDto`: revision,settings,days:confirmed affected date projections,createdMealId|null,createdItemId|null. Current target/default context is included. Success: 200.
- Application: `MealItemService.RemoveAsync` → Infrastructure: `MealItemRepository.RemoveAsync`.
- Frontend: core `MealPlannerFacade.removeItem`; feature flow delegates, UI never calls HTTP directly.
- Transaction class **W**: one complete user-locked, revision-checked transaction including readback before commit.
- Specific rule: Owner; removal allowed for unavailable recipe; cascade manual detail; compact order; retain empty meal/day.
- UI contract: Confirmed removal; pending button disabled; no nutrition subtraction in UI.

Errors include 400 validation,401 session,404 scoped unavailable,409 business/version conflict and500 unexpected; unsafe calls require CSRF. Writes require X-Meal-Plan-Revision; reads/preview do not. Request/response nested fields are the normative API appendix linked above; do not invent a parallel shape.

## Application Layer

Implement the named Application/Infrastructure/HTTP slice through the flow below. Controllers only bind/authenticate/delegate; services have no SQL; repositories own the entire atomic use case. Pure helpers contain the business rules. Register new use cases in existing DI extensions, not Program.cs ad-hoc service blocks.

## Domain Rules

- Name1–120, calories.01–20000, each macro.01–5000, at most2 decimals.
- Every numeric field is required and strictly positive, including fat and protein.
- Do not require label calories to equal4P+4C+9F.
- No serving quantity, reusable food library or snapshot.
- Every Manual parent has one child; a Recipe parent has none.

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

1. Validate all manual fields, then recheck target ownership and capacity under the user lock.
2. Insert optional sparse parents, common Manual item, and its one detail atomically.
3. Replace complete detail values only for an owned Manual subtype; never convert a Recipe item.
4. Remove through the common item FK cascade, compact order and retain empty parents.
5. Build confirmed affected-day totals from stored total-entry values.

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

- Reject every missing/zero/negative/excess/precision field with a field-path error.
- Inject failure after parent insertion and assert no orphan or materialized day survives.
- Wrong subtype/foreign item returns404; valid edit preserves identity/order.
- Removal cascades detail while retaining the last empty meal.
- Store names as plain text and reject line/control characters.

Negative cases must assert unchanged data/revision/confirmed state, not just the returned status. Use synthetic two-user fixtures. Real MySQL is required for FK/CHECK/lock/rollback behavior; controlled Observables and HttpTestingController are appropriate for client races/serialization. Existing critical auth/discovery/profile behavior must remain compatible.

### Acceptance criteria

- [x] Implement strict-positive total-entry manual foods as atomic parent/detail records, preserving the locked product rule.
- [x] Reject every missing/zero/negative/excess/precision field with a field-path error.
- [x] Inject failure after parent insertion and assert no orphan or materialized day survives.
- [x] Wrong subtype/foreign item returns404; valid edit preserves identity/order.
- [x] Removal cascades detail while retaining the last empty meal.
- [x] Store names as plain text and reject line/control characters.
- [x] All owned object operations scope to the session user and all multi-row writes share the common transaction/version protocol.
- [x] No deferred approved scope or unrelated refactor is introduced.
- [x] Build and named meaningful tests pass, with real results recorded; do not mark unrun integration tests passed.

### Completion verification

Verified 2026-10-13: `dotnet build Appetee.sln --no-restore --verbosity minimal`
passed, zero warnings/errors, 11.39s. Expanded regression passed 348/348, zero
failed/skipped, 11m37s, including all 43 B10/B11 cases. The initial phase run's
only failure was a B10 EXPLAIN assertion, corrected and verified by the full
phase rerun. Tests include precise missing/null/numeric/precision field errors,
plain-text/NFC/Unicode name handling, insert/readback rollback, subtype/ownership,
mixed capacity/concurrency, identity/order and manual-detail cascade checks.
Exact commands, files, database actions and limitations:
`Backend/docs/f011-b10-b11-progress.md`; results:
`Backend/.dotnet/test-results/f011-b10-b11-regression.trx`.
Only the explicitly opted-in guarded loopback test database was reset/seeded.
No schema/migration changes or developer/production database actions. Frontend,
deployment and a fresh full-suite result are not claimed.

Working directory: Appetee_v2_BackEnd repository root. Use the repository’s installed SDK/package versions. Commands are for implementation, not commands executed while preparing this specification.

```bash
dotnet build Appetee.sln
dotnet test tests/Appetee.Api.Tests/Appetee.Api.Tests.csproj --filter 'FullyQualifiedName~F011B11'
```

Before any integration test that can rebuild data, prove isolated test host/database and explicit opt-in. Add the named tests from this phase before running its filter; a zero-test match is not success. For frontend, run the meaningful phase tests plus build; use the configured runner’s supported file selection when available rather than inventing a lint script. Inspect imports/state location and exercise the specified error path manually. Record actual result and limitations in the phase completion evidence; do not change specification-ready into implemented without evidence.

## Implementation Notes

### Existing code involved

Audited current files (paths relative to the backend repository):

- `src/Appetee.Infrastructure/Data/IDbConnectionFactory.cs`
- `src/Appetee.Api/Controllers/ErrorsController.cs`

Earlier-phase files to extend, not falsely assumed present at the audited snapshot:

- `src/Appetee.Application/Requests/MealPlans/MealItemRequests.cs`
- `src/Appetee.Application/Services/MealPlans/IMealItemService.cs`
- `src/Appetee.Application/Services/MealPlans/MealItemService.cs`
- `src/Appetee.Application/Abstractions/MealPlans/IMealItemRepository.cs`
- `src/Appetee.Infrastructure/MealPlans/MealItemRepository.cs`
- `src/Appetee.Infrastructure/MealPlans/MealItemSql.cs`
- `src/Appetee.Api/Controllers/MealPlannerController.cs`

The [File Manifest](../README.md#implementation-file-manifest) names first creator and subsequent editors. Preserve existing project/namespace conventions. Consult [repository audit](../README.md#preserved-repository-audit) before adapting changed source.

### Files to create

Additional pure validation companion: `tests/Appetee.Api.Tests/Unit/F011B11ManualItemRulesTests.cs`.

- `tests/Appetee.Api.Tests/Integration/F011B11ManualItemTests.cs`

Each production class/module uses the responsibility/dependency rules in [backend map](Phase_B03_write_protocol_and_errors.md#shared-backend-architecture) or [frontend ownership map](../frontend/Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture). Test companions exercise behavior, not implementation-only snapshots. Do not create similarly named duplicate files elsewhere.

### Files to modify

- `src/Appetee.Application/Requests/MealPlans/MealItemRequests.cs`
- `src/Appetee.Application/Services/MealPlans/IMealItemService.cs`
- `src/Appetee.Application/Services/MealPlans/MealItemService.cs`
- `src/Appetee.Application/Abstractions/MealPlans/IMealItemRepository.cs`
- `src/Appetee.Infrastructure/MealPlans/MealItemRepository.cs`
- `src/Appetee.Infrastructure/MealPlans/MealItemSql.cs`
- `src/Appetee.Api/Controllers/MealPlannerController.cs`

### Frontend changes

F11 uses a separate ManualItemDraftState and core MealPlannerFacade. Values mean the whole entry. Invalid submit keeps the form open with a red linked summary below its heading. No field-level HTTP; core synchronization precedes return to the meal.

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

- Relaxing the locked zero rule
- Committing parent and detail separately
- Multiplying manual values by recipe quantity
- Binding a form directly to a cached item
- Removing empty parents after item deletion

## Dependencies

B10 shared item service/repository and generic removal route; B03 common transaction protocol.

Mandatory accompanying contracts: [Decisions](../README.md#approved-decisions), [API](../README.md#canonical-api-contracts), [Data Model](../README.md#canonical-database-model), [Architecture](../README.md#shared-system-architecture), and [Frontend Data Flow](../frontend/Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture). Calculator phases also read [Nutrition Policy](../README.md#nutrition-calculation-policy). These are normative contract sections, not optional background. If a prerequisite is absent, implement that prerequisite first; do not bypass it with local component state, a new API, or an unsafe database reset.


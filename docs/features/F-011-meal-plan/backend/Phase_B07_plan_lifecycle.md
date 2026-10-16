# F-011 — Meal Plan — Backend — Phase B07

**Phase title:** Edit, duplicate, delete and Current lifecycle

## Canonical Contract

The feature [README](../README.md) owns shared product behavior, data requirements, database impact, API/request/response contracts and error semantics. This file applies the backend template to one bounded phase. It does not redefine the shared contract.

**Phase:** B07
**Status:** Implemented and verified (backend only, 2026-10-11)
**Specification:** Implemented against the canonical contract; actual completion evidence is recorded below.

## Backend Goal

Complete plan maintenance without silently recalculating history or changing saved planner content.

## Authorization and Ownership

Session derives the owner. Join item→meal→day→user for child IDs; also match route date where supplied. Current requires scoped plan plus composite FK. A route guard/disabled button is never authorization. All unsafe browser calls use E-005 CSRF transport/validation and exact allowed API boundary. Use Dapper parameters, strict DTOs and named enum codes; escape displayed text through normal Angular binding. Pure calculation/GETs do not create persistent state.

## API Layer

Controllers bind/map request, session identity and revision, call the Application use case, map the canonical HTTP result and expose OpenAPI. No SQL or target calculation in controllers.

### NP07: PUT /api/nutrition-plans/{planId}

Purpose: Update metadata or explicitly recalculate. Authentication required; owner comes from session, foreign/missing owned objects both 404. Parameters: planId route int. No extra query parameters.

- Request `UpdateNutritionPlanRequest`: name1–80, defaultMealsPerDay1–8; optional complete calculation plus both review fields together. Omit all three for metadata-only. Mode is not accepted.
- Response `NutritionPlanMutationDto`: revision,settings,plan|null,deletedPlanId|null,profile|null,plannerInvalidated. Null profile means unchanged, not erase. Success: 200.
- Application: `NutritionPlanService.UpdateAsync` → Infrastructure: `NutritionPlanRepository.UpdateAsync`.
- Frontend: core `NutritionPlanFacade.update`; feature flow delegates, UI never calls HTTP directly.
- Transaction class **W**: one complete user-locked, revision-checked transaction including readback before commit.
- Specific rule: Mode immutable. Omitted calculation preserves calculation block byte-for-value. Supplied block recomputes and updates profile atomically. Current target/count change invalidates planner.
- UI contract: Explicit Update; keep draft and old confirmed data on error; no optimistic target math.

Errors include 400 validation,401 session,404 scoped unavailable,409 business/version conflict and500 unexpected; unsafe calls require CSRF. Writes require X-Meal-Plan-Revision; reads/preview do not. Request/response nested fields are the normative API appendix linked above; do not invent a parallel shape.

### NP08: POST /api/nutrition-plans/{planId}/duplicate

Purpose: Duplicate one plan as inactive. Authentication required; owner comes from session, foreign/missing owned objects both 404. Parameters: planId route int. No extra query parameters.

- Request `none`: No request body. Do not invent optional mutation inputs.
- Response `NutritionPlanMutationDto`: revision,settings,plan|null,deletedPlanId|null,profile|null,plannerInvalidated. Null profile means unchanged, not erase. Success: 201 + plan Location.
- Application: `NutritionPlanService.DuplicateAsync` → Infrastructure: `NutritionPlanRepository.DuplicateAsync`.
- Frontend: core `NutritionPlanFacade.duplicate`; feature flow delegates, UI never calls HTTP directly.
- Transaction class **W**: one complete user-locked, revision-checked transaction including readback before commit.
- Specific rule: Owner/cap; generate unique suffix under lock. Copy targets/provenance, fresh id/audit timestamps; calculated_at remains original calculation time. Current unchanged.
- UI contract: Confirmed UI; disable repeated action while pending; POST not safely replayed with a fresh version.

Errors include 400 validation,401 session,404 scoped unavailable,409 business/version conflict and500 unexpected; unsafe calls require CSRF. Writes require X-Meal-Plan-Revision; reads/preview do not. Request/response nested fields are the normative API appendix linked above; do not invent a parallel shape.

### NP09: DELETE /api/nutrition-plans/{planId}

Purpose: Delete plan and clear Current if necessary. Authentication required; owner comes from session, foreign/missing owned objects both 404. Parameters: planId route int. No extra query parameters.

- Request `none`: No request body. Do not invent optional mutation inputs.
- Response `NutritionPlanMutationDto`: revision,settings,plan|null,deletedPlanId|null,profile|null,plannerInvalidated. Null profile means unchanged, not erase. Success: 200.
- Application: `NutritionPlanService.DeleteAsync` → Infrastructure: `NutritionPlanRepository.DeleteAsync`.
- Frontend: core `NutritionPlanFacade.delete`; feature flow delegates, UI never calls HTTP directly.
- Transaction class **W**: one complete user-locked, revision-checked transaction including readback before commit.
- Specific rule: Owner; pointer NULL before DELETE. No alternative Current, no food deletion. Missing/foreign404 even for repeated delete; stale version409.
- UI contract: Confirmation before command; keep card until acknowledgement; clear stale details after receipt.

Errors include 400 validation,401 session,404 scoped unavailable,409 business/version conflict and500 unexpected; unsafe calls require CSRF. Writes require X-Meal-Plan-Revision; reads/preview do not. Request/response nested fields are the normative API appendix linked above; do not invent a parallel shape.

### NP10: PUT /api/meal-plan/current-nutrition-plan

Purpose: Select owned Current plan. Authentication required; owner comes from session, foreign/missing owned objects both 404. Parameters: none. No extra query parameters.

- Request `SetCurrentNutritionPlanRequest`: nutritionPlanId positive signed INT owned by session user; no null/clear action.
- Response `NutritionPlanMutationDto`: revision,settings,plan|null,deletedPlanId|null,profile|null,plannerInvalidated. Null profile means unchanged, not erase. Success: 200.
- Application: `NutritionPlanService.SetCurrentAsync` → Infrastructure: `NutritionPlanRepository.SetCurrentAsync`.
- Frontend: core `NutritionPlanFacade.setCurrent`; feature flow delegates, UI never calls HTTP directly.
- Transaction class **W**: one complete user-locked, revision-checked transaction including readback before commit.
- Specific rule: Owner and composite FK; same Current no-op. Do not recalculate targets or rewrite days.
- UI contract: Confirmed Current badge; invalidate range then refresh on active view/next entry; no planner dropdown.

Errors include 400 validation,401 session,404 scoped unavailable,409 business/version conflict and500 unexpected; unsafe calls require CSRF. Writes require X-Meal-Plan-Revision; reads/preview do not. Request/response nested fields are the normative API appendix linked above; do not invent a parallel shape.

## Application Layer

Implement the named Application/Infrastructure/HTTP slice through the flow below. Controllers only bind/authenticate/delegate; services have no SQL; repositories own the entire atomic use case. Pure helpers contain the business rules. Register new use cases in existing DI extensions, not Program.cs ad-hoc service blocks.

## Domain Rules

- Mode is immutable; Easy rejects calculation inputs.
- Duplicate preserves the source calculation but never its Current membership. Naming uses " - Copy", then " - Copy 2", truncating the base within80 characters.
- Current selection uses stored targets; a changed profile produces a notice, not recalculation.
- Delete confirmation is client UX; server ownership and revision checks remain mandatory.
- An inactive metadata change does not rewrite planner contents; it still advances revision when data changed.

## Persistence

No schema. Update calculation block only for explicit recalculation. Duplicate fresh id/created_at/updated_at but preserves original calculated_at and calculation values. Delete Current clears FK first.

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

1. Metadata update preserves every calculation field; explicit calculation revalidates/recomputes and saves profile with plan.
2. Duplicate loads source under owner lock, generates suffix within80chars, checks cap and inserts inactive copy.
3. Current command scopes requested plan to user and updates settings only; sameCurrent no-op.
4. Delete current pointer then plan atomically; no auto-selection and no meal data mutation.
5. Return complete receipt and plannerInvalidated only when current context/defaults/targets actually change.

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

- Metadata-only preserves policy/input/target/calculated_at exactly.
- Duplicate naming with long Unicode names/collation collision; remains inactive.
- Foreign Current fails scoped lookup and DB FK; sameCurrent unchangedrevision.
- Current deletion returns null context and keeps all dates/items.
- Recalculation failure rolls back profile and plan; stale tab cannot delete newly edited plan.

Negative cases must assert unchanged data/revision/confirmed state, not just the returned status. Use synthetic two-user fixtures. Real MySQL is required for FK/CHECK/lock/rollback behavior; controlled Observables and HttpTestingController are appropriate for client races/serialization. Existing critical auth/discovery/profile behavior must remain compatible.

### Acceptance criteria

- [x] Complete plan maintenance without silently recalculating history or changing saved planner content.
- [x] Metadata-only preserves policy/input/target/calculated_at exactly.
- [x] Duplicate naming with long Unicode names/collation collision; remains inactive.
- [x] Foreign Current fails scoped lookup and DB FK; sameCurrent unchangedrevision.
- [x] Current deletion returns null context and keeps all dates/items.
- [x] Recalculation failure rolls back profile and plan; stale tab cannot delete newly edited plan.
- [x] All owned object operations scope to the session user and all multi-row writes share the common transaction/version protocol.
- [x] No deferred approved scope or unrelated refactor is introduced.
- [x] Build and named meaningful tests pass, with real results recorded; do not mark unrun integration tests passed.

### Completion verification

Working directory: Appetee_v2_BackEnd repository root. Use the repository’s installed SDK/package versions. Commands are for implementation, not commands executed while preparing this specification.

```bash
dotnet build Appetee.sln
dotnet test tests/Appetee.Api.Tests/Appetee.Api.Tests.csproj --filter 'FullyQualifiedName~F011B07'
```

Before any integration test that can rebuild data, prove isolated test host/database and explicit opt-in. Add the named tests from this phase before running its filter; a zero-test match is not success. For frontend, run the meaningful phase tests plus build; use the configured runner’s supported file selection when available rather than inventing a lint script. Inspect imports/state location and exercise the specified error path manually. Record actual result and limitations in the phase completion evidence; do not change specification-ready into implemented without evidence.

### Recorded implementation verification

Implemented in `C:\Users\galid\Documents\Appetee\Backend` on 2026-10-11.
Prior dirty/untracked work, B01–B06, security, migrator JSON configuration,
schema/generated SQL and existing migrations were preserved. Backend only;
no frontend or B08+ implementation.

- `dotnet build Appetee.sln`: passed, 0 errors, 8 NU1900 warnings for unavailable
  NuGet vulnerability data. No new analyzer warnings; audit remains unverified.
- `dotnet test tests/Appetee.Api.Tests/Appetee.Api.Tests.csproj --no-build --no-restore --filter FullyQualifiedName~F011B07 --logger 'console;verbosity=normal'`:
  82/82 passed (72 real-MySQL integration cases and 10 unit cases), zero failed
  or skipped; reported time 3.2361 minutes, runtime .NET 10.0.11 (64-bit).
- `dotnet test tests/Appetee.Api.Tests/Appetee.Api.Tests.csproj --no-build --no-restore --logger 'console;verbosity=normal'`:
  full regression 779/779 passed, zero failed/skipped; time 24.8887 minutes.
- Database integration explicitly opted in using
  `APPETEE_RUN_DB_INTEGRATION_TESTS=true`. The fixture enforces a loopback host
  and fixed `appetee_backend_tests`. Synthetic graph rows, temporary failure
  triggers (removed in finally), direct FK rejection and EXPLAIN checks ran only
  there. Full regression additionally exercised existing migration SQL/tooling
  inside the isolated fixture. No production/developer DB action, manual reset
  script, standalone migration CLI invocation, new migration or schema change.
- EXPLAIN reviewed the owner/primary/name access paths for lifecycle reads,
  metadata update, delete and Current pointers; existing indexes suffice.
- Development fixture failures (JSON property casing, const lookup optimization,
  and UTF-8 attribute encoding of a lone surrogate) were corrected; those runs
  are not counted as successful completion. No production rule was weakened.

Detailed file manifest, commands, coverage and deployment limitations:
[`Backend/docs/f011-b07-verification.md`](../../../../../Backend/docs/f011-b07-verification.md).

## Implementation Notes

### Existing code involved

Audited current files (paths relative to the backend repository):

- `src/Appetee.Infrastructure/Data/IDbConnectionFactory.cs`
- `src/Appetee.Api/Controllers/ErrorsController.cs`

Earlier-phase files to extend, not falsely assumed present at the audited snapshot:

- `src/Appetee.Api/Controllers/NutritionPlansController.cs`
- `src/Appetee.Application/Services/MealPlans/INutritionPlanService.cs`
- `src/Appetee.Application/Services/MealPlans/NutritionPlanService.cs`
- `src/Appetee.Application/Requests/MealPlans/NutritionPlanRequests.cs`
- `src/Appetee.Application/Abstractions/MealPlans/INutritionPlanRepository.cs`
- `src/Appetee.Infrastructure/MealPlans/NutritionPlanRepository.cs`
- `src/Appetee.Infrastructure/MealPlans/NutritionPlanSql.cs`

The [File Manifest](../README.md#implementation-file-manifest) names first creator and subsequent editors. Preserve existing project/namespace conventions. Consult [repository audit](../README.md#preserved-repository-audit) before adapting changed source.

### Files to create

- `src/Appetee.Api/Controllers/MealPlanSettingsController.cs`
- `tests/Appetee.Api.Tests/Integration/F011B07PlanLifecycleTests.cs`

Each production class/module uses the responsibility/dependency rules in [backend map](Phase_B03_write_protocol_and_errors.md#shared-backend-architecture) or [frontend ownership map](../frontend/Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture). Test companions exercise behavior, not implementation-only snapshots. Do not create similarly named duplicate files elsewhere.

### Files to modify

- `src/Appetee.Api/Controllers/NutritionPlansController.cs`
- `src/Appetee.Application/Services/MealPlans/INutritionPlanService.cs`
- `src/Appetee.Application/Services/MealPlans/NutritionPlanService.cs`
- `src/Appetee.Application/Requests/MealPlans/NutritionPlanRequests.cs`
- `src/Appetee.Application/Abstractions/MealPlans/INutritionPlanRepository.cs`
- `src/Appetee.Infrastructure/MealPlans/NutritionPlanRepository.cs`
- `src/Appetee.Infrastructure/MealPlans/NutritionPlanSql.cs`

### Frontend changes

F04 confirms deletion and calls core lifecycle methods; F07 single-page draft chooses metadata-only versus deliberate recalculation. Current membership derives core settings. Sync invalidates all ranges when needed instead of writing target math into components.

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

- Recalculating after every name edit
- Making a duplicate Current
- Selecting another plan after deletion
- Deleting planner food with a Nutrition Plan
- Changing mode in place

## Dependencies

B06; common revision/CSRF protocol.

Mandatory accompanying contracts: [Decisions](../README.md#approved-decisions), [API](../README.md#canonical-api-contracts), [Data Model](../README.md#canonical-database-model), [Architecture](../README.md#shared-system-architecture), and [Frontend Data Flow](../frontend/Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture). Calculator phases also read [Nutrition Policy](../README.md#nutrition-calculation-policy). These are normative contract sections, not optional background. If a prerequisite is absent, implement that prerequisite first; do not bypass it with local component state, a new API, or an unsafe database reset.

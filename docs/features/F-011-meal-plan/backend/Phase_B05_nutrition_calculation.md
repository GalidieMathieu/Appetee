# F-011 — Meal Plan — Backend — Phase B05

**Phase title:** Versioned Intermediate calculator and preview

## Canonical Contract

The feature [README](../README.md) owns shared product behavior, data requirements, database impact, API/request/response contracts and error semantics. This file applies the backend template to one bounded phase. It does not redefine the shared contract.

**Phase:** B05
**Status:** Implemented and verified (backend only, 2026-10-06)
**Specification:** Implemented against the canonical contract and explicitly confirmed policy version/estimate rounding; completion evidence is recorded below.

## Backend Goal

Implement the exact approved pure calculation policy with server preview and no persistence side effects.

## Authorization and Ownership

Session derives the owner. Join item→meal→day→user for child IDs; also match route date where supplied. Current requires scoped plan plus composite FK. A route guard/disabled button is never authorization. All unsafe browser calls use E-005 CSRF transport/validation and exact allowed API boundary. Use Dapper parameters, strict DTOs and named enum codes; escape displayed text through normal Angular binding. Pure calculation/GETs do not create persistent state.

## API Layer

Controllers bind/map request, session identity and revision, call the Application use case, map the canonical HTTP result and expose OpenAPI. No SQL or target calculation in controllers.

### NP03: POST /api/nutrition-plans/calculation-preview

Purpose: Calculate unsaved Intermediate preview. Authentication required; owner comes from session, foreign/missing owned objects both 404. Parameters: none. No extra query parameters.

- Request `NutritionCalculationRequest`: profile:complete NutritionProfileRequest, goal one of six policy codes, activityLevel one of four codes. No client targets.
- Response `NutritionCalculationDto`: policyVersion,calculationYear,inputs,rmrKcal,maintenanceKcal,targets,warnings. No persistent entity ID. Success: 200.
- Application: `NutritionCalculationService.Calculate` → Infrastructure: `None (pure Application)`.
- Frontend: core `NutritionPlanFacade.preview`; feature flow delegates, UI never calls HTTP directly.
- Transaction class **P**: pure preview: no database writes or revision.
- Specific rule: Validate current server year, eligibility, math; 400 field/feasibility errors. Returns policy/year review evidence. No settings insertion.
- UI contract: Preview state belongs to temporary draft controller; switchMap may cancel obsolete READ-ONLY previews, never writes.

Errors include 400 validation,401 session,404 scoped unavailable,409 business/version conflict and500 unexpected; unsafe calls require CSRF. Writes require X-Meal-Plan-Revision; reads/preview do not. Request/response nested fields are the normative API appendix linked above; do not invent a parallel shape.

## Application Layer

Implement the named Application/Infrastructure/HTTP slice through the flow below. Controllers only bind/authenticate/delegate; services have no SQL; repositories own the entire atomic use case. Pure helpers contain the business rules. Register new use cases in existing DI extensions, not Program.cs ad-hoc service blocks.

## Domain Rules

- Formula constants11.936,587.728,-8.129,191.027,+29.279 with metres.
- Activity1.40/1.60/1.75/2.05; loss min15%/500, muscle+5%, weight+min10%/500; other goals maintenance.
- Protein2.0loss/1.6others; carb preference3/4/5/6gkg; fat20% min27.5% centre35% max.
- Full decimal intermediates; E1500–6000, positive macros, energy difference<=2kcal.
- Age>35/Inactive warning for equation extrapolation; no recovery/per-day training.
- Preview POST requires CSRF but no revision.

## Persistence

None. Preview cannot insert/update users/settings/plans. Inputs/targets become persisted only through B06/B07 commands.

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

1. Bind strict calculation request and use server TimeProvider for year/age.
2. Validate eligibility/precision and Ten Haaf inputs, convert height cm→m.
3. Compute RMR, maintenance, goal adjustment, energy nearest25, protein ceiling, fat/carbohydrate feasibility exactly per Nutrition_Policy.
4. Return estimates, integer targets, warning codes and policyVersion/calculationYear review evidence.
5. Return field/feasibility errors without any repository call.

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

- Golden80kg/180cm/28maleActive maintain=3500/128P/506C/107F; loss=3000/160P/401C/84F.
- All6goals×4activities, both coefficients, rounding midpoints, min/max and infeasible cases.
- Cm/metre regression; unknown/numeric codes; adult boundary; fake server-year rollover.
- Assert preview uses no persistence abstraction and database row/revision counts unchanged.
- Warning thresholds and policy version/year stable in response.

Negative cases must assert unchanged data/revision/confirmed state, not just the returned status. Use synthetic two-user fixtures. Real MySQL is required for FK/CHECK/lock/rollback behavior; controlled Observables and HttpTestingController are appropriate for client races/serialization. Existing critical auth/discovery/profile behavior must remain compatible.

### Acceptance criteria

- [x] Implement the exact approved pure calculation policy with server preview and no persistence side effects.
- [x] Golden80kg/180cm/28maleActive maintain=3500/128P/506C/107F; loss=3000/160P/401C/84F.
- [x] All6goals×4activities, both coefficients, rounding midpoints, min/max and infeasible cases.
- [x] Cm/metre regression; unknown/numeric codes; adult boundary; fake server-year rollover.
- [x] Assert preview uses no persistence abstraction and database row/revision counts unchanged.
- [x] Warning thresholds and policy version/year stable in response.
- [x] All owned object operations scope to the session user and all multi-row writes share the common transaction/version protocol.
- [x] No deferred approved scope or unrelated refactor is introduced.
- [x] Build and named meaningful tests pass, with real results recorded; do not mark unrun integration tests passed.

### Completion verification

Implemented and verified in `C:\Users\galid\Documents\Appetee\Backend` on
2026-10-06. That repository's `docs/f011-b05-verification.md` records the detailed
file manifest, approved decisions, preserved changes, exact commands, earlier
corrected failures, database actions, and limitations.

- `dotnet build Appetee.sln`: succeeded, zero errors; six NU1900 warnings because
  the NuGet vulnerability feed was unavailable. Vulnerability auditing remains
  unverified.
- `dotnet test tests/Appetee.Api.Tests/Appetee.Api.Tests.csproj --no-restore --filter FullyQualifiedName~F011B05`:
  144/144 passed, zero failed/skipped, duration 2m27s (83 unit cases and 61
  real-MySQL HTTP integration cases).
- `dotnet test tests/Appetee.Api.Tests/Appetee.Api.Tests.csproj --no-restore --logger 'console;verbosity=normal'`:
  611/611 passed, zero failed/skipped; reported total time 15.5903 minutes.
- Unit coverage includes a 126,720-case bounded grid and fixed vectors for all
  6 goals × 4 activities × both sex coefficients. The infeasible protein/fat
  allocation safeguard is exercised directly at the pure allocator, not claimed
  as reachable from validated profiles in the tested grid.
- Integration runs opted in with `APPETEE_RUN_DB_INTEGRATION_TESTS=true`. The
  fixture enforces loopback MySQL and fixed `appetee_backend_tests`. Only that
  isolated fixture rebuilt/tested data. No new schema, B05 migration, manual
  reset script, production database action, or frontend implementation was made.
- Initial version `mp-v1.0.0-2026-10` and two-decimal estimate midpoint
  AwayFromZero were explicitly confirmed by the user. Full decimal intermediates
  determine targets; the canonical example's abbreviated estimates were clarified
  to exact RMR 2005.4844 and maintenance 3509.5977 without changing targets.

Working directory: Appetee_v2_BackEnd repository root. Use the repository’s installed SDK/package versions. Commands are for implementation, not commands executed while preparing this specification.

```bash
dotnet build Appetee.sln
dotnet test tests/Appetee.Api.Tests/Appetee.Api.Tests.csproj --filter 'FullyQualifiedName~F011B05'
```

Before any integration test that can rebuild data, prove isolated test host/database and explicit opt-in. Add the named tests from this phase before running its filter; a zero-test match is not success. For frontend, run the meaningful phase tests plus build; use the configured runner’s supported file selection when available rather than inventing a lint script. Inspect imports/state location and exercise the specified error path manually. Record actual result and limitations in the phase completion evidence; do not change specification-ready into implemented without evidence.

## Implementation Notes

### Existing code involved

Audited current files (paths relative to the backend repository):

- `src/Appetee.Api/Extensions/ApplicationServiceCollectionExtensions.cs`
- `src/Appetee.Infrastructure/Data/IDbConnectionFactory.cs`
- `src/Appetee.Api/Controllers/ErrorsController.cs`

Earlier-phase files to extend, not falsely assumed present at the audited snapshot:

None. Do not create speculative files for future phases.

The [File Manifest](../README.md#implementation-file-manifest) names first creator and subsequent editors. Preserve existing project/namespace conventions. Consult [repository audit](../README.md#preserved-repository-audit) before adapting changed source.

### Files to create

- `src/Appetee.Application/Models/MealPlans/NutritionPolicy.cs`
- `src/Appetee.Application/Models/MealPlans/NutritionCalculation.cs`
- `src/Appetee.Application/Dtos/MealPlans/NutritionCalculationDto.cs`
- `src/Appetee.Application/Requests/MealPlans/NutritionCalculationRequest.cs`
- `src/Appetee.Application/Services/MealPlans/INutritionCalculationService.cs`
- `src/Appetee.Application/Services/MealPlans/NutritionCalculationService.cs`
- `src/Appetee.Api/Controllers/NutritionPlansController.cs`
- `tests/Appetee.Api.Tests/Unit/F011B05NutritionCalculationTests.cs`
- `tests/Appetee.Api.Tests/Integration/F011B05PreviewTests.cs`

Each production class/module uses the responsibility/dependency rules in [backend map](Phase_B03_write_protocol_and_errors.md#shared-backend-architecture) or [frontend ownership map](../frontend/Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture). Test companions exercise behavior, not implementation-only snapshots. Do not create similarly named duplicate files elsewhere.

### Files to modify

- `src/Appetee.Api/Extensions/ApplicationServiceCollectionExtensions.cs`

### Frontend changes

F06 typed draft requests core NutritionPlanApi preview via facade; ephemeral preview belongs to separate draft state, not saved plan cache. Cancel obsolete read-only previews; never implement formula in TS or UI.

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

- Using height in cm inside587.728 term
- Rounding RMR before energy calculation
- Using1.6as universal maximum claim
- Persisting on preview
- Caching preview as complete saved plan

## Dependencies

B04 profile request types; approved athlete audience/policy; testable TimeProvider.

Mandatory accompanying contracts: [Decisions](../README.md#approved-decisions), [API](../README.md#canonical-api-contracts), [Data Model](../README.md#canonical-database-model), [Architecture](../README.md#shared-system-architecture), and [Frontend Data Flow](../frontend/Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture). Calculator phases also read [Nutrition Policy](../README.md#nutrition-calculation-policy). These are normative contract sections, not optional background. If a prerequisite is absent, implement that prerequisite first; do not bypass it with local component state, a new API, or an unsafe database reset.

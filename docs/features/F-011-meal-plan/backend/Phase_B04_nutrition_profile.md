# F-011 — Meal Plan — Backend — Phase B04

**Phase title:** Separate current-user nutrition profile

## Canonical Contract

The feature [README](../README.md) owns shared product behavior, data requirements, database impact, API/request/response contracts and error semantics. This file applies the backend template to one bounded phase. It does not redefine the shared contract.

**Phase:** B04
**Status:** Implemented and verified (backend only, 2026-10-06)
**Specification:** Implemented against the canonical contract; completion evidence is recorded below.

## Backend Goal

Expose complete saved nutrition profile without changing the existing username/image contract or recalculating plans.

## Authorization and Ownership

Session derives the owner. Join item→meal→day→user for child IDs; also match route date where supplied. Current requires scoped plan plus composite FK. A route guard/disabled button is never authorization. All unsafe browser calls use E-005 CSRF transport/validation and exact allowed API boundary. Use Dapper parameters, strict DTOs and named enum codes; escape displayed text through normal Angular binding. Pure calculation/GETs do not create persistent state.

## API Layer

Controllers bind/map request, session identity and revision, call the Application use case, map the canonical HTTP result and expose OpenAPI. No SQL or target calculation in controllers.

### NP01: GET /api/users/me/nutrition-profile

Purpose: Read current saved profile. Authentication required; owner comes from session, foreign/missing owned objects both 404. Parameters: none. No extra query parameters.

- Request `none`: No request body. Do not invent optional mutation inputs.
- Response `NutritionProfileDto`: revision:string, profile:complete value|null. Absent is valid on GET; PUT returns complete value. Success: 200.
- Application: `UserService.GetNutritionProfileAsync` → Infrastructure: `UserQueries.GetNutritionProfileAsync`.
- Frontend: core `NutritionProfileFacade.load`; feature flow delegates, UI never calls HTTP directly.
- Transaction class **R**: read-only coherent snapshot; never create rows.
- Specific rule: Session owner only; absent profile is 200 with profile:null. No request user ID.
- UI contract: Profile query state; no optimistic behavior.

Errors include 400 validation,401 session,404 scoped unavailable,409 business/version conflict and500 unexpected; unsafe calls require CSRF. Writes require X-Meal-Plan-Revision; reads/preview do not. Request/response nested fields are the normative API appendix linked above; do not invent a parallel shape.

### NP02: PUT /api/users/me/nutrition-profile

Purpose: Save complete profile without recalculating plans. Authentication required; owner comes from session, foreign/missing owned objects both 404. Parameters: none. No extra query parameters.

- Request `NutritionProfileRequest`: calculationSex male/female, birthYear integer, heightCm120–230, weightKg35–250, max2 decimals; adultConfirmed true when age-this-year18.
- Response `NutritionProfileDto`: revision:string, profile:complete value|null. Absent is valid on GET; PUT returns complete value. Success: 200.
- Application: `UserService.UpdateNutritionProfileAsync` → Infrastructure: `UserRepository.UpdateNutritionProfileAsync`.
- Frontend: core `NutritionProfileFacade.update`; feature flow delegates, UI never calls HTTP directly.
- Transaction class **W**: one complete user-locked, revision-checked transaction including readback before commit.
- Specific rule: Validate complete values/adult declaration; compare revision; same values no-op. Plan rows/targets remain untouched.
- UI contract: Confirmed UI; preserve feature draft on error; core profile source replaced only on success.

Errors include 400 validation,401 session,404 scoped unavailable,409 business/version conflict and500 unexpected; unsafe calls require CSRF. Writes require X-Meal-Plan-Revision; reads/preview do not. Request/response nested fields are the normative API appendix linked above; do not invent a parallel shape.

## Application Layer

Implement the named Application/Infrastructure/HTTP slice through the flow below. Controllers only bind/authenticate/delegate; services have no SQL; repositories own the entire atomic use case. Pure helpers contain the business rules. Register new use cases in existing DI extensions, not Program.cs ad-hoc service blocks.

## Domain Rules

- Sex code male/female; height120–230cm, weight35–250kg, max2decimals.
- Age-this-year18–65; year-derived age not client age; adultConfirmed true at18.
- All fields required for PUT; no partial profile clear API.
- Missing session401; other user IDs are not accepted at all.
- Same saved values no-op; latest profile is not a plan target.

## Persistence

Use B02 users profile columns and settings revision. No age/date-of-birth column. Existing users.updated_at remains current timestamp strategy.

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

1. GET owner profile and effective revision in one consistent read; profile absent returns null and creates nothing.
2. PUT validates all four inputs and adult declaration against server calculation year.
3. UserRepository uses MealPlanTransaction; updates only nutrition fields and revision, reads profile inside transaction.
4. UserService returns separate DTO; existing GET/PUT users/me continues username/image semantics.
5. Do not touch nutrition_plans when profile changes.

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

- GET absent profile writes zero rows.
- PUT boundary/precision/unknown member/numeric enum cases.
- Username/image remain unchanged; legacy routes retain404 containment.
- Profile change leaves all plan target/calculated_at values unchanged.
- Concurrent profile/meal writes share one revision lock and stale response409.

Negative cases must assert unchanged data/revision/confirmed state, not just the returned status. Use synthetic two-user fixtures. Real MySQL is required for FK/CHECK/lock/rollback behavior; controlled Observables and HttpTestingController are appropriate for client races/serialization. Existing critical auth/discovery/profile behavior must remain compatible.

### Acceptance criteria

- [x] Expose complete saved nutrition profile without changing the existing username/image contract or recalculating plans.
- [x] GET absent profile writes zero rows.
- [x] PUT boundary/precision/unknown member/numeric enum cases.
- [x] Username/image remain unchanged; legacy routes retain404 containment.
- [x] Profile change leaves all plan target/calculated_at values unchanged.
- [x] Concurrent profile/meal writes share one revision lock and stale response409.
- [x] All owned object operations scope to the session user and all multi-row writes share the common transaction/version protocol.
- [x] No deferred approved scope or unrelated refactor is introduced.
- [x] Build and named meaningful tests pass, with real results recorded; do not mark unrun integration tests passed.

### Completion verification

Implemented and verified in `C:\Users\galid\Documents\Appetee\Backend` on
2026-10-06. Detailed file manifest, preserved changes, commands, database actions,
earlier corrected test failures, and limitations are recorded in that backend
repository's `docs/f011-b04-verification.md`.

- `dotnet build Appetee.sln`: succeeded, zero errors; six NU1900 warnings because
  the NuGet vulnerability feed was unavailable. Vulnerability auditing remains
  unverified.
- `dotnet test tests/Appetee.Api.Tests/Appetee.Api.Tests.csproj --no-restore --filter FullyQualifiedName~F011B04`:
  50/50 passed, zero failed/skipped, duration 2m16s.
- `dotnet test tests/Appetee.Api.Tests/Appetee.Api.Tests.csproj --no-restore`:
  467/467 passed, zero failed/skipped, duration 15m24s.
- Integration runs explicitly opted in with
  `APPETEE_RUN_DB_INTEGRATION_TESTS=true`. The fixture enforces loopback MySQL and
  `appetee_backend_tests`; only that isolated database was rebuilt/tested. No
  production database action, manual reset script, schema change, new B04
  migration, or frontend implementation was performed.
- The controlled meal/profile race exercises the common real-MySQL transaction
  helper and the HTTP profile endpoint; it does not add a later-phase meal API.

Working directory: Appetee_v2_BackEnd repository root. Use the repository’s installed SDK/package versions. Commands are for implementation, not commands executed while preparing this specification.

```bash
dotnet build Appetee.sln
dotnet test tests/Appetee.Api.Tests/Appetee.Api.Tests.csproj --filter 'FullyQualifiedName~F011B04'
```

Before any integration test that can rebuild data, prove isolated test host/database and explicit opt-in. Add the named tests from this phase before running its filter; a zero-test match is not success. For frontend, run the meaningful phase tests plus build; use the configured runner’s supported file selection when available rather than inventing a lint script. Inspect imports/state location and exercise the specified error path manually. Record actual result and limitations in the phase completion evidence; do not change specification-ready into implemented without evidence.

## Implementation Notes

### Existing code involved

Audited current files (paths relative to the backend repository):

- `src/Appetee.Api/Controllers/UsersController.cs`
- `src/Appetee.Application/Services/Users/IUserService.cs`
- `src/Appetee.Application/Services/Users/UserService.cs`
- `src/Appetee.Application/Abstractions/Users/IUserQueries.cs`
- `src/Appetee.Application/Abstractions/Users/IUserRepository.cs`
- `src/Appetee.Infrastructure/Users/UserQueries.cs`
- `src/Appetee.Infrastructure/Users/UserRepository.cs`
- `src/Appetee.Infrastructure/Users/UserSql.cs`
- `src/Appetee.Infrastructure/Data/IDbConnectionFactory.cs`
- `src/Appetee.Api/Controllers/ErrorsController.cs`

Earlier-phase files to extend, not falsely assumed present at the audited snapshot:

None. Do not create speculative files for future phases.

The [File Manifest](../README.md#implementation-file-manifest) names first creator and subsequent editors. Preserve existing project/namespace conventions. Consult [repository audit](../README.md#preserved-repository-audit) before adapting changed source.

### Files to create

- `src/Appetee.Application/Dtos/MealPlans/NutritionProfileDto.cs`
- `src/Appetee.Application/Requests/MealPlans/NutritionProfileRequest.cs`
- `src/Appetee.Application/RowData/MealPlans/NutritionProfileRowData.cs`
- `tests/Appetee.Api.Tests/Integration/F011B04ProfileTests.cs`

Each production class/module uses the responsibility/dependency rules in [backend map](Phase_B03_write_protocol_and_errors.md#shared-backend-architecture) or [frontend ownership map](../frontend/Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture). Test companions exercise behavior, not implementation-only snapshots. Do not create similarly named duplicate files elsewhere.

### Files to modify

- `src/Appetee.Api/Controllers/UsersController.cs`
- `src/Appetee.Application/Services/Users/IUserService.cs`
- `src/Appetee.Application/Services/Users/UserService.cs`
- `src/Appetee.Application/Abstractions/Users/IUserQueries.cs`
- `src/Appetee.Application/Abstractions/Users/IUserRepository.cs`
- `src/Appetee.Infrastructure/Users/UserQueries.cs`
- `src/Appetee.Infrastructure/Users/UserRepository.cs`
- `src/Appetee.Infrastructure/Users/UserSql.cs`

### Frontend changes

F03 extends existing core UserApi, adds separate core NutritionProfileStore/Facade, and initializes feature profile draft once. Shared UI accepts a controlled FormGroup and never calls HTTP. Profile save returns core receipt before showing Saved.

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

- Expanding existing profile response unpredictably
- Saving wizard steps through profile PUT
- Accepting client age
- Recalculating every plan on weight edit
- Putting profile DTO/FormGroup into page.ts

## Dependencies

B03 and E-005 protection for PUT.

Mandatory accompanying contracts: [Decisions](../README.md#approved-decisions), [API](../README.md#canonical-api-contracts), [Data Model](../README.md#canonical-database-model), [Architecture](../README.md#shared-system-architecture), and [Frontend Data Flow](../frontend/Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture). Calculator phases also read [Nutrition Policy](../README.md#nutrition-calculation-policy). These are normative contract sections, not optional background. If a prerequisite is absent, implement that prerequisite first; do not bypass it with local component state, a new API, or an unsafe database reset.

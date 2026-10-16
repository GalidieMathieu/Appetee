# F-011 — Meal Plan — Backend — Phase B13

**Phase title:** Exact atomic Copy Day

## Canonical Contract

The feature [README](../README.md) owns shared product behavior, data requirements, database impact, API/request/response contracts and error semantics. This file applies the backend template to one bounded phase. It does not redefine the shared contract.

**Phase:** B13
**Status:** Backend implemented and full backend suite verified (2026-10-15). Deployment/frontend pending.
**Specification:** Canonical API retained; no schema change.

## Backend Goal

Copy source intent including absent-versus-empty distinctions into one destination, replacing exactly after reviewed confirmation.

## Authorization and Ownership

Session derives the owner. Join item→meal→day→user for child IDs; also match route date where supplied. Current requires scoped plan plus composite FK. A route guard/disabled button is never authorization. All unsafe browser calls use E-005 CSRF transport/validation and exact allowed API boundary. Use Dapper parameters, strict DTOs and named enum codes; escape displayed text through normal Angular binding. Pure calculation/GETs do not create persistent state.

## API Layer

Controllers bind/map request, session identity and revision, call the Application use case, map the canonical HTTP result and expose OpenAPI. No SQL or target calculation in controllers.

### MP12: POST /api/meal-plan/copy-day

Purpose: Exact one-date replacement. Authentication required; owner comes from session, foreign/missing owned objects both 404. Parameters: none. No extra query parameters.

- Request `CopyDayRequest`: sourceDate,destinationDate distinct ISO dates; replaceExisting required boolean; header revision is the jointly reviewed source/destination version.
- Response `PlannerMutationDto`: revision,settings,days:confirmed affected date projections,createdMealId|null,createdItemId|null. Current target/default context is included. Success: 200.
- Application: `PlannerCopyService.CopyDayAsync` → Infrastructure: `PlannerCopyRepository.CopyDayAsync`.
- Frontend: core `MealPlannerFacade.copyDay`; feature flow delegates, UI never calls HTTP directly.
- Transaction class **W**: one complete user-locked, revision-checked transaction including readback before commit.
- Specific rule: Distinct dates; reviewed matching version; replaceExisting false+saved destination409. Source unavailable recipe409. Source absent clears destination; saved empty remains saved empty.
- UI contract: Confirm overwrite after destination GET; mismatch refreshes source/destination and asks reconfirmation; no optimistic copy.

Errors include 400 validation,401 session,404 scoped unavailable,409 business/version conflict and500 unexpected; unsafe calls require CSRF. Writes require X-Meal-Plan-Revision; reads/preview do not. Request/response nested fields are the normative API appendix linked above; do not invent a parallel shape.

## Application Layer

Implement the named Application/Infrastructure/HTTP slice through the flow below. Controllers only bind/authenticate/delegate; services have no SQL; repositories own the entire atomic use case. Pure helpers contain the business rules. Register new use cases in existing DI extensions, not Program.cs ad-hoc service blocks.

## Domain Rules

- Manual values are deep-copied into new detail identities.
- Preserve names/order/whole quantities; never copy virtual placeholders.
- Unavailable source recipe returns409 without changing destination.
- Unconfirmed persisted destination returns destination_not_empty409.
- Absent-to-absent can be a no-op; replacing saved identities is a real change even if values match.
- Do not infer new IDs from contiguous auto-increment values.

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

1. Validate distinct dates, lock the user and compare the reviewed revision.
2. Capture all source rows and absent/saved-empty state before deleting anything.
3. Validate recipe availability and require replacement acknowledgement for any persisted destination.
4. Delete the destination; absent source leaves it absent, saved-empty source creates an empty day, otherwise batch exact content.
5. Return the normalized destination and new revision after one commit; rollback all changes on failure.

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

- Mixed content and saved empty meals copy exactly; editing copied manual data cannot affect source.
- Verify absent-to-saved clearing, saved-empty retention and absent-to-absent no-op.
- A persisted empty destination still requires confirmation.
- Failures after delete/inserts restore original destination and revision.
- A source change after review returns409 before replacement.

Negative cases must assert unchanged data/revision/confirmed state, not just the returned status. Use synthetic two-user fixtures. Real MySQL is required for FK/CHECK/lock/rollback behavior; controlled Observables and HttpTestingController are appropriate for client races/serialization. Existing critical auth/discovery/profile behavior must remain compatible.

### Acceptance criteria

- [x] Copy source intent including absent-versus-empty distinctions into one destination, replacing exactly after reviewed confirmation.
- [x] Mixed content and saved empty meals copy exactly; editing copied manual data cannot affect source.
- [x] Verify absent-to-saved clearing, saved-empty retention and absent-to-absent no-op.
- [x] A persisted empty destination still requires confirmation.
- [x] Failures after delete/inserts restore original destination and revision.
- [x] A source change after review returns409 before replacement.
- [x] All owned object operations scope to the session user and all multi-row writes share the common transaction/version protocol.
- [x] No deferred approved scope or unrelated refactor is introduced.
- [x] Build and named meaningful tests pass, with real results recorded; do not mark unrun integration tests passed.

### Completion verification

Verified 2026-10-15: final build passed with 0 warnings/errors (12.23s); full
backend suite passed 992/992, 0 failed/skipped (41.1526min), including all 49
B12–B15 cases. Mixed deep copies, absent/empty distinctions, confirmation, scoped
ownership, stale review, insert/readback failure and post-commit reply loss are
covered. Exact commands/files/environment: `Backend/docs/f011-b12-b15-progress.md`;
TRX: `Backend/.dotnet/test-results/f011-backend-release-full.trx`.
No schema/migration changes, developer/production database action or frontend
implementation. Deployed release gates remain open.

Working directory: Appetee_v2_BackEnd repository root. Use the repository’s installed SDK/package versions. Commands are for implementation, not commands executed while preparing this specification.

```bash
dotnet build Appetee.sln
dotnet test tests/Appetee.Api.Tests/Appetee.Api.Tests.csproj --filter 'FullyQualifiedName~F011B13'
```

Before any integration test that can rebuild data, prove isolated test host/database and explicit opt-in. Add the named tests from this phase before running its filter; a zero-test match is not success. For frontend, run the meaningful phase tests plus build; use the configured runner’s supported file selection when available rather than inventing a lint script. Inspect imports/state location and exercise the specified error path manually. Record actual result and limitations in the phase completion evidence; do not change specification-ready into implemented without evidence.

## Implementation Notes

### Existing code involved

Audited current files (paths relative to the backend repository):

- `src/Appetee.Api/Extensions/ApplicationServiceCollectionExtensions.cs`
- `src/Appetee.Api/Extensions/InfrastructureServiceCollectionExtensions.cs`
- `src/Appetee.Infrastructure/Data/IDbConnectionFactory.cs`
- `src/Appetee.Api/Controllers/ErrorsController.cs`

Earlier-phase files to extend, not falsely assumed present at the audited snapshot:

- `src/Appetee.Api/Controllers/MealPlannerController.cs`

The [File Manifest](../README.md#implementation-file-manifest) names first creator and subsequent editors. Preserve existing project/namespace conventions. Consult [repository audit](../README.md#preserved-repository-audit) before adapting changed source.

### Files to create

- `src/Appetee.Application/Requests/MealPlans/CopyRequests.cs`
- `src/Appetee.Application/Models/MealPlans/PlannerCopyBuilder.cs`
- `src/Appetee.Application/Services/MealPlans/IPlannerCopyService.cs`
- `src/Appetee.Application/Services/MealPlans/PlannerCopyService.cs`
- `src/Appetee.Application/Abstractions/MealPlans/IPlannerCopyRepository.cs`
- `src/Appetee.Infrastructure/MealPlans/PlannerCopyRepository.cs`
- `src/Appetee.Infrastructure/MealPlans/PlannerCopySql.cs`
- `tests/Appetee.Api.Tests/Integration/F011B13CopyDayTests.cs`

Each production class/module uses the responsibility/dependency rules in [backend map](Phase_B03_write_protocol_and_errors.md#shared-backend-architecture) or [frontend ownership map](../frontend/Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture). Test companions exercise behavior, not implementation-only snapshots. Do not create similarly named duplicate files elsewhere.

### Files to modify

- `src/Appetee.Api/Controllers/MealPlannerController.cs`
- `src/Appetee.Api/Extensions/ApplicationServiceCollectionExtensions.cs`
- `src/Appetee.Api/Extensions/InfrastructureServiceCollectionExtensions.cs`

### Frontend changes

F13 keeps source/destination graphs in core range queries. Feature copy state owns only dates, reviewed revision and confirmation. A newer destination GET cannot authorize an older source; ambiguous outcomes require reconciliation, not another copy.

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

- Copying visual defaults
- Reading source after deletion
- Sharing manual child IDs
- Refreshing only the revision without reviewing data
- Automatic retry with a fresh revision

## Dependencies

B12; all read, write and item invariants are stable.

Mandatory accompanying contracts: [Decisions](../README.md#approved-decisions), [API](../README.md#canonical-api-contracts), [Data Model](../README.md#canonical-database-model), [Architecture](../README.md#shared-system-architecture), and [Frontend Data Flow](../frontend/Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture). Calculator phases also read [Nutrition Policy](../README.md#nutrition-calculation-policy). These are normative contract sections, not optional background. If a prerequisite is absent, implement that prerequisite first; do not bypass it with local component state, a new API, or an unsafe database reset.


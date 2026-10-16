# F-011 — Meal Plan — Backend — Phase B15

**Phase title:** Backend contract, security and performance release verification

## Canonical Contract

The feature [README](../README.md) owns shared product behavior, data requirements, database impact, API/request/response contracts and error semantics. This file applies the backend template to one bounded phase. It does not redefine the shared contract.

**Phase:** B15
**Status:** Automated backend verification passed (2026-10-15); deployed release gates remain pending. B15 is not marked fully complete.
**Specification:** Test/foundation changes implemented; no new API or schema.

## Backend Goal

Demonstrate the implemented feature meets contracts and prerequisites on isolated real MySQL, including negative/security/failure cases.

## Authorization and Ownership

Session derives the owner. Join item→meal→day→user for child IDs; also match route date where supplied. Current requires scoped plan plus composite FK. A route guard/disabled button is never authorization. All unsafe browser calls use E-005 CSRF transport/validation and exact allowed API boundary. Use Dapper parameters, strict DTOs and named enum codes; escape displayed text through normal Angular binding. Pure calculation/GETs do not create persistent state.

## API Layer

Controllers bind/map request, session identity and revision, call the Application use case, map the canonical HTTP result and expose OpenAPI. No SQL or target calculation in controllers.

No new endpoint is introduced in this phase. Implement only the foundation/projection/test changes named above. Preserve existing public contracts; relevant complete endpoint shapes are in the canonical API appendix.

## Application Layer

Implement the named Application/Infrastructure/HTTP slice through the flow below. Controllers only bind/authenticate/delegate; services have no SQL; repositories own the entire atomic use case. Pure helpers contain the business rules. Register new use cases in existing DI extensions, not Program.cs ad-hoc service blocks.

## Domain Rules

- Use real MySQL for FK/CHECK/locking tests, not SQLite substitutes.
- Require dedicated database, safe host and explicit destructive-test opt-in.
- Never log profile/manual bodies or tokens.
- No per-item recipe queries or UI-owned authorization.
- Documentation completion is not implementation completion.

## Persistence

No new feature schema. Verify migration history, upgrade/recovery evidence, safe test database and separate migration/application identities. Do not change migrations already applied.

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

1. Test every route anonymously and with owned/foreign/missing resources, including valid/invalid/missing CSRF.
2. Use independent connections for revision races, first writes and injected copy failures.
3. Compare implemented OpenAPI to canonical DTO/nullability/error contracts.
4. Capture EXPLAIN and bounded command counts for ordinary and maximum-size operations.
5. Run builds and guarded suites; record actual versions, commands, outcomes and limitations.

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

- Full object-ownership matrix, mixed foreign reorder IDs and Current FK checks.
- Cross-tab conflicts and ambiguous-commit handling contract.
- Cancellation/fault after partial copy restores all data.
- Four-result-set range query and indexed owner/date/parent access; bounded maximum copy.
- Existing auth/discovery/favorites/cooking/basic-profile regressions pass.

Negative cases must assert unchanged data/revision/confirmed state, not just the returned status. Use synthetic two-user fixtures. Real MySQL is required for FK/CHECK/lock/rollback behavior; controlled Observables and HttpTestingController are appropriate for client races/serialization. Existing critical auth/discovery/profile behavior must remain compatible.

### Acceptance criteria

- [ ] Demonstrate the implemented feature meets contracts and prerequisites on isolated real MySQL, including negative/security/failure cases.
- [x] Full object-ownership matrix, mixed foreign reorder IDs and Current FK checks.
- [x] Cross-tab conflicts and ambiguous-commit handling contract.
- [x] Cancellation/fault after partial copy restores all data.
- [x] Four-result-set range query and indexed owner/date/parent access; bounded maximum copy.
- [x] Existing auth/discovery/favorites/cooking/basic-profile regressions pass.
- [x] All owned object operations scope to the session user and all multi-row writes share the common transaction/version protocol.
- [x] No deferred approved scope or unrelated refactor is introduced.
- [x] Build and named meaningful tests pass, with real results recorded; do not mark unrun integration tests passed.
- [ ] Complete deployed prerequisite evidence: actual migration history/recovery, distinct least-privileged identities and authenticated/CSRF-protected smoke checks. Local fixture credentials do not establish these facts.

### Completion verification

Verified 2026-10-15: final build passed with 0 warnings/errors (12.23s); required
full backend suite passed **992/992**, **0 failed/skipped** (41.1526min), including
**49/49 B12–B15** cases. TRX counters checked; no test exclusions. Initial phase
runs also passed (29/29, 17/17, final-contract 4/4); tooling tests passed 48/48.
Canonical/generated schema copies align and no migration was changed.
Exact commands, files, environment, measurements and checkpoints:
`Backend/docs/f011-b12-b15-progress.md`; artifact:
`Backend/.dotnet/test-results/f011-backend-release-full.trx`.

Isolated loopback MySQL 8.0.35 / strict mode / InnoDB and actual indexes verified.
Maximum 7×12×20 mixed range: 1 command / 4 sets, 41ms, 425658 serialized bytes.
Maximum copy: 36 transaction commands, 128-row batches, 2611 reported inserts,
301ms transaction / 333ms TestServer receipt. These are local observations, not
remote HTTP or production SLO evidence. Existing auth, discovery, favorites,
cooking, basic profile, migrations and account closure regressions passed.

Pending external gates (not inferred from a local test pass): deployed migration
history and backup/fix-forward readiness; distinct least-privileged runtime and
migration identities; synthetic deployed authenticated/CSRF-protected smoke
checks; frontend/browser release acceptance. Do not run reset/bootstrap scripts
or blind migration replay to satisfy these gates.

No developer/production migration/reset/grant, backend listener launch, Azure
action or frontend application change was performed. Only the guarded explicitly
opted-in `appetee_backend_tests` fixture was reset/seeded. No verification process
from this implementation remains running. B15 stays open for the deployment
evidence above, even though its automated implementation/verification passed.

Release verification also fixes the master-specified existing account-closure
integration: remove Current settings, then dated roots/cascades, then plans,
then the user under the original lock/transaction. Owner/foreign isolation and
outbox/root rollback are tested; no unrelated E-001 redesign or audit deletion.

Working directory: Appetee_v2_BackEnd repository root. Use the repository’s installed SDK/package versions. Commands are for implementation, not commands executed while preparing this specification.

```bash
dotnet build Appetee.sln
# Only after isolated MySQL guard/preflight passes:

dotnet test tests/Appetee.Api.Tests/Appetee.Api.Tests.csproj
```

Before any integration test that can rebuild data, prove isolated test host/database and explicit opt-in. Add the named tests from this phase before running its filter; a zero-test match is not success. For frontend, run the meaningful phase tests plus build; use the configured runner’s supported file selection when available rather than inventing a lint script. Inspect imports/state location and exercise the specified error path manually. Record actual result and limitations in the phase completion evidence; do not change specification-ready into implemented without evidence.

## Implementation Notes

### Existing code involved

Audited current files (paths relative to the backend repository):

- `tests/Appetee.Api.Tests/Infrastructure/ApiTestDatabase.cs`
- `tests/Appetee.Api.Tests/Infrastructure/AppeteeWebApplicationFactory.cs`
- `src/Appetee.Infrastructure/Data/IDbConnectionFactory.cs`
- `src/Appetee.Api/Controllers/ErrorsController.cs`

Earlier-phase files to extend, not falsely assumed present at the audited snapshot:

None. Do not create speculative files for future phases.

The [File Manifest](../README.md#implementation-file-manifest) names first creator and subsequent editors. Preserve existing project/namespace conventions. Consult [repository audit](../README.md#preserved-repository-audit) before adapting changed source.

### Files to create

- `tests/Appetee.Api.Tests/Integration/F011B15SecurityAndConcurrencyTests.cs`
- `tests/Appetee.Api.Tests/Integration/F011B15PerformanceTests.cs`

Each production class/module uses the responsibility/dependency rules in [backend map](Phase_B03_write_protocol_and_errors.md#shared-backend-architecture) or [frontend ownership map](../frontend/Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture). Test companions exercise behavior, not implementation-only snapshots. Do not create similarly named duplicate files elsewhere.

### Files to modify

- `tests/Appetee.Api.Tests/Infrastructure/ApiTestDatabase.cs`
- `tests/Appetee.Api.Tests/Infrastructure/AppeteeWebApplicationFactory.cs`

### Frontend changes

F15 tests completed contracts, CSRF,401/409 and unknown/no-Current states. The frontend ownership audit remains mandatory even when backend tests pass.

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

- Only happy-path tests
- Marking prerequisites complete from documents alone
- Unmeasured performance claims
- Resetting a remote configured database
- Unrelated refactoring

## Dependencies

B01–B14; implemented E-005/E-002/E-008 prerequisites with recorded evidence. Documentation status alone is not completion.

Mandatory accompanying contracts: [Decisions](../README.md#approved-decisions), [API](../README.md#canonical-api-contracts), [Data Model](../README.md#canonical-database-model), [Architecture](../README.md#shared-system-architecture), and [Frontend Data Flow](../frontend/Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture). Calculator phases also read [Nutrition Policy](../README.md#nutrition-calculation-policy). These are normative contract sections, not optional background. If a prerequisite is absent, implement that prerequisite first; do not bypass it with local component state, a new API, or an unsafe database reset.


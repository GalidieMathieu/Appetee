# F-011 — Meal Plan — Frontend — Phase F02c

**Phase title:** Ordered core write coordinator and failure states

## Canonical Contract

The feature [README](../README.md) owns shared product behavior, data requirements, database impact, API/request/response contracts and error semantics. This file applies the frontend template to one bounded phase. It does not redefine the shared contract.

**Phase:** F02c
**Status:** Implemented
**Specification:** Implemented and verified on 2026-10-05.

## Frontend Goal

Serialize state-changing requests, coalesce unsent scalar edits, and distinguish rejected writes from uncertain commit outcomes.

## Routes

Use the authenticated Meal Plan route shell introduced in F01 and the child routes introduced by this phase. Profile integration uses the existing `/profile` route. The exact route/selection and Back behavior is owned by the [shared frontend architecture](./Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture) and [UX contract](../README.md#ux-and-accessibility-contract). Do not register a component before its owning phase creates it. Route guards provide UX only; backend ownership remains authoritative.

## Page and Component Structure

### Files to create

- `src/app/core/shared/data-access/meal-plan/meal-plan-mutation-coordinator.ts`
- `src/app/core/shared/data-access/meal-plan/meal-plan-mutation-coordinator.spec.ts`

Each production class/module uses the responsibility/dependency rules in [backend map](../backend/Phase_B03_write_protocol_and_errors.md#shared-backend-architecture) or [frontend ownership map](Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture). Test companions exercise behavior, not implementation-only snapshots. Do not create similarly named duplicate files elsewhere.

### Files to modify

- `src/app/core/shared/data-access/meal-plan/meal-plan-mutation.model.ts`
- `src/app/app.config.ts`

## State Ownership

**Core:** reusable DTO/domain types, APIs, saved profile, complete plan details, plan summaries, planner range/query state, scoped picker API/query state, mutation coordinator, synchronization and domain facades.

**Feature:** separate task/selection state, form drafts, temporary overlays and view-model orchestration.

**UI/page.ts:** composition, focus references and intent/view-model bindings only. No API subscriptions, persistent/shared entity cache, request state, forms or nutrition calculations. See the phase-specific boundary table under Data Flow.

## State Lifetime

Core identity state survives route changes and clears via existing-instance SESSION_RESETTERS. Core picker classes are provided once per workspace and clear on the core reset signal. Feature flow/draft providers survive child task/step navigation and clear on flow exit or identity reset. APIs are stateless. Browser refresh reconstructs from URL and authenticated GETs; no browser-persisted profile, planner or mutation queue. [Exact owner/lifetime map](./Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture).

## Data Flow

### Data flow

1. Core facades will submit typed operation descriptors with resource IDs/body, reviewed base context and core-owned execution function.
2. Coordinator validates originating snapshot authority, increments readEpoch and runs one write at a time.
3. Coalesce only unsent same-resource name/quantity values; keep structural commands distinct.
4. On response call SyncService once, advance trusted own-write chain and then notify caller; do not clear a newer feature draft from core.
5. On409/unknown outcome pause dependent queue and expose review/reconciliation state; reset cancels unsent jobs and rejects late generation callbacks.

Data ownership at each crossing is explicit: UI intent → separate feature flow/draft controller → core domain facade/coordinator → core API → controller → Application → atomic Infrastructure operation. Confirmed response returns through core SyncService/store once before feature navigation/status. For read-only phases there is no write/coordinator transaction; for pure preview its ephemeral result belongs to the unsaved draft, not saved-plan cache.

### Complete frontend data flow and ownership

**Response path:** API → Core data-access/state → feature orchestration/state → UI components. **Intent path:** UI → separate feature controller → Core domain facade/coordinator → Core API → backend. The response must return through Core before it changes feature navigation or success state.

| Boundary | Exact responsibility in F02c |
|---|---|
| API response | Stateless core APIs execute intents constructed by core facades. Controlled requests prove ordering before UI integration. |
| Core data/access/state | MealPlanMutationCoordinator owns the single FIFO lane/status/read epoch; MealPlanSyncService adopts successful receipts into core stores. |
| Feature orchestration/state | Feature draft controllers will submit scalar intent and originating revision, then observe status and confirmed selectors. |
| UI components and page.ts | Future autosave/status controls consume a VM; they cannot enqueue HTTP themselves. |

### Mutations, autosave and state propagation

Serialize all feature writes. Coalesce only unsent same-resource scalar edits. Preserve unknown outcome, conflict and confirmed rejection as distinct states; never attach a new revision and blindly replay.

On a successful write, the Core API returns the typed receipt to its core use case; Core synchronization applies affected confirmed data/settings/revision once. Readonly selectors then update feature-derived view models. Feature state reconciles only the acknowledged draft version and performs the next UI task. Page.ts binds the resulting view model; it never handles the raw receipt or patches a server entity. Foundation/read-only phases document this integration contract without importing future modules before their creation.

### Refresh, errors and identity changes

Loads have independent core request/error state and captured generation/key/sequence/epoch. A response from an old identity or pre-write epoch is discarded. An unknown newer revision invalidates older projections; it cannot silently authorize their edits. Failed writes preserve confirmed Core data and feature drafts separately. Conflicts require refresh/review; ambiguous results require reconciliation rather than automatic replay. Core stores/coordinator clear via SESSION_RESETTERS using existing instances; scoped picker and feature drafts clear on the core context reset signal. Late results cannot repopulate a new session.

### Boundary acceptance

Trace one read from HTTP result to rendered VM and one applicable write from UI intent to confirmed Core state and back. Prove there is no API state, persistent/shared entity cache, HTTP orchestration, FormGroup ownership or nutrition algorithm in page.ts. Reusable application/API state remains in Core even when its provider is scoped to the planner workspace. Temporary draft/model/form files remain separate from presentation.

[Ownership diagram](../assets/diagrams/03-frontend-ownership.png) · [Range flow](../assets/diagrams/04-range-read.png) · [Autosave flow](../assets/diagrams/05-autosave-state.png)

## API Integration

No new endpoint is introduced in this phase. Implement only the foundation/projection/test changes named above. Preserve existing public contracts; relevant complete endpoint shapes are in the canonical API appendix.

## Loading Behavior

Operation statuses idle/pending/failed/conflict/unknownOutcome are explicit. UI components added later render these; core provides codes/state, not toast text or focus logic.

For any affected data consumer distinguish not loaded/loading, loaded-empty, ready, stale-refreshing and error; mutations additionally expose pending/failed/conflict/unknownOutcome. Saved means acknowledged latest intent. NULL target is no-target mode; NULL nutrient means unknown, not zero. Keep query errors independent from mutation errors.

## Empty States

Distinguish not loaded from a successful empty response. An untouched date, saved-empty day and saved-empty meal have different behavior; no virtual refill after a day is saved. Picker no-results is not an API error. Easy/no Current has no targets; an unknown nutrient is not zero. Apply the [UX state table](../README.md#ux-and-accessibility-contract) where this phase exposes that state.

## Error Behavior

Use existing ProblemDetails with traceId/code and field errors.400 keeps the draft/invalid operation visible;401 invokes central session handling;404 uses non-leaking unavailable behavior;409 pauses dependent work and requires refresh/review; unexpected/transport failure preserves confirmed state. A possibly committed request is unknownOutcome, not proof of rollback. Never automatically attach a newer GET revision and replay a mutation. No sensitive request/body/token logging. Read-only retries are bounded and do not retry auth/validation failures.

## Caching and Invalidation

Authoritative caches stay in Core. Same-key reads coalesce; list summaries cannot hydrate complete detail caches. Accept only current identity/key/sequence/epoch responses. Core sync applies one receipt before feature navigation and updates/invalidate affected projections. Unknown revision jumps stale older views rather than upgrading their write authority. Revalidate on route entry/focus; clear on identity reset. [Detailed read/write and invalidation contract](./Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture).

## Forms

Apply the exact numeric/name/date/enum/union bounds in the endpoint cards and canonical contracts. Client checks help the user; server checks remain authoritative. Reject missing or unknown JSON fields rather than accept overposting. Dynamic checks (ownership, current slot, counts, duplicate recipe, complete reorder membership, replacement confirmation) must be rechecked under the mutation lock, not only in an earlier GET. A no-op still requires a valid current precondition and owned object.

For UI forms, put typed controls/validators in the dedicated form factory/draft state; preserve failed values and map field-path errors. Never bind an editable form directly to a cached DTO. No silent unit conversion, clamping, fractional-serving acceptance or unknown-to-zero coercion.

## Responsive Behavior

Use the same core sources and route-scoped drafts at all widths. Desktop keeps day context left and task right; narrow viewport renders one active task with Back. Do not mount duplicate desktop/mobile forms or provide a second core store in a mobile subtree. Test long names, full item lists and narrow width without changing business behavior. Final visual references do not override the written layout rules.

## Accessibility

Use native controls, visible focus, named icon buttons and text equivalents for selected/progress/unknown states. New task focuses its heading and Back restores the trigger. Only true dialogs trap focus/handle Escape. Invalid forms show linked field errors and a summary below the heading. Save announcements are polite and settled. Dragging has Move up/down alternatives. Validate the applicable keyboard/focus/error behavior in [UX and accessibility](../README.md#ux-and-accessibility-contract); do not rely only on color or tooltips.

Include 200%/400% zoom and reduced-motion settings in final acceptance. Reflow task content and respect reduced-motion preferences without changing core state lifetimes.

## Testing

### Testing requirements

- Quantity2 in flight then3/4 sends2 then4; older ack does not overwrite latest draft token.
- Two rapid structural clicks disable/deduplicate at intent boundary without merging unrelated operations.
- 409 pauses; unknown commit does not replay with fetched newer revision.
- Logout during write clears queue and ignores eventual response; next identity cannot receive it.
- Queued edit of a resource deleted by earlier receipt is cancelled with visible operation result.

Negative cases must assert unchanged data/revision/confirmed state, not just the returned status. Use synthetic two-user fixtures. Real MySQL is required for FK/CHECK/lock/rollback behavior; controlled Observables and HttpTestingController are appropriate for client races/serialization. Existing critical auth/discovery/profile behavior must remain compatible.

### Acceptance criteria

- [x] Serialize state-changing requests, coalesce unsent scalar edits, and distinguish rejected writes from uncertain commit outcomes.
- [x] Quantity2 in flight then3/4 sends2 then4; older ack does not overwrite latest draft token.
- [x] Two rapid structural clicks disable/deduplicate at intent boundary without merging unrelated operations.
- [x] 409 pauses; unknown commit does not replay with fetched newer revision.
- [x] Logout during write clears queue and ignores eventual response; next identity cannot receive it.
- [x] Queued edit of a resource deleted by earlier receipt is cancelled with visible operation result.
- [x] Core data-access contains saved data/DTOs/facades; feature temporary state is separate from pages/UI; no direct component HTTP.
- [x] No deferred approved scope or unrelated refactor is introduced.
- [x] Build and named meaningful tests pass, with real results recorded; do not mark unrun integration tests passed.

### Completion verification

Working directory: Appetee_v2_frontEnd repository root. Use the repository’s installed SDK/package versions. Commands are for implementation, not commands executed while preparing this specification.

```bash
npm run build
npm test -- --watch=false
```

Before any integration test that can rebuild data, prove isolated test host/database and explicit opt-in. Add the named tests from this phase before running its filter; a zero-test match is not success. For frontend, run the meaningful phase tests plus build; use the configured runner’s supported file selection when available rather than inventing a lint script. Inspect imports/state location and exercise the specified error path manually. Record actual result and limitations in the phase completion evidence; do not change specification-ready into implemented without evidence.

Completion evidence (2026-10-05):

- Focused F02b/F02c/provider run: 3 files passed, 22 tests passed.
- Full frontend run: 63 files passed, 371 tests passed, 1 existing test skipped.
- Production build passed; only the three existing SCSS budget warnings remained.
- The coordinator is registered through `SESSION_RESETTERS` with `useExisting`; architecture searches found no feature, Router, MatDialog, FormGroup or HttpClient dependency.
- No backend, database, API endpoint, page, form or UI implementation was included.

## Implementation Notes

### Existing code involved

Audited current files (paths relative to the frontend repository):

- `src/app/app.config.ts`
- `src/app/core/shared/data-access/STATE_ARCHITECTURE.md`
- `src/app/core/shared/data-access/generic-template/entity-cache-store.ts`
- `src/app/core/session/session-reset.token.ts`
- `src/app/core/session/session.service.ts`
- `src/app/core/api/api-error.interceptor.ts`

Earlier-phase files to extend, not falsely assumed present at the audited snapshot:

- `src/app/core/shared/data-access/meal-plan/meal-plan-mutation.model.ts`

The [File Manifest](../README.md#implementation-file-manifest) names first creator and subsequent editors. Preserve existing project/namespace conventions. Consult [repository audit](../README.md#preserved-repository-audit) before adapting changed source.

### Database changes

No frontend phase writes SQL or changes schema. Backend prerequisites below own persistence.

### Backend changes

B03 must guarantee one commit/version/readback and stable409. No backend implementation in this phase; use controlled HTTP Observables and real integration later. No GET may create state to support the queue.

### Frontend changes

Implement the exact core files and separate feature flow/form/UI files listed above. Core owns HTTP, DTOs, confirmed state, synchronization and reusable use cases. Feature state owns only temporary drafts/selection/tasks. Pages/components bind readonly view models and emit intent; no HttpClient/API injection, server-data arrays, request orchestration or nutrition math in page.ts. This phase’s concrete flow below defines the boundary crossings.

### Business rules

- No switchMap for mutations, automatic fresh-version retry, persistent offline queue, component/FormGroup/Router captures.
- Queued quantity requests carry absolute latest values; in-flight requests cannot be cancelled as an undo.
- Same-revision duplicate POST is rejected after successful commit; no operation-receipt table introduced.
- Expose waitUntilIdle/flush coordination signals for later route guard; no dialog inside core.
- Pending operation state is independent of list/detail/range errors.

### Security / ownership

Session derives the owner. Join item→meal→day→user for child IDs; also match route date where supplied. Current requires scoped plan plus composite FK. A route guard/disabled button is never authorization. All unsafe browser calls use E-005 CSRF transport/validation and exact allowed API boundary. Use Dapper parameters, strict DTOs and named enum codes; escape displayed text through normal Angular binding. Pure calculation/GETs do not create persistent state.

### Transactions

The browser never emulates a transaction with several persistence calls. Each completed W action is one core-coordinated backend command. Core sends the originating reviewed revision and consumes the atomic receipt once. Temporary UI overlays do not mutate confirmed stores. Copy Week is one command, not seven Copy Day calls. The paired backend phase owns database atomicity; do not weaken it to simplify UI.

### Out of scope

All other phase implementations unless explicitly listed as modifications; no broad migration of unrelated stores/services. No Templates, persisted weeks, target/recipe snapshots, fractional servings, flexible ingredients, recommendations, training-day model, recovery modifier, shopping list, batches or reusable foods/meals. Do not add a generic state/transaction framework as a substitute for the concrete slice.

### Common implementation mistakes

- Promise queue detached from session lifetime
- Cancelling HTTP and assuming rollback
- Advancing version from unrelated GET
- Root queue retaining component closures
- Persisting body/profile drafts in localStorage

## Dependencies

F02b; B03 revision/error semantics; E-005 protection available for integration.

Mandatory accompanying contracts: [Decisions](../README.md#approved-decisions), [API](../README.md#canonical-api-contracts), [Data Model](../README.md#canonical-database-model), [Architecture](../README.md#shared-system-architecture), and [Frontend Data Flow](Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture). Calculator phases also read [Nutrition Policy](../README.md#nutrition-calculation-policy). These are normative contract sections, not optional background. If a prerequisite is absent, implement that prerequisite first; do not bypass it with local component state, a new API, or an unsafe database reset.

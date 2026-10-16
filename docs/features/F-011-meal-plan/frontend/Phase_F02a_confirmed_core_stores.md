# F-011 — Meal Plan — Frontend — Phase F02a

**Phase title:** Confirmed core stores and query identities

## Canonical Contract

The feature [README](../README.md) owns shared product behavior, data requirements, database impact, API/request/response contracts and error semantics. This file applies the frontend template to one bounded phase. It does not redefine the shared contract.

**Phase:** F02a
**Status:** Implemented
**Specification:** Implemented in the frontend repository and verified on 2026-10-05.

## Frontend Goal

Create one source of truth for saved range, plan, profile and settings data with independent request states and session generations.

## Routes

Use the authenticated Meal Plan route shell introduced in F01 and the child routes introduced by this phase. Profile integration uses the existing `/profile` route. The exact route/selection and Back behavior is owned by the [shared frontend architecture](./Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture) and [UX contract](../README.md#ux-and-accessibility-contract). Do not register a component before its owning phase creates it. Route guards provide UX only; backend ownership remains authoritative.

## Page and Component Structure

### Files to create

- `src/app/core/shared/data-access/meal-plan/meal-plan-context.store.ts`
- `src/app/core/shared/data-access/meal-plan/meal-plan-context.store.spec.ts`
- `src/app/core/shared/data-access/meal-plan/meal-planner.store.ts`
- `src/app/core/shared/data-access/meal-plan/meal-planner.store.spec.ts`
- `src/app/core/shared/data-access/meal-plan/nutrition-plans.store.ts`
- `src/app/core/shared/data-access/meal-plan/nutrition-plans.store.spec.ts`
- `src/app/core/shared/data-access/meal-plan/nutrition-plan-details.store.ts`
- `src/app/core/shared/data-access/meal-plan/nutrition-plan-details.store.spec.ts`
- `src/app/core/shared/data-access/user/nutrition-profile.store.ts`
- `src/app/core/shared/data-access/user/nutrition-profile.store.spec.ts`
- `src/app/core/shared/data-access/meal-plan/testing/meal-plan.fixtures.ts`

Each production class/module uses the responsibility/dependency rules in [backend map](../backend/Phase_B03_write_protocol_and_errors.md#shared-backend-architecture) or [frontend ownership map](Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture). Test companions exercise behavior, not implementation-only snapshots. Do not create similarly named duplicate files elsewhere.

### Files to modify

- `src/app/app.config.ts`

## State Ownership

**Core:** reusable DTO/domain types, APIs, saved profile, complete plan details, plan summaries, planner range/query state, scoped picker API/query state, mutation coordinator, synchronization and domain facades.

**Feature:** separate task/selection state, form drafts, temporary overlays and view-model orchestration.

**UI/page.ts:** composition, focus references and intent/view-model bindings only. No API subscriptions, persistent/shared entity cache, request state, forms or nutrition calculations. See the phase-specific boundary table under Data Flow.

## State Lifetime

Core identity state survives route changes and clears via existing-instance SESSION_RESETTERS. Core picker classes are provided once per workspace and clear on the core reset signal. Feature flow/draft providers survive child task/step navigation and clear on flow exit or identity reset. APIs are stateless. Browser refresh reconstructs from URL and authenticated GETs; no browser-persisted profile, planner or mutation queue. [Exact owner/lifetime map](./Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture).

## Data Flow

### Data flow

1. Create root signal stores with readonly selectors and explicit controlled write methods for core synchronization only.
2. Planner store holds up to three independently keyed range projections with observed revision/request token, not an unbounded entity cache.
3. Plan summary store is distinct from complete detail cache; use EntityCacheStore with complete detail record id/plan/revision metadata.
4. Profile store owns complete nullable profile independently of existing UserStore username/image.
5. Register each root identity store with SESSION_RESETTERS using useExisting; context reset increments generation and emits reset$ for scoped consumers.

Data ownership at each crossing is explicit: UI intent → separate feature flow/draft controller → core domain facade/coordinator → core API → controller → Application → atomic Infrastructure operation. Confirmed response returns through core SyncService/store once before feature navigation/status. For read-only phases there is no write/coordinator transaction; for pure preview its ephemeral result belongs to the unsaved draft, not saved-plan cache.

### Complete frontend data flow and ownership

**Response path:** API → Core data-access/state → feature orchestration/state → UI components. **Intent path:** UI → separate feature controller → Core domain facade/coordinator → Core API → backend. The response must return through Core before it changes feature navigation or success state.

| Boundary | Exact responsibility in F02a |
|---|---|
| API response | A future core facade supplies complete range/list/detail/profile responses; this phase tests ingestion with typed fixtures. |
| Core data/access/state | MealPlannerStore owns ranges; NutritionPlansStore owns summaries; NutritionPlanDetailsStore owns complete details; NutritionProfileStore owns the saved profile; MealPlanContextStore owns context. |
| Feature orchestration/state | Later route-scoped feature state derives task-specific view models from readonly core selectors; never keeps a second cache. |
| UI components and page.ts | Future pages/components bind those view models. This phase adds no page data subscriptions. |

### Mutations, autosave and state propagation

This phase defines authoritative state and reset behavior. Receipt orchestration comes in F02b and writes in F02c; do not emulate either in components.

On a successful write, the Core API returns the typed receipt to its core use case; Core synchronization applies affected confirmed data/settings/revision once. Readonly selectors then update feature-derived view models. Feature state reconciles only the acknowledged draft version and performs the next UI task. Page.ts binds the resulting view model; it never handles the raw receipt or patches a server entity. Foundation/read-only phases document this integration contract without importing future modules before their creation.

### Refresh, errors and identity changes

Loads have independent core request/error state and captured generation/key/sequence/epoch. A response from an old identity or pre-write epoch is discarded. An unknown newer revision invalidates older projections; it cannot silently authorize their edits. Failed writes preserve confirmed Core data and feature drafts separately. Conflicts require refresh/review; ambiguous results require reconciliation rather than automatic replay. Core stores/coordinator clear via SESSION_RESETTERS using existing instances; scoped picker and feature drafts clear on the core context reset signal. Late results cannot repopulate a new session.

### Boundary acceptance

Trace one read from HTTP result to rendered VM and one applicable write from UI intent to confirmed Core state and back. Prove there is no API state, persistent/shared entity cache, HTTP orchestration, FormGroup ownership or nutrition algorithm in page.ts. Reusable application/API state remains in Core even when its provider is scoped to the planner workspace. Temporary draft/model/form files remain separate from presentation.

[Ownership diagram](../assets/diagrams/03-frontend-ownership.png) · [Range flow](../assets/diagrams/04-range-read.png) · [Autosave flow](../assets/diagrams/05-autosave-state.png)

## API Integration

No new endpoint is introduced in this phase. Implement only the foundation/projection/test changes named above. Preserve existing public contracts; relevant complete endpoint shapes are in the canonical API appendix.

## Loading Behavior

No feature UI implementation; expose selectors needed for later loading/empty/error/stale states. Keep state types presentation-neutral.

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

- Same-key request state does not affect another key/ID.
- Summary DTO cannot be inserted as complete plan detail; compile/runtime fixture tests cover it.
- Reset clears every identity value and increments generation; old token is rejected.
- Range eviction preserves active/reviewed keys within max3; unknown nutrition retained.
- No root store provided a second time at route/component level.

Negative cases must assert unchanged data/revision/confirmed state, not just the returned status. Use synthetic two-user fixtures. Real MySQL is required for FK/CHECK/lock/rollback behavior; controlled Observables and HttpTestingController are appropriate for client races/serialization. Existing critical auth/discovery/profile behavior must remain compatible.

### Acceptance criteria

- [x] Create one source of truth for saved range, plan, profile and settings data with independent request states and session generations.
- [x] Same-key request state does not affect another key/ID.
- [x] Summary DTO cannot be inserted as complete plan detail; compile/runtime fixture tests cover it.
- [x] Reset clears every identity value and increments generation; old token is rejected.
- [x] Range eviction preserves active/reviewed keys within max3; unknown nutrition retained.
- [x] No root store provided a second time at route/component level.
- [x] Core data-access contains saved data/DTOs/stores; future facades remain assigned to their owning phases; feature state and pages were not changed.
- [x] No deferred approved scope or unrelated refactor is introduced.
- [x] Build and named meaningful tests pass, with real results recorded; no integration-test claim is made.

### Completion evidence

- `npm run build`: passed on 2026-10-05; three pre-existing component-style budget warnings remain.
- Focused F02a store/provider suite: 6 test files and 27 tests passed.
- `npm test -- --watch=false`: 61 test files passed, 358 tests passed, and one pre-existing test remained skipped.
- Static ownership search found no feature, Router, MatDialog, HttpClient or FormGroup dependency in the new Core stores and no route/component provider for these root stores.
- No backend, database, page, facade, synchronization or mutation-coordinator implementation was included.

### Completion verification

Working directory: Appetee_v2_frontEnd repository root. Use the repository’s installed SDK/package versions. Commands are for implementation, not commands executed while preparing this specification.

```bash
npm run build
npm test -- --watch=false
```

Before any integration test that can rebuild data, prove isolated test host/database and explicit opt-in. Add the named tests from this phase before running its filter; a zero-test match is not success. For frontend, run the meaningful phase tests plus build; use the configured runner’s supported file selection when available rather than inventing a lint script. Inspect imports/state location and exercise the specified error path manually. Record actual result and limitations in the phase completion evidence; do not change specification-ready into implemented without evidence.

## Implementation Notes

### Existing code involved

Audited current files (paths relative to the frontend repository):

- `src/app/app.config.ts`
- `src/app/core/shared/data-access/STATE_ARCHITECTURE.md`
- `src/app/core/shared/data-access/generic-template/entity-cache-store.ts`
- `src/app/core/session/session-reset.token.ts`
- `src/app/core/shared/data-access/recipes/recipe-details.store.ts`
- `src/app/core/session/session.service.ts`

Earlier-phase files to extend, not falsely assumed present at the audited snapshot:

None. Do not create speculative files for future phases.

The [File Manifest](../README.md#implementation-file-manifest) names first creator and subsequent editors. Preserve existing project/namespace conventions. Consult [repository audit](../README.md#preserved-repository-audit) before adapting changed source.

### Database changes

No frontend phase writes SQL or changes schema. Backend prerequisites below own persistence.

### Backend changes

Uses B08 normalized reads and B06 complete-versus-summary contracts, but makes no calls yet. No schema/backend implementation in this phase. Tests use clearly synthetic contract fixtures in core/testing.

### Frontend changes

Implement the exact core files and separate feature flow/form/UI files listed above. Core owns HTTP, DTOs, confirmed state, synchronization and reusable use cases. Feature state owns only temporary drafts/selection/tasks. Pages/components bind readonly view models and emit intent; no HttpClient/API injection, server-data arrays, request orchestration or nutrition math in page.ts. This phase’s concrete flow below defines the boundary crossings.

### Business rules

- No feature/page mutable server arrays; no duplicated settings flags on plan cards.
- Every object documents owner, provider, lifetime, invalidation and identity scope.
- Query loading/error is independent per key; detail state per ID; mutation state comes later.
- NULL profile differs from not-loaded and error; untouched date differs from saved-empty.
- Do not use an EntityStore loaded Boolean for several independently loaded plans.

### Security / ownership

Session derives the owner. Join item→meal→day→user for child IDs; also match route date where supplied. Current requires scoped plan plus composite FK. A route guard/disabled button is never authorization. All unsafe browser calls use E-005 CSRF transport/validation and exact allowed API boundary. Use Dapper parameters, strict DTOs and named enum codes; escape displayed text through normal Angular binding. Pure calculation/GETs do not create persistent state.

### Transactions

The browser never emulates a transaction with several persistence calls. Each completed W action is one core-coordinated backend command. Core sends the originating reviewed revision and consumes the atomic receipt once. Temporary UI overlays do not mutate confirmed stores. Copy Week is one command, not seven Copy Day calls. The paired backend phase owns database atomicity; do not weaken it to simplify UI.

### Out of scope

All other phase implementations unless explicitly listed as modifications; no broad migration of unrelated stores/services. No Templates, persisted weeks, target/recipe snapshots, fractional servings, flexible ingredients, recommendations, training-day model, recovery modifier, shopping list, batches or reusable foods/meals. Do not add a generic state/transaction framework as a substitute for the concrete slice.

### Common implementation mistakes

- One loading flag for all reads/writes
- Registering useClass and creating duplicate store
- Caching partial cards as details
- Putting form controls into stores
- Treating id:null as missing error

## Dependencies

F01; inspect EntityCacheStore and STATE_ARCHITECTURE.md. Do not implement UI or mutation queue in this slice.

Mandatory accompanying contracts: [Decisions](../README.md#approved-decisions), [API](../README.md#canonical-api-contracts), [Data Model](../README.md#canonical-database-model), [Architecture](../README.md#shared-system-architecture), and [Frontend Data Flow](Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture). Calculator phases also read [Nutrition Policy](../README.md#nutrition-calculation-policy). These are normative contract sections, not optional background. If a prerequisite is absent, implement that prerequisite first; do not bypass it with local component state, a new API, or an unsafe database reset.

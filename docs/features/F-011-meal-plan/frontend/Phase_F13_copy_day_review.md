# F-011 — Meal Plan — Frontend — Phase F13

**Phase title:** Copy Day review and exact replacement

## Canonical Contract

The feature [README](../README.md) owns shared product behavior, data requirements, database impact, API/request/response contracts and error semantics. This file applies the frontend template to one bounded phase. It does not redefine the shared contract.

**Phase:** F13
**Status:** Frontend implemented locally; live backend integration and manual accessibility acceptance pending.
**Specification:** Implemented against MP01/MP12; no backend changes.

## Frontend implementation evidence — 2026-10-15

Copy Day is a real focus-trapping Material dialog opened from day context. Core pins/loads source and destination range snapshots after writes settle; feature state keeps only dates, reviewed revision, acknowledgement and presentation feedback. Review displays saved/absent/empty distinctions, replacement counts, expandable destination meal/food labels and clearing warnings. Saved destinations require explicit replacement acknowledgement. Mismatched revisions reload both at most once; continuously changing context remains unconfirmed. Confirmation uses that joint reviewed version, not the latest unrelated number. One command synchronizes destination data before closing/selecting it. [Verification and remaining release checks](F11_F15_implementation_verification.md).

## Frontend Goal

Present a trustworthy destination review and one confirmed copy without keeping server graphs in feature state.

## Routes

Copy Day remains a dialog over the current planner route, not a new browser task or persistent URL. Cancel/Escape restores its trigger, except while an unsafe command is pending. Changing destination, closing, errors or a changed context revoke consent. A conflict/unknown outcome requires fresh inspection and another explicit confirmation; there is no automatic replay. The shared header is preserved.

Use the authenticated Meal Plan route shell introduced in F01 and the child routes introduced by this phase. Profile integration uses the existing `/profile` route. The exact route/selection and Back behavior is owned by the [shared frontend architecture](./Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture) and [UX contract](../README.md#ux-and-accessibility-contract). Do not register a component before its owning phase creates it. Route guards provide UX only; backend ownership remains authoritative.

## Page and Component Structure

### Files to create

- `src/app/features/meal-plan/models/copy-intent.model.ts`
- `src/app/features/meal-plan/state/copy-flow.state.ts`
- `src/app/features/meal-plan/state/copy-flow.state.spec.ts`
- `src/app/features/meal-plan/planner/copy-day-dialog.component.ts`
- `src/app/features/meal-plan/planner/copy-day-dialog.component.html`
- `src/app/features/meal-plan/planner/copy-day-dialog.component.scss`
- `src/app/features/meal-plan/planner/copy-day-dialog.component.spec.ts`

Each production class/module uses the responsibility/dependency rules in [backend map](../backend/Phase_B03_write_protocol_and_errors.md#shared-backend-architecture) or [frontend ownership map](Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture). Test companions exercise behavior, not implementation-only snapshots. Do not create similarly named duplicate files elsewhere.

### Files to modify

- `src/app/core/shared/data-access/meal-plan/meal-planner.facade.ts`
- `src/app/features/meal-plan/state/meal-plan-workspace.facade.ts`
- `src/app/features/meal-plan/meal-plan.routes.ts`

## State Ownership

**Core:** reusable DTO/domain types, APIs, saved profile, complete plan details, plan summaries, planner range/query state, scoped picker API/query state, mutation coordinator, synchronization and domain facades.

**Feature:** separate task/selection state, form drafts, temporary overlays and view-model orchestration.

**UI/page.ts:** composition, focus references and intent/view-model bindings only. No API subscriptions, persistent/shared entity cache, request state, forms or nutrition calculations. See the phase-specific boundary table under Data Flow.

## State Lifetime

Core identity state survives route changes and clears via existing-instance SESSION_RESETTERS. Core picker classes are provided once per workspace and clear on the core reset signal. Feature flow/draft providers survive child task/step navigation and clear on flow exit or identity reset. APIs are stateless. Browser refresh reconstructs from URL and authenticated GETs; no browser-persisted profile, planner or mutation queue. [Exact owner/lifetime map](./Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture).

## Data Flow

### Data flow

1. Wait for writes to settle, then inspect source and destination through core keyed ranges.
2. Feature copy state keeps dates/mode/reviewed revision/confirmation; graphs and counts come from core selectors.
3. Different revisions invalidate review and reload both; destination version cannot bless an old source.
4. Show replacement/clearing summary, then confirm with replaceExisting.
5. One core command and receipt synchronize destination before closing/selecting it.

Data ownership at each crossing is explicit: UI intent → separate feature flow/draft controller → core domain facade/coordinator → core API → controller → Application → atomic Infrastructure operation. Confirmed response returns through core SyncService/store once before feature navigation/status. For read-only phases there is no write/coordinator transaction; for pure preview its ephemeral result belongs to the unsaved draft, not saved-plan cache.

### Complete frontend data flow and ownership

**Response path:** API → Core data-access/state → feature orchestration/state → UI components. **Intent path:** UI → separate feature controller → Core domain facade/coordinator → Core API → backend. The response must return through Core before it changes feature navigation or success state.

| Boundary | Exact responsibility in F13 |
|---|---|
| API response | MP01 supplies source and destination snapshots; MP12 performs Copy Day through MealPlannerApi. |
| Core data/access/state | MealPlannerFacade/Store own loaded ranges; coordinator and sync execute/adopt one copy command. |
| Feature orchestration/state | CopyFlowState owns only dates, reviewed revision and confirmation; WorkspaceFacade composes review VM from core snapshots. |
| UI components and page.ts | CopyDayDialogComponent displays impact and emits Confirm/Cancel. |

### Mutations, autosave and state propagation

Confirm uses the reviewed context, not the latest globally observed number. One receipt replaces destination projection; conflict returns to refreshed review. No copied server graph is stored inside the dialog or feature state.

On a successful write, the Core API returns the typed receipt to its core use case; Core synchronization applies affected confirmed data/settings/revision once. Readonly selectors then update feature-derived view models. Feature state reconciles only the acknowledged draft version and performs the next UI task. Page.ts binds the resulting view model; it never handles the raw receipt or patches a server entity. Foundation/read-only phases document this integration contract without importing future modules before their creation.

### Refresh, errors and identity changes

Loads have independent core request/error state and captured generation/key/sequence/epoch. A response from an old identity or pre-write epoch is discarded. An unknown newer revision invalidates older projections; it cannot silently authorize their edits. Failed writes preserve confirmed Core data and feature drafts separately. Conflicts require refresh/review; ambiguous results require reconciliation rather than automatic replay. Core stores/coordinator clear via SESSION_RESETTERS using existing instances; scoped picker and feature drafts clear on the core context reset signal. Late results cannot repopulate a new session.

### Boundary acceptance

Trace one read from HTTP result to rendered VM and one applicable write from UI intent to confirmed Core state and back. Prove there is no API state, persistent/shared entity cache, HTTP orchestration, FormGroup ownership or nutrition algorithm in page.ts. Reusable application/API state remains in Core even when its provider is scoped to the planner workspace. Temporary draft/model/form files remain separate from presentation.

[Ownership diagram](../assets/diagrams/03-frontend-ownership.png) · [Range flow](../assets/diagrams/04-range-read.png) · [Autosave flow](../assets/diagrams/05-autosave-state.png)

## API Integration

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

## Loading Behavior

Dialog shows destination date, affected content and an explicit replacement warning, including clearing from absent source. Confirm requires a current review. Cancel restores trigger; success focuses destination context.

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

- Newer destination GET cannot authorize stale source.
- Absent/empty/populated states produce correct review and final result.
- Cancel sends nothing; duplicate confirmation is disabled.
- 409 requires fresh review; unknown network outcome leaves confirmed client data intact.
- Dialog keyboard, Escape/focus restoration and mobile layout.

Negative cases must assert unchanged data/revision/confirmed state, not just the returned status. Use synthetic two-user fixtures. Real MySQL is required for FK/CHECK/lock/rollback behavior; controlled Observables and HttpTestingController are appropriate for client races/serialization. Existing critical auth/discovery/profile behavior must remain compatible.

### Acceptance criteria

- [x] Present a trustworthy destination review and one confirmed copy without keeping server graphs in feature state.
- [ ] Newer destination GET cannot authorize stale source.
- [ ] Absent/empty/populated states produce correct review and final result.
- [ ] Cancel sends nothing; duplicate confirmation is disabled.
- [ ] 409 requires fresh review; unknown network outcome leaves confirmed client data intact.
- [ ] Dialog keyboard, Escape/focus restoration and mobile layout.
- [x] Core data-access contains saved data/DTOs/facades; feature temporary state is separate from pages/UI; no direct component HTTP.
- [x] No deferred approved scope or unrelated refactor is introduced.
- [x] Build and named meaningful frontend tests pass; actual results and unrun integration/manual checks are recorded separately.

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

- `src/app/core/shared/data-access/STATE_ARCHITECTURE.md`
- `src/app/core/shared/data-access/generic-template/entity-cache-store.ts`
- `src/app/core/session/session-reset.token.ts`

Earlier-phase files to extend, not falsely assumed present at the audited snapshot:

- `src/app/core/shared/data-access/meal-plan/meal-planner.facade.ts`
- `src/app/features/meal-plan/state/meal-plan-workspace.facade.ts`
- `src/app/features/meal-plan/meal-plan.routes.ts`

The [File Manifest](../README.md#implementation-file-manifest) names first creator and subsequent editors. Preserve existing project/namespace conventions. Consult [repository audit](../README.md#preserved-repository-audit) before adapting changed source.

### Database changes

No frontend phase writes SQL or changes schema. Backend prerequisites below own persistence.

### Backend changes

B13 owns atomic replacement, sparse-state interpretation and source_recipe_unavailable409. MP01 supplies inspection; no additional copy-preview endpoint.

### Frontend changes

Implement the exact core files and separate feature flow/form/UI files listed above. Core owns HTTP, DTOs, confirmed state, synchronization and reusable use cases. Feature state owns only temporary drafts/selection/tasks. Pages/components bind readonly view models and emit intent; no HttpClient/API injection, server-data arrays, request orchestration or nutrition math in page.ts. This phase’s concrete flow below defines the boundary crossings.

### Business rules

- Same date is invalid; every persisted destination needs acknowledgement.
- Absent source means no saved structure, not virtual meal content.
- Unknown outcome pauses for reconciliation; no automatic repetition.
- Send only dates/flag plus revision header, never a client graph.
- Changing destination,409 or route exit clears confirmation.

### Security / ownership

Session derives the owner. Join item→meal→day→user for child IDs; also match route date where supplied. Current requires scoped plan plus composite FK. A route guard/disabled button is never authorization. All unsafe browser calls use E-005 CSRF transport/validation and exact allowed API boundary. Use Dapper parameters, strict DTOs and named enum codes; escape displayed text through normal Angular binding. Pure calculation/GETs do not create persistent state.

### Transactions

The browser never emulates a transaction with several persistence calls. Each completed W action is one core-coordinated backend command. Core sends the originating reviewed revision and consumes the atomic receipt once. Temporary UI overlays do not mutate confirmed stores. Copy Week is one command, not seven Copy Day calls. The paired backend phase owns database atomicity; do not weaken it to simplify UI.

### Out of scope

All other phase implementations unless explicitly listed as modifications; no broad migration of unrelated stores/services. No Templates, persisted weeks, target/recipe snapshots, fractional servings, flexible ingredients, recommendations, training-day model, recovery modifier, shopping list, batches or reusable foods/meals. Do not add a generic state/transaction framework as a substitute for the concrete slice.

### Common implementation mistakes

- Feature-owned server graph
- Automatic revision refresh/replay
- Ignoring saved-empty destinations
- Copying virtual placeholders
- Optimistic destination replacement

## Dependencies

F12; B13.

Mandatory accompanying contracts: [Decisions](../README.md#approved-decisions), [API](../README.md#canonical-api-contracts), [Data Model](../README.md#canonical-database-model), [Architecture](../README.md#shared-system-architecture), and [Frontend Data Flow](Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture). Calculator phases also read [Nutrition Policy](../README.md#nutrition-calculation-policy). These are normative contract sections, not optional background. If a prerequisite is absent, implement that prerequisite first; do not bypass it with local component state, a new API, or an unsafe database reset.


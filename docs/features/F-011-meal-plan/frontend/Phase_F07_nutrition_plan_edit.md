# F-011 — Meal Plan — Frontend — Phase F07

**Phase title:** Single-page plan editing and deliberate recalculation

## Canonical Contract

The feature [README](../README.md) owns shared product behavior, data requirements, database impact, API/request/response contracts and error semantics. This file applies the frontend template to one bounded phase. It does not redefine the shared contract.

**Phase:** F07
**Status:** Frontend implemented; live API/browser verification pending.
**Specification:** Implemented against the canonical contract; no backend changes.

## Frontend implementation evidence — 2026-10-12

Implemented one compact all-fields edit page, complete keyed Core detail reads and NP07 updates. Metadata-only requests omit calculation/review fields and preserve saved targets. Detail/profile reads have independent Core state; profile loading follows accepted detail to avoid a cross-query revision race. Refreshes never overwrite a dirty draft or silently replace its reviewed revision. Current-profile copying affects only the draft; deliberate recalculation invalidates the preview and requires fresh evidence. Missing/foreign detail uses the same safe unavailable view. Core receipt synchronization controls range invalidation/rebasing; no food is rewritten in the UI.

Primary tests: `nutrition-plan-edit.page.spec.ts`, expanded `nutrition-plan.facade.spec.ts`, `nutrition-plan-intermediate.spec.ts`, `nutrition-plan-calculation-flow.spec.ts` and existing sync tests. They cover complete-detail coalescing, wrong-ID rejection, pre-write response rejection without stranded Loading, metadata omission/target preservation, dirty refreshes, profile copying, policy-stale recovery and CSRF rejection without replay.

Verification from `appetee_front`:

```powershell
$env:VITEST_MAX_WORKERS = '1'
npm test -- --watch=false --include='src/app/features/meal-plan/**/*.spec.ts' --include='src/app/core/shared/data-access/meal-plan/**/*.spec.ts'
npm test -- --watch=false
npm run build
```

- Focused Meal Plan suite: **158 passed / 35 files**.
- Full frontend suite: **580 passed, 1 existing skip / 98 files** on the serial rerun. An earlier two-worker full run had two timeout failures, including an existing cooking-mode test; test limits/unrelated tests were not changed.
- Final production build: **passed**. Initial bundle **508.99 kB vs 500 kB** warning, plus the three existing SCSS warnings (recipes list, admin recipes and cooking mode). Budgets were not changed.
- Ownership inspection: no direct HTTP/API subscriptions, owned FormGroups/shared caches or nutrition algorithms in the new pages/presentational components; Core does not import feature/Router/form/UI modules.
- No backend, database, browser-storage, deployment or hosting changes.
- Live API journeys, real-browser 320 px captures, 200%/400% zoom, reduced-motion and screen-reader acceptance are **not run**, not marked passed. Compact CSS/native semantics and DOM focus tests do not substitute for those checks.

## Frontend Goal

Edit all plan fields in one page while preserving saved calculation unless the user changes/recalculates it.

## Routes

Approved browser route: `/meal-plan/nutrition-plans/:planId/edit`, under the authenticated shell. Dashboard cards expose a named Edit action. The page loads complete NP05 detail, never a list-summary draft, and submits NP07 with the explicitly reviewed revision. Cancel/confirmed Update returns to the dashboard and restores the plan's Edit trigger when available. Mode is immutable.

Use the authenticated Meal Plan route shell introduced in F01 and the child routes introduced by this phase. Profile integration uses the existing `/profile` route. The exact route/selection and Back behavior is owned by the [shared frontend architecture](./Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture) and [UX contract](../README.md#ux-and-accessibility-contract). Do not register a component before its owning phase creates it. Route guards provide UX only; backend ownership remains authoritative.

## Page and Component Structure

### Files to create

- `src/app/features/meal-plan/nutrition-plans/nutrition-plan-edit.page.ts`
- `src/app/features/meal-plan/nutrition-plans/nutrition-plan-edit.page.html`
- `src/app/features/meal-plan/nutrition-plans/nutrition-plan-edit.page.scss`
- `src/app/features/meal-plan/nutrition-plans/nutrition-plan-edit.page.spec.ts`

Each production class/module uses the responsibility/dependency rules in [backend map](../backend/Phase_B03_write_protocol_and_errors.md#shared-backend-architecture) or [frontend ownership map](Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture). Test companions exercise behavior, not implementation-only snapshots. Do not create similarly named duplicate files elsewhere.

### Files to modify

- `src/app/core/shared/data-access/meal-plan/nutrition-plan.facade.ts`
- `src/app/core/shared/data-access/meal-plan/nutrition-plan.facade.spec.ts`
- `src/app/features/meal-plan/state/nutrition-plan-draft.state.ts`
- `src/app/features/meal-plan/state/nutrition-plan-flow.facade.ts`
- `src/app/features/meal-plan/meal-plan.routes.ts`

## State Ownership

**Core:** reusable DTO/domain types, APIs, saved profile, complete plan details, plan summaries, planner range/query state, scoped picker API/query state, mutation coordinator, synchronization and domain facades.

**Feature:** separate task/selection state, form drafts, temporary overlays and view-model orchestration.

**UI/page.ts:** composition, focus references and intent/view-model bindings only. No API subscriptions, persistent/shared entity cache, request state, forms or nutrition calculations. See the phase-specific boundary table under Data Flow.

## State Lifetime

Core identity state survives route changes and clears via existing-instance SESSION_RESETTERS. Core picker classes are provided once per workspace and clear on the core reset signal. Feature flow/draft providers survive child task/step navigation and clear on flow exit or identity reset. APIs are stateless. Browser refresh reconstructs from URL and authenticated GETs; no browser-persisted profile, planner or mutation queue. [Exact owner/lifetime map](./Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture).

## Data Flow

### Data flow

1. Core facade loads complete detail record and profile independently; never hydrate edit from summary card.
2. Feature draft copies the stored plan inputs once, keeps baseline for change detection and originating revision.
3. Display profileDiffers/new-policy notices; Use current profile explicitly copies values into draft only.
4. Name/count-only Update omits calculation/review fields; calculation change requests fresh server preview and includes review evidence.
5. Core command applies full receipt/invalidation before reset/navigation;409 retains draft and requires review, not blind rebase.

Data ownership at each crossing is explicit: UI intent → separate feature flow/draft controller → core domain facade/coordinator → core API → controller → Application → atomic Infrastructure operation. Confirmed response returns through core SyncService/store once before feature navigation/status. For read-only phases there is no write/coordinator transaction; for pure preview its ephemeral result belongs to the unsaved draft, not saved-plan cache.

### Complete frontend data flow and ownership

**Response path:** API → Core data-access/state → feature orchestration/state → UI components. **Intent path:** UI → separate feature controller → Core domain facade/coordinator → Core API → backend. The response must return through Core before it changes feature navigation or success state.

| Boundary | Exact responsibility in F07 |
|---|---|
| API response | NP05 complete detail, NP01 profile, NP03 preview when calculation changes, NP07 Update. |
| Core data/access/state | NutritionPlanFacade loads complete detail into NutritionPlanDetailsStore; summary data must not seed that cache. Profile remains in its separate core store. |
| Feature orchestration/state | NutritionPlanDraftState/FlowFacade initialize editable fields once and distinguish metadata-only edits from deliberate recalculation. |
| UI components and page.ts | NutritionPlanEditPage and shared controlled form components display one all-fields edit surface. |

### Mutations, autosave and state propagation

Explicit Update goes through core coordinator. Metadata-only request omits calculation/review fields. Receipt refreshes core detail/list/profile/settings as applicable before baseline reset; newer local edits are not overwritten.

On a successful write, the Core API returns the typed receipt to its core use case; Core synchronization applies affected confirmed data/settings/revision once. Readonly selectors then update feature-derived view models. Feature state reconciles only the acknowledged draft version and performs the next UI task. Page.ts binds the resulting view model; it never handles the raw receipt or patches a server entity. Foundation/read-only phases document this integration contract without importing future modules before their creation.

### Refresh, errors and identity changes

Loads have independent core request/error state and captured generation/key/sequence/epoch. A response from an old identity or pre-write epoch is discarded. An unknown newer revision invalidates older projections; it cannot silently authorize their edits. Failed writes preserve confirmed Core data and feature drafts separately. Conflicts require refresh/review; ambiguous results require reconciliation rather than automatic replay. Core stores/coordinator clear via SESSION_RESETTERS using existing instances; scoped picker and feature drafts clear on the core context reset signal. Late results cannot repopulate a new session.

### Boundary acceptance

Trace one read from HTTP result to rendered VM and one applicable write from UI intent to confirmed Core state and back. Prove there is no API state, persistent/shared entity cache, HTTP orchestration, FormGroup ownership or nutrition algorithm in page.ts. Reusable application/API state remains in Core even when its provider is scoped to the planner workspace. Temporary draft/model/form files remain separate from presentation.

[Ownership diagram](../assets/diagrams/03-frontend-ownership.png) · [Range flow](../assets/diagrams/04-range-read.png) · [Autosave flow](../assets/diagrams/05-autosave-state.png)

## API Integration

### NP05: GET /api/nutrition-plans/{planId}

Purpose: Load complete plan for edit. Authentication required; owner comes from session, foreign/missing owned objects both 404. Parameters: planId route int. No extra query parameters.

- Request `none`: No request body. Do not invent optional mutation inputs.
- Response `NutritionPlanDetailDto`: revision,settings,plan:complete NutritionPlanDto,profileDiffers. Only complete plan enters detail cache. Success: 200.
- Application: `NutritionPlanService.GetAsync` → Infrastructure: `NutritionPlanQueries.GetAsync`.
- Frontend: core `NutritionPlanFacade.loadDetail`; feature flow delegates, UI never calls HTTP directly.
- Transaction class **R**: read-only coherent snapshot; never create rows.
- Specific rule: Scoped ID; missing/foreign404. profileDiffers compares current profile to stored inputs, not a forced recalculation.
- UI contract: Core complete detail cache record with observed revision; initialize draft once, never continuously patch it from cache.

Errors include 400 validation,401 session,404 scoped unavailable,409 business/version conflict and500 unexpected; unsafe calls require CSRF. Writes require X-Meal-Plan-Revision; reads/preview do not. Request/response nested fields are the normative API appendix linked above; do not invent a parallel shape.

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

## Loading Behavior

One all-fields page, Update Nutrition Plan action, grouped sections and error summary. Profile mismatch notice is informational with explicit action. Loading a missing detail cannot briefly display another cached plan.

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

- Metadata-only request omission and preserved targets.
- Dirty draft survives core refresh/error and newer profile notification.
- Explicit Use current profile and recalculate show fresh preview; policyyear evidence.
- Foreign/missing plan404 produces safe unavailable page.
- Current edit triggers range invalidation; inactive edit does not rewrite food.

Negative cases must assert unchanged data/revision/confirmed state, not just the returned status. Use synthetic two-user fixtures. Real MySQL is required for FK/CHECK/lock/rollback behavior; controlled Observables and HttpTestingController are appropriate for client races/serialization. Existing critical auth/discovery/profile behavior must remain compatible.

### Acceptance criteria

- [x] Edit all plan fields in one page while preserving saved calculation unless the user changes/recalculates it.
- [ ] Metadata-only request omission and preserved targets.
- [ ] Dirty draft survives core refresh/error and newer profile notification.
- [ ] Explicit Use current profile and recalculate show fresh preview; policyyear evidence.
- [ ] Foreign/missing plan404 produces safe unavailable page.
- [ ] Current edit triggers range invalidation; inactive edit does not rewrite food.
- [x] Core data-access contains saved data/DTOs/facades; feature temporary state is separate from pages/UI; no direct component HTTP.
- [x] No deferred approved scope or unrelated refactor is introduced.
- [x] Build and named meaningful frontend tests pass, with real results recorded; unrun integration/browser checks remain pending above.

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

- `src/app/core/shared/data-access/meal-plan/nutrition-plan.facade.ts`
- `src/app/core/shared/data-access/meal-plan/nutrition-plan.facade.spec.ts`
- `src/app/features/meal-plan/state/nutrition-plan-draft.state.ts`
- `src/app/features/meal-plan/state/nutrition-plan-flow.facade.ts`
- `src/app/features/meal-plan/meal-plan.routes.ts`

The [File Manifest](../README.md#implementation-file-manifest) names first creator and subsequent editors. Preserve existing project/namespace conventions. Consult [repository audit](../README.md#preserved-repository-audit) before adapting changed source.

### Database changes

No frontend phase writes SQL or changes schema. Backend prerequisites below own persistence.

### Backend changes

NP07 distinguishes omitted calculation from explicit recalculation; server stores current profile only for recalculation. No new endpoints or mode conversion.

### Frontend changes

Implement the exact core files and separate feature flow/form/UI files listed above. Core owns HTTP, DTOs, confirmed state, synchronization and reusable use cases. Feature state owns only temporary drafts/selection/tasks. Pages/components bind readonly view models and emit intent; no HttpClient/API injection, server-data arrays, request orchestration or nutrition math in page.ts. This phase’s concrete flow below defines the boundary crossings.

### Business rules

- Mode immutable; Easy page has no hidden intermediate fields.
- Switching Current or opening edit does not recalculate.
- Global profile update does not overwrite dirty edit draft.
- Do not convert all updates into full recalculations because API supports a calculation block.
- No hero images or wizard sequence for edit.

### Security / ownership

Session derives the owner. Join item→meal→day→user for child IDs; also match route date where supplied. Current requires scoped plan plus composite FK. A route guard/disabled button is never authorization. All unsafe browser calls use E-005 CSRF transport/validation and exact allowed API boundary. Use Dapper parameters, strict DTOs and named enum codes; escape displayed text through normal Angular binding. Pure calculation/GETs do not create persistent state.

### Transactions

The browser never emulates a transaction with several persistence calls. Each completed W action is one core-coordinated backend command. Core sends the originating reviewed revision and consumes the atomic receipt once. Temporary UI overlays do not mutate confirmed stores. Copy Week is one command, not seven Copy Day calls. The paired backend phase owns database atomicity; do not weaken it to simplify UI.

### Out of scope

All other phase implementations unless explicitly listed as modifications; no broad migration of unrelated stores/services. No Templates, persisted weeks, target/recipe snapshots, fractional servings, flexible ingredients, recommendations, training-day model, recovery modifier, shopping list, batches or reusable foods/meals. Do not add a generic state/transaction framework as a substitute for the concrete slice.

### Common implementation mistakes

- Editing from list projection
- PATCHing every keystroke as nutrition update
- Auto-recalculating on page load
- Hidden mode mutation
- Overwriting draft with incoming GET

## Dependencies

F06; B07 and complete plan detail GET.

Mandatory accompanying contracts: [Decisions](../README.md#approved-decisions), [API](../README.md#canonical-api-contracts), [Data Model](../README.md#canonical-database-model), [Architecture](../README.md#shared-system-architecture), and [Frontend Data Flow](Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture). Calculator phases also read [Nutrition Policy](../README.md#nutrition-calculation-policy). These are normative contract sections, not optional background. If a prerequisite is absent, implement that prerequisite first; do not bypass it with local component state, a new API, or an unsafe database reset.

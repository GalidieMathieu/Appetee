# F-011 — Meal Plan — Frontend — Phase F11

**Phase title:** Manual entry draft, validation and total-entry semantics

## Canonical Contract

The feature [README](../README.md) owns shared product behavior, data requirements, database impact, API/request/response contracts and error semantics. This file applies the frontend template to one bounded phase. It does not redefine the shared contract.

**Phase:** F11
**Status:** Frontend implemented locally; live backend integration and manual accessibility acceptance pending.
**Specification:** Implemented against the canonical API contract; backend endpoints unchanged.

## Frontend implementation evidence — 2026-10-15

Typed manual form/validators and editable scalar drafts live in dedicated feature files. Core owns Add/Update/Remove, serialization and receipt synchronization. Opening, typing and cancelling do not create rows; only an explicit complete Add/Update persists. Values remain total-entry numbers, all required and positive, with at most two decimals. Errors preserve the draft and originating revision; refresh alone never authorizes a repeat. [Verification and remaining release checks](F11_F15_implementation_verification.md).

## Frontend Goal

Implement complete manual-food editing with separate feature form state and atomic core persistence.

## Routes

Approved browser URLs (2026-10-15):

- Add to a saved meal: `/meal-plan/planner?date=YYYY-MM-DD&task=manual&mealId=123`.
- Add to an untouched slot: `/meal-plan/planner?date=YYYY-MM-DD&task=manual&defaultSlot=2`.
- Edit: `/meal-plan/planner?date=YYYY-MM-DD&task=manual&mealId=123&itemId=456`.

Add requires exactly one of `mealId` or `defaultSlot`. Edit requires both `mealId` and `itemId` and rejects `defaultSlot`. Saved IDs are positive signed INTs; slots are 1–8. Validate against the accepted loaded day: the selected item must be manual and belong to that meal/date. Query normalization uses replacement navigation to remove duplicate keys before enabling mutations; a selection lacking a valid parent falls back to day context. An unavailable/non-manual item falls back to its valid meal editor, without HTTP writes or invented data.

Back/Cancel returns to `task=meal` for the same date and meal, with Stay/Discard protection for dirty or failed explicit drafts. There is no manual autosave or Save-and-leave shortcut. A request already sent must settle/reconcile; discarding is not rollback. After virtual Add, Core synchronizes the receipt first, and navigation uses confirmed `createdMealId`. The shared header remains unchanged. Browser refresh reconstructs from URL and GETs, not stored drafts. These are browser routes only; MP08/MP09 backend endpoints and bodies do not change.

Use the authenticated Meal Plan route shell introduced in F01 and the child routes introduced by this phase. Profile integration uses the existing `/profile` route. The exact route/selection and Back behavior is owned by the [shared frontend architecture](./Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture) and [UX contract](../README.md#ux-and-accessibility-contract). Do not register a component before its owning phase creates it. Route guards provide UX only; backend ownership remains authoritative.

## Page and Component Structure

### Files to create

- `src/app/features/meal-plan/models/manual-item-draft.model.ts`
- `src/app/features/meal-plan/forms/manual-item-form.factory.ts`
- `src/app/features/meal-plan/state/manual-item-draft.state.ts`
- `src/app/features/meal-plan/state/manual-item-draft.state.spec.ts`
- `src/app/features/meal-plan/planner/manual-item-editor.component.ts`
- `src/app/features/meal-plan/planner/manual-item-editor.component.html`
- `src/app/features/meal-plan/planner/manual-item-editor.component.scss`
- `src/app/features/meal-plan/planner/manual-item-editor.component.spec.ts`

Each production class/module uses the responsibility/dependency rules in [backend map](../backend/Phase_B03_write_protocol_and_errors.md#shared-backend-architecture) or [frontend ownership map](Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture). Test companions exercise behavior, not implementation-only snapshots. Do not create similarly named duplicate files elsewhere.

### Files to modify

- `src/app/core/shared/data-access/meal-plan/meal-planner.facade.ts`
- `src/app/features/meal-plan/state/meal-plan-workspace.facade.ts`
- `src/app/features/meal-plan/models/meal-plan-workspace.model.ts`
- `src/app/features/meal-plan/meal-plan.routes.ts`

## State Ownership

**Core:** reusable DTO/domain types, APIs, saved profile, complete plan details, plan summaries, planner range/query state, scoped picker API/query state, mutation coordinator, synchronization and domain facades.

**Feature:** separate task/selection state, form drafts, temporary overlays and view-model orchestration.

**UI/page.ts:** composition, focus references and intent/view-model bindings only. No API subscriptions, persistent/shared entity cache, request state, forms or nutrition calculations. See the phase-specific boundary table under Data Flow.

## State Lifetime

Core identity state survives route changes and clears via existing-instance SESSION_RESETTERS. Core picker classes are provided once per workspace and clear on the core reset signal. Feature flow/draft providers survive child task/step navigation and clear on flow exit or identity reset. APIs are stateless. Browser refresh reconstructs from URL and authenticated GETs; no browser-persisted profile, planner or mutation queue. [Exact owner/lifetime map](./Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture).

## Data Flow

### Data flow

1. Opening New creates only a draft; Edit copies scalar values from one confirmed core item once.
2. Pure form factory defines typed controls/validators; component emits Add/Update/Cancel.
3. Completed valid action delegates to core facade with target and reviewed base context.
4. Core sync applies receipt before the flow returns to Meal Editor and clears draft.
5. Invalid/server errors preserve fields with linked summary; Cancel discards unsaved values only.

Data ownership at each crossing is explicit: UI intent → separate feature flow/draft controller → core domain facade/coordinator → core API → controller → Application → atomic Infrastructure operation. Confirmed response returns through core SyncService/store once before feature navigation/status. For read-only phases there is no write/coordinator transaction; for pure preview its ephemeral result belongs to the unsaved draft, not saved-plan cache.

### Complete frontend data flow and ownership

**Response path:** API → Core data-access/state → feature orchestration/state → UI components. **Intent path:** UI → separate feature controller → Core domain facade/coordinator → Core API → backend. The response must return through Core before it changes feature navigation or success state.

| Boundary | Exact responsibility in F11 |
|---|---|
| API response | MP01 supplies existing item; MP08 Add, MP09 Update and MP10 Remove pass through MealPlannerApi. |
| Core data/access/state | MealPlannerFacade/coordinator/sync own persistence and confirmed MealPlannerStore day projections. |
| Feature orchestration/state | ManualItemDraftState and its form factory copy only editable scalar values once; WorkspaceFacade orchestrates task/submit/error handling. |
| UI components and page.ts | ManualItemEditorComponent binds the form/status and emits Add/Update/Cancel without API calls. |

### Mutations, autosave and state propagation

There is no per-field autosave for manual items. One valid whole-entry submit writes atomically; core adopts confirmed totals before task closes. Cancel writes nothing; failure preserves values separately from the unchanged core snapshot.

On a successful write, the Core API returns the typed receipt to its core use case; Core synchronization applies affected confirmed data/settings/revision once. Readonly selectors then update feature-derived view models. Feature state reconciles only the acknowledged draft version and performs the next UI task. Page.ts binds the resulting view model; it never handles the raw receipt or patches a server entity. Foundation/read-only phases document this integration contract without importing future modules before their creation.

### Refresh, errors and identity changes

Loads have independent core request/error state and captured generation/key/sequence/epoch. A response from an old identity or pre-write epoch is discarded. An unknown newer revision invalidates older projections; it cannot silently authorize their edits. Failed writes preserve confirmed Core data and feature drafts separately. Conflicts require refresh/review; ambiguous results require reconciliation rather than automatic replay. Core stores/coordinator clear via SESSION_RESETTERS using existing instances; scoped picker and feature drafts clear on the core context reset signal. Late results cannot repopulate a new session.

### Boundary acceptance

Trace one read from HTTP result to rendered VM and one applicable write from UI intent to confirmed Core state and back. Prove there is no API state, persistent/shared entity cache, HTTP orchestration, FormGroup ownership or nutrition algorithm in page.ts. Reusable application/API state remains in Core even when its provider is scoped to the planner workspace. Temporary draft/model/form files remain separate from presentation.

[Ownership diagram](../assets/diagrams/03-frontend-ownership.png) · [Range flow](../assets/diagrams/04-range-read.png) · [Autosave flow](../assets/diagrams/05-autosave-state.png)

## API Integration

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

## Loading Behavior

Use Add/Edit manual food heading and red error summary directly below it after invalid submit. Show all fields with units and Total for this entry explanation. Restore Add/Edit trigger focus on close.

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

- Each missing/zero/negative/excess/precision field fails with clear linked errors.
- Open/type/cancel perform no request; valid completion performs one.
- Failed first materialization creates no fake client parents.
- Dirty edit survives refresh; receipt updates core before close.
- First-error focus, keyboard Cancel/Back, units and narrow reflow.

Negative cases must assert unchanged data/revision/confirmed state, not just the returned status. Use synthetic two-user fixtures. Real MySQL is required for FK/CHECK/lock/rollback behavior; controlled Observables and HttpTestingController are appropriate for client races/serialization. Existing critical auth/discovery/profile behavior must remain compatible.

### Acceptance criteria

- [x] Implement complete manual-food editing with separate feature form state and atomic core persistence.
- [ ] Each missing/zero/negative/excess/precision field fails with clear linked errors.
- [ ] Open/type/cancel perform no request; valid completion performs one.
- [ ] Failed first materialization creates no fake client parents.
- [ ] Dirty edit survives refresh; receipt updates core before close.
- [ ] First-error focus, keyboard Cancel/Back, units and narrow reflow.
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
- `src/app/features/meal-plan/models/meal-plan-workspace.model.ts`
- `src/app/features/meal-plan/meal-plan.routes.ts`

The [File Manifest](../README.md#implementation-file-manifest) names first creator and subsequent editors. Preserve existing project/namespace conventions. Consult [repository audit](../README.md#preserved-repository-audit) before adapting changed source.

### Database changes

No frontend phase writes SQL or changes schema. Backend prerequisites below own persistence.

### Backend changes

B11 owns atomic parent/detail persistence and authoritative validation. No new schema/endpoint; manual nutrition is total-entry data and is never multiplied by recipe quantity.

### Frontend changes

Implement the exact core files and separate feature flow/form/UI files listed above. Core owns HTTP, DTOs, confirmed state, synchronization and reusable use cases. Feature state owns only temporary drafts/selection/tasks. Pages/components bind readonly view models and emit intent; no HttpClient/API injection, server-data arrays, request orchestration or nutrition math in page.ts. This phase’s concrete flow below defines the boundary crossings.

### Business rules

- Every value strictly>0; all represent the whole entry, with no quantity field.
- Name1–120; calories<=20000; macros<=5000; max2 decimals.
- No per-field writes or4/4/9 calorie-equality rule.
- Form controls cannot mutate cached DTO objects.
- Manual editor is a right-pane task or single mobile screen, not a nested picker modal.

### Security / ownership

Session derives the owner. Join item→meal→day→user for child IDs; also match route date where supplied. Current requires scoped plan plus composite FK. A route guard/disabled button is never authorization. All unsafe browser calls use E-005 CSRF transport/validation and exact allowed API boundary. Use Dapper parameters, strict DTOs and named enum codes; escape displayed text through normal Angular binding. Pure calculation/GETs do not create persistent state.

### Transactions

The browser never emulates a transaction with several persistence calls. Each completed W action is one core-coordinated backend command. Core sends the originating reviewed revision and consumes the atomic receipt once. Temporary UI overlays do not mutate confirmed stores. Copy Week is one command, not seven Copy Day calls. The paired backend phase owns database atomicity; do not weaken it to simplify UI.

### Out of scope

All other phase implementations unless explicitly listed as modifications; no broad migration of unrelated stores/services. No Templates, persisted weeks, target/recipe snapshots, fractional servings, flexible ingredients, recommendations, training-day model, recovery modifier, shopping list, batches or reusable foods/meals. Do not add a generic state/transaction framework as a substitute for the concrete slice.

### Common implementation mistakes

- Allowing zero contrary to locked rule
- Form logic in page.ts
- Saving individual fields
- Direct cached-DTO binding
- Adding My Foods scope

## Dependencies

F09 and B11; core MealPlannerFacade and common coordinator are available.

Mandatory accompanying contracts: [Decisions](../README.md#approved-decisions), [API](../README.md#canonical-api-contracts), [Data Model](../README.md#canonical-database-model), [Architecture](../README.md#shared-system-architecture), and [Frontend Data Flow](Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture). Calculator phases also read [Nutrition Policy](../README.md#nutrition-calculation-policy). These are normative contract sections, not optional background. If a prerequisite is absent, implement that prerequisite first; do not bypass it with local component state, a new API, or an unsafe database reset.


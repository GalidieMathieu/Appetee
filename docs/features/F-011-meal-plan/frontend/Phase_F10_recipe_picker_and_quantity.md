# F-011 — Meal Plan — Frontend — Phase F10

**Phase title:** Independent recipe picker and whole-serving quantities

## Canonical Contract

The feature [README](../README.md) owns shared product behavior, data requirements, database impact, API/request/response contracts and error semantics. This file applies the frontend template to one bounded phase. It does not redefine the shared contract.

**Phase:** F10
**Status:** Frontend implemented locally; live backend integration and manual accessibility acceptance pending.
**Specification:** Implemented against the canonical API contract; no backend changes.

## Frontend implementation evidence — 2026-10-13

Search/Saved discovery uses a workspace-scoped Core picker facade/store, independent of the main Recipes query. Feature state owns only unsent search/tab intent; UI emits actions. Advanced cards use the existing lazy recipe experience for preview. Add, whole-serving quantity changes (1–20) and explicit removal use the Core planner write lane. Confirmed selected items determine In meal; duplicates never increment/upsert. Opening/cancelling the picker is read-only. See [F09/F10 verification and remaining requirements](F09_F10_implementation_verification.md).

## Frontend Goal

Reuse discovery/search/preview without sharing main Recipes query state; add/quantity/remove commands flow through core.

## Routes

Approved picker URL: `/meal-plan/planner?date=YYYY-MM-DD&task=recipe-picker&mealId=123`, or `/meal-plan/planner?date=YYYY-MM-DD&task=recipe-picker&defaultSlot=2` for an untouched virtual slot. Exactly one of `mealId` or `defaultSlot` is required, never both. Validate the selector against the accepted loaded day before enabling actions. Invalid/duplicate/unavailable selectors normalize to valid day context; a URL never invents a meal or authorizes access.

Back/cancel returns to `task=meal` for the same date and selected meal, restoring the Add recipe trigger when present. Direct entry replaces the URL with this parent; a trusted same-date parent uses history Back. Open/cancel does not persist a virtual meal. Successful Add first synchronizes the affected day in Core, then returns using the confirmed `createdMealId`, not the old virtual slot. Within the live workspace, a temporary slot-to-confirmed-ID navigation alias resolves the old parent history entry; aliases clear on exit/reset and are not persisted.

Allowed planner `task` values after F10 are `day`, `meal`, and `recipe-picker`. Day accepts neither selector; the other two require exactly one. Search drafts are not put in the URL or browser storage. The existing shared shell header is preserved across all three tasks.

Use the authenticated Meal Plan route shell introduced in F01 and the child routes introduced by this phase. Profile integration uses the existing `/profile` route. The exact route/selection and Back behavior is owned by the [shared frontend architecture](./Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture) and [UX contract](../README.md#ux-and-accessibility-contract). Do not register a component before its owning phase creates it. Route guards provide UX only; backend ownership remains authoritative.

## Page and Component Structure

### Files to create

- `src/app/core/shared/data-access/recipes/picker/recipe-picker.store.ts`
- `src/app/core/shared/data-access/recipes/picker/recipe-picker.store.spec.ts`
- `src/app/core/shared/data-access/recipes/picker/recipe-picker.facade.ts`
- `src/app/core/shared/data-access/recipes/picker/recipe-picker.facade.spec.ts`
- `src/app/features/meal-plan/state/recipe-picker.state.ts`
- `src/app/features/meal-plan/state/recipe-picker.state.spec.ts`
- `src/app/features/meal-plan/planner/recipe-picker.component.ts`
- `src/app/features/meal-plan/planner/recipe-picker.component.html`
- `src/app/features/meal-plan/planner/recipe-picker.component.scss`
- `src/app/features/meal-plan/planner/recipe-picker.component.spec.ts`
- `src/app/features/meal-plan/planner/recipe-picker-row.component.ts`
- `src/app/features/meal-plan/planner/recipe-picker-row.component.html`
- `src/app/features/meal-plan/planner/recipe-picker-row.component.scss`
- `src/app/features/meal-plan/planner/recipe-picker-row.component.spec.ts`

Each production class/module uses the responsibility/dependency rules in [backend map](../backend/Phase_B03_write_protocol_and_errors.md#shared-backend-architecture) or [frontend ownership map](Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture). Test companions exercise behavior, not implementation-only snapshots. Do not create similarly named duplicate files elsewhere.

### Files to modify

- `src/app/core/shared/data-access/meal-plan/meal-planner.facade.ts`
- `src/app/features/meal-plan/state/meal-plan-workspace.facade.ts`
- `src/app/features/meal-plan/state/meal-editor-draft.state.ts`
- `src/app/features/meal-plan/meal-plan.routes.ts`

## State Ownership

**Core:** reusable DTO/domain types, APIs, saved profile, complete plan details, plan summaries, planner range/query state, scoped picker API/query state, mutation coordinator, synchronization and domain facades.

**Feature:** separate task/selection state, form drafts, temporary overlays and view-model orchestration.

**UI/page.ts:** composition, focus references and intent/view-model bindings only. No API subscriptions, persistent/shared entity cache, request state, forms or nutrition calculations. See the phase-specific boundary table under Data Flow.

## State Lifetime

Core identity state survives route changes and clears via existing-instance SESSION_RESETTERS. Core picker classes are provided once per workspace and clear on the core reset signal. Feature flow/draft providers survive child task/step navigation and clear on flow exit or identity reset. APIs are stateless. Browser refresh reconstructs from URL and authenticated GETs; no browser-persisted profile, planner or mutation queue. [Exact owner/lifetime map](./Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture).

## Data Flow

### Data flow

1. Provide core picker store/facade once per workspace; feature state owns only unsubmitted search and tab intent.
2. Apply shared search normalization, then core picker calls `RecipesApi.discoverForMealPlan` with its own criteria/cursor/generation.
3. Render `RecipeCardAdvance` projections; optional preview uses existing RecipeExperienceFacade, never one preview call per row.
4. In meal comes from confirmed selected items; Add sends IDs/quantity, then returns to editor after receipt.
5. For quantity2 in flight then3/4, coalesce the unsent value 4; confirmed totals stay at the acknowledged value.
6. Reset scoped picker on context.reset$ and route destruction; favorite events invalidate Saved without changing Meal Plan revision.

Data ownership at each crossing is explicit: UI intent → separate feature flow/draft controller → core domain facade/coordinator → core API → controller → Application → atomic Infrastructure operation. Confirmed response returns through core SyncService/store once before feature navigation/status. For read-only phases there is no write/coordinator transaction; for pure preview its ephemeral result belongs to the unsaved draft, not saved-plan cache.

### Complete frontend data flow and ownership

**Response path:** API → Core data-access/state → feature orchestration/state → UI components. **Intent path:** UI → separate feature controller → Core domain facade/coordinator → Core API → backend. The response must return through Core before it changes feature navigation or success state.

| Boundary | Exact responsibility in F10 |
|---|---|
| API response | `RecipesApi.discoverForMealPlan` and `GET /api/recipes/meal-plan` serve advanced picker results; MP06 add, MP07 absolute quantity and MP10 remove use MealPlannerApi; MP01 supplies selected meal. |
| Core data/access/state | Core scoped RecipePickerFacade/Store own applied query/results/cursor; core MealPlannerFacade/Store own saved meal and mutations. Existing recipe experience handles preview. |
| Feature orchestration/state | RecipePickerState owns unsent search text/task choices; WorkspaceFacade orchestrates selection and add; MealEditorDraftState holds pending quantities. |
| UI components and page.ts | RecipePickerComponent/Row and MealEditor bind their readonly combined VM; no direct RecipesApi or writable-store injection. |

### Mutations, autosave and state propagation

Add receipt updates core before returning to editor. Absolute quantities use the shared write lane and latest-unsent coalescing; old acknowledgement cannot erase newer draft. In meal derives from confirmed selected meal; adding does not change favorites.

On a successful write, the Core API returns the typed receipt to its core use case; Core synchronization applies affected confirmed data/settings/revision once. Readonly selectors then update feature-derived view models. Feature state reconciles only the acknowledged draft version and performs the next UI task. Page.ts binds the resulting view model; it never handles the raw receipt or patches a server entity. Foundation/read-only phases document this integration contract without importing future modules before their creation.

### Refresh, errors and identity changes

Loads have independent core request/error state and captured generation/key/sequence/epoch. A response from an old identity or pre-write epoch is discarded. An unknown newer revision invalidates older projections; it cannot silently authorize their edits. Failed writes preserve confirmed Core data and feature drafts separately. Conflicts require refresh/review; ambiguous results require reconciliation rather than automatic replay. Core stores/coordinator clear via SESSION_RESETTERS using existing instances; scoped picker and feature drafts clear on the core context reset signal. Late results cannot repopulate a new session.

### Boundary acceptance

Trace one read from HTTP result to rendered VM and one applicable write from UI intent to confirmed Core state and back. Prove there is no API state, persistent/shared entity cache, HTTP orchestration, FormGroup ownership or nutrition algorithm in page.ts. Reusable application/API state remains in Core even when its provider is scoped to the planner workspace. Temporary draft/model/form files remain separate from presentation.

[Ownership diagram](../assets/diagrams/03-frontend-ownership.png) · [Range flow](../assets/diagrams/04-range-read.png) · [Autosave flow](../assets/diagrams/05-autosave-state.png)

## API Integration

### MP06: POST /api/meal-plan/days/{date}/recipe-items

Purpose: Add recipe, optionally materializing virtual meal. Authentication required; owner comes from session, foreign/missing owned objects both 404. Parameters: date route. No extra query parameters.

- Request `AddRecipeItemRequest`: meal:{mealId} OR {defaultSlot} exactly; recipeId positive INT; quantity integer1–20. Real meal must match route date/user.
- Response `PlannerMutationDto`: revision,settings,days:confirmed affected date projections,createdMealId|null,createdItemId|null. Current target/default context is included. Success: 201 + one-date Location.
- Application: `MealItemService.AddRecipeAsync` → Infrastructure: `MealItemRepository.AddRecipeAsync`.
- Frontend: core `MealPlannerFacade.addRecipe`; feature flow delegates, UI never calls HTTP directly.
- Transaction class **W**: one complete user-locked, revision-checked transaction including readback before commit.
- Specific rule: Target ownership/date/slot; compatibility; quantity1–20; max20; duplicate409. Insert parent(s)+item atomically. Return created IDs.
- UI contract: In meal prevents normal duplicate; Add stays pending until receipt; then back to Meal Editor.

Errors include 400 validation,401 session,404 scoped unavailable,409 business/version conflict and500 unexpected; unsafe calls require CSRF. Writes require X-Meal-Plan-Revision; reads/preview do not. Request/response nested fields are the normative API appendix linked above; do not invent a parallel shape.

### MP07: PUT /api/meal-plan/recipe-items/{itemId}/quantity

Purpose: Set absolute whole-serving count. Authentication required; owner comes from session, foreign/missing owned objects both 404. Parameters: itemId route int. No extra query parameters.

- Request `SetRecipeQuantityRequest`: quantity integer1–20; absolute value, not delta;0 is invalid.
- Response `PlannerMutationDto`: revision,settings,days:confirmed affected date projections,createdMealId|null,createdItemId|null. Current target/default context is included. Success: 200.
- Application: `MealItemService.SetRecipeQuantityAsync` → Infrastructure: `MealItemRepository.SetRecipeQuantityAsync`.
- Frontend: core `MealPlannerFacade.setRecipeQuantity`; feature flow delegates, UI never calls HTTP directly.
- Transaction class **W**: one complete user-locked, revision-checked transaction including readback before commit.
- Specific rule: Owned Recipe subtype; compatible canonical recipe; integer1–20; zero invalid; same value no-op.
- UI contract: Immediate quantity draft, latest unsent value coalesced; server totals only; preserve a newer draft when older ack arrives.

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

Wide result rows show name, description, kcal/protein/carbs and optional fat/badges, with Add/In meal. Search/Saved work; no fake Recommended control. Buttons have recipe-specific accessible names and pending states.

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

- Picker criteria leave the Recipes page filters/results/cursor untouched.
- Old pages cannot append to newer criteria; reset drops pending results.
- In-meal prevents duplicate clicks and handles server409.
- Rapid quantity2→4, unavailable removal and null fat render correctly.
- Wide/narrow views use one query instance and return focus to the selected meal.

Negative cases must assert unchanged data/revision/confirmed state, not just the returned status. Use synthetic two-user fixtures. Real MySQL is required for FK/CHECK/lock/rollback behavior; controlled Observables and HttpTestingController are appropriate for client races/serialization. Existing critical auth/discovery/profile behavior must remain compatible.

### Acceptance criteria

- [ ] Reuse discovery/search/preview without sharing main Recipes query state; add/quantity/remove commands flow through core.
- [ ] Picker criteria leave the Recipes page filters/results/cursor untouched.
- [ ] Old pages cannot append to newer criteria; reset drops pending results.
- [ ] In-meal prevents duplicate clicks and handles server409.
- [ ] Rapid quantity2→4, unavailable removal and null fat render correctly.
- [ ] Wide/narrow views use one query instance and return focus to the selected meal.
- [ ] Core data-access contains saved data/DTOs/facades; feature temporary state is separate from pages/UI; no direct component HTTP.
- [ ] No deferred approved scope or unrelated refactor is introduced.
- [ ] Build and named meaningful tests pass, with real results recorded; do not mark unrun integration tests passed.

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
- `src/app/core/shared/data-access/recipes/recipe.api.ts`
- `src/app/core/shared/data-access/recipes/recipe.facade.ts`
- `src/app/core/shared/data-access/recipes/recipe.model.ts`
- `src/app/core/shared/ui/recipe-search-bar/recipe-search-bar.component.ts`
- `src/app/core/shared/ui/recipe-search-bar/recipe-search.ts`
- `src/app/core/shared/ui/recipe-experience/recipe-experience.facade.ts`
- `src/app/features/recipes/state/recipe-discovery.facade.ts`
- `src/app/core/shared/data-access/recipes/recipes.store.ts`

Earlier-phase files to extend, not falsely assumed present at the audited snapshot:

- `src/app/core/shared/data-access/meal-plan/meal-planner.facade.ts`
- `src/app/features/meal-plan/state/meal-plan-workspace.facade.ts`
- `src/app/features/meal-plan/state/meal-editor-draft.state.ts`
- `src/app/features/meal-plan/meal-plan.routes.ts`

The [File Manifest](../README.md#implementation-file-manifest) names first creator and subsequent editors. Preserve existing project/namespace conventions. Consult [repository audit](../README.md#preserved-repository-audit) before adapting changed source.

### Database changes

No frontend phase writes SQL or changes schema. Backend prerequisites below own persistence.

### Backend changes

Reuse GET recipes cursor/compatibility and B10 item commands; B01 supplies additive fields. Generic item deletion starts in B10 and gains manual coverage in B11. No new picker search endpoint.

### Frontend changes

Implement the exact core files and separate feature flow/form/UI files listed above. Core owns HTTP, DTOs, confirmed state, synchronization and reusable use cases. Feature state owns only temporary drafts/selection/tasks. Pages/components bind readonly view models and emit intent; no HttpClient/API injection, server-data arrays, request orchestration or nutrition math in page.ts. This phase’s concrete flow below defines the boundary crossings.

### Business rules

- Do not inject root RecipeDiscoveryFacade/RecipesStore into picker.
- No Recent/recommendation backend or ingredient optimizer.
- Integer1–20; explicit Remove instead of zero.
- Read-only search may cancel previous requests; writes cannot use switchMap.
- Result cards are query projections, not complete details.
- Core file ownership is independent of locally scoped DI lifetime.

### Security / ownership

Session derives the owner. Join item→meal→day→user for child IDs; also match route date where supplied. Current requires scoped plan plus composite FK. A route guard/disabled button is never authorization. All unsafe browser calls use E-005 CSRF transport/validation and exact allowed API boundary. Use Dapper parameters, strict DTOs and named enum codes; escape displayed text through normal Angular binding. Pure calculation/GETs do not create persistent state.

### Transactions

The browser never emulates a transaction with several persistence calls. Each completed W action is one core-coordinated backend command. Core sends the originating reviewed revision and consumes the atomic receipt once. Temporary UI overlays do not mutate confirmed stores. Copy Week is one command, not seven Copy Day calls. The paired backend phase owns database atomicity; do not weaken it to simplify UI.

### Out of scope

All other phase implementations unless explicitly listed as modifications; no broad migration of unrelated stores/services. No Templates, persisted weeks, target/recipe snapshots, fractional servings, flexible ingredients, recommendations, training-day model, recovery modifier, shopping list, batches or reusable foods/meals. Do not add a generic state/transaction framework as a substitute for the concrete slice.

### Common implementation mistakes

- Sharing root RecipesStore
- Result arrays in components
- Preview call per result
- Increment-delta API
- Pending-quantity nutrition math

## Dependencies

F09; B01/B10; existing RecipesApi/RecipesFacade/RecipeExperienceFacade.

Mandatory accompanying contracts: [Decisions](../README.md#approved-decisions), [API](../README.md#canonical-api-contracts), [Data Model](../README.md#canonical-database-model), [Architecture](../README.md#shared-system-architecture), and [Frontend Data Flow](Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture). Calculator phases also read [Nutrition Policy](../README.md#nutrition-calculation-policy). These are normative contract sections, not optional background. If a prerequisite is absent, implement that prerequisite first; do not bypass it with local component state, a new API, or an unsafe database reset.

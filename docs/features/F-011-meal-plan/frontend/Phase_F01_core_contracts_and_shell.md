# F-011 — Meal Plan — Frontend — Phase F01

**Phase title:** Core contracts, HTTP clients and feature shell

## Canonical Contract

The feature [README](../README.md) owns shared product behavior, data requirements, database impact, API/request/response contracts and error semantics. This file applies the frontend template to one bounded phase. It does not redefine the shared contract.

**Phase:** F01
**Status:** Implemented
**Specification:** Implemented in the frontend repository and verified on 2026-10-04.

## Frontend Goal

Establish the correct core ownership boundary and compile-safe lazy shell without implementing data fetching in pages.

## Routes

Use the authenticated Meal Plan route shell introduced in F01 and the child routes introduced by this phase. Profile integration uses the existing `/profile` route. The exact route/selection and Back behavior is owned by the [shared frontend architecture](./Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture) and [UX contract](../README.md#ux-and-accessibility-contract). Do not register a component before its owning phase creates it. Route guards provide UX only; backend ownership remains authoritative.

## Page and Component Structure

### Files to create

- `src/app/core/shared/data-access/meal-plan/meal-plan.model.ts`
- `src/app/core/shared/data-access/meal-plan/nutrition-plan.model.ts`
- `src/app/core/shared/data-access/meal-plan/meal-plan-mutation.model.ts`
- `src/app/core/shared/data-access/meal-plan/meal-planner.api.ts`
- `src/app/core/shared/data-access/meal-plan/meal-planner.api.spec.ts`
- `src/app/core/shared/data-access/meal-plan/nutrition-plan.api.ts`
- `src/app/core/shared/data-access/meal-plan/nutrition-plan.api.spec.ts`
- `src/app/core/shared/data-access/user/nutrition-profile.model.ts`
- `src/app/features/meal-plan/meal-plan.routes.ts`
- `src/app/features/meal-plan/meal-plan-shell.page.ts`
- `src/app/features/meal-plan/meal-plan-shell.page.html`
- `src/app/features/meal-plan/meal-plan-shell.page.scss`
- `src/app/features/meal-plan/meal-plan-shell.page.spec.ts`

Each production class/module uses the responsibility/dependency rules in [backend map](../backend/Phase_B03_write_protocol_and_errors.md#shared-backend-architecture) or [frontend ownership map](Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture). Test companions exercise behavior, not implementation-only snapshots. Do not create similarly named duplicate files elsewhere.

### Files to modify

- `src/app/app.routes.ts`
- `src/app/core/shared/data-access/recipes/recipe.model.ts`
- `src/app/core/shared/data-access/user/user_auth.api.ts`
- `src/app/core/shared/data-access/user/user_auth.api.spec.ts`

## State Ownership

**Core:** reusable DTO/domain types, APIs, saved profile, complete plan details, plan summaries, planner range/query state, scoped picker API/query state, mutation coordinator, synchronization and domain facades.

**Feature:** separate task/selection state, form drafts, temporary overlays and view-model orchestration.

**UI/page.ts:** composition, focus references and intent/view-model bindings only. No API subscriptions, persistent/shared entity cache, request state, forms or nutrition calculations. See the phase-specific boundary table under Data Flow.

## State Lifetime

Core identity state survives route changes and clears via existing-instance SESSION_RESETTERS. Core picker classes are provided once per workspace and clear on the core reset signal. Feature flow/draft providers survive child task/step navigation and clear on flow exit or identity reset. APIs are stateless. Browser refresh reconstructs from URL and authenticated GETs; no browser-persisted profile, planner or mutation queue. [Exact owner/lifetime map](./Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture).

## Data Flow

### Data flow

1. Define separate wire types for list summaries, complete plans, range projections, profile values, requests and receipts in core.
2. Create stateless MealPlannerApi/NutritionPlanApi and extend existing UserApi for nutrition profile; keep methods Observable-based.
3. Serialize ISO dates, integer IDs, strict request bodies and revision headers; token injection remains existing E-005 boundary, not per-page code.
4. Create lazy shell/routes referencing only classes that exist in this phase; add child routes in their owning later phases, not broken imports.
5. Keep global navigation/Home availability disabled until release integration; no user-facing implementation/debug placeholders.

Data ownership at each crossing is explicit: UI intent → separate feature flow/draft controller → core domain facade/coordinator → core API → controller → Application → atomic Infrastructure operation. Confirmed response returns through core SyncService/store once before feature navigation/status. For read-only phases there is no write/coordinator transaction; for pure preview its ephemeral result belongs to the unsaved draft, not saved-plan cache.

### Complete frontend data flow and ownership

**Response path:** API → Core data-access/state → feature orchestration/state → UI components. **Intent path:** UI → separate feature controller → Core domain facade/coordinator → Core API → backend. The response must return through Core before it changes feature navigation or success state.

| Boundary | Exact responsibility in F01 |
|---|---|
| API response | Contract-only APIs: MealPlannerApi, NutritionPlanApi and existing UserApi; endpoint behavior is covered by HTTP contract tests. |
| Core data/access/state | The core DTO and API modules define the boundary. Confirmed stores/sync are introduced in F02a–c; no shell-local substitute is allowed. |
| Feature orchestration/state | The feature shell owns composition only; later feature flow controllers will consume core facades. |
| UI components and page.ts | MealPlanShellPage renders route/layout composition without server data. |

### Mutations, autosave and state propagation

No live mutation UI in this foundation. Test transport shapes now; wire the core coordinator only when its phase exists.

On a successful write, the Core API returns the typed receipt to its core use case; Core synchronization applies affected confirmed data/settings/revision once. Readonly selectors then update feature-derived view models. Feature state reconciles only the acknowledged draft version and performs the next UI task. Page.ts binds the resulting view model; it never handles the raw receipt or patches a server entity. Foundation/read-only phases document this integration contract without importing future modules before their creation.

### Refresh, errors and identity changes

Loads have independent core request/error state and captured generation/key/sequence/epoch. A response from an old identity or pre-write epoch is discarded. An unknown newer revision invalidates older projections; it cannot silently authorize their edits. Failed writes preserve confirmed Core data and feature drafts separately. Conflicts require refresh/review; ambiguous results require reconciliation rather than automatic replay. Core stores/coordinator clear via SESSION_RESETTERS using existing instances; scoped picker and feature drafts clear on the core context reset signal. Late results cannot repopulate a new session.

### Boundary acceptance

Trace one read from HTTP result to rendered VM and one applicable write from UI intent to confirmed Core state and back. Prove there is no API state, persistent/shared entity cache, HTTP orchestration, FormGroup ownership or nutrition algorithm in page.ts. Reusable application/API state remains in Core even when its provider is scoped to the planner workspace. Temporary draft/model/form files remain separate from presentation.

[Ownership diagram](../assets/diagrams/03-frontend-ownership.png) · [Range flow](../assets/diagrams/04-range-read.png) · [Autosave flow](../assets/diagrams/05-autosave-state.png)

## API Integration

Add the typed `RecipesApi.discoverForMealPlan` call for backend endpoint `GET /api/recipes/meal-plan`. It reuses the existing discovery criteria/cursor serialization and returns `RecipeMealPlanPageDto` with `RecipeCardAdvance` items. Preserve ordinary discovery/favorites `RecipeCardDto` unchanged. Other than this canonical prerequisite endpoint, implement only the foundation/projection/test changes named above.

## Loading Behavior

Shell uses existing Appetee typography/tokens and Meal Planner/Nutrition Plans labels. No data UI yet; feature entry is enabled only after flows are complete.

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

- HttpTestingController verifies methods/routes/query/header/body shapes and no ownerId/targets overposting.
- Compile strict discriminated Recipe/Manual/virtual/saved models including nullable fat.
- Shell compiles without imports of future pages; lazy route remains authenticated.
- Existing recipe card tests compile unchanged; the dedicated Meal Plan projection carries its additional fields; current UserApi basic profile methods remain unchanged.

Negative cases must assert unchanged data/revision/confirmed state, not just the returned status. Use synthetic two-user fixtures. Real MySQL is required for FK/CHECK/lock/rollback behavior; controlled Observables and HttpTestingController are appropriate for client races/serialization. Existing critical auth/discovery/profile behavior must remain compatible.

### Acceptance criteria

- [x] Establish the correct core ownership boundary and compile-safe lazy shell without implementing data fetching in pages.
- [x] HttpTestingController verifies methods/routes/query/header/body shapes and no ownerId/targets overposting.
- [x] Compile strict discriminated Recipe/Manual/virtual/saved models including nullable fat.
- [x] Shell compiles without imports of future pages; lazy route remains authenticated.
- [x] Existing recipe card tests compile unchanged; the dedicated Meal Plan projection carries its additional fields; current UserApi basic profile methods remain unchanged.
- [x] Core data-access contains saved data/DTOs; feature shell remains composition-only with no direct component HTTP. Stores/facades remain assigned to their later phases.
- [x] No deferred approved scope or unrelated refactor is introduced.
- [x] Build and named meaningful tests pass, with real results recorded; no integration-test claim is made.

### Completion evidence

- `npm run build`: passed on 2026-10-04; three pre-existing component-style budget warnings remain.
- `npm test -- --watch=false`: 56 test files passed, 335 tests passed, and one pre-existing test remained skipped after the dedicated Meal Plan recipe endpoint revision.
- Focused F01 HTTP/shell run: 4 files and 14 tests passed before the final authenticated-route assertion; the final shell spec passed 2 tests.
- Ownership searches found no feature, Router or MatDialog dependencies in the new Core data-access files and no HTTP/API/form orchestration in the feature shell.
- E-005 CSRF transport and backend endpoint availability remain external prerequisites; F01 does not duplicate or bypass them.

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

- `src/app/app.routes.ts`
- `src/app/core/shared/data-access/recipes/recipe.model.ts`
- `src/app/core/shared/data-access/user/user_auth.api.ts`
- `src/app/core/shared/data-access/user/user_auth.api.spec.ts`
- `src/app/core/shared/data-access/STATE_ARCHITECTURE.md`
- `src/app/core/shared/data-access/generic-template/entity-cache-store.ts`
- `src/app/core/session/session-reset.token.ts`
- `src/app/core/auth/auth.interceptor.ts`
- `src/app/core/api/api-error.interceptor.ts`
- `src/app/core/shared/data-access/recipes/recipe.api.ts`

Earlier-phase files to extend, not falsely assumed present at the audited snapshot:

None. Do not create speculative files for future phases.

The [File Manifest](../README.md#implementation-file-manifest) names first creator and subsequent editors. Preserve existing project/namespace conventions. Consult [repository audit](../README.md#preserved-repository-audit) before adapting changed source.

### Database changes

No frontend phase writes SQL or changes schema. Backend prerequisites below own persistence.

### Backend changes

B01 supplies the dedicated Meal Plan recipe projection endpoint; B04–B14 supply the remaining eventual endpoints. No backend code change in this frontend phase. E-005 handles cookie/CSRF transport centrally; never stub production security to make tests pass.

### Frontend changes

Implement the exact core files and separate feature flow/form/UI files listed above. Core owns HTTP, DTOs, confirmed state, synchronization and reusable use cases. Feature state owns only temporary drafts/selection/tasks. Pages/components bind readonly view models and emit intent; no HttpClient/API injection, server-data arrays, request orchestration or nutrition math in page.ts. This phase’s concrete flow below defines the boundary crossings.

### Business rules

- Do not place DTOs under features or duplicate their definitions in components.
- Revision is string on wire; use central core comparison helper later, not number coercion.
- No API service caches/signals or Router/MatDialog dependency.
- Add the richer Meal Plan projection separately; preserve existing discovery/card consumers and their `RecipeCardDto` contract.
- Use existing authGuard/private layout, not a second application shell.

### Security / ownership

Session derives the owner. Join item→meal→day→user for child IDs; also match route date where supplied. Current requires scoped plan plus composite FK. A route guard/disabled button is never authorization. All unsafe browser calls use E-005 CSRF transport/validation and exact allowed API boundary. Use Dapper parameters, strict DTOs and named enum codes; escape displayed text through normal Angular binding. Pure calculation/GETs do not create persistent state.

### Transactions

The browser never emulates a transaction with several persistence calls. Each completed W action is one core-coordinated backend command. Core sends the originating reviewed revision and consumes the atomic receipt once. Temporary UI overlays do not mutate confirmed stores. Copy Week is one command, not seven Copy Day calls. The paired backend phase owns database atomicity; do not weaken it to simplify UI.

### Out of scope

All other phase implementations unless explicitly listed as modifications; no broad migration of unrelated stores/services. No Templates, persisted weeks, target/recipe snapshots, fractional servings, flexible ingredients, recommendations, training-day model, recovery modifier, shopping list, batches or reusable foods/meals. Do not add a generic state/transaction framework as a substitute for the concrete slice.

### Common implementation mistakes

- HTTP subscriptions in page.ts
- Putting plan DTOs in feature models
- Converting revision to Number
- Creating another UserApi
- Importing pages before their phase creates them

### Shared frontend architecture

**Mandatory for every frontend phase.** The latest user instruction supersedes the earlier proposal's feature-local confirmed stores. Location and DI lifetime are different questions: all reusable server-backed data classes live in core even when a particular query instance is scoped to a workspace.

#### Nonnegotiable dependency direction

`page/component → feature flow/draft controller → core domain facade → core API → backend`. Response: `core API → core synchronization/store → readonly selectors → feature view model → UI`. Feature draft state can copy editable scalar values once from a confirmed response. It never becomes another authoritative entity/list cache.

`core/shared/data-access/**` must not import `features/**` (including type-only imports), Router, MatDialog, a component, or a feature draft model. A feature UI must not inject HttpClient, an API class, or a core writable store. Feature flow controllers consume core facades, which expose readonly selectors and use-case methods. Presentational components accept inputs and emit intent events. Page.ts owns composition/lifecycle delegation and focus references, not HTTP subscriptions, queues, DTO arrays, forms, validation policies or nutrition math.

![Core and feature separation](../assets/diagrams/03-frontend-ownership.png)

#### Exact domain ownership

Prefix C=`src/app/core/shared/data-access/meal-plan/`; U=`src/app/core/shared/data-access/user/`; R=`src/app/core/shared/data-access/recipes/picker/`; F=`src/app/features/meal-plan/`. Every name below expands to this exact path.

| File/class | Classification/provider/lifetime | Owns | Must NOT own |
|---|---|---|---|
| C/meal-plan.model.ts | Shared contract, no provider | Planner/settings/nutrient DTOs, availability, date-string types | FormGroups, Router or component state |
| C/nutrition-plan.model.ts | Shared contract | Plan list/detail/preview/request types | Wizard step/dirty state |
| C/meal-plan-mutation.model.ts | Shared operation contract | Intent kind, expected base context, resource IDs, receipt union, status types | DOM/component callbacks or feature models |
| C/meal-planner.api.ts / MealPlannerApi | Stateless root HTTP | Exact planner endpoint calls returning Observables | Signals, cache, routing, optimistic totals |
| C/nutrition-plan.api.ts / NutritionPlanApi | Stateless root HTTP | Plan/preview/Current calls | Auto-calculation client logic or forms |
| C/meal-plan-context.store.ts / MealPlanContextStore | Root identity state; SESSION_RESETTERS | Last observed context, current settings, generation, reset$; revision observations | Permission to upgrade stale views merely from latest number |
| C/meal-planner.store.ts / MealPlannerStore | Root query projection; SESSION_RESETTERS | Up to3 keyed range snapshots, per-key request state/revision/freshness, active range key | Incomplete entity cache, temporary text/drag/manual values |
| C/nutrition-plans.store.ts / NutritionPlansStore | Root list query; SESSION_RESETTERS | Bounded summary list and its load/error/staleness/context | Complete calculation inputs inferred from cards |
| C/nutrition-plan-details.store.ts / NutritionPlanDetailsStore | Root complete cache; SESSION_RESETTERS | EntityCacheStore of `{id,plan,revision,profileDiffers}` records | Summary upserts, partial entity merges |
| U/nutrition-profile.model.ts | Shared profile wire/domain model | NutritionProfileValue, request/response types | Username/image semantics or UI-specific controls |
| U/nutrition-profile.store.ts / NutritionProfileStore | Root identity snapshot; SESSION_RESETTERS | Complete nullable nutrition profile, revision, independent request state | Nutrition plan targets or wizard drafts |
| U/nutrition-profile.facade.ts / NutritionProfileFacade | Root domain use case | Existing UserApi profile methods, profile load/update, coordinator delegation | Page navigation, forms, direct plan recalculation |
| C/meal-plan-sync.service.ts / MealPlanSyncService | Root synchronization owner | Observe read context; apply receipts; invalidation/rebase; nonreplay changed$ events | HTTP, UI feedback/dialogs, permanent secondary data copies |
| C/meal-plan-mutation-coordinator.ts / MealPlanMutationCoordinator | Root identity operation state; SESSION_RESETTERS | One FIFO write lane, coalescing, base revision checks, pending/error/unknown states | Feature FormGroups, persistent offline queue, durable browser storage |
| C/meal-planner.facade.ts / MealPlannerFacade | Root domain facade | Range coalescing/read tokens; typed planner use cases; readonly selectors | Router, page UI state, SQL/target math |
| C/nutrition-plan.facade.ts / NutritionPlanFacade | Root domain facade | List/detail loading, preview transport, plan commands | Wizard steps or draft form mutation |
| R/recipe-picker.store.ts / RecipePickerStore | Core query class, locally provided per planner workspace | Applied criteria, cursor, projected recipe results, own request generation | Main RecipesStore mutation, complete recipe details |
| R/recipe-picker.facade.ts / RecipePickerFacade | Locally provided with its store | RecipesApi Meal Plan discovery endpoint; favorite events; reset handling | Meal mutation persistence or new preview implementation |

No second user HTTP owner: extend existing U/user_auth.api.ts (`UserApi`) with nutrition-profile GET/PUT. Keep existing UserStore/User model username/image contract unchanged. New NutritionProfileStore is intentionally separate.

#### Feature temporary state and UI

| Exact relative feature path | Provider/lifetime | Permitted state |
|---|---|---|
| F/models/meal-plan-workspace.model.ts | Pure type module | Selected date, selected real ID/virtual slot, task union, view-model types |
| F/models/nutrition-plan-draft.model.ts | Pure type module | Editable form fields, draft mode, review-policy evidence |
| F/models/manual-item-draft.model.ts | Pure type module | Editable manual scalar values, target identity/base revision |
| F/models/copy-intent.model.ts | Pure type module | Source/destination dates, reviewed revision, confirmation and summary presentation |
| F/state/meal-plan-workspace.state.ts | Planner route provider | Date/task/selection; no copied range data |
| F/state/meal-plan-workspace.facade.ts | Planner route provider | Router parsing/navigation and UI flows composed from core facades/state; readonly VM |
| F/state/meal-editor-draft.state.ts | Planner route provider | Rename FormControl and pending quantity drafts keyed by item ID |
| F/state/manual-item-draft.state.ts | Planner route provider | Manual FormGroup, dirty/touched/baseline/error state |
| F/state/recipe-picker.state.ts | Planner route provider | Unsubmitted search text, selected Saved tab; applied result state remains core picker |
| F/state/copy-flow.state.ts | Planner route provider | Copy intent and reviewed revision; no retained server graph |
| F/state/nutrition-plan-draft.state.ts | Create/edit shell provider | Typed plan/profile forms, step, dirty flags, ephemeral server preview and review token |
| F/state/nutrition-plan-flow.facade.ts | Create/edit shell provider | Step/action/navigation orchestration through core NutritionPlanFacade/ProfileFacade |
| F/state/nutrition-plans-page.facade.ts | List route provider | Dialog/menu orchestration using core plan facade; no authoritative list |
| src/app/features/profile/state/nutrition-profile-editor.state.ts | Profile route provider | Separate reusable profile edit draft, no saved profile cache |
| src/app/features/profile/state/nutrition-profile-editor.facade.ts | Profile route provider | Initialize draft from core profile, save intent, field/error presentation |
| F/forms/nutrition-plan-form.factory.ts | Pure helper | Typed controls and UI validators; no request/persistence |
| F/forms/manual-item-form.factory.ts | Pure helper | Manual typed controls and validators |
| src/app/core/shared/ui/nutrition-profile-form/nutrition-profile-form.factory.ts | Pure helper | Profile controls; exact unit/precision/form shape |
| F/guards/meal-plan-pending-changes.guard.ts | Route guard | Delegate flush/wait/stay/discard to flow + core pending state |

Profile editor state/facade belong to features/profile/state, and the plan wizard/edit draft belongs to features/meal-plan/state. Both consume core profile data and the shared controlled form; neither core nor a page imports another feature’s draft controller. The UI form itself remains reusable at core/shared/ui/nutrition-profile-form; that controlled component accepts the typed FormGroup and errors and never loads/saves data. Its control-shape interface lives beside that shared component, not in core data-access. The shared pure form factory imports its colocated control interface and core scalar types; feature draft controllers instantiate its forms. Core domain data-access does not import this UI factory or form-control types.

Pure view-model mapping from already confirmed selectors is allowed in feature state/selectors files: selected-meal lookup, first two item names, +N count, labels, button disabled state, progress geometry. Summing nutrients, resolving default names, adjusting calories, checking recipe dietary compatibility, and recomputing targets are not frontend business responsibilities.

#### Provider and session rules

Register all root identity stores plus MutationCoordinator in existing app.config.ts SESSION_RESETTERS using useExisting, never useClass (which would create a second instance). APIs are stateless and need no reset. Root facades' same-key in-flight maps cancel/clear when context.reset$ fires; old completion callbacks remove entries only if they still match that request/generation.

Scoped picker store/facade are provided once at planner workspace level so switching between Meal Editor and Picker can retain that workspace's query. They are **not** root registrations in SESSION_RESETTERS. They subscribe to MealPlanContextStore.reset$ and capture the root generation on each request; destroy their subscriptions on route destruction. Feature drafts also clear on that reset event and route exit. This handles failed restore/identity change as well as explicit logout, without assuming AuthStore.loggedOut$ covers all cases. Do not change SessionService into a feature-aware service.

No localStorage/sessionStorage/IndexedDB persistence for profiles, pending requests, planner data or drafts. Refresh reconstructs from URL + authenticated GETs. Memory-only drafts may be lost on hard refresh; browser beforeunload may warn when dirty/in-flight, but do not use unreliable unload writes or sendBeacon for persistence.

#### Core state contracts

Every query token contains `{identityGeneration, queryKey, requestSequence, readEpoch, invalidationVersion}`. Every cached snapshot carries its observed revision and settings context. Different keys have independent loading/errors; same-key in-flight loads coalesce. The planner range store keeps a maximum of three snapshots: active week, copy source, copy destination; evict nonactive least-recently-used entries without discarding required confirmation context. A copy workflow can request a one-day source/destination key or reuse a complete containing week; never synthesize saved data from a card.

Plan detail caches only a complete GET/detail or complete mutation plan. List responses populate only summary store. Profile store is its own complete nullable value. Mutation request state is independent of query loads. A failed range refresh may keep a visibly stale old snapshot but disables writes/copy confirmation until refreshed; it must not turn old data into current authority.

#### Flow A — enter planner or change week

1. Page lifecycle delegates URL to feature WorkspaceFacade; it parses date/meal/slot/task with pure helpers. Today uses local calendar components, not toISOString().
2. Feature asks core MealPlannerFacade.loadRange(Monday,Sunday). It never calls API directly.
3. Core waits for its write lane to be idle before starting a fresh feature GET; a previously in-flight GET may complete but must satisfy its captured epoch.
4. Store sets only that query's loading state; facade captures token and calls MealPlannerApi.
5. On response, reject mismatched identity/key/sequence/epoch/freshness before changing data or error state. Core SyncService observes revision/context.
6. Same current revision: accept. New unseen revision: accept this complete response but mark other older projections stale; do not promote those views' write authority. Older revision: discard/refetch as needed. During an in-flight write, defer/ignore conflicting read adoption until reconciliation.
7. Store receives the full normalized range once; readonly selectors supply feature VM. Page binds it; no mirrored days[] array.
8. Selecting another date in the loaded week is local task state only. No new GET/write. Changing week clears invalid task selection and loads that key.

![Read flow](../assets/diagrams/04-range-read.png)

#### Flow B — rename a saved or virtual meal

1. User text goes into MealEditorDraftState, separate from confirmed meal. Save on Enter, blur, or 600ms valid idle; identical trimmed value is ignored. Invalid text remains draft with error.
2. Feature passes typed intent + originating snapshot revision to core facade. Core coordinator checks that view is current. A stale screen gets local refresh-required feedback without issuing a write.
3. For saved ID use PATCH rename; for virtual slot use POST create-meal with slot/name. No request on opening editor. While virtual materialization is pending, disable dependent item/add/reorder/delete actions.
4. Coordinator serializes command, increments readEpoch to invalidate pre-write GETs, and sends expected revision plus CSRF via API/interceptor.
5. Successful receipt goes through SyncService exactly once before observers are notified. Replace affected day projection, settings/revision, and invalidate other affected queries. Returned virtual materialization replaces placeholder route with createdMealId using replaceUrl so Back does not revisit a dead slot.
6. Feature clears only the acknowledged draft version; a newer typed value stays dirty/pending. UI says Saved only when no pending/latest draft remains. Errors keep draft and confirmed day separate.

#### Flow C — rapid quantity changes

Request values are absolute quantities. If 2 is in flight and clicks produce 3 then 4, preserve one queued latest value 4. Receipt 2 updates confirmed nutrition but cannot replace draft 4. Dispatch 4 only after receipt 2 advances the trusted own-write chain. Do not issue increment APIs, dispatch parallel writes, use switchMap, or recalculate displayed totals from draft 4. Show pending input state and confirmed totals until receipt 4. Count below 1 is invalid; Remove is separate.

The queued command is a core operation record containing scalar body/resource IDs and execution logic constructed by a core facade, never a closure capturing a component, Router, FormGroup or feature state. Coalescing applies only to unsent same-resource scalar edits; structural add/delete/copy commands never collapse into each other. If an earlier receipt deletes a resource, cancel later dependent queued edits with visible local feedback.

#### Flow D — plan create/edit/profile

List/detail/profile GETs populate their respective core stores. Feature creates a typed draft once; future GET emissions must not overwrite user edits. Intermediate preview is ephemeral data derived from an unsaved draft and may live in draft state; it is not a persisted plan or shared entity. Debounce changed valid calculation inputs 300ms and cancel obsolete previews with request generation; invalid drafts clear readiness. A cancelled preview never writes.

Create/Update sends draft values + reviewed policyVersion/calculationYear through core facade/coordinator with base revision from the relevant reviewed context. Backend recomputes. Core applies returned plan, profile (if changed), settings and invalidations before feature navigates/reset. Metadata-only edit omits calculation and review evidence. Use current profile is an explicit draft-copy action; changing global profile does not silently patch every open plan draft or recalculate targets. Same-current selection is a valid no-op.

#### Flow E — recipe picker and manual editor

Picker UI search draft lives in feature state. Submitted normalized criteria go to core scoped RecipePickerFacade, which owns applied criteria/result/cursor in core store and calls `RecipesApi.discoverForMealPlan`. Do not inject root RecipeDiscoveryFacade/RecipesStore. Saved membership uses existing RecipesFacade favorite change/query invalidation signals; adding to a meal does not mark recipe as favorite or alter canonical recipe entities. Preview delegates to existing RecipeExperienceFacade with return/focus context; no new preview HTTP business logic.

Add builds recipe item intent against selected real ID or virtual slot and uses core MealPlannerFacade. On receipt core data updates first; feature changes task back to Meal Editor. Existing recipe IDs in confirmed selected meal drive In meal state. No card-to-detail cache hydration.

Manual editor copies exactly editable name/nutrition scalars into separate ManualItemDraftState. Quantity is absent. Invalid Add/Update shows summary under heading plus field errors and stays open. Cancel discards draft; no server write. Successful whole-entry receipt updates core then closes task. Never bind FormGroup directly into cached DTO objects.

#### Flow F — Current change and invalidation

Plan dashboard intent → core NutritionPlanFacade → coordinator → PUT Current. SyncService sets returned settings, updates complete plan if returned, and marks all range projections stale because untouched defaults and every date's targets can change. Saved food is not rewritten client-side. Active planner reloads; off-route planner reloads on next entry. During refetch, hide stale target/progress or label loading; do not show old targets as new Current. Easy/no Current explicitly hide targets. Plan list Current badge derives from settings, not separate booleans on each cached plan.

#### Flow G — copy confirmation

Feature CopyFlowState stores dates, mode, reviewedRevision and confirmation only. Source/destination graphs live in core range queries. Flush/wait pending writes before inspection. If source and destination revisions differ, core reloads the relevant queries and disables confirm; user must review the new comparison. Destination GET must never update an old source intent's revision by itself. Summary includes count of affected persisted days/meals/items and absent-source destinations to be cleared.

After confirmation, core command uses reviewedRevision and replaceExisting. No client content graph is sent. One command/receipt replaces affected ranges; then feature closes dialog and selects destination as appropriate. Any409 invalidates the review and requires reinspection; ambiguous failure pauses rather than rerunning copy. Copy Week is never seven frontend requests.

#### Global version handling

- Reads may discover a new revision but never silently authorize stale drafts/views.
- For this SPA's own successful mutation with exactly expected old revision → old+1 (or same for no-op), SyncService knows the command's full affected scope. It may rebase unaffected, already-fresh projections from old to new; it must invalidate affected projections not replaced by the receipt. This is an acknowledged own-write chain, not arbitrary promotion to the maximum observed revision.
- A receipt with an unexpected jump, old identity, or incomplete shape invalidates context and triggers reconciliation. Do not apply guessed patches.
- External newer context marks older views stale, pauses dependent pending work, and preserves user drafts for review.
- Canonical recipe updates are outside feature revision: RecipesFacade.queryInvalidated$ marks ranges and picker data stale, without incrementing this user's revision. Route entry/window focus revalidates when idle; no real-time cross-device claim.

#### Failure and navigation states

Coordinator states idle/pending/failed/conflict/unknownOutcome are explicit. Query error is independent. Status text: Saving… while outstanding relevant command; Saved only acknowledged; Could not save with retry/review action when failed. Polite live region announces a settled status, not each keypress/click.

409: do not replay automatically. Reload necessary context, preserve draft, show what needs review. Unknown network/commit outcome: GET/reconcile; same old revision replay would be rejected if committed, but a new revision must never be attached automatically. Non-idempotent creation might require user review because no operation receipt ledger exists. On route change, flush a valid scalar draft then wait for queued/in-flight writes. Invalid/failed manual draft prompts Stay/Discard. Discard cancels only unsent work; it cannot undo an in-flight server commit. Wait for reconciliation or explicitly explain uncertainty before leaving. Auth expiration always follows central session handling and clears identity state.

#### Core invalidation matrix

| Event | Replace | Invalidate/rebase |
|---|---|---|
| Meal/item/order receipt | Returned affected days and settings | Overlapping range queries not directly patched; rebase unaffected fresh own-revision snapshots |
| Copy receipt | Returned destination dates/context | Any overlapping source/destination cached query projections; never recipe entities |
| Plan create/update/duplicate | Complete returned detail, profile if changed, settings | Plan list stale (or replace complete matching summary derived in core); active planner only if plannerInvalidated |
| Plan delete | Remove detail and list item, settings | All ranges if Current was cleared; no unrelated recipe cache |
| Profile update | Nutrition profile | Plan-detail profileDiffers notices stale; preserve stored targets; unaffected range own-revision rebase |
| Current change | Settings, returned plan | All planner ranges; list membership derives settings |
| Recipe authoring/query invalidation | No guessed nutrients | Planner ranges and picker queries stale |
| Favorite change | Existing favorite relationship owner | Scoped Saved query updated/invalidated; no Meal Plan revision change |
| Session reset | Clear all root stores/queue/context | Reset scoped stores/drafts; discard every old-generation result |

Home has no implemented upcoming-meal query at the audited snapshot. Emit a domain changed$ event for consumers and enable the existing entry route; do not invent or fill a Home next-meal store in V1. A future consumer can subscribe to invalidation without forcing core to import Home.

#### Review/test enforcement

- Search feature UI/page files for HttpClient, API injection, writable DTO arrays, subscribe-based fetching, and nutrition arithmetic. Legitimate UI event/focus bindings only.
- Search core data-access imports for features/Router/MatDialog; any match is an architecture violation unless it is a test fixture reference outside production imports.
- Test stale GET after mutation; logout while request pending; old response error after new identity; two independent plan IDs loading; same-key coalescing; list cannot poison detail; manual form cannot mutate core DTO; picker filters do not affect Recipes page; draft 4 survives receipt 2; destination revision does not bless old source; mobile and desktop use the same providers.
- Keep forms and UI-facing draft models in state/forms/models files. Do not pass only this prose to a coding agent; the phase files name exact classes and acceptance tests.

#### Additional temporary controls

F/state/meal-plan-ordering.state.ts owns only a temporary ordered-ID overlay (F12), separate from rename/quantity draft state. F/guards/nutrition-plan-pending-changes.guard.ts protects create/edit drafts from F05; planner guard arrives F09. Profile has its own small pending-changes guard in features/profile/state from F03. Each delegates to its flow controller plus the core coordinator, never executes HTTP itself. The wizard guard added F06 validates step access and redirects to the first incomplete step; it does not save progress.

#### Task navigation after sparse materialization

A feature-only navigation alias may map the reviewed date/virtual slot to createdMealId from a confirmed receipt for same-workspace Back navigation. It never contains a meal DTO or grants write authority. Clear it on identity reset, workspace destruction or incompatible refreshed context. A stale virtual URL after reload falls back to day overview. See [UX and accessibility](../README.md#ux-and-accessibility-contract).


## Dependencies

Approved canonical API/data-flow contracts; E-005 interceptor contract understood. Backend can be developed independently; HTTP tests use contract fixtures.

Mandatory accompanying contracts: [Decisions](../README.md#approved-decisions), [API](../README.md#canonical-api-contracts), [Data Model](../README.md#canonical-database-model), [Architecture](../README.md#shared-system-architecture), and [Frontend Data Flow](Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture). Calculator phases also read [Nutrition Policy](../README.md#nutrition-calculation-policy). These are normative contract sections, not optional background. If a prerequisite is absent, implement that prerequisite first; do not bypass it with local component state, a new API, or an unsafe database reset.

# F-011 — Meal Plan — Frontend — Phase F05

**Phase title:** Easy plan creation and temporary draft foundation

## Canonical Contract

The feature [README](../README.md) owns shared product behavior, data requirements, database impact, API/request/response contracts and error semantics. This file applies the frontend template to one bounded phase. It does not redefine the shared contract.

**Phase:** F05
**Status:** Implemented (frontend)
**Specification:** Frontend implemented and verified on 2026-10-11; live API/browser acceptance remains unrun.

## Frontend Goal

Implement short Easy creation with reusable, separate plan draft/flow infrastructure for later Intermediate/edit.

## Routes

Use the authenticated Meal Plan route shell introduced in F01 and the child routes introduced by this phase. Profile integration uses the existing `/profile` route. The exact route/selection and Back behavior is owned by the [shared frontend architecture](./Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture) and [UX contract](../README.md#ux-and-accessibility-contract). Do not register a component before its owning phase creates it. Route guards provide UX only; backend ownership remains authoritative.

User-approved browser route: **`/meal-plan/nutrition-plans/create/easy`**, a separate Easy creation page under the authenticated Meal Plan shell. Dashboard and empty-state “Create Easy plan” links open this route; the dashboard remains the plan list and never embeds the form. This browser URL is not the API endpoint: explicit Create continues to use **NP06 `POST /api/nutrition-plans`**. A confirmed receipt updates Core before returning to `/meal-plan/nutrition-plans`; the dashboard reloads the canonical list so the confirmed plan is visible. Cancel/Back uses the same guarded parent route, with focus restored to its Create link (heading fallback when unavailable). Intermediate creation and Edit remain hidden until their owning phases.

## Page and Component Structure

### Files to create

- `src/app/features/meal-plan/models/nutrition-plan-draft.model.ts`
- `src/app/features/meal-plan/forms/nutrition-plan-form.factory.ts`
- `src/app/features/meal-plan/state/nutrition-plan-draft.state.ts`
- `src/app/features/meal-plan/state/nutrition-plan-draft.state.spec.ts`
- `src/app/features/meal-plan/state/nutrition-plan-flow.facade.ts`
- `src/app/features/meal-plan/state/nutrition-plan-flow.facade.spec.ts`
- `src/app/features/meal-plan/nutrition-plans/easy-plan-create.page.ts`
- `src/app/features/meal-plan/nutrition-plans/easy-plan-create.page.html`
- `src/app/features/meal-plan/nutrition-plans/easy-plan-create.page.scss`
- `src/app/features/meal-plan/nutrition-plans/easy-plan-create.page.spec.ts`
- `src/app/features/meal-plan/guards/nutrition-plan-pending-changes.guard.ts`
- `src/app/features/meal-plan/guards/nutrition-plan-pending-changes.guard.spec.ts`

Each production class/module uses the responsibility/dependency rules in [backend map](../backend/Phase_B03_write_protocol_and_errors.md#shared-backend-architecture) or [frontend ownership map](Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture). Test companions exercise behavior, not implementation-only snapshots. Do not create similarly named duplicate files elsewhere.

### Files to modify

- `src/app/core/shared/data-access/meal-plan/nutrition-plan.facade.ts`
- `src/app/core/shared/data-access/meal-plan/nutrition-plan.facade.spec.ts`
- `src/app/features/meal-plan/meal-plan.routes.ts`
- `src/app/features/meal-plan/meal-plan-shell.page.spec.ts` (new child-route regression assertion)
- `src/app/features/meal-plan/nutrition-plans/nutrition-plans.page.ts`
- `src/app/features/meal-plan/nutrition-plans/nutrition-plans.page.html`
- `src/app/features/meal-plan/nutrition-plans/nutrition-plans.page.scss`
- `src/app/features/meal-plan/nutrition-plans/nutrition-plans.page.spec.ts`

The dashboard edits above implement the user-approved Easy links and return-focus behavior, not an embedded creation form or future-phase controls.

## State Ownership

**Core:** reusable DTO/domain types, APIs, saved profile, complete plan details, plan summaries, planner range/query state, scoped picker API/query state, mutation coordinator, synchronization and domain facades.

**Feature:** separate task/selection state, form drafts, temporary overlays and view-model orchestration.

**UI/page.ts:** composition, focus references and intent/view-model bindings only. No API subscriptions, persistent/shared entity cache, request state, forms or nutrition calculations. See the phase-specific boundary table under Data Flow.

## State Lifetime

Core identity state survives route changes and clears via existing-instance SESSION_RESETTERS. Core picker classes are provided once per workspace and clear on the core reset signal. Feature flow/draft providers survive child task/step navigation and clear on flow exit or identity reset. APIs are stateless. Browser refresh reconstructs from URL and authenticated GETs; no browser-persisted profile, planner or mutation queue. [Exact owner/lifetime map](./Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture).

## Data Flow

### Data flow

1. Route provides fresh draft state and flow facade; page binds readonly VM and emits intents.
2. Draft form contains name/count only for Easy; no saved profile data copied into payload.
3. Flow builds typed Create request, preserving reviewed context revision from core list/context.
4. Core facade/coordinator persists; sync applies plan/settings; only then navigate to plans and destroy/reset draft.
5. Error retains entered name/count; name conflict attaches field error, not silent auto-rename.

Data ownership at each crossing is explicit: UI intent → separate feature flow/draft controller → core domain facade/coordinator → core API → controller → Application → atomic Infrastructure operation. Confirmed response returns through core SyncService/store once before feature navigation/status. For read-only phases there is no write/coordinator transaction; for pure preview its ephemeral result belongs to the unsaved draft, not saved-plan cache.

### Complete frontend data flow and ownership

**Response path:** API → Core data-access/state → feature orchestration/state → UI components. **Intent path:** UI → separate feature controller → Core domain facade/coordinator → Core API → backend. The response must return through Core before it changes feature navigation or success state.

| Boundary | Exact responsibility in F05 |
|---|---|
| API response | NP06 Create through NutritionPlanApi; current list/context from previously loaded core state. |
| Core data/access/state | NutritionPlanFacade and coordinator own the request; sync places the created plan/settings in core. |
| Feature orchestration/state | NutritionPlanDraftState, form factory and NutritionPlanFlowFacade own name/count/dirty state and submission flow. |
| UI components and page.ts | EasyPlanCreatePage binds the draft VM and emits Create/Cancel. |

### Mutations, autosave and state propagation

No autosave on typing. Explicit Create sends Easy fields only; acknowledgement updates core first, then clears draft and navigates. Failed/unknown submission retains the draft and blocks unsafe repeat.

On a successful write, the Core API returns the typed receipt to its core use case; Core synchronization applies affected confirmed data/settings/revision once. Readonly selectors then update feature-derived view models. Feature state reconciles only the acknowledged draft version and performs the next UI task. Page.ts binds the resulting view model; it never handles the raw receipt or patches a server entity. Foundation/read-only phases document this integration contract without importing future modules before their creation.

### Refresh, errors and identity changes

Loads have independent core request/error state and captured generation/key/sequence/epoch. A response from an old identity or pre-write epoch is discarded. An unknown newer revision invalidates older projections; it cannot silently authorize their edits. Failed writes preserve confirmed Core data and feature drafts separately. Conflicts require refresh/review; ambiguous results require reconciliation rather than automatic replay. Core stores/coordinator clear via SESSION_RESETTERS using existing instances; scoped picker and feature drafts clear on the core context reset signal. Late results cannot repopulate a new session.

### Boundary acceptance

Trace one read from HTTP result to rendered VM and one applicable write from UI intent to confirmed Core state and back. Prove there is no API state, persistent/shared entity cache, HTTP orchestration, FormGroup ownership or nutrition algorithm in page.ts. Reusable application/API state remains in Core even when its provider is scoped to the planner workspace. Temporary draft/model/form files remain separate from presentation.

[Ownership diagram](../assets/diagrams/03-frontend-ownership.png) · [Range flow](../assets/diagrams/04-range-read.png) · [Autosave flow](../assets/diagrams/05-autosave-state.png)

## API Integration

### NP06: POST /api/nutrition-plans

Purpose: Create Easy/Intermediate plan. Authentication required; owner comes from session, foreign/missing owned objects both 404. Parameters: none. No extra query parameters.

- Request `CreateNutritionPlanRequest`: name1–80, mode easy/intermediate, defaultMealsPerDay1–8; Intermediate requires calculation plus reviewedPolicyVersion and reviewedCalculationYear; Easy omits them.
- Response `NutritionPlanMutationDto`: revision,settings,plan|null,deletedPlanId|null,profile|null,plannerInvalidated. Null profile means unchanged, not erase. Success: 201 + plan Location.
- Application: `NutritionPlanService.CreateAsync` → Infrastructure: `NutritionPlanRepository.CreateAsync`.
- Frontend: core `NutritionPlanFacade.create`; feature flow delegates, UI never calls HTTP directly.
- Transaction class **W**: one complete user-locked, revision-checked transaction including readback before commit.
- Specific rule: Mode shape/name/count/cap; server recomputation and reviewed policy/year. Profile+plan+first Current one commit. Name/cap/preview conflict409.
- UI contract: Explicit Create; disable duplicate submit. Core sync before route navigation; wizard reset only after receipt.

Errors include 400 validation,401 session,404 scoped unavailable,409 business/version conflict and500 unexpected; unsafe calls require CSRF. Writes require X-Meal-Plan-Revision; reads/preview do not. Request/response nested fields are the normative API appendix linked above; do not invent a parallel shape.

## Loading Behavior

One compact form with name and meal count plus explanation that individual days can change later. No wizard for Easy. Accessible labels and linked error summary; narrow layout is one column.

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

- Create payload excludes profile/goal/activity/targets even when user has saved profile.
- Successful receipt updates core before navigation; failure retains draft.
- Enter/submit double-click guarded by core pending state.
- Dirty route-exit handled by flow/guard pattern; cancel writes nothing.
- Name Unicode/case collision server errors render clearly.

Negative cases must assert unchanged data/revision/confirmed state, not just the returned status. Use synthetic two-user fixtures. Real MySQL is required for FK/CHECK/lock/rollback behavior; controlled Observables and HttpTestingController are appropriate for client races/serialization. Existing critical auth/discovery/profile behavior must remain compatible.

### Acceptance criteria

- [x] Implement short Easy creation with reusable, separate plan draft/flow infrastructure for later Intermediate/edit.
- [x] Create payload excludes profile/goal/activity/targets; no profile is collected or read by this flow.
- [x] Successful receipt updates core before navigation; failure retains draft.
- [x] Enter/submit double-click guarded by core pending state.
- [x] Dirty route-exit handled by flow/guard pattern; cancel writes nothing.
- [x] Name Unicode/case collision server errors render clearly.
- [x] Core data-access contains saved data/DTOs/facades; feature temporary state is separate from pages/UI; no direct component HTTP.
- [x] No deferred approved scope or unrelated refactor is introduced.
- [x] Build and named meaningful frontend tests pass; live backend/browser integration is not claimed.

### Completion evidence (2026-10-11)

Commands run from `appetee_front`, with test/build runs separated:

```powershell
$env:VITEST_MAX_WORKERS = '2'
npm test -- --watch=false --include='**/nutrition-plan*.spec.ts' --include='**/easy-plan-create.page.spec.ts' --include='**/meal-plan-shell.page.spec.ts'
npm test -- --watch=false
npm run build
git diff --check
```

- Clean focused plan verification: 12 files, 69 tests passed. Clean full frontend verification: 80 files, 515 tests passed, 1 existing skip.
- An earlier default-worker run had two worker crashes and was not counted as passing. Limiting Vitest to two workers (supported by the installed runner) produced clean focused/full results; no test timeout, application configuration or assertion was weakened.
- Production build passed with the same four warnings present after F04: initial bundle 506.82 kB versus 500 kB warning budget, plus existing recipes-list/admin-recipes/cooking-mode SCSS warnings. Budgets unchanged.
- RouterTestingHarness proves dashboard link → separate Easy page → one strict POST use case → confirmed Core/settings → refreshed dashboard containing the plan, with one Current badge and restored Create-link focus. Dirty Cancel stays when declined, discards only when confirmed, writes nothing and clears the draft on re-entry.
- Draft/Core tests cover NFC/trimmed Unicode scalar length, forbidden controls and lone surrogates, inclusive 1–8 integer count bounds, strict Easy-only payload, deduplicated create, server-driven first Current, preservation of existing Current, late-read/reset protection, retained failures, explicit conflict/unknown-outcome reconciliation without replay, name-collision field errors and preservation of newer draft intent.
- UI composition follows `assets/references/08_create_plan_meal_structure.png` for the bordered white form card, meal-count tiles and action footer. Easy stays a compact form with name/count only: no stepper, profile, goal, activity, preview or target fields. Count starts unselected rather than inventing a default. Shared typography/input/button/theme styles are reused; local SCSS handles layout and reflow.
- Ownership/whitespace checks passed. No page-owned FormGroup/API/subscription/server cache, browser storage, new API client, backend, database/schema or hosting change was introduced.
- Real browser/live backend creation, public-edge CSRF/cookie behavior, keyboard/screen-reader journeys and 320px/200%/400% zoom/reduced-motion captures were not run. Router/component tests prove frontend behavior with controlled typed responses, not deployment readiness.

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
- `src/app/features/meal-plan/meal-plan.routes.ts`

The [File Manifest](../README.md#implementation-file-manifest) names first creator and subsequent editors. Preserve existing project/namespace conventions. Consult [repository audit](../README.md#preserved-repository-audit) before adapting changed source.

### Database changes

No frontend phase writes SQL or changes schema. Backend prerequisites below own persistence.

### Backend changes

B06 handles mode shape, cap, atomic first Current; no new backend work. Easy does not call calculation-preview.

### Frontend changes

Implement the exact core files and separate feature flow/form/UI files listed above. Core owns HTTP, DTOs, confirmed state, synchronization and reusable use cases. Feature state owns only temporary drafts/selection/tasks. Pages/components bind readonly view models and emit intent; no HttpClient/API injection, server-data arrays, request orchestration or nutrition math in page.ts. This phase’s concrete flow below defines the boundary crossings.

### Business rules

- Name1–80 and integer count1–8; all calc fields omitted, not populated withzero.
- First-Current behavior comes from server receipt.
- Do not save each form field; explicit Create is one completed action.
- No page.ts FormGroup, validation policy, API or local server data.
- Abandoning draft produces no DB rows.

### Security / ownership

Session derives the owner. Join item→meal→day→user for child IDs; also match route date where supplied. Current requires scoped plan plus composite FK. A route guard/disabled button is never authorization. All unsafe browser calls use E-005 CSRF transport/validation and exact allowed API boundary. Use Dapper parameters, strict DTOs and named enum codes; escape displayed text through normal Angular binding. Pure calculation/GETs do not create persistent state.

### Transactions

The browser never emulates a transaction with several persistence calls. Each completed W action is one core-coordinated backend command. Core sends the originating reviewed revision and consumes the atomic receipt once. Temporary UI overlays do not mutate confirmed stores. Copy Week is one command, not seven Copy Day calls. The paired backend phase owns database atomicity; do not weaken it to simplify UI.

### Out of scope

All other phase implementations unless explicitly listed as modifications; no broad migration of unrelated stores/services. No Templates, persisted weeks, target/recipe snapshots, fractional servings, flexible ingredients, recommendations, training-day model, recovery modifier, shopping list, batches or reusable foods/meals. Do not add a generic state/transaction framework as a substitute for the concrete slice.

### Common implementation mistakes

- Easy collecting unnecessary body data
- Persisting draft after every field
- Defaulting targets to0
- Creating plan in page array before response
- Reusing global wizard state across routes

## Dependencies

F04; B06.

Mandatory accompanying contracts: [Decisions](../README.md#approved-decisions), [API](../README.md#canonical-api-contracts), [Data Model](../README.md#canonical-database-model), [Architecture](../README.md#shared-system-architecture), and [Frontend Data Flow](Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture). Calculator phases also read [Nutrition Policy](../README.md#nutrition-calculation-policy). These are normative contract sections, not optional background. If a prerequisite is absent, implement that prerequisite first; do not bypass it with local component state, a new API, or an unsafe database reset.

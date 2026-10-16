# F-011 — Meal Plan — Frontend — Phase F08

**Phase title:** Read-only planner workspace and route state

## Canonical Contract

The feature [README](../README.md) owns shared product behavior, data requirements, database impact, API/request/response contracts and error semantics. This file applies the frontend template to one bounded phase. It does not redefine the shared contract.

**Phase:** F08
**Status:** Frontend implemented; B08 backend integration pending.
**Specification:** Implemented against the canonical contract; no backend changes.

## Frontend implementation evidence — 2026-10-12

Implemented Core keyed/coalesced range reads with generation/epoch/sequence checks and complete inclusive-range validation, plus separate feature date/task/selection state. UI binds exact normalized saved/virtual/empty/unavailable projections and server totals/targets/remaining. Unknown values remain Unknown, negative remaining retains its sign and over-target text, and Easy/no-Current/stale views hide target displays. Selecting a loaded date or opening a virtual/saved task sends no mutation. Entry/focus revalidates with GET. The compact horizontal week strip permits overflow; desktop keeps day/task panes, narrow widths show one active task and Back restores the meal trigger.

Primary tests: `meal-planner.facade.spec.ts`, `meal-plan-workspace.state.spec.ts`, `meal-plan-workspace.facade.spec.ts`, planner page and four component specs. They cover Monday/year/DST boundaries, valid/mutually exclusive selectors, identity reset, stale week completions, coalescing, omitted-day rejection, unavailable backend, unknown/signed totals, read-only intents and task focus/Back.

**B08 integration remains pending:** application traffic uses the real MP01 endpoint. Only tests supply mocks. The frontend's unavailable-service handling is verified with controlled responses; it is not proof that the pending endpoint is deployed or works live.

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

Build the week/day workspace from core normalized data with separate route/task state and shared desktop/mobile logic.

## Routes

Approved browser route: `/meal-plan/planner?date=YYYY-MM-DD`; the empty Meal Plan shell route redirects to `planner`.

Allowed `task` values:

The table below records F08's original read-only scope. F09 extends `meal` to editing; F10 adds the approved [`recipe-picker` task and Back/confirmed-ID behavior](Phase_F10_recipe_picker_and_quantity.md#routes). Current allowed tasks are `day`, `meal`, and `recipe-picker`.

| Value | Meaning | Allowed selection |
|---|---|---|
| `day` (default) | Selected-day read-only workspace | Neither selector |
| `meal` | Read-only saved-meal or virtual-slot detail | Exactly one of `mealId` or `defaultSlot` |

`mealId` is a positive signed-INT ID; `defaultSlot` is an integer 1–8. They are mutually exclusive, including on direct entry. Unknown tasks, invalid/duplicate dates or selectors, missing meal selection and conflicting selectors are normalized with replacement navigation to valid day context. Missing/invalid dates use local Today. A selection absent from an accepted normalized day falls back to that day, never an invented meal. Calendar intent uses local date/Monday arithmetic, including DST; SQL date-edge weeks are bounded to 1000-01-01 through 9999-12-31.

The application uses the real MP01 API client. B08 integration is **pending**, not verified: an unavailable backend produces a visible query error and user-triggered GET retry. Mock responses exist only in tests. No meal editor, autosave or mutation controls are included in F08.

Use the authenticated Meal Plan route shell introduced in F01 and the child routes introduced by this phase. Profile integration uses the existing `/profile` route. The exact route/selection and Back behavior is owned by the [shared frontend architecture](./Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture) and [UX contract](../README.md#ux-and-accessibility-contract). Do not register a component before its owning phase creates it. Route guards provide UX only; backend ownership remains authoritative.

## Page and Component Structure

### Files to create

- `src/app/core/shared/data-access/meal-plan/meal-planner.facade.ts`
- `src/app/core/shared/data-access/meal-plan/meal-planner.facade.spec.ts`
- `src/app/features/meal-plan/models/meal-plan-workspace.model.ts`
- `src/app/features/meal-plan/state/meal-plan-workspace.state.ts`
- `src/app/features/meal-plan/state/meal-plan-workspace.state.spec.ts`
- `src/app/features/meal-plan/state/meal-plan-workspace.facade.ts`
- `src/app/features/meal-plan/state/meal-plan-workspace.facade.spec.ts`
- `src/app/features/meal-plan/planner/meal-planner.page.ts`
- `src/app/features/meal-plan/planner/meal-planner.page.html`
- `src/app/features/meal-plan/planner/meal-planner.page.scss`
- `src/app/features/meal-plan/planner/meal-planner.page.spec.ts`
- `src/app/features/meal-plan/planner/week-strip.component.ts`
- `src/app/features/meal-plan/planner/week-strip.component.html`
- `src/app/features/meal-plan/planner/week-strip.component.scss`
- `src/app/features/meal-plan/planner/week-strip.component.spec.ts`
- `src/app/features/meal-plan/planner/selected-day-panel.component.ts`
- `src/app/features/meal-plan/planner/selected-day-panel.component.html`
- `src/app/features/meal-plan/planner/selected-day-panel.component.scss`
- `src/app/features/meal-plan/planner/selected-day-panel.component.spec.ts`
- `src/app/features/meal-plan/planner/meal-row.component.ts`
- `src/app/features/meal-plan/planner/meal-row.component.html`
- `src/app/features/meal-plan/planner/meal-row.component.scss`
- `src/app/features/meal-plan/planner/meal-row.component.spec.ts`
- `src/app/features/meal-plan/planner/nutrition-summary.component.ts`
- `src/app/features/meal-plan/planner/nutrition-summary.component.html`
- `src/app/features/meal-plan/planner/nutrition-summary.component.scss`
- `src/app/features/meal-plan/planner/nutrition-summary.component.spec.ts`

Each production class/module uses the responsibility/dependency rules in [backend map](../backend/Phase_B03_write_protocol_and_errors.md#shared-backend-architecture) or [frontend ownership map](Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture). Test companions exercise behavior, not implementation-only snapshots. Do not create similarly named duplicate files elsewhere.

### Files to modify

- `src/app/features/meal-plan/meal-plan.routes.ts`
- `src/app/features/meal-plan/meal-plan-shell.page.html`

## State Ownership

**Core:** reusable DTO/domain types, APIs, saved profile, complete plan details, plan summaries, planner range/query state, scoped picker API/query state, mutation coordinator, synchronization and domain facades.

**Feature:** separate task/selection state, form drafts, temporary overlays and view-model orchestration.

**UI/page.ts:** composition, focus references and intent/view-model bindings only. No API subscriptions, persistent/shared entity cache, request state, forms or nutrition calculations. See the phase-specific boundary table under Data Flow.

## State Lifetime

Core identity state survives route changes and clears via existing-instance SESSION_RESETTERS. Core picker classes are provided once per workspace and clear on the core reset signal. Feature flow/draft providers survive child task/step navigation and clear on flow exit or identity reset. APIs are stateless. Browser refresh reconstructs from URL and authenticated GETs; no browser-persisted profile, planner or mutation queue. [Exact owner/lifetime map](./Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture).

## Data Flow

### Data flow

1. Workspace page delegates the URL to its feature facade, using local calendar date and Monday arithmetic.
2. Core facade loads/coalesces keyed ranges with identity, epoch and freshness guards.
3. Feature VM reads core selectors; feature state stores selection and task only.
4. Selecting a loaded date needs no GET/write; changing week loads that query key.
5. Render exact virtual/saved/empty/unavailable/Easy/no-Current projections; never rebuild defaults or totals.
6. One provider/component state supports wide panes and narrow task screens.

Data ownership at each crossing is explicit: UI intent → separate feature flow/draft controller → core domain facade/coordinator → core API → controller → Application → atomic Infrastructure operation. Confirmed response returns through core SyncService/store once before feature navigation/status. For read-only phases there is no write/coordinator transaction; for pure preview its ephemeral result belongs to the unsaved draft, not saved-plan cache.

### Complete frontend data flow and ownership

**Response path:** API → Core data-access/state → feature orchestration/state → UI components. **Intent path:** UI → separate feature controller → Core domain facade/coordinator → Core API → backend. The response must return through Core before it changes feature navigation or success state.

| Boundary | Exact responsibility in F08 |
|---|---|
| API response | MP01 range GET through MealPlannerApi. |
| Core data/access/state | MealPlannerFacade captures key/generation/epoch, validates the response and stores the complete normalized range through core synchronization in MealPlannerStore. |
| Feature orchestration/state | MealPlanWorkspaceFacade/State parse navigation and derive selected date/meal/task VM without copying days into feature state. |
| UI components and page.ts | MealPlannerPage, WeekStrip, SelectedDayPanel, MealRow and NutritionSummary render readonly VM values. |

### Mutations, autosave and state propagation

Read-only phase: opening a date/virtual slot makes no mutation. Later writes reuse this core range flow; this phase proves stale completion rejection and no GET persistence.

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

## Loading Behavior

Compact Monday–Sunday strip, selected day, Today/prev/next/date jump, optional disabled Templates. True date buttons with aria-pressed/labels; unknown values use readable Unknown, over-target values retain numeric sign/text.

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

- Monday/month/year/DST and local Today boundaries.
- Loading/error/retry/stale/empty/Easy/no-Current displays.
- Selecting dates/opening virtual tasks performs no mutation.
- An old week response cannot replace the active query or repopulate a reset identity.
- Keyboard selected-date labels, focus and320px reflow.

Negative cases must assert unchanged data/revision/confirmed state, not just the returned status. Use synthetic two-user fixtures. Real MySQL is required for FK/CHECK/lock/rollback behavior; controlled Observables and HttpTestingController are appropriate for client races/serialization. Existing critical auth/discovery/profile behavior must remain compatible.

### Acceptance criteria

- [x] Build the week/day workspace from core normalized data with separate route/task state and shared desktop/mobile logic.
- [ ] Monday/month/year/DST and local Today boundaries.
- [ ] Loading/error/retry/stale/empty/Easy/no-Current displays.
- [ ] Selecting dates/opening virtual tasks performs no mutation.
- [ ] An old week response cannot replace the active query or repopulate a reset identity.
- [ ] Keyboard selected-date labels, focus and320px reflow.
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

- `src/app/features/meal-plan/meal-plan.routes.ts`
- `src/app/features/meal-plan/meal-plan-shell.page.html`

The [File Manifest](../README.md#implementation-file-manifest) names first creator and subsequent editors. Preserve existing project/namespace conventions. Consult [repository audit](../README.md#preserved-repository-audit) before adapting changed source.

### Database changes

No frontend phase writes SQL or changes schema. Backend prerequisites below own persistence.

### Backend changes

B08 normalizes dates/defaults/totals/remaining. No backend changes. Wire one-date GET for latercopy inspection without new selected-day route.

### Frontend changes

Implement the exact core files and separate feature flow/form/UI files listed above. Core owns HTTP, DTOs, confirmed state, synchronization and reusable use cases. Feature state owns only temporary drafts/selection/tasks. Pages/components bind readonly view models and emit intent; no HttpClient/API injection, server-data arrays, request orchestration or nutrition math in page.ts. This phase’s concrete flow below defines the boundary crossings.

### Business rules

- Calendar dates never use UTC-midnight toISOString conversion.
- No Day/3Days/Week modes or planner plan dropdown.
- Show two food names plus+N on overview; saved count excludes virtual placeholders.
- Route entry/window focus revalidates when idle; stale data cannot authorize writes.
- No page.days/currentPlan copies; core remains the source.

### Security / ownership

Session derives the owner. Join item→meal→day→user for child IDs; also match route date where supplied. Current requires scoped plan plus composite FK. A route guard/disabled button is never authorization. All unsafe browser calls use E-005 CSRF transport/validation and exact allowed API boundary. Use Dapper parameters, strict DTOs and named enum codes; escape displayed text through normal Angular binding. Pure calculation/GETs do not create persistent state.

### Transactions

The browser never emulates a transaction with several persistence calls. Each completed W action is one core-coordinated backend command. Core sends the originating reviewed revision and consumes the atomic receipt once. Temporary UI overlays do not mutate confirmed stores. Copy Week is one command, not seven Copy Day calls. The paired backend phase owns database atomicity; do not weaken it to simplify UI.

### Out of scope

All other phase implementations unless explicitly listed as modifications; no broad migration of unrelated stores/services. No Templates, persisted weeks, target/recipe snapshots, fractional servings, flexible ingredients, recommendations, training-day model, recovery modifier, shopping list, batches or reusable foods/meals. Do not add a generic state/transaction framework as a substitute for the concrete slice.

### Common implementation mistakes

- Making UI generate defaults
- Putting date cache in feature/page
- One global query error for all keys
- Changing left pane to meal context
- Rendering duplicate desktop/mobile forms

## Dependencies

F02c/F04; B08.

Mandatory accompanying contracts: [Decisions](../README.md#approved-decisions), [API](../README.md#canonical-api-contracts), [Data Model](../README.md#canonical-database-model), [Architecture](../README.md#shared-system-architecture), and [Frontend Data Flow](Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture). Calculator phases also read [Nutrition Policy](../README.md#nutrition-calculation-policy). These are normative contract sections, not optional background. If a prerequisite is absent, implement that prerequisite first; do not bypass it with local component state, a new API, or an unsafe database reset.

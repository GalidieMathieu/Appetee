# F-011 — Meal Plan — Frontend — Phase F04

**Phase title:** Plan dashboard and lifecycle actions

## Canonical Contract

The feature [README](../README.md) owns shared product behavior, data requirements, database impact, API/request/response contracts and error semantics. This file applies the frontend template to one bounded phase. It does not redefine the shared contract.

**Phase:** F04
**Status:** Implemented (frontend)
**Specification:** Frontend implemented on 2026-10-11; live B07/backend and browser acceptance remain external verification.

## Frontend Goal

Show text-first plan cards from core state and complete Current/duplicate/delete flows with confirmed results.

## Routes

Use the authenticated Meal Plan route shell introduced in F01 and the child routes introduced by this phase. Profile integration uses the existing `/profile` route. The exact route/selection and Back behavior is owned by the [shared frontend architecture](./Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture) and [UX contract](../README.md#ux-and-accessibility-contract). Do not register a component before its owning phase creates it. Route guards provide UX only; backend ownership remains authoritative.

Approved implementation URL: **`/meal-plan/nutrition-plans`**, a `nutrition-plans` child beneath the existing authenticated Meal Plan shell. Creation and Edit links are hidden until F05/F06/F07 provide working routes; no placeholder or broken future route is registered. Global navigation/Home release availability remains unchanged. The user explicitly authorized frontend implementation against the canonical B07 contracts while B07 is being implemented in parallel.

## Page and Component Structure

### Files to create

- `src/app/core/shared/data-access/meal-plan/nutrition-plan.facade.ts`
- `src/app/core/shared/data-access/meal-plan/nutrition-plan.facade.spec.ts`
- `src/app/features/meal-plan/state/nutrition-plans-page.facade.ts`
- `src/app/features/meal-plan/state/nutrition-plans-page.facade.spec.ts`
- `src/app/features/meal-plan/nutrition-plans/nutrition-plans.page.ts`
- `src/app/features/meal-plan/nutrition-plans/nutrition-plans.page.html`
- `src/app/features/meal-plan/nutrition-plans/nutrition-plans.page.scss`
- `src/app/features/meal-plan/nutrition-plans/nutrition-plans.page.spec.ts`
- `src/app/features/meal-plan/nutrition-plans/nutrition-plan-card.component.ts`
- `src/app/features/meal-plan/nutrition-plans/nutrition-plan-card.component.html`
- `src/app/features/meal-plan/nutrition-plans/nutrition-plan-card.component.scss`
- `src/app/features/meal-plan/nutrition-plans/nutrition-plan-card.component.spec.ts`

Each production class/module uses the responsibility/dependency rules in [backend map](../backend/Phase_B03_write_protocol_and_errors.md#shared-backend-architecture) or [frontend ownership map](Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture). Test companions exercise behavior, not implementation-only snapshots. Do not create similarly named duplicate files elsewhere.

### Files to modify

- `src/app/features/meal-plan/meal-plan.routes.ts`
- `src/app/features/meal-plan/meal-plan-shell.page.spec.ts` (update the earlier empty-child-route expectation)

## State Ownership

**Core:** reusable DTO/domain types, APIs, saved profile, complete plan details, plan summaries, planner range/query state, scoped picker API/query state, mutation coordinator, synchronization and domain facades.

**Feature:** separate task/selection state, form drafts, temporary overlays and view-model orchestration.

**UI/page.ts:** composition, focus references and intent/view-model bindings only. No API subscriptions, persistent/shared entity cache, request state, forms or nutrition calculations. See the phase-specific boundary table under Data Flow.

## State Lifetime

Core identity state survives route changes and clears via existing-instance SESSION_RESETTERS. Core picker classes are provided once per workspace and clear on the core reset signal. Feature flow/draft providers survive child task/step navigation and clear on flow exit or identity reset. APIs are stateless. Browser refresh reconstructs from URL and authenticated GETs; no browser-persisted profile, planner or mutation queue. [Exact owner/lifetime map](./Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture).

## Data Flow

### Data flow

1. List route feature facade calls core NutritionPlanFacade.loadList and exposes readonly view model.
2. Core loads summary list/settings with per-query state; Current badges derive shared settings, not card booleans.
3. Card emits edit/use/duplicate/delete intent; feature facade owns dialogs/navigation and delegates domain actions to core.
4. Coordinator executes one lifecycle command; SyncService updates detail/context, invalidates or updates summary list once.
5. Delete Current confirmation explains no targets/defaults afterward and preserved saved food; receipt clears Current without choosing another.

Data ownership at each crossing is explicit: UI intent → separate feature flow/draft controller → core domain facade/coordinator → core API → controller → Application → atomic Infrastructure operation. Confirmed response returns through core SyncService/store once before feature navigation/status. For read-only phases there is no write/coordinator transaction; for pure preview its ephemeral result belongs to the unsaved draft, not saved-plan cache.

### Complete frontend data flow and ownership

**Response path:** API → Core data-access/state → feature orchestration/state → UI components. **Intent path:** UI → separate feature controller → Core domain facade/coordinator → Core API → backend. The response must return through Core before it changes feature navigation or success state.

| Boundary | Exact responsibility in F04 |
|---|---|
| API response | NP04 list plus NP08 duplicate, NP09 delete and NP10 Current through NutritionPlanApi. |
| Core data/access/state | NutritionPlanFacade uses summary store, complete detail store, context and shared coordinator/sync. Current membership derives from settings. |
| Feature orchestration/state | NutritionPlansPageFacade handles menus/confirmation/navigation while deriving cards from readonly core selectors. |
| UI components and page.ts | NutritionPlansPage and NutritionPlanCardComponent display the derived list and emit actions. |

### Mutations, autosave and state propagation

Core executes one confirmed command. Sync updates/removes complete plan data, list projection and settings; Current changes invalidate planner projections before the page reports success.

On a successful write, the Core API returns the typed receipt to its core use case; Core synchronization applies affected confirmed data/settings/revision once. Readonly selectors then update feature-derived view models. Feature state reconciles only the acknowledged draft version and performs the next UI task. Page.ts binds the resulting view model; it never handles the raw receipt or patches a server entity. Foundation/read-only phases document this integration contract without importing future modules before their creation.

### Refresh, errors and identity changes

Loads have independent core request/error state and captured generation/key/sequence/epoch. A response from an old identity or pre-write epoch is discarded. An unknown newer revision invalidates older projections; it cannot silently authorize their edits. Failed writes preserve confirmed Core data and feature drafts separately. Conflicts require refresh/review; ambiguous results require reconciliation rather than automatic replay. Core stores/coordinator clear via SESSION_RESETTERS using existing instances; scoped picker and feature drafts clear on the core context reset signal. Late results cannot repopulate a new session.

### Boundary acceptance

Trace one read from HTTP result to rendered VM and one applicable write from UI intent to confirmed Core state and back. Prove there is no API state, persistent/shared entity cache, HTTP orchestration, FormGroup ownership or nutrition algorithm in page.ts. Reusable application/API state remains in Core even when its provider is scoped to the planner workspace. Temporary draft/model/form files remain separate from presentation.

[Ownership diagram](../assets/diagrams/03-frontend-ownership.png) · [Range flow](../assets/diagrams/04-range-read.png) · [Autosave flow](../assets/diagrams/05-autosave-state.png)

## API Integration

### NP04: GET /api/nutrition-plans

Purpose: List owned plans and Current context. Authentication required; owner comes from session, foreign/missing owned objects both 404. Parameters: none. No extra query parameters.

- Request `none`: No request body. Do not invent optional mutation inputs.
- Response `NutritionPlanListDto`: revision,settings,plans:summary[]; summaries omit complete calculation inputs. Success: 200.
- Application: `NutritionPlanService.ListAsync` → Infrastructure: `NutritionPlanQueries.ListAsync`.
- Frontend: core `NutritionPlanFacade.loadList`; feature flow delegates, UI never calls HTTP directly.
- Transaction class **R**: read-only coherent snapshot; never create rows.
- Specific rule: Own max50 plans, Current first then updated_at DESC,id DESC. No pagination needed at this cap.
- UI contract: Core list projection, separate from detail cache; loading/error owned by list query.

Errors include 400 validation,401 session,404 scoped unavailable,409 business/version conflict and500 unexpected; unsafe calls require CSRF. Writes require X-Meal-Plan-Revision; reads/preview do not. Request/response nested fields are the normative API appendix linked above; do not invent a parallel shape.

### NP08: POST /api/nutrition-plans/{planId}/duplicate

Purpose: Duplicate one plan as inactive. Authentication required; owner comes from session, foreign/missing owned objects both 404. Parameters: planId route int. No extra query parameters.

- Request `none`: No request body. Do not invent optional mutation inputs.
- Response `NutritionPlanMutationDto`: revision,settings,plan|null,deletedPlanId|null,profile|null,plannerInvalidated. Null profile means unchanged, not erase. Success: 201 + plan Location.
- Application: `NutritionPlanService.DuplicateAsync` → Infrastructure: `NutritionPlanRepository.DuplicateAsync`.
- Frontend: core `NutritionPlanFacade.duplicate`; feature flow delegates, UI never calls HTTP directly.
- Transaction class **W**: one complete user-locked, revision-checked transaction including readback before commit.
- Specific rule: Owner/cap; generate unique suffix under lock. Copy targets/provenance, fresh id/audit timestamps; calculated_at remains original calculation time. Current unchanged.
- UI contract: Confirmed UI; disable repeated action while pending; POST not safely replayed with a fresh version.

Errors include 400 validation,401 session,404 scoped unavailable,409 business/version conflict and500 unexpected; unsafe calls require CSRF. Writes require X-Meal-Plan-Revision; reads/preview do not. Request/response nested fields are the normative API appendix linked above; do not invent a parallel shape.

### NP09: DELETE /api/nutrition-plans/{planId}

Purpose: Delete plan and clear Current if necessary. Authentication required; owner comes from session, foreign/missing owned objects both 404. Parameters: planId route int. No extra query parameters.

- Request `none`: No request body. Do not invent optional mutation inputs.
- Response `NutritionPlanMutationDto`: revision,settings,plan|null,deletedPlanId|null,profile|null,plannerInvalidated. Null profile means unchanged, not erase. Success: 200.
- Application: `NutritionPlanService.DeleteAsync` → Infrastructure: `NutritionPlanRepository.DeleteAsync`.
- Frontend: core `NutritionPlanFacade.delete`; feature flow delegates, UI never calls HTTP directly.
- Transaction class **W**: one complete user-locked, revision-checked transaction including readback before commit.
- Specific rule: Owner; pointer NULL before DELETE. No alternative Current, no food deletion. Missing/foreign404 even for repeated delete; stale version409.
- UI contract: Confirmation before command; keep card until acknowledgement; clear stale details after receipt.

Errors include 400 validation,401 session,404 scoped unavailable,409 business/version conflict and500 unexpected; unsafe calls require CSRF. Writes require X-Meal-Plan-Revision; reads/preview do not. Request/response nested fields are the normative API appendix linked above; do not invent a parallel shape.

### NP10: PUT /api/meal-plan/current-nutrition-plan

Purpose: Select owned Current plan. Authentication required; owner comes from session, foreign/missing owned objects both 404. Parameters: none. No extra query parameters.

- Request `SetCurrentNutritionPlanRequest`: nutritionPlanId positive signed INT owned by session user; no null/clear action.
- Response `NutritionPlanMutationDto`: revision,settings,plan|null,deletedPlanId|null,profile|null,plannerInvalidated. Null profile means unchanged, not erase. Success: 200.
- Application: `NutritionPlanService.SetCurrentAsync` → Infrastructure: `NutritionPlanRepository.SetCurrentAsync`.
- Frontend: core `NutritionPlanFacade.setCurrent`; feature flow delegates, UI never calls HTTP directly.
- Transaction class **W**: one complete user-locked, revision-checked transaction including readback before commit.
- Specific rule: Owner and composite FK; same Current no-op. Do not recalculate targets or rewrite days.
- UI contract: Confirmed Current badge; invalidate range then refresh on active view/next entry; no planner dropdown.

Errors include 400 validation,401 session,404 scoped unavailable,409 business/version conflict and500 unexpected; unsafe calls require CSRF. Writes require X-Meal-Plan-Revision; reads/preview do not. Request/response nested fields are the normative API appendix linked above; do not invent a parallel shape.

## Loading Behavior

Text-first cards with Current badge/Use this plan, Edit and named overflow actions. Empty state offers Easy/Intermediate creation routes when phases add them. Dialog uses Material focus/Escape behavior.

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

- Loading/error/retry/empty/50-plan cap states.
- Current badge uniqueness after switch/delete; Easy/no Current render correctly.
- Duplicate POST not retried on timeout; deletion stale409 preserves card until refresh.
- Card component has no injected API/store; list page has no local plans[] cache.
- Focus returns after dialog; keyboard actions have names.

Negative cases must assert unchanged data/revision/confirmed state, not just the returned status. Use synthetic two-user fixtures. Real MySQL is required for FK/CHECK/lock/rollback behavior; controlled Observables and HttpTestingController are appropriate for client races/serialization. Existing critical auth/discovery/profile behavior must remain compatible.

### Acceptance criteria

- [x] Show text-first plan cards from core state and complete Current/duplicate/delete flows with confirmed results.
- [x] Loading/error/retry/empty/50-plan cap states.
- [x] Current badge uniqueness after switch/delete; Easy/no Current render correctly.
- [x] Duplicate POST not retried on timeout; deletion stale409 preserves card until refresh.
- [x] Card component has no injected API/store; list page has no local plans[] cache.
- [x] Focus returns after dialog; keyboard actions have names (component/Material DOM tests).
- [x] Core data-access contains saved data/DTOs/facades; feature temporary state is separate from pages/UI; no direct component HTTP.
- [x] No deferred approved scope or unrelated refactor is introduced.
- [x] Build and named meaningful tests pass, with real results recorded; no live backend/browser integration pass is claimed.

### Completion verification

Working directory: Appetee_v2_frontEnd repository root. Use the repository’s installed SDK/package versions. Commands are for implementation, not commands executed while preparing this specification.

```bash
npm run build
npm test -- --watch=false
```

Before any integration test that can rebuild data, prove isolated test host/database and explicit opt-in. Add the named tests from this phase before running its filter; a zero-test match is not success. For frontend, run the meaningful phase tests plus build; use the configured runner’s supported file selection when available rather than inventing a lint script. Inspect imports/state location and exercise the specified error path manually. Record actual result and limitations in the phase completion evidence; do not change specification-ready into implemented without evidence.

## Implementation Notes

### Implementation evidence and verification boundaries

Verification executed from `appetee_front` on 2026-10-11:

```powershell
npm test -- --watch=false --include='**/nutrition-plan*.spec.ts' --include='**/meal-plan-shell.page.spec.ts'
npm test -- --watch=false
npm run build
git diff --check
```

- Focused plan/API/store/shell verification: 8 files, 44 tests passed.
- Final full frontend suite run by itself: 76 files, 490 tests passed, 1 existing skip. An earlier concurrent build/test attempt hit three five-second test timeouts (the new 50-card case and two existing recipe cases); the final serial rerun passed without changing test timeouts.
- Final production build passed. Warnings: initial bundle 506.82 kB exceeds the 500 kB warning budget by 6.83 kB, plus the three existing component-style warnings (recipes list, admin recipes, cooking mode). Budgets were not raised.
- Frontend and documentation whitespace checks passed. Architecture searches found no HTTP subscriptions/forms/DTO-array cache in the page/card, and no feature/Router/MatDialog/UI imports in the Core facade.

- UI composition follows `assets/references/04_nutrition_plans.png`: text-first white card grid, mode/goal/activity tags, settings-derived Current pill, estimated targets and meal-structure footer. Legacy Advanced modes, invented descriptions and Easy targets from the image are not copied.
- Typography, buttons and colors reuse `src/styles/_text.scss`, `_button.scss` and `_theme.scss`. Local SCSS owns only card/page layout, reflow and focused-control presentation; no new theme or bitmap is introduced.
- Core list reads coalesce, wait for the write lane, use captured identity/epoch/query tokens and a bounded read timeout, and never hydrate details from summaries. A discarded pre-write read exposes a recoverable query error instead of stranding Loading. Query state remains independent from action state.
- Lifecycle commands use the existing API, central CSRF transport, original reviewed revision, coordinator and SyncService. Only confirmed receipts change Current/detail state and invalidate summaries/planner projections. A subsequent list GET adopts canonical ordering and server-generated duplicate names.
- Conflict/unknown outcome offers fresh GET plus explicit review, not automatic replay. A delete dialog's old consent/revision is discarded after review; reopening requires a new confirmation. Shared paused state is recoverable on route re-entry.
- Material menus/dialogs retain named keyboard controls, focus trapping/Escape behavior and restore focus on cancellation; acknowledged deletion moves focus to the list heading when its trigger is removed. Pending deletion disables dialog dismissal. Page classes own only bindings, lifecycle forwarding and focus references.
- Live backend/browser journeys, staging, screen-reader/keyboard-only acceptance, 320px/200%/400% zoom/reduced-motion captures were not run. No backend/database/schema/hosting code was changed. B07 is being implemented separately; mocked typed responses are not evidence that live B07 endpoints pass.

### Existing code involved

Audited current files (paths relative to the frontend repository):

- `src/app/core/shared/data-access/STATE_ARCHITECTURE.md`
- `src/app/core/shared/data-access/generic-template/entity-cache-store.ts`
- `src/app/core/session/session-reset.token.ts`

Earlier-phase files to extend, not falsely assumed present at the audited snapshot:

- `src/app/features/meal-plan/meal-plan.routes.ts`

The [File Manifest](../README.md#implementation-file-manifest) names first creator and subsequent editors. Preserve existing project/namespace conventions. Consult [repository audit](../README.md#preserved-repository-audit) before adapting changed source.

### Database changes

No frontend phase writes SQL or changes schema. Backend prerequisites below own persistence.

### Backend changes

Uses B06/B07 lifecycle; no new endpoints. Server enforces owner/cap/name/current FK and returns complete receipt. Frontend cannot substitute ownership by hiding actions.

### Frontend changes

Implement the exact core files and separate feature flow/form/UI files listed above. Core owns HTTP, DTOs, confirmed state, synchronization and reusable use cases. Feature state owns only temporary drafts/selection/tasks. Pages/components bind readonly view models and emit intent; no HttpClient/API injection, server-data arrays, request orchestration or nutrition math in page.ts. This phase’s concrete flow below defines the boundary crossings.

### Business rules

- No food hero images, Usual Day, training week or mode conversion.
- Easy cards show count/mode, no fake zero targets.
- Duplicate stays inactive and uses server-generated name; no client-only copied plan.
- List summaries cannot seed detail cache.
- Independent pending action state; prevent double click on same operation.

### Security / ownership

Session derives the owner. Join item→meal→day→user for child IDs; also match route date where supplied. Current requires scoped plan plus composite FK. A route guard/disabled button is never authorization. All unsafe browser calls use E-005 CSRF transport/validation and exact allowed API boundary. Use Dapper parameters, strict DTOs and named enum codes; escape displayed text through normal Angular binding. Pure calculation/GETs do not create persistent state.

### Transactions

The browser never emulates a transaction with several persistence calls. Each completed W action is one core-coordinated backend command. Core sends the originating reviewed revision and consumes the atomic receipt once. Temporary UI overlays do not mutate confirmed stores. Copy Week is one command, not seven Copy Day calls. The paired backend phase owns database atomicity; do not weaken it to simplify UI.

### Out of scope

All other phase implementations unless explicitly listed as modifications; no broad migration of unrelated stores/services. No Templates, persisted weeks, target/recipe snapshots, fractional servings, flexible ingredients, recommendations, training-day model, recovery modifier, shopping list, batches or reusable foods/meals. Do not add a generic state/transaction framework as a substitute for the concrete slice.

### Common implementation mistakes

- Mutating isCurrent on each card
- Duplicating a plan purely in local array
- Caching card as full detail
- Putting dialogs in core facade
- Auto-selecting another plan after delete

## Dependencies

F02c/F03; B06/B07.

Mandatory accompanying contracts: [Decisions](../README.md#approved-decisions), [API](../README.md#canonical-api-contracts), [Data Model](../README.md#canonical-database-model), [Architecture](../README.md#shared-system-architecture), and [Frontend Data Flow](Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture). Calculator phases also read [Nutrition Policy](../README.md#nutrition-calculation-policy). These are normative contract sections, not optional background. If a prerequisite is absent, implement that prerequisite first; do not bypass it with local component state, a new API, or an unsafe database reset.

# F-011 — Meal Plan — Frontend — Phase F15

**Phase title:** Responsive, accessibility and ownership release verification

## Canonical Contract

The feature [README](../README.md) owns shared product behavior, data requirements, database impact, API/request/response contracts and error semantics. This file applies the frontend template to one bounded phase. It does not redefine the shared contract.

**Phase:** F15
**Status:** Automated frontend verification implemented; live integration and manual release acceptance remain pending. Not release-complete.
**Specification:** Frontend verification/scoped fixes only; no backend, database, deployment or hosting changes.

## Frontend implementation evidence — 2026-10-15

Added/extended the four named browser suites with test-only API fixtures plus unit/contract checks. Existing global Meal Plan navigation is preserved once, and the Home CTA now opens the implemented route without an upcoming-meal cache. Necessary scoped fixes include post-render focus restoration, local field-error links (preventing base-href navigation away), single-response HTTP completion/timeout cleanup, accessible orange foreground/action variants, visible focus and reduced-motion styling. Actual commands/results, screenshots and remaining release gates are recorded in [F11–F15 implementation verification](F11_F15_implementation_verification.md).

Mocked browser journeys do **not** verify real authenticated backend behavior, database atomicity, deployed cookies/CORS/CSRF, migration safety or screen-reader/browser-zoom acceptance. F15 remains incomplete until those gates are exercised and recorded. No unrun live or manual check is marked passed.

## Frontend Goal

Verify complete flows and enforce the core/feature boundary before enabling navigation/Home entry.

## Routes

Current planner tasks are `day`, `meal`, `recipe-picker` and the approved [`manual` Add/Edit routes](Phase_F11_manual_food_editor.md#routes). Copy Day/Week remain dialogs. The authenticated `/meal-plan` entry redirects to the planner; existing Home action navigates there. Browser error-summary links focus local fields without changing the route or discarding a draft.

Use the authenticated Meal Plan route shell introduced in F01 and the child routes introduced by this phase. Profile integration uses the existing `/profile` route. The exact route/selection and Back behavior is owned by the [shared frontend architecture](./Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture) and [UX contract](../README.md#ux-and-accessibility-contract). Do not register a component before its owning phase creates it. Route guards provide UX only; backend ownership remains authoritative.

## Page and Component Structure

### Files to create

- `e2e/meal-plan-planner.spec.ts`
- `e2e/meal-plan-nutrition-plans.spec.ts`
- `e2e/meal-plan-concurrency.spec.ts`
- `e2e/meal-plan-accessibility.spec.ts`

Each production class/module uses the responsibility/dependency rules in [backend map](../backend/Phase_B03_write_protocol_and_errors.md#shared-backend-architecture) or [frontend ownership map](Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture). Test companions exercise behavior, not implementation-only snapshots. Do not create similarly named duplicate files elsewhere.

### Files to modify

- `src/app/core/layout/private-layout/private-header.component.ts`
- `src/app/core/layout/private-layout/private-header.component.html`
- `src/app/core/layout/private-layout/private-header.component.scss`
- `src/app/features/home/home-feature-availability.ts`
- `src/app/features/home/components/meal-plan-empty-state/meal-plan-empty-state.component.ts`
- `src/app/features/home/components/meal-plan-empty-state/meal-plan-empty-state.component.html`
- `src/styles/_theme.scss`
- `playwright.config.ts`

## State Ownership

**Core:** reusable DTO/domain types, APIs, saved profile, complete plan details, plan summaries, planner range/query state, scoped picker API/query state, mutation coordinator, synchronization and domain facades.

**Feature:** separate task/selection state, form drafts, temporary overlays and view-model orchestration.

**UI/page.ts:** composition, focus references and intent/view-model bindings only. No API subscriptions, persistent/shared entity cache, request state, forms or nutrition calculations. See the phase-specific boundary table under Data Flow.

## State Lifetime

Core identity state survives route changes and clears via existing-instance SESSION_RESETTERS. Core picker classes are provided once per workspace and clear on the core reset signal. Feature flow/draft providers survive child task/step navigation and clear on flow exit or identity reset. APIs are stateless. Browser refresh reconstructs from URL and authenticated GETs; no browser-persisted profile, planner or mutation queue. [Exact owner/lifetime map](./Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture).

## Data Flow

### Data flow

1. Audit production imports/state against File Manifest and Data Flow; repair misplaced caches before acceptance.
2. Run full browser flows against completed backend with CSRF, expiry, conflicts and unknown nutrition.
3. Verify stable desktop context and one-task mobile Back using the same providers.
4. Check keyboard, focus, status, contrast, zoom/reflow and drag alternatives.
5. Enable one global Meal Plan entry and existing Home CTA without implementing an upcoming-meal dashboard.
6. Record actual commands/results and limitations; specifications alone are not implementation evidence.

Data ownership at each crossing is explicit: UI intent → separate feature flow/draft controller → core domain facade/coordinator → core API → controller → Application → atomic Infrastructure operation. Confirmed response returns through core SyncService/store once before feature navigation/status. For read-only phases there is no write/coordinator transaction; for pure preview its ephemeral result belongs to the unsaved draft, not saved-plan cache.

### Complete frontend data flow and ownership

**Response path:** API → Core data-access/state → feature orchestration/state → UI components. **Intent path:** UI → separate feature controller → Core domain facade/coordinator → Core API → backend. The response must return through Core before it changes feature navigation or success state.

| Boundary | Exact responsibility in F15 |
|---|---|
| API response | Exercise all NP01–NP10 and MP01–MP13 paths through their existing core APIs, plus existing recipe discovery and experience contracts. |
| Core data/access/state | Verify every confirmed store, scoped picker, coordinator, sync and session reset boundary under browser and controlled-response tests. |
| Feature orchestration/state | Verify feature task/draft controllers own only temporary state and maintain one instance across responsive layouts. |
| UI components and page.ts | Exercise all planner, form, dialog, picker and navigation components with keyboard, narrow layout and direct links. |

### Mutations, autosave and state propagation

Verify the complete lifecycle for autosave, explicit submit, stale/late responses, two-session conflict, unknown outcome and Current invalidation. This phase changes verification/necessary scoped fixes only; no competing data architecture.

On a successful write, the Core API returns the typed receipt to its core use case; Core synchronization applies affected confirmed data/settings/revision once. Readonly selectors then update feature-derived view models. Feature state reconciles only the acknowledged draft version and performs the next UI task. Page.ts binds the resulting view model; it never handles the raw receipt or patches a server entity. Foundation/read-only phases document this integration contract without importing future modules before their creation.

### Refresh, errors and identity changes

Loads have independent core request/error state and captured generation/key/sequence/epoch. A response from an old identity or pre-write epoch is discarded. An unknown newer revision invalidates older projections; it cannot silently authorize their edits. Failed writes preserve confirmed Core data and feature drafts separately. Conflicts require refresh/review; ambiguous results require reconciliation rather than automatic replay. Core stores/coordinator clear via SESSION_RESETTERS using existing instances; scoped picker and feature drafts clear on the core context reset signal. Late results cannot repopulate a new session.

### Boundary acceptance

Trace one read from HTTP result to rendered VM and one applicable write from UI intent to confirmed Core state and back. Prove there is no API state, persistent/shared entity cache, HTTP orchestration, FormGroup ownership or nutrition algorithm in page.ts. Reusable application/API state remains in Core even when its provider is scoped to the planner workspace. Temporary draft/model/form files remain separate from presentation.

[Ownership diagram](../assets/diagrams/03-frontend-ownership.png) · [Range flow](../assets/diagrams/04-range-read.png) · [Autosave flow](../assets/diagrams/05-autosave-state.png)

## API Integration

No new endpoint is introduced in this phase. Implement only the foundation/projection/test changes named above. Preserve existing public contracts; relevant complete endpoint shapes are in the canonical API appendix.

## Loading Behavior

Enable final navigation only when routes work. Preserve brand with accessible foregrounds. Verify loading/empty/error/stale/unavailable/unsaved/pending/success states and avoid implementation jargon in product flows.

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

- Desktop and mobile plan/planner/copy paths.
- Two-tab same-version race, late GET, logout response and rapid quantities.
- Read-only navigation leaves DB counts unchanged; backend fault and client rollback agree.
- 320px/200% zoom, visible unobscured focus, linked errors/status and corrected contrast.
- Architecture searches/manual review prove core ownership and separate form controllers.

Negative cases must assert unchanged data/revision/confirmed state, not just the returned status. Use synthetic two-user fixtures. Real MySQL is required for FK/CHECK/lock/rollback behavior; controlled Observables and HttpTestingController are appropriate for client races/serialization. Existing critical auth/discovery/profile behavior must remain compatible.

### Acceptance criteria

- [ ] Verify complete flows and enforce the core/feature boundary before enabling navigation/Home entry.
- [ ] Desktop and mobile plan/planner/copy paths.
- [ ] Two-tab same-version race, late GET, logout response and rapid quantities.
- [ ] Read-only navigation leaves DB counts unchanged; backend fault and client rollback agree.
- [ ] 320px/200% zoom, visible unobscured focus, linked errors/status and corrected contrast.
- [ ] Architecture searches/manual review prove core ownership and separate form controllers.
- [x] Core data-access contains saved data/DTOs/facades; feature temporary state is separate from pages/UI; no direct component HTTP.
- [x] No deferred approved scope or unrelated refactor is introduced.
- [x] Build and named meaningful frontend tests pass; actual results and unrun integration/manual checks are recorded separately.

### Completion verification

Working directory: Appetee_v2_frontEnd repository root. Use the repository’s installed SDK/package versions. Commands are for implementation, not commands executed while preparing this specification.

```bash
npm run build
npm test -- --watch=false
npm run e2e -- e2e/meal-plan-planner.spec.ts e2e/meal-plan-nutrition-plans.spec.ts e2e/meal-plan-concurrency.spec.ts e2e/meal-plan-accessibility.spec.ts
```

Before any integration test that can rebuild data, prove isolated test host/database and explicit opt-in. Add the named tests from this phase before running its filter; a zero-test match is not success. For frontend, run the meaningful phase tests plus build; use the configured runner’s supported file selection when available rather than inventing a lint script. Inspect imports/state location and exercise the specified error path manually. Record actual result and limitations in the phase completion evidence; do not change specification-ready into implemented without evidence.

## Implementation Notes

### Existing code involved

Audited current files (paths relative to the frontend repository):

- `src/app/core/layout/private-layout/private-header.component.ts`
- `src/app/core/layout/private-layout/private-header.component.html`
- `src/app/core/layout/private-layout/private-header.component.scss`
- `src/app/features/home/home-feature-availability.ts`
- `src/app/features/home/components/meal-plan-empty-state/meal-plan-empty-state.component.ts`
- `src/app/features/home/components/meal-plan-empty-state/meal-plan-empty-state.component.html`
- `src/styles/_theme.scss`
- `playwright.config.ts`
- `src/app/core/shared/data-access/STATE_ARCHITECTURE.md`
- `src/app/core/shared/data-access/generic-template/entity-cache-store.ts`
- `src/app/core/session/session-reset.token.ts`
- `src/app/core/session/session.service.ts`

Earlier-phase files to extend, not falsely assumed present at the audited snapshot:

None. Do not create speculative files for future phases.

The [File Manifest](../README.md#implementation-file-manifest) names first creator and subsequent editors. Preserve existing project/namespace conventions. Consult [repository audit](../README.md#preserved-repository-audit) before adapting changed source.

### Database changes

No frontend phase writes SQL or changes schema. Backend prerequisites below own persistence.

### Backend changes

B15 must pass authorization, integrity, CSRF, migration and query checks. UI tests do not replace backend authorization tests. Fix defects in their owning phase/initiative without expanding feature scope.

### Frontend changes

Implement the exact core files and separate feature flow/form/UI files listed above. Core owns HTTP, DTOs, confirmed state, synchronization and reusable use cases. Feature state owns only temporary drafts/selection/tasks. Pages/components bind readonly view models and emit intent; no HttpClient/API injection, server-data arrays, request orchestration or nutrition math in page.ts. This phase’s concrete flow below defines the boundary crossings.

### Business rules

- No HttpClient/API injection in feature UI/pages and no features imports from core data-access.
- Feature models contain only draft/task/view-model types, not duplicated wire/entity definitions.
- Root identity instances use useExisting; scoped picker resets without root duplication.
- No stored browser profile/queue or unsafe production test calls.
- No deferred modes/templates/recommendations/meal-time scope.

### Security / ownership

Session derives the owner. Join item→meal→day→user for child IDs; also match route date where supplied. Current requires scoped plan plus composite FK. A route guard/disabled button is never authorization. All unsafe browser calls use E-005 CSRF transport/validation and exact allowed API boundary. Use Dapper parameters, strict DTOs and named enum codes; escape displayed text through normal Angular binding. Pure calculation/GETs do not create persistent state.

### Transactions

The browser never emulates a transaction with several persistence calls. Each completed W action is one core-coordinated backend command. Core sends the originating reviewed revision and consumes the atomic receipt once. Temporary UI overlays do not mutate confirmed stores. Copy Week is one command, not seven Copy Day calls. The paired backend phase owns database atomicity; do not weaken it to simplify UI.

### Out of scope

All other phase implementations unless explicitly listed as modifications; no broad migration of unrelated stores/services. No Templates, persisted weeks, target/recipe snapshots, fractional servings, flexible ingredients, recommendations, training-day model, recovery modifier, shopping list, batches or reusable foods/meals. Do not add a generic state/transaction framework as a substitute for the concrete slice.

### Common implementation mistakes

- Calling documented work implemented
- Deferring accessibility until redesign
- Inventing a Home dashboard
- Duplicating mobile stores
- Accepting page-owned server arrays because UI appears correct

## Dependencies

F01–F14 including F02a/F02b/F02c; B15 and verified E-005/E-002/E-008 release gates.

Mandatory accompanying contracts: [Decisions](../README.md#approved-decisions), [API](../README.md#canonical-api-contracts), [Data Model](../README.md#canonical-database-model), [Architecture](../README.md#shared-system-architecture), and [Frontend Data Flow](Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture). Calculator phases also read [Nutrition Policy](../README.md#nutrition-calculation-policy). These are normative contract sections, not optional background. If a prerequisite is absent, implement that prerequisite first; do not bypass it with local component state, a new API, or an unsafe database reset.


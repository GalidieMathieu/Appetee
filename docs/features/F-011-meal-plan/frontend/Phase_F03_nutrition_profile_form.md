# F-011 — Meal Plan — Frontend — Phase F03

**Phase title:** Shared nutrition profile form and Profile integration

## Canonical Contract

The feature [README](../README.md) owns shared product behavior, data requirements, database impact, API/request/response contracts and error semantics. This file applies the frontend template to one bounded phase. It does not redefine the shared contract.

**Phase:** F03
**Status:** Implemented
**Specification:** Implemented and reverified on 2026-10-06 after interrupted-session recovery.

## Frontend Goal

Create the controlled profile fields and separate feature edit state backed by the core saved-profile source.

## Routes

Use the authenticated Meal Plan route shell introduced in F01 and the child routes introduced by this phase. Profile integration uses the existing `/profile` route. The exact route/selection and Back behavior is owned by the [shared frontend architecture](./Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture) and [UX contract](../README.md#ux-and-accessibility-contract). Do not register a component before its owning phase creates it. Route guards provide UX only; backend ownership remains authoritative.

## Page and Component Structure

### Files to create

- `src/app/core/shared/data-access/user/nutrition-profile.facade.ts`
- `src/app/core/shared/data-access/user/nutrition-profile.facade.spec.ts`
- `src/app/core/shared/ui/nutrition-profile-form/nutrition-profile-form.component.ts`
- `src/app/core/shared/ui/nutrition-profile-form/nutrition-profile-form.component.html`
- `src/app/core/shared/ui/nutrition-profile-form/nutrition-profile-form.component.scss`
- `src/app/core/shared/ui/nutrition-profile-form/nutrition-profile-form.component.spec.ts`
- `src/app/core/shared/ui/nutrition-profile-form/nutrition-profile-form.model.ts`
- `src/app/core/shared/ui/nutrition-profile-form/nutrition-profile-form.factory.ts`
- `src/app/features/profile/state/nutrition-profile-editor.state.ts`
- `src/app/features/profile/state/nutrition-profile-editor.state.spec.ts`
- `src/app/features/profile/state/nutrition-profile-editor.facade.ts`
- `src/app/features/profile/state/nutrition-profile-editor.facade.spec.ts`
- `src/app/features/profile/state/nutrition-profile-pending-changes.guard.ts`
- `src/app/features/profile/state/nutrition-profile-pending-changes.guard.spec.ts`

Each production class/module uses the responsibility/dependency rules in [backend map](../backend/Phase_B03_write_protocol_and_errors.md#shared-backend-architecture) or [frontend ownership map](Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture). Test companions exercise behavior, not implementation-only snapshots. Do not create similarly named duplicate files elsewhere.

### Files to modify

- `src/app/features/profile/profile.page.ts`
- `src/app/features/profile/profile.page.html`
- `src/app/features/profile/profile.page.scss`
- `src/app/features/profile/profile.page.spec.ts`
- `src/app/features/profile/profile.routes.ts`

## State Ownership

**Core:** reusable DTO/domain types, APIs, saved profile, complete plan details, plan summaries, planner range/query state, scoped picker API/query state, mutation coordinator, synchronization and domain facades.

**Feature:** separate task/selection state, form drafts, temporary overlays and view-model orchestration.

**UI/page.ts:** composition, focus references and intent/view-model bindings only. No API subscriptions, persistent/shared entity cache, request state, forms or nutrition calculations. See the phase-specific boundary table under Data Flow.

## State Lifetime

Core identity state survives route changes and clears via existing-instance SESSION_RESETTERS. Core picker classes are provided once per workspace and clear on the core reset signal. Feature flow/draft providers survive child task/step navigation and clear on flow exit or identity reset. APIs are stateless. Browser refresh reconstructs from URL and authenticated GETs; no browser-persisted profile, planner or mutation queue. [Exact owner/lifetime map](./Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture).

## Data Flow

### Data flow

1. Profile page delegates enter/load to feature ProfileEditorFacade, which calls core NutritionProfileFacade.
2. Core facade loads UserApi response into NutritionProfileStore through sync, with generation protection.
3. Feature state creates FormGroup from shared pure factory and initializes scalar draft once; current username/image store remains separate.
4. Shared form component accepts controlled group/error inputs and emits user intent only.
5. Save delegates complete request/base revision to core coordinator; receipt updates saved profile before clearing acknowledged draft.

Data ownership at each crossing is explicit: UI intent → separate feature flow/draft controller → core domain facade/coordinator → core API → controller → Application → atomic Infrastructure operation. Confirmed response returns through core SyncService/store once before feature navigation/status. For read-only phases there is no write/coordinator transaction; for pure preview its ephemeral result belongs to the unsaved draft, not saved-plan cache.

### Complete frontend data flow and ownership

**Response path:** API → Core data-access/state → feature orchestration/state → UI components. **Intent path:** UI → separate feature controller → Core domain facade/coordinator → Core API → backend. The response must return through Core before it changes feature navigation or success state.

| Boundary | Exact responsibility in F03 |
|---|---|
| API response | NP01 GET and NP02 PUT through existing UserApi nutrition-profile methods. |
| Core data/access/state | NutritionProfileFacade loads into NutritionProfileStore; PUT runs through the shared coordinator and synchronization/context rules. |
| Feature orchestration/state | features/profile/state/NutritionProfileEditorFacade and EditorState seed and own the editable form once; the shared UI form factory has no persistence responsibility. |
| UI components and page.ts | Profile page and controlled NutritionProfileFormComponent bind values, errors and save status. |

### Mutations, autosave and state propagation

Explicit Save emits intent to the profile feature facade. Confirmed response replaces the core saved profile before draft baseline resets. Global profile edits do not recompute existing plans.

On a successful write, the Core API returns the typed receipt to its core use case; Core synchronization applies affected confirmed data/settings/revision once. Readonly selectors then update feature-derived view models. Feature state reconciles only the acknowledged draft version and performs the next UI task. Page.ts binds the resulting view model; it never handles the raw receipt or patches a server entity. Foundation/read-only phases document this integration contract without importing future modules before their creation.

### Refresh, errors and identity changes

Loads have independent core request/error state and captured generation/key/sequence/epoch. A response from an old identity or pre-write epoch is discarded. An unknown newer revision invalidates older projections; it cannot silently authorize their edits. Failed writes preserve confirmed Core data and feature drafts separately. Conflicts require refresh/review; ambiguous results require reconciliation rather than automatic replay. Core stores/coordinator clear via SESSION_RESETTERS using existing instances; scoped picker and feature drafts clear on the core context reset signal. Late results cannot repopulate a new session.

### Boundary acceptance

Trace one read from HTTP result to rendered VM and one applicable write from UI intent to confirmed Core state and back. Prove there is no API state, persistent/shared entity cache, HTTP orchestration, FormGroup ownership or nutrition algorithm in page.ts. Reusable application/API state remains in Core even when its provider is scoped to the planner workspace. Temporary draft/model/form files remain separate from presentation.

[Ownership diagram](../assets/diagrams/03-frontend-ownership.png) · [Range flow](../assets/diagrams/04-range-read.png) · [Autosave flow](../assets/diagrams/05-autosave-state.png)

## API Integration

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

### NP02: PUT /api/users/me/nutrition-profile

Purpose: Save complete profile without recalculating plans. Authentication required; owner comes from session, foreign/missing owned objects both 404. Parameters: none. No extra query parameters.

- Request `NutritionProfileRequest`: calculationSex male/female, birthYear integer, heightCm120–230, weightKg35–250, max2 decimals; adultConfirmed true when age-this-year18.
- Response `NutritionProfileDto`: revision:string, profile:complete value|null. Absent is valid on GET; PUT returns complete value. Success: 200.
- Application: `UserService.UpdateNutritionProfileAsync` → Infrastructure: `UserRepository.UpdateNutritionProfileAsync`.
- Frontend: core `NutritionProfileFacade.update`; feature flow delegates, UI never calls HTTP directly.
- Transaction class **W**: one complete user-locked, revision-checked transaction including readback before commit.
- Specific rule: Validate complete values/adult declaration; compare revision; same values no-op. Plan rows/targets remain untouched.
- UI contract: Confirmed UI; preserve feature draft on error; core profile source replaced only on success.

Errors include 400 validation,401 session,404 scoped unavailable,409 business/version conflict and500 unexpected; unsafe calls require CSRF. Writes require X-Meal-Plan-Revision; reads/preview do not. Request/response nested fields are the normative API appendix linked above; do not invent a parallel shape.

## Loading Behavior

Labels state units and calculation purpose. Field errors are linked to a red summary below section heading; Save disabled while pending and error remains visible on failure. Shared form reflows to one column on narrow screens.

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

- Null profile initial state, prefilled profile, validation boundaries and two-decimal input.
- Late GET after typing does not overwrite dirty draft; failed save preserves it.
- Shared component cannot fetch/save independently and uses accessible labels/errors.
- Username/image behavior unchanged; current plan targets unchanged after profile save.
- Reset/route exit clears draft; no browser storage.

Negative cases must assert unchanged data/revision/confirmed state, not just the returned status. Use synthetic two-user fixtures. Real MySQL is required for FK/CHECK/lock/rollback behavior; controlled Observables and HttpTestingController are appropriate for client races/serialization. Existing critical auth/discovery/profile behavior must remain compatible.

### Acceptance criteria

- [x] Create the controlled profile fields and separate feature edit state backed by the core saved-profile source.
- [x] Null profile initial state, prefilled profile, validation boundaries and two-decimal input.
- [x] Late GET after typing does not overwrite dirty draft; failed save preserves it.
- [x] Shared component cannot fetch/save independently and uses accessible labels/errors.
- [x] Username/image behavior unchanged; current plan targets unchanged after profile save.
- [x] Reset/route exit clears draft; no browser storage.
- [x] Core data-access contains saved data/DTOs/facades; feature temporary state is separate from pages/UI; no direct component HTTP.
- [x] No deferred approved scope or unrelated refactor is introduced.
- [x] Build and named meaningful tests pass, with real results recorded; do not mark unrun integration tests passed.

### Completion verification

Working directory: Appetee_v2_frontEnd repository root. Use the repository’s installed SDK/package versions. Commands are for implementation, not commands executed while preparing this specification.

```bash
npm run build
npm test -- --watch=false
```

Before any integration test that can rebuild data, prove isolated test host/database and explicit opt-in. Add the named tests from this phase before running its filter; a zero-test match is not success. For frontend, run the meaningful phase tests plus build; use the configured runner’s supported file selection when available rather than inventing a lint script. Inspect imports/state location and exercise the specified error path manually. Record actual result and limitations in the phase completion evidence; do not change specification-ready into implemented without evidence.

Completion evidence (2026-10-06):

- Focused profile run (`npm test -- --watch=false --include='**/nutrition-profile*.spec.ts' --include='**/profile.page.spec.ts'`): 7 files passed, 41 tests passed (includes the saved-profile store).
- Full frontend run (`npm test -- --watch=false`): 68 files passed, 403 tests passed, 1 existing test skipped.
- Production build passed; only the three existing SCSS budget warnings remained.
- Architecture audit found no FormGroup construction, HTTP orchestration, subscriptions or body-measurement state in `profile.page.ts`; core data-access has no feature/UI import.
- No browser storage, backend, database, schema or endpoint implementation was added.
- Recovery verification covers ProblemDetails field-path mapping (birthYear → ageYears), trace/code references, accessible summary/input links, binary-inexact decimal validation, explicit conflict/unknown-outcome refresh/review without replay, preservation of newer drafts, and late-read suppression on identity reset.
- Route destruction clears the draft and resets entry state even when the route provider instance is reused. Query failures remain separate from mutation failures.
- Browser visual/keyboard/200%/400% zoom/reduced-motion checks and live backend integration were not run; component DOM tests and production compilation do not substitute for those checks.

## Implementation Notes

### Existing code involved

Audited current files (paths relative to the frontend repository):

- `src/app/features/profile/profile.page.ts`
- `src/app/features/profile/profile.page.html`
- `src/app/features/profile/profile.page.scss`
- `src/app/features/profile/profile.page.spec.ts`
- `src/app/features/profile/profile.routes.ts`
- `src/app/core/shared/data-access/STATE_ARCHITECTURE.md`
- `src/app/core/shared/data-access/generic-template/entity-cache-store.ts`
- `src/app/core/session/session-reset.token.ts`
- `src/app/core/shared/data-access/user/user_auth.api.ts`
- `src/app/core/shared/data-access/user/user.store.ts`

Earlier-phase files to extend, not falsely assumed present at the audited snapshot:

None. Do not create speculative files for future phases.

The [File Manifest](../README.md#implementation-file-manifest) names first creator and subsequent editors. Preserve existing project/namespace conventions. Consult [repository audit](../README.md#preserved-repository-audit) before adapting changed source.

### Database changes

No frontend phase writes SQL or changes schema. Backend prerequisites below own persistence.

### Backend changes

NP01/NP02 contracts and server eligibility/ownership are B04. Client validation is assistance only; render returned field errors. No additional profile fields or plan recalc endpoint.

### Frontend changes

Implement the exact core files and separate feature flow/form/UI files listed above. Core owns HTTP, DTOs, confirmed state, synchronization and reusable use cases. Feature state owns only temporary drafts/selection/tasks. Pages/components bind readonly view models and emit intent; no HttpClient/API injection, server-data arrays, request orchestration or nutrition math in page.ts. This phase’s concrete flow below defines the boundary crossings.

### Business rules

- Use metric labels cm/kg and Age this year, not exact age or date-of-birth.
- All four fields required for save; request adult confirmation when derived age18.
- No automatic target recalculation; explain saved values can be reused by later plan setup.
- Core data-access must not import shared UI form controls/factory.
- Profile page.ts has no FormGroup construction, HTTP subscription or body-measurement signals.

### Security / ownership

Session derives the owner. Join item→meal→day→user for child IDs; also match route date where supplied. Current requires scoped plan plus composite FK. A route guard/disabled button is never authorization. All unsafe browser calls use E-005 CSRF transport/validation and exact allowed API boundary. Use Dapper parameters, strict DTOs and named enum codes; escape displayed text through normal Angular binding. Pure calculation/GETs do not create persistent state.

### Transactions

The browser never emulates a transaction with several persistence calls. Each completed W action is one core-coordinated backend command. Core sends the originating reviewed revision and consumes the atomic receipt once. Temporary UI overlays do not mutate confirmed stores. Copy Week is one command, not seven Copy Day calls. The paired backend phase owns database atomicity; do not weaken it to simplify UI.

### Out of scope

All other phase implementations unless explicitly listed as modifications; no broad migration of unrelated stores/services. No Templates, persisted weeks, target/recipe snapshots, fractional servings, flexible ingredients, recommendations, training-day model, recovery modifier, shopping list, batches or reusable foods/meals. Do not add a generic state/transaction framework as a substitute for the concrete slice.

### Common implementation mistakes

- Writing wizard draft to global profile per step
- Mixing username/image DTO with nutrition profile
- Form factory inside page.ts
- Double cache in profile feature
- Inferring calculation sex from identity

## Dependencies

F02c; B04; existing Profile page basic data must remain intact.

Mandatory accompanying contracts: [Decisions](../README.md#approved-decisions), [API](../README.md#canonical-api-contracts), [Data Model](../README.md#canonical-database-model), [Architecture](../README.md#shared-system-architecture), and [Frontend Data Flow](Phase_F01_core_contracts_and_shell.md#shared-frontend-architecture). Calculator phases also read [Nutrition Policy](../README.md#nutrition-calculation-policy). These are normative contract sections, not optional background. If a prerequisite is absent, implement that prerequisite first; do not bypass it with local component state, a new API, or an unsafe database reset.

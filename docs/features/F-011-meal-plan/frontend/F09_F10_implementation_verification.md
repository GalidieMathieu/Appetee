# F09/F10 frontend implementation and verification

Recorded 2026-10-13 (America/Denver). Frontend only; backend, schema, deployment and hosting were not changed. Existing F01–F08, E-002 and E-005 worktree changes were preserved.

## Implemented scope

- Meal editor, explicit New Meal, rename autosave (Enter/blur/600 ms valid idle), saved-meal deletion and retained saved-empty dates.
- Virtual editor/picker open and cancel are read-only. First mutation persists only the selected slot; synchronized `createdMealId` replaces the virtual selector. Malformed creation receipts without that confirmed identity are treated as unknown outcomes, not guessed identities.
- Independent Search/Saved recipe picker using `GET /api/recipes/meal-plan`, `RecipeCardAdvance`, existing lazy preview and confirmed In meal membership. Add is one whole serving; quantity is absolute integer 1–20; Remove is explicit, including unavailable recipe items. Duplicate additions do not increment/upsert.
- Versioned name/quantity drafts and latest-unsent coalescing. Old acknowledgements cannot erase newer input. Nutrition, totals, targets and remaining values are server-confirmed only; no pending-quantity nutrient arithmetic.
- Save/Stay/Discard navigation decisions, waiting for already-sent mutations, browser Back protection, focus restoration and advisory native unload warning. Discard cancels only unsent work, including during dialog closing; it is not rollback.
- Validation feedback and error-summary links, polite settled save announcements, clear unavailable-service feedback, and explicit refresh/review after failures/conflicts/unknown outcomes. A confirmed `csrf_invalid` rejection is distinguished from transport/5xx/timeout uncertainty. No mutation replay and no adoption of a newer GET revision without explicit review.
- Generation/reset protection for late responses, scoped picker queries and temporary navigation aliases. No browser-persisted drafts, token state or mutation queue.

## Approved routes and ownership

| Browser URL | Purpose and selection |
|---|---|
| `/meal-plan/planner?date=YYYY-MM-DD&task=day` | Day context; neither selector |
| `/meal-plan/planner?date=YYYY-MM-DD&task=meal&mealId=123` | Saved meal editor |
| `/meal-plan/planner?date=YYYY-MM-DD&task=meal&defaultSlot=2` | Untouched virtual editor |
| `/meal-plan/planner?date=YYYY-MM-DD&task=recipe-picker&mealId=123` | Saved meal picker |
| `/meal-plan/planner?date=YYYY-MM-DD&task=recipe-picker&defaultSlot=2` | Untouched virtual picker |

`meal` and `recipe-picker` require exactly one selector, never both. Positive signed-INT IDs and slots 1–8 must resolve against the accepted loaded day. Invalid/duplicate/missing/unavailable selections normalize to valid day context without mutation. Picker Back returns to the same date's meal editor; after virtual Add it uses the receipt's confirmed meal ID. No API `task` field or task persistence is introduced.

Core owns APIs, typed models, confirmed data, synchronization, write coordination and applied picker query/results/cursors/request state. Separate feature state files own temporary selection/history aliases, unsent search/tab intent and scalar overlays. Pages/presentational components bind readonly projections and emit intent; they do not subscribe to APIs, cache server DTO arrays, own forms or calculate nutrition. Picker classes are Core files with workspace-scoped providers; main Recipes query/cursor state is not reused.

The existing shared shell header, section tabs and single Create Nutrition Plan chooser remain unchanged across tasks. Desktop uses day context plus editor/picker; narrow layouts use one active task and Back.

## Changed source files

Paths below are relative to `appetee_front`. Each new UI component also has its `.html`, `.scss` and `.spec.ts` companions unless noted.

Core:

- `src/app/core/shared/data-access/meal-plan/meal-plan-mutation.model.ts`: planner result metadata after synchronization.
- `src/app/core/shared/data-access/meal-plan/meal-planner.facade.ts`: coordinated create/rename/delete/add/quantity/remove and confirmed-ID validation; existing reads preserved.
- `src/app/core/shared/data-access/meal-plan/meal-plan-mutation-coordinator.ts` and `.spec.ts`: paused-lane navigation settlement and uncertain 5xx outcome classification; no replay.
- `src/app/core/shared/data-access/recipes/recipe-search.ts`: shared pure normalization; `src/app/core/shared/ui/recipe-search-bar/recipe-search.ts` remains a compatible re-export.
- `src/app/core/shared/data-access/recipes/picker/recipe-picker.store.ts`, `recipe-picker.facade.ts` and their specs: independent scoped query state.

Feature/UI:

- `src/app/features/meal-plan/models/meal-plan-workspace.model.ts`: picker task.
- `src/app/features/meal-plan/state/meal-plan-workspace.state.ts` and `.spec.ts`: route validation and temporary confirmed-ID aliases.
- `src/app/features/meal-plan/state/meal-plan-workspace.facade.ts` and `.spec.ts`: draft/navigation/action orchestration.
- `src/app/features/meal-plan/state/meal-editor-draft.state.ts` and `.spec.ts`: temporary versioned scalar overlays.
- `src/app/features/meal-plan/state/recipe-picker.state.ts` and `.spec.ts`: unsent search/tab intent.
- `src/app/features/meal-plan/state/meal-plan-writing.spec.ts`: real Core lane/sync with test-only API responses for races, sparse identity, deletion, failures and navigation.
- `src/app/features/meal-plan/guards/meal-plan-pending-changes.guard.ts` and `.spec.ts`; `src/app/features/meal-plan/meal-plan.routes.ts`: scoped providers and query/task deactivation protection.
- `src/app/features/meal-plan/planner/meal-editor.component.*`, `autosave-status.component.*`, `recipe-picker.component.*`, `recipe-picker-row.component.*`: new presentation.
- `src/app/features/meal-plan/planner/planner-decision.dialog.ts`: shared presentation-only decision dialog with inline template/styles.
- `src/app/features/meal-plan/planner/meal-planner.page.*`, `selected-day-panel.component.*`, `week-strip.component.*`, `nutrition-summary.component.*`: composition, compact context, New Meal and honest unknown values; existing test fixtures updated for editor dependencies.
- `src/app/app.config.ts`: router `canceledNavigationResolution: 'computed'`. This preserves the parent history entry after a guard's Stay decision; it does not change HTTP/auth configuration.
- `e2e/meal-plan-planner.spec.ts`; `playwright.meal-plan-ui.config.ts`: test-only API interception and targeted browser coverage, retaining earlier UI tests.

Documentation: feature README, F08 route cross-reference, F09/F10 phase statuses/routes and this verification record. Backend phase implementation statuses are owned by backend work, not inferred from these tests.

## UI references and intentional differences

Inspected `assets/references/01_meal_planner_main.png`, `02_meal_editor.png`, `03_recipe_picker.png` and `11_header_reference.png`. Reused `src/styles` text, input and button classes plus Appetee color/border/radius tokens. White surfaces, compact task panels, selected day/meal context, serving controls, row hierarchy and confirmed total panels follow the references. Horizontal week-strip scrolling and vertical full-meal overflow are intentional.

Planner item DTOs do not supply recipe images/time/description: editor rows use theme icons and confirmed available fields rather than per-item detail calls or invented data. Picker cards do supply these fields and render them. Unknown nutrients remain an accessible em dash, not zero. Reference-only Add Manual (F11), reorder (F12), Copy (F13/F14), Templates, Recent and Recommended controls were not added.

## Actual verification

From `C:\Users\galid\Documents\Appetee\appetee_front`:

```powershell
$env:VITEST_MAX_WORKERS = '1'
npm test -- --watch=false
npm run build
npx playwright test --config=playwright.meal-plan-ui.config.ts
git -c core.whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol diff --check
```

- Full frontend unit suite: **666 passed, 1 existing skip, 116 files**. Existing admin-tests `allowSignalWrites` deprecation warnings remain.
- Production frontend build: **passed**. Initial bundle **525.02 kB**, warning against 500 kB; Meal Plan lazy chunk **221.52 kB**. Three existing SCSS budget warnings remain: recipes list **5.00 kB**, admin recipes **7.45 kB**, cooking mode **7.33 kB** against 4 kB each. Budgets and test limits were not increased.
- Final Chromium test-only browser suite: **17 passed**. Eight editor/picker/navigation/reflow journeys plus nine previous dashboard/wizard/editor/shared-header journeys. Includes desktop/mobile addition/quantity/removal, virtual GET-only cancellation and confirmed ID, delayed rename/discard, conflict refresh without replay, saved-empty reload, browser Back Stay/Discard and trigger focus.
- Reflow assertions passed at **320, 360, 390, 768, 1024 and 1440 px** with a full 20-item meal and reduced-motion emulation. No page-width overflow; intentional week-strip overflow remains contained. Mobile picker heading is asserted clear of the existing sticky header.
- Desktop 1440 px/mobile 390 px captures inspected: `test-results/meal-plan-ui/f09-editor-desktop.png`, `f09-editor-mobile.png`, `f10-picker-desktop.png`, `f10-picker-mobile.png`. Captures contain synthetic test-only fixtures, not production fallback content.
- Ownership inspection found no production Core imports of feature/Router/Material/UI modules and no planner page/component HTTP/API subscriptions or FormGroups. Tracked frontend/docs whitespace checks passed with repository CRLF accounted for.

Earlier development runs exposed draft-binding reactive feedback, discard-during-close and browser Back history issues; those were corrected and rerun. An early browser server-start timeout was not a pass. Existing dependency mocks and one newly added duplicate test's recipe ID were corrected to match the actual fixtures. Final results above supersede those failed/interrupted attempts; no live backend outcome is implied.

## Remaining integration/release requirements — not run

- Exercise deployed B01/B08/B09/B10 endpoints with a real authenticated browser/account: sparse materialization, atomic receipts and IDs, duplicates/limits, retained empty dates and unavailable recipes.
- Verify real E-005 cookies/credentials, allowed-origin CORS/CSRF, session expiry/account changes, two-tab conflicts, transport uncertainty and slow writes. Local intercepted HTTP requests are not browser-security deployment acceptance.
- Complete actual browser 200%/400% zoom, screen-reader/live-region/keyboard acceptance and supported cross-browser checks. Viewport reflow and reduced-motion emulation do not substitute for these.
- Ensure paired backend/security deployment before releasing enabled write entry points. Frontend failures are visible and do not substitute mock responses in the application.
- F11 onward and F15 release acceptance remain outside this implementation. No manual-food editor, ordering or copying was implemented.

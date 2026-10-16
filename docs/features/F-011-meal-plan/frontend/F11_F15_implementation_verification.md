# F11–F15 frontend implementation and verification

Recorded 2026-10-15 (America/Denver). Frontend only. Backend endpoints, source, schema, deployments and hosting were not changed. Existing F01–F10, E-002 and E-005 worktree changes were preserved.

F11–F14 are implemented locally against documented APIs. F15 automated frontend coverage and scoped fixes are implemented, but **F15 is not release-complete**: live backend/security and manual accessibility gates remain unverified.

## Approved routes and behavior

| Browser URL/task | Contract |
|---|---|
| `/meal-plan/planner?date=YYYY-MM-DD&task=manual&mealId=123` | Add to a saved meal |
| `/meal-plan/planner?date=YYYY-MM-DD&task=manual&defaultSlot=2` | Add to a virtual slot; opening/typing/cancelling creates nothing |
| `/meal-plan/planner?date=YYYY-MM-DD&task=manual&mealId=123&itemId=456` | Edit; item must be manual and belong to the accepted loaded meal/date; `defaultSlot` rejected |
| Existing `day`, `meal`, `recipe-picker` | Preserved; no backend `task` parameters added |
| Copy Day / Copy Week | Real Material dialogs over the existing planner route, not new routes |

Manual Add requires exactly one meal selector. Edit requires `mealId` and `itemId`. Positive signed-INT IDs, slots 1–8, valid local calendar dates and nonduplicated parameters are checked before resolving selection against Core data. Invalid item subtype/membership never produces a write or invented entity. Back/Cancel returns to the same meal with dirty/failed explicit-draft protection and trigger focus restoration. Successful virtual Add uses the synchronized receipt's `createdMealId`.

Manual values are the whole entry: name 1–120 Unicode scalars, calories 0.01–20000, each macro 0.01–5000, all required, finite and at most two decimals. No quantity, per-field autosave, calorie-equality calculation, rounding/clamping or cached-DTO form binding. Explicit Add/Update is one Core-coordinated command. Errors preserve fields/base revision; refresh alone does not authorize retry. Summary links focus fields locally without navigating against the app's base href.

The manual task displays “Save with Add or Update”, not the meal-name autosave badge; it cannot claim that an unsent manual form is saved. Deliberate invalid submissions/new server errors focus the summary after rendering, while subsequent field correction does not steal focus.

Meal/item ordering uses CDK handles plus visible, named Move up/down buttons. Only temporary complete ID overlays change during interaction; no HTTP during pointer motion and no mutation for unchanged/invalid moves. One completed move sends a full membership permutation through Core. Virtual/cross-parent movement is disabled. Failed order restores confirmed state, with position/status announcements and focus on the moved control or row while controls are disabled.

Copy review pins source/destination snapshots in Core after writes settle. Dates, jointly reviewed revision, acknowledgement and presentation feedback remain feature-owned; server graphs and request state do not. A newer destination cannot bless an older source: both are reloaded once, then review is refused if still inconsistent. Review identifies actual dates, saved-empty/absent distinctions, destination meal/item counts, expandable meal/food labels and absent-source clearing. Persisted destinations need replacement acknowledgement. Changing destination/context or closing/rejection revokes consent. Copy Week is exactly one MP13 command, never seven Copy Day calls. Core rejects incomplete destination receipts as unknown without partial adoption.

Confirmed `csrf_invalid` rejection is distinct from transport/5xx/timeout uncertainty. No automatic mutation replay or substitution of a newer GET revision. Closing an uncertain copy retains visible reconciliation and disabled writes. Already-sent explicit actions settle before navigation; their success callbacks do not override the user's chosen destination. Session reset clears scoped drafts/aliases/overlays/consent and rejects late identity results.

## Changed frontend files

All source paths below are relative to `appetee_front`. Existing files were extended, not duplicated.

Core:

- `src/app/core/shared/data-access/meal-plan/meal-planner.facade.ts`: manual, ordering, copy use cases; bounded joint review using existing keyed Core ranges; complete copy/create receipt checks; single-response HTTP completion to release timeouts/subscriptions.
- `src/app/core/shared/data-access/meal-plan/meal-planner.facade.spec.ts`; new `meal-planner-copy.spec.ts`: response cleanup, revision races, bounded reads, reset and partial-receipt protection.
- Existing `MealPlannerApi`, DTOs, coordinator, synchronization service, root stores and auth/CSRF transport are reused. No additional API client or endpoint was introduced.

Feature models/forms/state:

- New `src/app/features/meal-plan/models/manual-item-draft.model.ts` and `copy-intent.model.ts`.
- New `src/app/features/meal-plan/forms/manual-item-form.factory.ts`.
- New `src/app/features/meal-plan/state/manual-item-draft.state.ts`, `meal-plan-ordering.state.ts`, `copy-flow.state.ts` and their specs.
- Extended `state/meal-plan-workspace.facade.ts`, `state/meal-plan-workspace.state.ts`, their specs and `state/meal-plan-writing.spec.ts`.
- Extended `models/meal-plan-workspace.model.ts` and `meal-plan.routes.ts` for approved manual selection and workspace-scoped providers. No duplicate root registrations.

Presentation:

- New `planner/manual-item-editor.component.*`, `copy-day-dialog.component.*`, `copy-week-dialog.component.*`, including templates/styles/specs.
- New `planner/field-error-link.directive.ts` and `.spec.ts`: UI-only local field focus.
- Extended `planner/meal-planner.page.*`, `meal-editor.component.*`, `selected-day-panel.component.*` and `meal-row.component.scss`: composition, manual actions, drag/move controls, compact context, long-name reflow and post-render focus.
- Extended `nutrition-plans/easy-plan-create.page.ts/.html`, `nutrition-plan-edit.page.ts/.html` and `nutrition-plan-wizard.page.ts/.html` only for local error links.
- `src/styles/_button.scss`: reusable explicit-action shape; `_theme.scss` and `src/styles.scss`: scoped accessible orange/foreground variants, focus and reduced-motion styling. Bright Appetee brand orange remains available outside these readable action/text variants.
- `src/app/core/layout/private-layout/private-header.component.scss`: accessible active-navigation foreground; existing single Meal Plan links preserved.
- Home `home-feature-availability.ts`, `home.page.spec.ts`, `components/meal-plan-empty-state/meal-plan-empty-state.component.ts/.html/.spec.ts`: enable the existing frontend route CTA and accurate entry text. No upcoming-meal HTTP/cache/UI was added.

Browser verification:

- Extended `e2e/meal-plan-planner.spec.ts`; new `e2e/meal-plan-nutrition-plans.spec.ts`, `meal-plan-concurrency.spec.ts`, `meal-plan-accessibility.spec.ts`.
- Test-only `e2e/fixtures/meal-plan.fixture.ts` and `manual-form.fixture.ts` extract/extend synthetic fixtures. No application fallback/mock data.
- Extended `playwright.meal-plan-ui.config.ts` to include all five Meal Plan suites, retaining earlier `meal-plan-ui.spec.ts` coverage. Its chooser keyboard check now waits/asserts Material's initial autofocus before Tab instead of racing it with forced focus. Default `playwright.config.ts`, timeouts/retry limits and application build budgets were not increased or changed.

Documentation: feature README, F11–F15 phase files and this record. Backend phase statuses are maintained separately and are not inferred from frontend tests.

## Visual/ownership evidence

Inspected `assets/references/01_meal_planner_main.png` and `02_meal_editor.png` (and reused the established shared-header composition). White compact day/task panels, warm accents, add actions, manual units and copy review use Appetee `src/styles` text/input/button classes and theme variables. Desktop retains day context; narrow layouts use one task with Back. Copy dialogs scroll inside the viewport for seven dates. No meal times, recipe thumbnails absent from planner DTOs, templates, recommendation controls or future foods dashboard were invented.

Ownership searches found no production feature/Router/Material/UI imports from Core data-access, and no UI/page API subscriptions, HttpClient/API injection or owned FormGroups. The existing profile-step form type input is a controlled input, not form ownership. Feature DTO-to-label/count mapping is presentation only; no frontend nutrition summation/calculation was added.

## Actual verification

Commands run from `C:\Users\galid\Documents\Appetee\appetee_front`:

```powershell
$env:VITEST_MAX_WORKERS = '1'
npm test -- --watch=false
npm run build
npx playwright test --config=playwright.meal-plan-ui.config.ts
npx playwright test --config=playwright.meal-plan-ui.config.ts --output=test-results/meal-plan-final-focused --grep="manual explicit Add/Edit|manual keyboard errors|200 percent text|primary action contrast"
git -c core.whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol diff --check
```

- Final full frontend unit suite: **735 passed, 1 existing skip, 124 files**; exit 0. Existing admin-test `allowSignalWrites` deprecation messages remain. All test files passed without unhandled errors on the final serial run. The final added focus regression verifies feedback does not steal focus during field correction.
- Final production build: **passed**, initial bundle **527.36 kB** against 500 kB warning; Meal Plan lazy chunk **318.36 kB**. Three existing 4 kB SCSS warnings remain: recipes list **5.00 kB**, admin recipes **7.45 kB**, cooking mode **7.33 kB**. Budgets were not relaxed. Build outputs are not deployed.
- Complete mocked Chromium suite: **36 passed** on the clean rerun (1.3 minutes), including pending explicit-save navigation, long-name day/dialog reflow, corrected chooser focus timing and all earlier UI journeys. After the final manual-only save-label refinement, the full unit/build check passed again and **all 5 focused manual/accessibility browser checks passed** (27.3 seconds), including both desktop/mobile explicit Add/Edit and save-label assertions. The focused run uses a separate output directory to retain the full-suite artifacts.
- Covered automated paths include manual required/range/precision/Unicode validation, no writes on open/cancel, explicit Add/Edit and virtual confirmed IDs, dirty/failed drafts, drag versus keyboard payloads, failure overlays, joint copy-version races, one seven-day command, saved-empty versus absent clearing, two stale tabs, confirmed CSRF rejection versus uncertain failures, central session expiry and prior plan/wizard/editor/picker behavior.
- Browser scenarios also cover 320/360/390/768/1024/1440 px, maximum item counts, long names, reduced-motion emulation, local linked errors, visible/unobscured focus and a computed primary-action contrast threshold of 4.5:1. The 200% check enlarges root text; it is **not** a claim that actual browser 200%/400% zoom was manually tested.
- Tracked frontend/docs whitespace checks passed with repository CRLF accounted for. No database/reset/migration test was executed.

Inspected captures under `test-results/meal-plan-ui/`: `f11-manual-desktop.png`, `f11-manual-mobile.png`, `f13-copy-day-desktop.png` and `f14-copy-week-mobile.png`. Desktop/week captures are also generated by their scenarios. The seven-date mobile dialog uses internal scrolling; the screenshot is not a claim that seven rows fit without scrolling. These artifacts use synthetic fixtures only.

Earlier development attempts were not all passes: initial focus restoration, base-href error navigation, fixture selection/button labels and a nested-list test selector were corrected and rerun. A concurrent long full run passed assertions but reported three unhandled timeout errors from still-open controlled HTTP Subjects; completing the single HTTP response in Core removed those subscriptions/timers, with a regression test and clean final unit rerun. A later browser rerun had 35 passes and one existing chooser-Tab focus race; that test now asserts initial autofocus before proceeding. Intermediate hot-reload/compile output is not final verification. Test limits and unrelated assertions were not relaxed to hide failures.

## Unrun release gates — keep pending

- Real authenticated B01/B08–B15 integration, including both manual endpoints, complete membership checks, copy atomicity/rollback, database counts and unavailable-source rejection. Synthetic fixture behavior is not backend proof.
- Deployed E-002/E-005/E-008 prerequisites: canonical authoring authorization, actual cookie/CORS/CSRF/session/account-change behavior, migration safety and isolated database evidence. No production/staging account or DB was used.
- Actual browser 200%/400% zoom, supported cross-browser coverage, manual keyboard/screen-reader announcements, complete contrast audit and assistive-technology release acceptance. Automated Chromium semantics/text enlargement do not replace those checks.
- Full live NP01–NP10/MP01–MP13 journeys and real two-session races, late/ambiguous commits and backend fault-injection/rollback agreement.
- Review the existing initial-bundle and unrelated SCSS warnings before release. Local header/Home availability is not permission to deploy write entry points before paired backend/security readiness.

Do not mark F15 or the overall feature release-complete until the remaining gates have actual evidence.

## Planner/editor reference alignment — 2026-10-15 (Denver)

Frontend-only visual follow-up against `01_meal_planner_main.png` and `02_meal_editor.png`:

- Full-width day view with horizontal meal identity, food rows, confirmed per-item nutrition and meal totals; compact selected rows alongside the editor on desktop.
- Calendar badge, compact four-color daily metrics/progress, expandable signed server remaining details, selected-day cards, quieter row dividers, dashed New Meal/Copy Day footer and muted page backdrop.
- Editor heading/delete action, aligned recipe name/quantity/nutrition/remove columns, outlined add actions and compact Meal Total panel. Mobile uses a single active task; ordering controls, autosave, explicit manual writes, pending/error handling and Back remain available.
- The existing shared Meal Planner/Nutrition Plans header and single Create Nutrition Plan button remain unchanged. No duplicate Meal Plan title was reintroduced.
- Palette additions live in `src/styles/_theme.scss`; shared button/input/text primitives are reused. Explicit form/dialog actions use the existing accessible-orange token through `_button.scss`; the bright brand/navigation color is preserved.
- MP01 does not include food image URLs or meal times. Neutral existing Material icons are used instead of fabricated photos; no times, fields, client/API or backend endpoints were added. No production mocks were introduced.

Changed frontend files: `meal-plan-shell.page.scss`; planner `meal-planner.page.{ts,html,scss}`, `week-strip.component.{html,scss}`, `selected-day-panel.component.{ts,html,scss}`, `meal-row.component.{ts,html,scss}`, `meal-editor.component.{ts,html,scss}`, `nutrition-summary.component.{ts,html,scss,spec.ts}`; shared `_theme.scss`/`_button.scss`; new `e2e/meal-plan-reference.spec.ts` and its registration in `playwright.meal-plan-ui.config.ts`. Core contracts, stores, write coordination, authentication and backend files were not changed by this visual follow-up.

Actual verification:

```powershell
$env:VITEST_MAX_WORKERS = '1'
npm test -- --watch=false --reporters=dot
npx playwright test --config=playwright.meal-plan-ui.config.ts
npx playwright test --config=playwright.meal-plan-ui.config.ts meal-plan-reference.spec.ts --output=test-results/meal-plan-reference-final
npm run build
```

- Complete unit rerun: **747 passed, 1 existing skip, 125 files; exit 0**, with no unhandled errors. A preceding concurrent unit/build attempt passed all assertions but reported one unhandled RxJS timeout while the Home facade file was running; the cause was not established, no unrelated production code was changed, and the independent rerun was clean. Existing admin-test deprecation notices remain.
- Complete mocked Chromium run: **42 passed** (1.9 minutes), including the shared header/dashboard, editing, ordering, copy, failure/session, responsive and contrast checks. An earlier run caught the existing white-on-bright-orange action contrast failure; the shared explicit-action style was fixed and the complete rerun passed.
- After final week-card width/wrapping refinement, **4 reference tests passed** at 1672/1440/390/320 px. The final checks include no clipped day-card text, full-width desktop day layout, aligned two-pane editor, target details, reachable actions, no page overflow and no writes from navigation.
- Final production build: **passed**; initial bundle **527.71 kB**, Meal Plan lazy chunk **336.37 kB**. Existing 500 kB initial and three unrelated SCSS warning categories remain; no new planner component style warnings and no relaxed budgets.
- Scoped touched-file whitespace check passed. The broader dirty worktree contains pre-existing whitespace findings in unrelated auth/header/admin files; those edits were preserved.

Generated and visually inspected synthetic-data captures: `test-results/meal-plan-ui/reference-planner-{1672,1440,390,320}.png` and `reference-editor-{1672,1440,390,320}.png` (desktop and mobile samples inspected). The lack of real food photos is a documented API-data limitation, not a fake image integration. These are local Chromium checks, not live backend, cross-browser, actual zoom, screen-reader or deployment acceptance. The pending release gates above remain pending.

### Day-panel density correction — 2026-10-15 (Denver)

Following the user's additional reference review, the day header now responds to its actual panel width rather than a viewport breakpoint that stacked date/nutrition at laptop widths. The full-width day keeps its date and all four daily metrics on one centered horizontal row at 1024/1280/1440/1672 px; genuinely narrow panels still reflow. The Details disclosure is removed entirely. Signed server remaining information is retained as screen-reader text in each daily metric, not as an extra visible row or another control. This supersedes the expandable-details presentation described above.

Reduced day-header, meal-row and footer padding, icon sizes, week-date typography and card height without fixed-height clipping or shrinking the entire application. Week cards are approximately 86 px tall, and the reference's three-meal desktop day panel is approximately 554 px tall (previous capture approximately 653 px). Ordering controls remain visible and operational. Existing theme tokens and shared typography/button/input styles remain in use; the shared header and all Core/backend contracts are unchanged.

Changed files in this correction: planner `selected-day-panel.component.scss`, `meal-row.component.scss`, `meal-planner.page.scss`, `week-strip.component.{html,scss}`, `nutrition-summary.component.{html,scss,spec.ts}` and `e2e/meal-plan-reference.spec.ts`.

Actual checks:

- `$env:VITEST_MAX_WORKERS='1'; npm test -- --watch=false --include='src/app/features/meal-plan/**/*.spec.ts' --reporters=dot`: **205 passed, 44 files**, exit 0. The full unrelated unit suite was not rerun for this correction.
- `npx playwright test --config=playwright.meal-plan-ui.config.ts meal-plan-reference.spec.ts`: **7 passed** at 1672/1440/1280/1024/768/390/320 px. New assertions verify date/metric alignment, no Details control, shallow cards/header, complete laptop week visibility, desktop day aspect ratio/height and meal-row density. Earlier density runs caught wrapped week-card statistics increasing every card's height; spacing was corrected, not the test bounds.
- `npx playwright test --config=playwright.meal-plan-ui.config.ts`: **45 passed**, 1.8 minutes, including all seven revised reference checks and existing editing, ordering, copy, security-error, focus, responsive and shared-header journeys.
- `npm run build`: **passed**, initial **527.45 kB**, Meal Plan lazy chunk **336.25 kB**. Existing initial-bundle and unrelated SCSS warnings remain; budgets unchanged.
- Scoped whitespace check passed. Final planner captures at desktop, laptop and narrow mobile widths were visually compared with `01_meal_planner_main.png`; screenshot artifacts use the existing `reference-planner-<width>.png` / `reference-editor-<width>.png` paths. No live backend, browser deployment or additional release gates were verified.

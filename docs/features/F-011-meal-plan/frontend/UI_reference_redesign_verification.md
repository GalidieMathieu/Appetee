# F-011 reference-driven frontend UI redesign

Date: 2026-10-13. Scope: frontend presentation only; no backend, migration, API, nutrition algorithm, DTO, route or persistence changes. Includes the subsequently requested shared header and Easy/Intermediate entry chooser.

## Design implementation

All seven original images in `assets/references` were visually inspected before editing. Existing `src/styles/_theme.scss`, `_text.scss`, `_button.scss`, `_input.scss` and similar application controls were inspected and reused. Layout additions use existing color/radius tokens, shared typography and button/input classes. No new UI framework, bitmap assets or large orange page background was introduced.

| Reference | Implemented composition | Final capture stem |
|---|---|---|
| 04 Nutrition Plans | Title and creation actions aligned across the header; underlined section tabs; three-column cards, icon/title/current badge, metadata chips, four target cells and meal-structure/action footer | `04-nutrition-plans` |
| 05 Profile | Centered wizard, five numbered connected steps, grouped two-column sex/age/height/weight fields with units, separated Back/Cancel and Continue actions | `05-profile` |
| 06 Goal | Six full-width icon/title/description rows with native radio selection and selected/focus states | `06-goal` |
| 07 Activity | Four native radio rows, activity icons and existing policy descriptions | `07-activity` |
| 08 Meal Structure | Count tiles with dot groups, number and meal/day caption; selection remains native-radio accessible | `08-meal-structure` |
| 09 Review | Plan-name band, four labeled summary rows with Change actions, server-calculated target block and prominent creation action | `09-review` |
| 10 Edit | Stacked name/profile/goal/activity/meal sections on the left; compact shared controls; target sidebar with decorative rings, saved/preview distinction and Save/Cancel actions | `10-edit` |

The wizard uses one maximum width and progress/navigation composition throughout. Narrow layouts stack cards and fields, retain native input labels and error links, and permit vertical scrolling. Native radios support Space/arrow selection; selected states are not color-only. Existing error summaries, heading focus, pending states, explicit review and draft navigation protections remain.

The Meal Plan header entry is available on desktop/mobile independently of catalogue-administration permissions. Navigation contains a single entry per menu. Mobile menu layering and desktop spacing accommodate it. Planner and Nutrition Plans now share the same shell-owned top bar: the compact Your fueling, made simple eyebrow, Meal Planner/Nutrition Plans tabs, and one Create Nutrition Plan button. Visible page titles and the planner's previous Your week, at a glance heading are removed; visually hidden headings preserve page labeling and focus handling. Switching tabs leaves the bar's dimensions/content unchanged except for the active tab. The top bar is hidden over creation/edit tasks. A feature-scoped body rule prevents viewport-height clipping of long forms without altering other pages' scrolling or theme.

Create Nutrition Plan opens the user-provided two-card choice dialog. Easy routes to the existing Easy form; Intermediate routes to the existing profile step. Opening/selecting the dialog never creates either plan. The dialog is keyboard accessible, dismissible with Escape/Close, traps focus and restores the trigger on cancel. The confirmed 50-plan cap blocks entry; duplicate opens are coalesced. Empty state refers to this same top action rather than adding another pair of creation links. Entry coordination is in feature-owned NutritionPlanEntryFacade; no Core API client or server-backed data was duplicated.

### Intentional differences from static references

- White Appetee surface replaces the reference background. Existing header/theme remain; the unrelated edit-reference sidebar, notifications and global search were not introduced.
- Easy and Intermediate creation keep their separate working routes behind the single-button chooser, superseding the original two dashboard links. There is no Advanced mode, invented plan description, dashboard search, duration or other unsupported data field.
- Meal count retains all eight supported values, not just the six shown in the static reference.
- Easy cards do not invent macro targets. Null nutrients remain accessible Unknown values, not zero.
- Activity wording remains the existing policy wording, not invented PAL/exercise mappings.
- Edit recalculation remains deliberate, never automatic. Targets, resting/maintenance estimates, policy/year and warnings remain server-authored. Decorative rings are hidden from accessibility APIs and do not represent calculated percentages.
- Editing retains required plan-name and current-profile actions and explicit conflict/uncertain-outcome review. These contract-required controls account for additional height compared with the static edit reference.

## Changed frontend areas

- `src/app/features/meal-plan/nutrition-plans`: dashboard/cards, wizard, editor and five shared steps.
- Added shared `_plan-ui.scss` composition mixins and `nutrition-targets.component.*`; compact edit selectors reuse the same form controls as creation.
- `src/app/core/shared/ui/nutrition-profile-form`: plan-context grouping, compact editing, unit suffixes and selected states; original profile validation/save behavior retained.
- `src/app/features/meal-plan/meal-plan-shell.page.*`, private header and `src/styles.scss`: navigation composition and feature-scoped scrolling.
- Added target/compact-selector/navigation regression coverage, `e2e/meal-plan-ui.spec.ts` and `playwright.meal-plan-ui.config.ts`.
- Shared-header follow-up adds `plan-create-choice.dialog.*` and `state/nutrition-plan-entry.facade.*`, updates planner/dashboard headings and adjusts routed creation/focus tests.

Core API clients, confirmed stores, flow calculations/coordination, DTOs and form data models were not redesigned. Existing E-002, E-005 and unrelated working-tree changes were preserved.

## Actual verification

Run from `appetee_front`:

```powershell
$env:VITEST_MAX_WORKERS = '1'
npm test -- --watch=false --include='src/app/features/meal-plan/**/*.spec.ts' --include='src/app/core/shared/ui/nutrition-profile-form/*.spec.ts' --include='src/app/core/layout/private-layout/private-header.component.spec.ts'
npm test -- --watch=false
npm run build
npm run e2e -- --config=playwright.meal-plan-ui.config.ts
```

- Initial redesign focused regression: **116 passed, 29 files**. Latest full regression including the shared-header/chooser follow-up: **637 passed, 1 existing skip, 106 files**.
- Production build: **passed**. Initial bundle **515.37 kB**, above the existing 500 kB warning budget; three existing SCSS warning budgets also remain (cooking mode, recipes list, admin authoring). No budgets or test timeouts changed; no new Meal Plan component-style warning.
- Chromium UI suite including follow-up: **9 scenarios passed**, using test-only synthetic API responses, never production mocks. Covers dashboard layout/white surface, desktop/mobile five-step flow, native keyboard selection, Change actions/draft preservation, target sidebar and explicit recalculation, mobile header navigation, plus reflow/action reachability at 320/768/1024 pixels with reduced-motion preference. Additional desktop/mobile journeys assert identical header text/bounds across both tabs, one Create button, both chooser routes, Escape/Cancel focus restoration, and no mutation on selection. Planner fixture deliberately exercises the unavailable-service display; this is not a live backend check.
- All seven final desktop screens were inspected against their corresponding reference. Desktop/mobile PNGs are generated under `appetee_front/test-results/meal-plan-ui`, using the stems above plus `-desktop.png`/`-mobile.png`. Generated artifacts are ignored by Git and can be recreated with the scoped E2E command.
- Follow-up captures also include `planner-shared-header-*` and `create-choice-*` desktop/mobile images for the updated top bar and user-provided dialog reference.
- Source whitespace check passed. No repository lint script is configured; a lint pass is not claimed.

The initial sandbox test attempt was blocked by dependency/file-access restrictions and was rerun with approved access. Initial checks also revealed duplicate header tracking and a browser-test expectation that omitted the planner's documented query parameters; both were corrected before the passing runs. Rendered captures exposed viewport-body clipping, which was corrected only for Meal Plan. Earlier failures are not counted as passes.

The shared-header follow-up's first focused run passed 107 tests with one routed-test failure: it inspected the new route before the Material chooser's afterClosed event. The test now waits for actual closure/navigation; the subsequent full suite passed. Production code was not given artificial delays.

## Remaining acceptance

This verification establishes reference-driven composition and scoped automated behavior, not full F15 completion. Real authenticated backend creation/edit integration, staging/deployment, cross-browser testing, actual browser zoom, screen-reader/manual assistive-technology acceptance and user design sign-off remain unverified. F08's live B08 integration remains pending until separately verified.

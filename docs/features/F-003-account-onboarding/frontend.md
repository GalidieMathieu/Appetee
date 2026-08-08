# F-003 — Account Onboarding: Frontend Design

**Status:** Active
**Implementation status:** Partially implemented
**Version:** 1.0
**Owner:** Mathieu Galidie
**Last updated:** 2026-08-06
**Dependencies:** F-002, F-004, F-005, F-006, F-007, Ingredient Groups (feature ID pending)
**Related engineering initiatives:** E-004, E-013, E-017

## Canonical Contract

The feature `README.md` owns the canonical data model, database impact, endpoint list, request/response contracts, and error behavior. This document describes only implementation responsibilities for this technical side and must not redefine those contracts.

## Purpose

This document defines the Angular onboarding shell, routed steps, form state, validation, navigation, and F-004 handoff.

## Current Frontend State

### Implemented

- `AUTH_ROUTES` mounts `/auth/sign-up` with Account, Diet, and Ingredient children.
- `SignUpWizard` owns reactive forms for account, diet IDs, search, and ingredient IDs.
- `SignUpShellPage` provides progress display, Back, Next, final submission, email check, and error selection.
- `signupWizardGuard` attempts to gate later steps until Account is valid.
- Account, Diet, and Ingredient step components are present.
- Login exit is present.
- Wizard reset occurs when the shell is destroyed.

### Known gaps

- Form rules do not match the approved display-name and password policy.
- Diet currently has a required validator despite optional selection.
- Email outcomes do not distinguish active and pending accounts.
- Current child guard fallback path does not match the canonical `/auth/sign-up/account` route.
- Direct navigation currently checks form validity rather than confirmed email availability completion.
- Back to Appetee is absent.
- Successful creation navigates to `/home` rather than F-004.
- Ingredient categories/groups are absent.

## Routes and Entry Points

| Route | Access | Purpose |
|---|---|---|
| `/auth/sign-up` | Guest | Redirect to Account. |
| `/auth/sign-up/account` | Guest | Required account fields and email availability. |
| `/auth/sign-up/diet` | Guest after Account completion | Optional diet selection. |
| `/auth/sign-up/ingredient` | Guest after Account completion | Optional avoided-ingredient selection and final submission. |
| `/auth/login` | Guest | Exit to Login. |
| `/` | Guest | Exit back to Appetee. |
| `/auth/verify-email` | Pending user | F-004 success destination. |

## Pages, Components, and State

- Shell: `SignUpShellPage` owns step metadata, actions, and submission orchestration.
- State: route-scoped `SignUpWizard`; intentionally not persisted across refresh/exit.
- Account step: email, display name, password, confirmation.
- Diet step: zero-to-many diet IDs.
- Ingredient step: search, zero-to-many ingredient IDs, future category/group controls.
- Shared data: `DietsFacade`, `IngredientsFacade`, `UserFacade`, and `AuthFacade`/future onboarding API boundary.

## User Interactions

### Interaction 1 — Account to Diet

1. User enters valid account fields.
2. User selects Next.
3. Frontend validates fields and requests email availability.
4. Available email opens Diet.
5. Active account remains on Account with Login/recovery action.
6. Pending account opens F-004.

### Interaction 2 — Optional Diet and Ingredients

1. User may select any number of diets or none.
2. Next opens Ingredients regardless of diet selection.
3. User may select any number of avoided ingredients or none.
4. Create Account becomes available when Account remains valid and submission is not pending.

### Interaction 3 — Back and exit

1. Back or browser Back returns to an earlier step.
2. Progress bars remain display-only.
3. Login or Back to Appetee exits and discards the draft.
4. Refresh returns to Account with cleared state.

## UI States

- Account initial: blank fields.
- Email check loading: Next disabled and status indicated.
- Active email: inline error plus Login/recovery action.
- Pending email: redirect to verification.
- Diet loading/error/empty: explicit retry or empty explanation.
- Ingredient loading/search/no matches/selected chips/error: explicit states.
- Final submission loading: navigation and submit disabled.
- Final validation/race failure: remain on current step and map errors to their source where possible.
- Success: clear wizard and open `/auth/verify-email` through F-004.

## Responsive and Accessibility Requirements

- Step count and progress are announced but not interactive.
- Form fields use explicit labels, autocomplete attributes, and error associations.
- Password visibility toggles are keyboard accessible.
- Focus moves to the first invalid field or error summary after failed progression.
- Selected diets and ingredients expose selected state programmatically.
- Group controls expose expanded, selected, and partially selected states.
- Bottom actions remain reachable without horizontal scrolling on mobile.

## Frontend Work by Feature Phase

### Phase 1 — Three-step onboarding foundation

**Status:** Completed

- Changes: Existing routes, shell, forms, step components, facades, and combined request.
- Unit or component tests: Sign-up shell test exists.
- Browser E2E tests: Not present.
- Accessibility validation: Partial labels/errors exist; evidence incomplete.
- Responsive and visual validation: Existing styles; evidence not recorded.

### Phase 2 — Account-information rules

**Status:** Not started

- Changes: Rename UI concept to Display Name; enforce 2–30 trimmed characters; 12–128 password; visibility toggles; autocomplete and messages.
- Unit or component tests: All boundaries, trimming, matching, and toggles.
- Browser E2E tests: Valid and invalid Account progression.
- Accessibility validation: Labels, errors, visibility controls, focus.
- Responsive and visual validation: Account step on narrow and desktop layouts.

### Phase 3 — Reliable email availability and final uniqueness

**Status:** In progress

- Changes: Track completed availability check; distinguish available/active/pending; handle final duplicate result without losing state.
- Unit or component tests: Availability outcomes and stale-email-change invalidation.
- Browser E2E tests: Active, pending, available, and concurrent duplicate outcomes.
- Accessibility validation: Loading and error announcements.
- Responsive and visual validation: Inline account outcome actions.

### Phase 4 — Navigation and abandonment completion

**Status:** In progress

- Changes: Fix canonical guard redirect, allow empty Diet, gate by Account plus availability completion, add Back to Appetee, align browser Back, retain display-only progress, preserve intentional refresh reset.
- Unit or component tests: Direct route, Back, browser history, empty diet/ingredients, exits, and refresh behavior.
- Browser E2E tests: Full no-preference flow and backward edits.
- Accessibility validation: Focus after step changes and action order.
- Responsive and visual validation: All three steps.

### Phase 5 — Ingredient-group integration

**Status:** Not started

- Changes: Category/group expansion, bulk selection, mixed state, individual removal, deduplicated ID set.
- Unit or component tests: Group and individual interaction matrix.
- Browser E2E tests: Select group, remove exception, submit resulting IDs.
- Accessibility validation: Disclosure and checkbox semantics.
- Responsive and visual validation: Long group and selected-item lists.

## Validation Commands

```text
npm test
npm run build
```

## Frontend Decisions

- Wizard state remains route-scoped and memory-only.
- The progress indicator is not navigation.
- Group selection resolves into the same individual ingredient-ID control used by direct selection.
- F-004 owns verification pages and outcomes; onboarding only invokes the success handoff.

## Open Questions

- Final visual labels for active-email Login/recovery actions depend on F-002 recovery availability.

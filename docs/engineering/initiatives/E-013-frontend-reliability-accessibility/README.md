# E-013 — Frontend Routing, State Isolation, Accessibility, and Reliability

## Initiative Information

- **Status:** Ready for implementation
- **Type:** Engineering initiative
- **Priority:** Medium
- **Implementation order:** 13
- **Last updated:** 2026-08-06

## Goal

Complete real routes and flows, prevent cross-user/stale session state, bound startup waits, and make core interactions accessible and maintainable.

## Problem

Several signed-in routes are missing or placeholders, sign-up navigation and store reset behavior can produce incorrect state, application bootstrap can wait indefinitely for session restoration, and core templates contain accessibility barriers. Debug residue, cleanup gaps, and inconsistent validation/localization patterns add maintainability risk.

## Why This Matters

The intended recipe/meal-planning product cannot be used reliably and is not suitable for a production audience. Route declarations, navigation, and implemented features are out of sync.

Broken onboarding and cross-principal stale-data exposure/corruption risk. Session boundary does not reliably invalidate all in-memory state; cache keys omit principal/permission context.

Exclusion from registration/login/core navigation, higher abandonment/support cost, and accessibility compliance risk without making a legal conclusion. Semantic, contrast, naming, relationship, landmark, and responsive-layout defects.

Whole-site availability depends on session API responsiveness, even for visitors who are not signed in. A global initialization dependency lacks a deadline and fallback UX.

Minor leaks/bugs and rising maintenance cost rather than a demonstrated credential disclosure. Lifecycle and presentation rules are inconsistently applied.

## Current Behavior

- Registered guest routes are /, /auth/login, duplicate /auth/Login, and sign-up steps. Registered authenticated routes are /home and /admin-recipes/*. Header links /recipes, /diet-needs, and /profile are unwired; goToCreateRecipe targets invalid /recipes/create. recipes.routes.ts is entirely commented, and the current recipe-list files are untracked/unregistered. Home displays one hard-coded recipe with no-op handlers.
- The wizard guard redirects to /sign-up/account instead of registered /auth/sign-up/account. Tests construct a custom route and do not expose the mismatch. RecipesStore reset registration is commented out. Base reset clears only the primary subject; ingredient detail and recipe detail maps/subjects remain populated, and facades return cached details without reauthorization.
- White text on the primary orange is about 2.75:1, below 4.5:1 for small text. A click-only div acts as a button; mobile-menu controls lack expanded/controls relationships; aria-describedby points to absent IDs; the login action sits outside the form with no submit handler; search fields lack labels; nested main landmarks appear; a dialog uses max-width based on viewport height.
- provideAppInitializer waits for restoreSession$ completion. That observable calls session then current-user APIs and has catch behavior but no explicit timeout; a hung network/API request prevents bootstrap from completing, including public landing/login.
- Production retains console calls. The wizard constructor logs only its initial four empty strings—not live credentials—and guard logs only validity/path. Router and form subscriptions lack explicit teardown in smaller components. One any remains. Client forms lack comprehensive maximum lengths/counts/numeric/file dimensions, and formatting/unit/currency/internationalization policy is not centralized.

## Target Behavior

Every navigation item maps to an implemented or intentionally unavailable route. Authentication bootstrap is bounded and recoverable, all user-scoped state is isolated by principal, core flows meet keyboard/screen-reader/contrast expectations, and frontend quality rules prevent regressions.

## Scope

### Included

- Route and navigation inventory
- Removal of placeholder/wildcard-hidden flows
- Bounded auth bootstrap and retry
- Principal-scoped store reset
- Sign-up guard/navigation correction
- Observable/subscription lifecycle
- Form caps and strict typing
- Core accessibility remediation
- Localization/unit formatting readiness
- Frontend tests and lint

### Excluded

- API authorization, E-001/E-002
- Global API contract generation, E-010
- Static asset performance, E-014

## Systems Affected

- Angular routes and layouts
- Auth initializer/facade/interceptor
- Recipe/ingredient/user stores
- Sign-up wizard
- Headers, forms, dialogs, search and buttons
- Frontend tests and quality configuration

## Required Change Summary

### Frontend

- Create a route/product inventory and remove links to unavailable pages or implement the routes.
- Replace indefinite initializer waits with bounded timeout, safe fallback, and later retry.

Remaining frontend implementation details are maintained in [`frontend.md`](./frontend.md).

### Tests

- Test offline, DNS failure, refusal, never-completing requests, `401`, `500`, and slow restoration.
- Test logout/login as a different user without stale recipes/preferences/profile.

## Implementation Phases

Phases are completed in order unless a documented dependency requires otherwise. A phase that changes code is not complete until its listed tests pass. A phase containing only configuration, documentation, or operational work must attach equivalent validation evidence.

### Phase 1 — Stabilize routes, startup, and session state

**Status:** Not started

#### Changes

- Register intended routes or remove misleading links.
- Bound session restoration and network waits.
- Clear all user-scoped state on identity change.

#### Tests and validation

- [ ] Router/deep-link tests.
- [ ] Startup timeout/offline tests and user-switch state-isolation tests.

#### Phase completion rule

- [ ] All scoped changes are implemented or explicitly documented as not applicable.
- [ ] Every required automated test passes.
- [ ] Required manual, staging, migration, or operational evidence is attached.
- [ ] The initiative `Work Status` section is updated with verified evidence.

### Phase 2 — Complete loading, error, empty, and cancellation behavior

**Status:** Not started

#### Changes

- Make feature stores/components deterministic under retries and cancellation.
- Manage Observable lifecycle and stale responses.

#### Tests and validation

- [ ] Component/store tests for loading, empty, error, retry, cancellation, and out-of-order responses.

#### Phase completion rule

- [ ] All scoped changes are implemented or explicitly documented as not applicable.
- [ ] Every required automated test passes.
- [ ] Required manual, staging, migration, or operational evidence is attached.
- [ ] The initiative `Work Status` section is updated with verified evidence.

### Phase 3 — Remove accessibility barriers

**Status:** Not started

#### Changes

- Correct semantic controls, labels, focus order, keyboard behavior, contrast, and responsive states.

#### Tests and validation

- [ ] Automated accessibility checks plus keyboard-only and screen-reader-oriented manual evidence.
- [ ] Mobile viewport E2E for core flows.

#### Phase completion rule

- [ ] All scoped changes are implemented or explicitly documented as not applicable.
- [ ] Every required automated test passes.
- [ ] Required manual, staging, migration, or operational evidence is attached.
- [ ] The initiative `Work Status` section is updated with verified evidence.

### Phase 4 — Enforce frontend quality controls

**Status:** Not started

#### Changes

- Add lint/format/no-console and lifecycle rules.
- Keep strict typing and localization readiness.

#### Tests and validation

- [ ] Lint/type/build/unit/E2E gates.
- [ ] Seeded accessibility and subscription-lifecycle failures must block.

#### Phase completion rule

- [ ] All scoped changes are implemented or explicitly documented as not applicable.
- [ ] Every required automated test passes.
- [ ] Required manual, staging, migration, or operational evidence is attached.
- [ ] The initiative `Work Status` section is updated with verified evidence.

## Work Status

### Completed

None. Creating this plan does not count as implementation.

### In Progress

None.

### Remaining

- [ ] Route inventory and core signed-in flows are complete.
- [ ] Session restoration and store reset are bounded and principal-safe.
- [ ] Core accessibility defects are remediated.
- [ ] Frontend lifecycle, validation, formatting, and quality gates are enforced.

## Risks and Edge Cases

- A wildcard redirect can hide missing features during development.
- A global signal/store can leak the previous user’s data after identity change.
- Blocking bootstrap indefinitely creates a blank application during dependency failure.
- Automated accessibility tools do not replace keyboard and screen-reader review.

## Product Features Affected

- Sign-up and login
- Private layout and navigation
- Recipe catalogue and administration
- Profile and preferences
- All future feature modules

## Validation

- All visible navigation resolves to intentional behavior.
- Startup reaches a bounded usable error/retry state during dependency failure.
- Cross-user session tests show no stale state.
- Core flows pass axe and manual keyboard/contrast acceptance.
- Lint/type/test/build gates are required.

## Completion Criteria

- [ ] Route inventory and core signed-in flows are complete.
- [ ] Session restoration and store reset are bounded and principal-safe.
- [ ] Core accessibility defects are remediated.
- [ ] Frontend lifecycle, validation, formatting, and quality gates are enforced.

## Decisions

- Frontend state is scoped to the authenticated principal and cleared on every identity transition.
- Unavailable features are not hidden behind wildcard redirects.
- Accessibility is part of completion, not a later visual polish task.

## Detailed Implementation Documents

- [Frontend implementation](./frontend.md)

## Traceability

The codes below are retained only to map this implementation plan to the historical problem register.

| Reference | Problem |
|---|---|
| FE-001 | Registered routes are incomplete and key signed-in flows are placeholders |
| FE-002 | Sign-up navigation and session cache reset behavior can produce incorrect state |
| FE-003 | Confirmed source-level accessibility barriers affect core flows |
| REL-004 | Frontend bootstrap can wait indefinitely for session restoration |
| FE-004 | Debug residue, subscription cleanup, validation caps, and localization readiness need hardening |

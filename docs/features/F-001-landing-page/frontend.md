# F-001 — Landing Page: Frontend Design

**Status:** Active
**Implementation status:** Partially implemented
**Version:** 1.0
**Owner:** Mathieu Galidie
**Last updated:** 2026-08-06
**Dependencies:** F-002, F-003, F-008, F-005 — Legal and Privacy
**Related engineering initiatives:** E-013, E-017

## Canonical Contract

The feature `README.md` owns the canonical data model, database impact, endpoint list, request/response contracts, and error behavior. This document describes only implementation responsibilities for this technical side and must not redefine those contracts.

## Purpose

This document contains frontend-specific details for the public Landing Page. Product behavior and acceptance criteria remain canonical in [`README.md`](./README.md).

## Current Frontend State

### Implemented

- `src/app/app.routes.ts` mounts the public layout at the root and applies `guestGuard`.
- `src/app/features/landing/landing.routes.ts` provides the landing child route.
- `landing.page.ts`, `landing.page.html`, and `landing.page.scss` implement the static page.
- `FeatureItemComponent` and `StepItemComponent` render repeated landing content.
- `landing.page.spec.ts` covers visible copy and authentication links.
- The current Login link targets `/auth/login`.

### Known gaps

- The central copy and feature descriptions do not yet match the approved specification.
- The Sign Up link targets `/auth/sign-up` instead of `/auth/sign-up/account`.
- The public-header logo must be confirmed and maintained as non-interactive.
- Legal/footer integration is not implemented.

## Routes and Entry Points

| Route | Access | Purpose |
|---|---|---|
| `/` | Guest | Render the Landing Page. |
| `/` | Authenticated user | Redirect through `guestGuard` to `/home`. |
| `/auth/login` | Guest | Secondary Login destination. |
| `/auth/sign-up/account` | Guest | Primary Create Account destination. |

## Pages, Components, and State

- Page boundary: `LandingPageComponent`.
- Layout boundary: `PublicLayoutComponent` with logo-only public header.
- Child components: `FeatureItemComponent`, `StepItemComponent`.
- Feature state: static presentation data only.
- Shared dependencies: Angular Router, `guestGuard`, public layout.
- API data access: none.

## User Interactions

### Interaction 1 — Create Account

1. User activates the primary CTA.
2. Angular Router navigates to `/auth/sign-up/account`.
3. F-003 owns the resulting onboarding flow.

### Interaction 2 — Login

1. User activates the secondary CTA.
2. Angular Router navigates to `/auth/login`.
3. F-002 owns the resulting authentication flow.

## UI States

- Initial state: static page content is immediately available.
- Loading: no F-001 data loading state.
- Success: not applicable.
- Empty results: not applicable.
- Validation errors: not applicable.
- Unauthorized access: authenticated users are redirected before the page is shown.
- Network interruption: static page remains usable; destination features may handle their own network states.
- Unexpected errors: handled by application-level frontend error behavior.

## Responsive and Accessibility Requirements

- Both CTAs must be keyboard reachable and have descriptive visible labels.
- Heading hierarchy must contain one clear page-level heading.
- Decorative icons must be hidden from assistive technology or have meaningful alt text when informative.
- The logo must not appear interactive if it has no navigation behavior.
- CTA order and prominence must remain clear on narrow screens.
- Text and controls must meet the application contrast standard.
- Visual reference: [`assets/landing-routing.svg`](./assets/landing-routing.svg).

## Frontend Work by Feature Phase

### Phase 1 — Static public landing experience

**Status:** Completed

- Changes: Existing page, components, content model, styling, and CTA links.
- Unit or component tests: Existing landing test.
- Browser E2E tests: Not currently present.
- Accessibility validation: Not recorded.
- Responsive and visual validation: Implementation exists; evidence not recorded.

### Phase 2 — Guest routing and authenticated redirect

**Status:** Completed

- Changes: Root public route group and `guestGuard` redirect.
- Unit or component tests: Guard tests exist in the authentication area.
- Browser E2E tests: Retain a root-route authentication scenario when E2E coverage is introduced.
- Accessibility validation: Not applicable to routing itself.
- Responsive and visual validation: Not applicable.

### Phase 3 — Approved landing alignment

**Status:** Not started

- Changes:
  - Replace the hero with “Meals built around you.”
  - Rewrite supporting copy in a friendly and inspiring tone.
  - Present personalized recipes, diets, avoided ingredients, meal planning, nutrition, and estimated pricing accurately.
  - Remove pantry-owned-ingredient and community-sharing claims.
  - Route Create Account to `/auth/sign-up/account`.
  - Keep Login at `/auth/login`.
  - Keep the logo non-interactive.
- Unit or component tests: Update copy, CTA destination, and logo-behavior assertions.
- Browser E2E tests: Guest CTA navigation and authenticated root redirect.
- Accessibility validation: Keyboard order, landmarks, heading hierarchy, alt behavior, and contrast.
- Responsive and visual validation: Mobile, tablet, and desktop screenshots after completion.

## Validation Commands

```text
npm test
npm run build
```

## Frontend Decisions

- No F-001 backend call is introduced.
- Static feature and step data may remain local to the page until a broader content-management feature exists.
- The legal footer will be composed into the public experience but remains owned elsewhere.

## Open Questions

- The exact supporting copy and visual treatment may be refined during Phase 3 without changing routing or scope.

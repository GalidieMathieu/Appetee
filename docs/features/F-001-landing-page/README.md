# F-001 — Landing Page

**Status:** Active
**Implementation status:** Partially implemented
**Version:** 1.0
**Owner:** Mathieu Galidie
**Last updated:** 2026-08-06
**Dependencies:** F-002, F-003, F-005, F-006
**Related engineering initiatives:** E-013, E-017

## Goal

Give unauthenticated visitors a clear, friendly introduction to Appetee and make account creation the primary next action.

## User Problem

A new visitor needs to understand quickly that Appetee provides meals built around the user's needs and must know how to create an account or log in. Public recipe browsing would undermine Appetee's personalized experience because recipe results depend on the user's diets and avoided ingredients.

## Current Behavior

Implementation baseline reviewed from frontend `main` on 2026-08-06.

### Implemented

- `/` renders the public landing page through `PublicLayoutComponent` for guests.
- `guestGuard` redirects authenticated users from the public route group to `/home`.
- The page contains a static hero, feature cards, a three-step explanation, a primary account-creation action, and a secondary login action.
- The login action routes to `/auth/login`.
- A landing-page test verifies the main content and authentication links.
- The public header displays the Appetee logo.

### Known gaps

- The approved central message, **“Meals built around you,”** is not yet used.
- The current account-creation action targets `/auth/sign-up`; the approved direct destination is `/auth/sign-up/account`.
- Current copy mentions pantry-owned ingredients, meal-prep style, and community recipe sharing, which are not approved landing-page claims.
- The public logo should be non-interactive.
- Privacy, Terms, copyright, and public-footer behavior are not present and are owned by F-005 — Legal and Privacy.

## Scope

### Included

- Public landing content for unauthenticated visitors.
- Friendly and inspiring product messaging.
- Explanation of personalized recipes, diet filtering, avoided ingredients, meal planning, nutrition, and estimated pricing.
- Primary Create Account action.
- Secondary Login action.
- Session-aware redirect from `/` to `/home` for authenticated users.
- Static, responsive presentation.

### Excluded

- Public recipe browsing.
- Authenticated Home Page content.
- Login and onboarding implementation.
- Privacy Policy, Terms, legal acceptance, and public legal-footer ownership, all owned by F-005.
- Community recipe sharing.
- Pantry-based recipe generation.
- Animation and analytics implementation.

## Users and Permissions

| Actor | Allowed behavior |
|---|---|
| Guest | View the landing page and open Login or Create Account. |
| Authenticated user | Is redirected to `/home`; does not view the landing page. |
| Administrator | Follows the same authenticated redirect behavior. |

## User Flows

### Flow 1 — Create an account

1. A guest opens `/`.
2. The guest reads the Appetee value proposition.
3. The guest selects the primary Create Account action.
4. Appetee opens `/auth/sign-up/account`.

### Flow 2 — Log in

1. A guest opens `/`.
2. The guest selects the secondary Login action.
3. Appetee opens `/auth/login`.

### Flow 3 — Authenticated root navigation

1. An authenticated user opens `/`.
2. `guestGuard` prevents access to the public route group.
3. Appetee redirects the user to `/home`.

## Functional Requirements

- **FR-001:** Guests must be able to access the Landing Page at `/`.
- **FR-002:** Authenticated users opening `/` must be redirected to `/home`.
- **FR-003:** The page must use **“Meals built around you”** as its central message.
- **FR-004:** Create Account must be the primary action and open `/auth/sign-up/account`.
- **FR-005:** Login must be the secondary action and open `/auth/login`.
- **FR-006:** The public header must display a non-interactive Appetee logo only.
- **FR-007:** The page must explain approved Appetee capabilities without implying public recipe access.
- **FR-008:** The initial stable experience must remain static and responsive.
- **FR-009:** The F-005 public legal footer must be rendered on the Landing Page when F-005 is implemented.

## Business Rules

- **BR-001:** Recipes are not available to guests because Appetee's principal experience is tailored to authenticated user preferences.
- **BR-002:** The landing page is an acquisition page, not a duplicate of Home or Recipes.
- **BR-003:** The page must not claim pantry-based generation or community sharing unless those capabilities receive approved feature specifications.
- **BR-004:** The primary product outcome is increased account creation.

## Edge Cases and Failure Behavior

- If authentication state is still restoring, routing must wait for the established authentication bootstrap rather than briefly exposing the wrong layout.
- Unknown public routes follow the application wildcard behavior and return to the root route.
- If a destination feature is unavailable, its action must not be presented as functional.

## Data Requirements

F-001 owns no persistent product data.

The page reads only enough authentication/session state to determine whether the visitor is a guest or must be redirected to `/home`.

## Database Impact

### Existing tables used

None directly.

### Schema changes

None.

### Index changes

None.

### Data migration

None.

## API Endpoints

F-001 owns no API endpoint.

Authentication restoration used by routing is owned by F-002.

## Request Contracts

None.

## Response Contracts

None.

## Error Behavior

- Landing content must remain renderable without catalogue data.
- A failed or missing authenticated session is handled by F-002 and results in the guest experience.
- An authenticated root navigation must resolve to `/home` rather than briefly rendering guest content.

## Delivery Phases

### Phase 1 — Static public landing experience

**Status:** Completed

#### User value delivered

- Guests can understand the existing Appetee concept and enter Login or Sign Up from a responsive public page.

#### Included work

- Product behavior: Static hero, feature summary, three-step explanation, and authentication actions.
- Frontend: See [`frontend.md`](./frontend.md).
- Data/API: None.
- Documentation/assets: Existing routing flow documented in [`assets/landing-routing.svg`](./assets/landing-routing.svg).

#### Tests and validation

- [x] Landing component/router test exists.
- [x] Login and Sign Up links are covered by the existing test.
- [X] Full responsive and accessibility evidence is not yet recorded.

#### Phase completion criteria

- [x] The public route renders.
- [x] Authentication entry actions exist.
- [x] Basic automated coverage exists.

### Phase 2 — Guest routing and authenticated redirect

**Status:** Completed

#### User value delivered

- Guests see the public experience, while authenticated users reach the authenticated Home Page.

#### Included work

- Product behavior: Guest-only root route and authenticated redirect to `/home`.
- Frontend: See [`frontend.md`](./frontend.md).
- Data/API: Uses existing authentication state; no F-001 API.
- Documentation/assets: Routing boundary included in the architecture diagram.

#### Tests and validation

- [x] `guestGuard` implements the authenticated redirect.
- [ ] Router integration coverage for restored sessions should be retained under the relevant frontend quality work.

#### Phase completion criteria

- [x] Guest access and authenticated redirect are present.

### Phase 3 — Approved landing alignment

**Status:** Not started

#### User value delivered

- Visitors receive accurate, focused messaging designed to increase sign-ups.

#### Included work

- Product behavior: Apply the approved message, capabilities, action hierarchy, and logo behavior.
- Frontend: See [`frontend.md`](./frontend.md).
- Data/API: None.
- Documentation/assets: Update visual evidence when the aligned page is complete.

#### Tests and validation

- [ ] Update landing content assertions.
- [ ] Verify `/auth/sign-up/account` and `/auth/login` destinations.
- [ ] Verify the logo has no click interaction.
- [ ] Validate keyboard access, semantics, mobile layout, and desktop layout.

#### Phase completion criteria

- [ ] Approved copy and supported capabilities are displayed.
- [ ] Unsupported claims are removed.
- [ ] Required actions and routing are correct.
- [ ] Updated tests pass.

## Work Status

### Completed

- Static public page.
- Authentication entry actions.
- Guest route protection and authenticated redirect.

### In progress

- None.

### Remaining

- [ ] Phase 3 — Approved landing alignment.
- [ ] Integrate the F-005 public legal footer without transferring its ownership to F-001.

## Acceptance Criteria

- [ ] **AC-001:** A guest opening `/` sees a friendly, inspiring page centered on “Meals built around you.”
- [ ] **AC-002:** Create Account is visually primary and opens `/auth/sign-up/account`.
- [ ] **AC-003:** Login is visually secondary and opens `/auth/login`.
- [ ] **AC-004:** An authenticated user opening `/` reaches `/home`.
- [ ] **AC-005:** The page does not promise pantry generation, community sharing, or public recipe access.
- [ ] **AC-006:** The logo is visible and non-interactive.
- [ ] **AC-007:** The page is usable on supported mobile and desktop widths.

## Risks and Open Questions

- F-005 owns legal/footer content; F-001 only provides the Landing Page placement.
- Final marketing copy below the main message may be refined without changing the approved behavior.

## Decisions

- `/` is the canonical guest Landing Page.
- Authenticated `/` navigation redirects to `/home`.
- The page has no application navigation menu.
- The logo is non-interactive.
- Create Account is primary; Login is secondary.
- Guests cannot browse recipes.
- The page remains static for the current version.
- Legal pages, legal acceptance, and the public footer are owned together by F-005 — Legal and Privacy.

## Related Documents

- [Frontend design](./frontend.md)
- [Feature assets](./assets/)

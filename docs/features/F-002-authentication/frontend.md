# F-002 — Authentication: Frontend Design

**Status:** Active
**Implementation status:** Partially implemented
**Version:** 1.0
**Owner:** Mathieu Galidie
**Last updated:** 2026-08-06
**Dependencies:** F-003, F-004, F-008
**Related engineering initiatives:** E-004, E-005, E-013, E-017

## Canonical Contract

The feature `README.md` owns the canonical data model, database impact, endpoint list, request/response contracts, and error behavior. This document describes only implementation responsibilities for this technical side and must not redefine those contracts.

## Purpose

This document defines frontend boundaries for Login, authenticated state, session restoration, route guards, logout, and future authentication-support flows.

## Current Frontend State

### Implemented

- `core/auth/data-access/auth.api.ts` calls login, sign-up, session, and logout endpoints.
- `AuthFacade` restores sessions, hydrates the current user, performs login, and resets session state on logout.
- `AuthStore` exposes authenticated state and logout notifications.
- `authGuard` redirects guests to `/auth/login`.
- `guestGuard` redirects authenticated users to `/home`.
- `LoginPage` uses a reactive email/password form and redirects success to `/home`.
- The private header invokes logout and routes to `/auth/login`.

### Known gaps

- Show/hide password, Remember Me, and Forgot Password are absent.
- Create Account links to `/auth/sign-up` rather than `/auth/sign-up/account`.
- Session-expired reason/message is not preserved through redirect.
- Pending-unverified login routing is not implemented.
- Password recovery, password change, and session management pages are absent.

## Routes and Entry Points

| Route | Access | Purpose |
|---|---|---|
| `/auth/login` | Guest | Login form. |
| `/auth/verify-email` | Pending user/guest | F-004 verification-pending experience. |
| Protected routes | Authenticated user | Guarded application routes. |
| `/profile` or future profile route | Authenticated user | Entry point for password change and active-session management. |

## Pages, Components, and State

- `LoginPage`: login form and authentication entry links.
- `AuthFacade`: coordinates API requests and current-user hydration.
- `AuthStore`: session summary, load/error state, authenticated signal.
- `SessionService`: clears principal-scoped stores.
- `authGuard` / `guestGuard`: route boundaries.
- Future recovery/change/session pages should live under the authentication feature while Profile may link to them.

## User Interactions

### Interaction 1 — Login

1. User enters email and password and optionally selects Remember Me.
2. Submit disables while pending.
3. Success hydrates the user and navigates to `/home`.
4. Invalid credentials remain on the page with generic feedback.
5. Pending verification redirects to `/auth/verify-email`.

### Interaction 2 — Session expiration

1. A protected API request indicates an expired or revoked session.
2. Client resets all user-scoped stores.
3. Router navigates to `/auth/login` with a safe expiration reason.
4. Login displays the session-expired message once.

### Interaction 3 — Logout

1. User selects Logout in the authenticated header.
2. Client calls the logout endpoint.
3. Client resets all scoped state even if the request fails.
4. Router opens `/auth/login`.

## UI States

- Initial: empty login form; Remember Me unchecked.
- Loading: submit disabled with busy indicator.
- Success: navigation to `/home`.
- Validation: required email/password and email format.
- Invalid credentials: generic alert.
- Pending verification: route to F-004.
- Rate limited: generic retry-later feedback and optional server-provided retry timing.
- Offline/network interruption: retryable general error; entered email remains.
- Expired session: one-time expiration alert.
- Unexpected error: safe general error from the shared error mapping.

## Responsive and Accessibility Requirements

- Inputs use explicit labels, correct email/password autocomplete attributes, and Enter submission.
- Show/hide password is a real button with an accessible pressed/state label.
- Errors use `role="alert"` or an equivalent announced status region without repeated announcements.
- Focus moves to the error summary or first invalid field after submission failure.
- Busy state is announced and prevents duplicate submission.
- Login and recovery remain usable on narrow screens and with zoom.
- Session-management lists must be operable by keyboard and not rely on location alone.

## Frontend Work by Feature Phase

### Phase 1 — Email login and protected routing foundation

**Status:** Completed

- Changes: Existing login page, auth facade/store, session restoration, guards, logout, and user hydration.
- Unit or component tests: Auth facade, guest guard, login page, and application tests exist.
- Browser E2E tests: Not currently present.
- Accessibility validation: Partial form semantics exist; complete evidence not recorded.
- Responsive and visual validation: Existing implementation; evidence not recorded.

### Phase 2 — Login experience completion

**Status:** Not started

- Changes: Add show/hide password, Remember Me, Forgot Password, generic error contract, corrected Sign Up route, Enter submission, and autocomplete attributes.
- Unit or component tests: All interactions, disabled state, messages, and links.
- Browser E2E tests: Successful, invalid, throttled, and pending-verification outcomes.
- Accessibility validation: Focus, announcements, toggle semantics, and keyboard flow.
- Responsive and visual validation: Mobile and desktop.

### Phase 3 — Remembered sessions and expiration experience

**Status:** Not started

- Changes: Send Remember Me intent, distinguish session outcomes, retain one-time expiration reason, and handle revoked/expired sessions consistently.
- Unit or component tests: Interceptor/facade state reset and expiration message.
- Browser E2E tests: Refresh, browser reopen where testable, expiration, and multi-user state isolation.
- Accessibility validation: Expiration announcement and focus after redirect.
- Responsive and visual validation: Login expired-session state.

### Phase 4 — Password recovery

**Status:** Not started

- Changes: Recovery request, sent confirmation, token result, and reset-password pages.
- Unit or component tests: Generic request result and token outcomes.
- Browser E2E tests: Complete reset journey.
- Accessibility validation: Form, focus, and status messages.
- Responsive and visual validation: All recovery states.

### Phase 5 — Password change

**Status:** Not started

- Changes: Auth-owned change-password page or component linked from Profile.
- Unit or component tests: Current/new/confirm validation and success.
- Browser E2E tests: Authenticated password change and subsequent login/session behavior.
- Accessibility validation: Password controls and error summary.
- Responsive and visual validation: Profile integration.

### Phase 6 — Active-session management

**Status:** Not started

- Changes: Session list, current marker, revoke action, and log out all others.
- Unit or component tests: Loading, empty, success, and failure states.
- Browser E2E tests: Multi-session revocation.
- Accessibility validation: List semantics, destructive confirmation, and focus return.
- Responsive and visual validation: Narrow session cards/list.

## Validation Commands

```text
npm test
npm run build
```

## Frontend Decisions

- Authenticated state is not inferred solely from a cookie; it is restored and validated through the backend session/current-user flow.
- All principal-scoped stores must reset on logout, expiration, or identity change.
- F-004 owns verification-page UI; F-002 owns routing to it from Login.

## Open Questions

- Choose the final route shape for password recovery/change before those phases begin.
- Decide whether active-session management is a dedicated auth route or embedded within Profile while preserving F-002 ownership.

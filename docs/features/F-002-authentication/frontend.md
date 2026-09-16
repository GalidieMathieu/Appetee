# F-002 — Authentication: Frontend Design

**Status:** Active
**Implementation status:** Phases 1–4 implemented
**Version:** 1.2
**Owner:** Mathieu Galidie
**Last updated:** 2026-08-23
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
- Login includes accessible Show/Hide Password, Remember Me, Forgot Password, and `/auth/sign-up/account` actions.
- Login sends the explicit `rememberMe` value, prevents duplicate pending submissions, supports Enter submission, and focuses validation/error feedback.
- Invalid credentials always display `Invalid email or password.`; throttled login displays the approved retry-later message.
- `SessionExpirationService` clears principal-scoped state, redirects once, and exposes the approved expiration message once.
- The API interceptor treats protected-resource `401` responses as ended sessions while leaving expected auth-endpoint failures to `AuthFacade`.
- Startup session restoration preserves the backend `session_expired` reason through the Login redirect.
- The private header invokes logout and routes to `/auth/login`.
- `ForgotPasswordPage` submits an email-only recovery request and always presents a generic success confirmation.
- `ResetPasswordPage` reads the link token without browser storage, validates password confirmation, submits only the token and new password, and clears the token URL after success.
- Recovery requests bypass global session-expiration handling so expected guest-flow failures cannot create a false expired-session redirect.
- Startup restoration clears an expired authentication cookie without discarding an opened recovery route or its reset token.

### Known gaps

- Pending-unverified login routing is not implemented.
- Password recovery depends on the planned server endpoints, email delivery, and token lifecycle.
- Password change and session management pages are absent.

## Routes and Entry Points

| Route | Access | Purpose |
|---|---|---|
| `/auth/login` | Guest | Login form. |
| `/auth/sign-up/account` | Guest | Correct account-onboarding entry. |
| `/auth/forgot-password` | Guest | Request password-reset instructions. |
| `/auth/reset-password?token=...` | Guest with recovery link | Confirm a new password using the server-issued token. |
| `/auth/verify-email` | Pending user/guest | F-004 verification-pending experience. |
| Protected routes | Authenticated user | Guarded application routes. |
| `/profile` or future profile route | Authenticated user | Entry point for password change and active-session management. |

## Pages, Components, and State

- `LoginPage`: login form and authentication entry links.
- `AuthFacade`: coordinates API requests and current-user hydration.
- `AuthStore`: session summary, load/error state, authenticated signal.
- `SessionService`: clears principal-scoped stores.
- `SessionExpirationService`: deduplicates expiration handling, clears scoped state, redirects, and supplies one-time Login feedback.
- `ForgotPasswordPage`: recovery request, generic sent confirmation, retry, and validation states.
- `ResetPasswordPage`: missing/invalid token, new-password confirmation, pending, failure, and success states.
- `PasswordRecoveryApi`: typed request and confirmation calls that opt out of authenticated-session expiration handling.
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

**Status:** Completed

- Changes: Show/hide password, Remember Me, Forgot Password entry, generic error contract, corrected Sign Up route, Enter submission, and autocomplete attributes are implemented.
- Unit or component tests: Password visibility, validation focus, pending state, messages, request payload, and links are covered.
- Browser E2E tests: Successful/user-isolated login, Remember Me payload, and generic invalid-credential behavior are covered. Pending-verification routing remains F-004.
- Accessibility validation: Labels, focus, alert announcement, toggle semantics, busy state, and keyboard flow have automated coverage.
- Responsive and visual validation: Narrow layout behavior is implemented; no separate manual visual sign-off is recorded.

### Phase 3 — Remembered sessions and expiration experience

**Status:** Completed

- Changes: Remember Me intent, protected-request/session-restore outcomes, one-time expiration reason, and consistent scoped-state reset are implemented.
- Unit or component tests: API payload, interceptor behavior, facade restoration, expiration deduplication, and Login message/focus are covered.
- Browser E2E tests: Expiration during protected use, expiration during startup restoration, logout, and multi-user state isolation are covered. Cookie persistence itself is verified by backend integration tests.
- Accessibility validation: The expiration alert is announced and focused after redirect.
- Responsive and visual validation: The Login expiration state uses the responsive Login error presentation.

### Phase 4 — Password recovery

**Status:** Frontend completed

- Changes: Recovery request, generic sent confirmation, missing/token-error outcomes, and reset-password pages are implemented.
- Unit or component tests: API payload boundaries, generic request result, invalid/expired/used/throttled outcomes, validation, duplicate-submit prevention, and success are covered.
- Browser E2E tests: The complete frontend request/reset journey and stale-auth-cookie recovery-link preservation are covered with mocked API responses; live backend/email integration remains pending.
- Accessibility validation: Labels, autocomplete, keyboard submission, busy state, alert/status announcements, password visibility semantics, and focus management are covered.
- Responsive and visual validation: Request, sent, token-error, reset, and success states share a narrow-screen responsive layout; no separate manual visual sign-off is recorded.

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
npm run test -- --watch=false
npm run build
npx --no-install tsc --noEmit -p tsconfig.app.json
npx --no-install tsc --noEmit -p tsconfig.spec.json
npm run e2e -- e2e/account-authorization.spec.ts
npm run e2e -- e2e/password-recovery.spec.ts
```

Last verified on 2026-08-23: production build passed; both TypeScript checks passed; 94 unit/component tests passed with one unrelated skipped test; and all six browser tests passed. The build retains one pre-existing admin-recipes stylesheet budget warning.

## Frontend Decisions

- Authenticated state is not inferred solely from a cookie; it is restored and validated through the backend session/current-user flow.
- All principal-scoped stores must reset on logout, expiration, or identity change.
- F-004 owns verification-page UI; F-002 owns routing to it from Login.
- Recovery tokens remain transient route input; the frontend does not place them or passwords in browser storage.
- Password confirmation is a UI safeguard only. The backend remains authoritative for password policy and token state.

## Open Questions

- Choose the final route shape for password recovery/change before those phases begin.
- Decide whether active-session management is a dedicated auth route or embedded within Profile while preserving F-002 ownership.

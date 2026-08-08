# F-002 — Authentication

**Status:** Active
**Implementation status:** Partially implemented
**Version:** 1.0
**Owner:** Mathieu Galidie
**Last updated:** 2026-08-06
**Dependencies:** F-003, F-004, F-005
**Related engineering initiatives:** E-004, E-005, E-013, E-017

## Goal

Allow verified users to log in with email and password, maintain a cookie-backed session, access protected Appetee routes, and log out safely.

## User Problem

Users need a predictable way to return to their personalized Appetee experience without repeatedly authenticating during normal use. Guests must be prevented from entering protected areas, and expired sessions must return the user to Login with understandable feedback.

## Current Behavior

Implementation baseline reviewed from frontend `main` and backend `master` on 2026-08-06.

### Implemented

- Login uses email and password.
- `POST /api/auth/login` validates credentials and creates a cookie-backed session.
- `GET /api/auth/session` supports session restoration.
- `GET /api/users/me` hydrates the authenticated user profile.
- `POST /api/auth/logout` clears the authentication cookie.
- Frontend `AuthFacade`, `AuthStore`, and session reset behavior manage authenticated state.
- `authGuard` sends guests to `/auth/login`.
- `guestGuard` sends authenticated users to `/home`.
- Successful login navigates to `/home`.
- Logout is available from the authenticated header and returns to `/auth/login`.
- The backend cookie is HttpOnly, Secure, uses `SameSite=None`, and has sliding expiration enabled by configuration.

### Known gaps

- The exact approved invalid-credential message is not yet guaranteed across the complete API-to-UI path.
- Show/hide password, Remember Me, and Forgot Password are not implemented.
- The Login page's Create Account link targets `/auth/sign-up` rather than `/auth/sign-up/account`.
- Current sessions are persistent by default; the approved behavior distinguishes browser-session and remembered sessions.
- The approved seven-day remembered-session lifetime, absolute reauthentication limit, and session-expired message are not implemented as a complete product flow.
- Password recovery, password change, and active-session management are not implemented.
- F-004 must block unverified accounts and redirect valid pending users to `/auth/verify-email`.

## Scope

### Included

- Email-and-password login.
- Generic invalid-credential feedback.
- Cookie-backed authenticated sessions.
- Session restoration after refresh or browser reopening when persistence applies.
- Guest and authenticated route behavior.
- Logout from the authenticated header.
- Remember Me choice and approved session experience.
- Session-expiration user experience.
- Password recovery and password change.
- Future active-session viewing and revocation.
- Integration with F-004 for pending unverified accounts.

### Excluded

- Account-onboarding steps.
- Email-verification token generation and activation lifecycle.
- Administrative role definitions.
- Security thresholds, abuse detection, CSRF implementation, and cookie-hardening remediation details.
- User profile editing beyond the password-change entry point.

## Users and Permissions

| Actor | Allowed behavior |
|---|---|
| Guest | Open Login, submit credentials, open recovery, or navigate to account creation. |
| Pending unverified user | Cannot authenticate; valid credentials lead to `/auth/verify-email`. |
| Verified authenticated user | Access normal protected features and log out. |
| Verified administrator | Authenticate normally; access depends on separate administrative permissions. |

## User Flows

### Flow 1 — Successful login

1. User opens `/auth/login`.
2. User enters email and password.
3. Appetee validates the credentials and verification status.
4. Appetee creates a session according to Remember Me.
5. Appetee hydrates the current user.
6. User is redirected to `/home`.

### Flow 2 — Invalid credentials

1. User submits an invalid email/password combination.
2. No authenticated session is created.
3. Appetee displays `Invalid email or password.`
4. The user remains on Login.

### Flow 3 — Valid but unverified account

1. A pending user submits the correct email and password.
2. Appetee does not create an authenticated session.
3. Appetee redirects to `/auth/verify-email`.
4. F-004 displays the masked email, last-sent date, expiration date, and resend option.

### Flow 4 — Session restoration

1. Appetee starts or refreshes.
2. The frontend requests the current session.
3. When valid, Appetee hydrates the current user and protected routes remain available.
4. When missing, expired, or revoked, user-scoped state is cleared and the user is treated as a guest.

### Flow 5 — Logout

1. User selects Logout in the authenticated header.
2. Appetee clears the server cookie and client user-scoped state.
3. Appetee redirects to `/auth/login`.

## Functional Requirements

- **FR-001:** Login must accept email and password only.
- **FR-002:** Successful login must redirect to `/home`.
- **FR-003:** Invalid credentials must display `Invalid email or password.` without confirming account existence.
- **FR-004:** Login must offer Show/Hide Password, Remember Me, Forgot Password, and Create Account.
- **FR-005:** Create Account must open `/auth/sign-up/account`.
- **FR-006:** Guests opening protected routes must be redirected to `/auth/login`.
- **FR-007:** Authenticated users opening guest-only routes must be redirected to `/home`.
- **FR-008:** Logout must be available in the authenticated header and redirect to `/auth/login`.
- **FR-009:** A non-remembered login must use a browser-session cookie.
- **FR-010:** Remember Me must be unchecked by default and create a seven-day persistent session.
- **FR-011:** Normal activity may renew a remembered session, subject to the absolute session policy.
- **FR-012:** Multiple browser and device sessions are allowed.
- **FR-013:** Logout ends the current browser session only unless the user explicitly revokes more sessions.
- **FR-014:** An expired session must redirect to `/auth/login` and display `Your session expired. Please log in again.`
- **FR-015:** Correct credentials for an unverified account must redirect to `/auth/verify-email` without creating a session.
- **FR-016:** Password recovery, password change, and active-session management remain capabilities of F-002.

## Business Rules

- **BR-001:** Email is the only login identifier.
- **BR-002:** Only verified accounts can become authenticated.
- **BR-003:** Remember Me is an explicit user choice.
- **BR-004:** A remembered session lasts seven days with sliding renewal; the absolute reauthentication limit is 30 days.
- **BR-005:** Multiple simultaneous sessions are permitted.
- **BR-006:** Invalid login feedback remains generic.
- **BR-007:** Password and abuse-control rules are server-authoritative and referenced through E-004.

## Edge Cases and Failure Behavior

- Duplicate submit attempts must not create multiple login requests while one is pending.
- Network failure must keep the user on Login and show a non-account-specific retry message.
- A missing or invalid restored session clears user-scoped frontend state.
- If the account becomes unverified, disabled, or otherwise ineligible, no new session is created.
- If logout API communication fails, local state is still cleared and the user is returned to Login; server-side revocation behavior remains governed by session engineering.
- A throttled login may display `Too many login attempts. Please try again later.` without exposing thresholds.

## Data Requirements

### Login request

Target contract:

```ts
interface LoginRequest {
  email: string;
  password: string;
  rememberMe: boolean;
}
```

The current implementation sends only `email` and `password`; `rememberMe` is added when the approved session behavior is implemented.

### Authenticated session summary

```ts
interface UserSession {
  userId: number;
  username: string; // current implementation name; F-003 will migrate the semantic field toward displayName
}
```

The authentication cookie remains HttpOnly and is never exposed as frontend data.

### Session-scoped frontend state

Authentication/session state is global for the current identity and survives route changes. All account-scoped stores must be reset on logout, failed restoration, or identity change under E-013/E-019.

## Database Impact

### Existing tables used

- `users`
- `password_reset_tokens` for future password-recovery phases

### Schema changes

F-002 does not directly own the final server-side session persistence model. Multiple-device sessions, revocation, absolute lifetime, and session history are implemented under E-005 and consumed by this feature.

### Index changes

Current relevant indexes:

```text
users.uq_users_email (email)
password_reset_tokens.idx_prt_user_id (user_id)
password_reset_tokens.idx_prt_expires_at (expires_at)
```

When password reset is implemented, the token lookup must have a unique or otherwise selective index on the stored token hash. E-008 owns the migration mechanism and E-005/E-004 own the security policy.

### Data migration

No migration is required for the currently implemented login/session endpoints. Future session persistence and password-reset index changes must use E-008 migrations.

## API Endpoints

| Method | Endpoint | Purpose | State |
|---|---|---|---|
| `POST` | `/api/auth/login` | Validate credentials and create a session | Implemented |
| `GET` | `/api/auth/session` | Restore the current cookie-backed session | Implemented |
| `POST` | `/api/auth/logout` | End the current browser session | Implemented |
| `GET` | `/api/users/me` | Hydrate the current authenticated user | Implemented |
| `POST` | `/api/auth/password-recovery/request` | Request password-reset email | Planned |
| `POST` | `/api/auth/password-recovery/confirm` | Consume reset token and set new password | Planned |
| `PUT` | `/api/users/me/password` | Change password while authenticated | Planned |

Active-session listing/revocation endpoints are deferred until that phase is specified with E-005.

## Request Contracts

### `POST /api/auth/login`

```json
{
  "email": "user@example.com",
  "password": "example-password",
  "rememberMe": false
}
```

`rememberMe` is `false` by default.

### `POST /api/auth/logout`

No product payload is required.

## Response Contracts

### Successful login/session restore

```json
{
  "userId": 42,
  "username": "Mathieu"
}
```

The current field is `username`; F-003 defines the future display-name cleanup.

### Pending verification outcome

Correct credentials for an unverified account must not create a session. The API returns a safe machine-readable outcome such as:

```json
{
  "code": "email_verification_required"
}
```

The common error-envelope shape is owned by E-010. F-002 only requires a stable code that lets the frontend hand the user to F-004.

### Logout

`204 No Content`.

## Error Behavior

- Invalid credentials: `401` with the user-facing meaning `Invalid email or password.`
- Pending verified-required account: no session is created; return the stable verification-required outcome.
- Rate-limited login: `429` with retry information under E-004.
- Expired/missing restored session: `401`; frontend clears user-scoped state.
- Logout failure must not prevent local state cleanup.
- Validation and error-envelope formatting are governed by E-010.

## Delivery Phases

### Phase 1 — Email login and protected routing foundation

**Status:** Completed

#### User value delivered

- Existing verified accounts can log in, restore a cookie session, access protected routes, and log out.

#### Included work

- Product behavior: Email/password login, `/home` redirect, route guards, session restoration, and logout.
- Backend: See [`backend.md`](./backend.md).
- Frontend: See [`frontend.md`](./frontend.md).
- Data/API: Login, session, logout, and current-user endpoints.
- Documentation/assets: Existing architecture shown in [`assets/authentication-session-flow.svg`](./assets/authentication-session-flow.svg).

#### Tests and validation

- [x] Frontend auth facade and guard tests exist.
- [x] Backend API test project exists and covers authentication behavior.
- [ ] Complete intended-contract quality gates remain owned by E-017.

#### Phase completion criteria

- [x] Core login, restoration, guards, and logout are present.

### Phase 2 — Login experience completion

**Status:** Not started

#### User value delivered

- Users receive a complete, accessible login form with clear recovery and onboarding actions.

#### Included work

- Product behavior: Approved message, Show/Hide Password, Remember Me, Forgot Password entry, and corrected Create Account route.
- Backend: Accept Remember Me intent as required by Phase 3's session behavior.
- Frontend: See [`frontend.md`](./frontend.md).
- Data/API: Align the login request contract when Remember Me is introduced.

#### Tests and validation

- [ ] Component tests for password visibility, pending submission, validation, and links.
- [ ] Integration test for generic invalid credentials.
- [ ] Accessibility validation for labels, focus, status messages, and keyboard submission.

#### Phase completion criteria

- [ ] All approved Login interactions work.
- [ ] Invalid credentials use the approved generic message.
- [ ] Create Account opens `/auth/sign-up/account`.

### Phase 3 — Remembered sessions and expiration experience

**Status:** Not started

#### User value delivered

- Users choose whether the browser remembers them and receive predictable handling when a session ends.

#### Included work

- Product behavior: Browser-session cookie without Remember Me; seven-day persistent cookie with Remember Me; sliding renewal; 30-day absolute reauthentication; multi-device sessions; session-expired feedback.
- Backend: See [`backend.md`](./backend.md).
- Frontend: See [`frontend.md`](./frontend.md).
- Data/API: Remember Me intent and server-owned expiration behavior.

#### Tests and validation

- [ ] Integration tests for remembered and non-remembered cookie attributes.
- [ ] Idle, sliding, and absolute-expiration tests.
- [ ] Frontend expired-session redirect/message tests.
- [ ] Multi-browser behavior validation.

#### Phase completion criteria

- [ ] Session behavior matches the approved policy.
- [ ] Expired sessions clear scoped state and return to Login.

### Phase 4 — Password recovery

**Status:** Not started

#### User value delivered

- A user who forgot a password can recover access without support intervention.

#### Included work

- Product behavior: Generic recovery request, time-limited single-use recovery link, new-password entry, and clear outcomes.
- Backend: See [`backend.md`](./backend.md).
- Frontend: See [`frontend.md`](./frontend.md).
- Data/API: Recovery request and reset confirmation operations.

#### Tests and validation

- [ ] Valid, expired, used, invalid, and throttled token tests.
- [ ] Generic response and enumeration-resistance tests.
- [ ] End-to-end recovery flow.

#### Phase completion criteria

- [ ] Recovery is safe, usable, and fully tested.

### Phase 5 — Password change

**Status:** Not started

#### User value delivered

- An authenticated user can replace the current password from Profile.

#### Included work

- Product behavior: Current-password verification, new password and confirmation, success feedback, and session-effect rule.
- Backend: See [`backend.md`](./backend.md).
- Frontend: See [`frontend.md`](./frontend.md).
- Data/API: Authenticated password-change operation.

#### Tests and validation

- [ ] Current-password, policy, mismatch, and success tests.
- [ ] Authorization and session-effect tests.

#### Phase completion criteria

- [ ] Password change is available through the Profile entry point and follows the approved credential policy.

### Phase 6 — Active-session management

**Status:** Not started

#### User value delivered

- Users can understand and revoke active sessions when server-side session records are available.

#### Included work

- Product behavior: View current/other sessions, revoke one, and log out all other sessions.
- Backend: See [`backend.md`](./backend.md).
- Frontend: See [`frontend.md`](./frontend.md).
- Data/API: Session listing and revocation contracts.

#### Tests and validation

- [ ] Ownership and cross-user denial tests.
- [ ] Current-session and other-session revocation tests.
- [ ] UI tests for empty, loading, and failure states.

#### Phase completion criteria

- [ ] Users can manage only their own sessions.

## Work Status

### Completed

- Core email/password login.
- Cookie session creation and restoration.
- Authenticated and guest route guards.
- Current-user hydration.
- Header logout and Login redirect.

### In progress

- None.

### Remaining

- [ ] Phase 2 — Login experience completion.
- [ ] Phase 3 — Remembered sessions and expiration experience.
- [ ] Phase 4 — Password recovery.
- [ ] Phase 5 — Password change.
- [ ] Phase 6 — Active-session management.
- [ ] F-004 integration for unverified users.

## Acceptance Criteria

- [ ] **AC-001:** A verified user can log in with email and password and reaches `/home`.
- [ ] **AC-002:** Invalid credentials display `Invalid email or password.`
- [ ] **AC-003:** A valid unverified user is redirected to `/auth/verify-email` without receiving a session.
- [ ] **AC-004:** Guests cannot access protected routes.
- [ ] **AC-005:** Authenticated users cannot remain on guest-only routes.
- [ ] **AC-006:** Remember Me follows the approved browser-session and seven-day behavior.
- [ ] **AC-007:** Expired sessions return to Login with the approved message.
- [ ] **AC-008:** Logout from the header clears the current session and returns to `/auth/login`.

## Risks and Open Questions

- Password-change session revocation behavior must be finalized before Phase 5 implementation.
- Exact active-session device metadata must be minimized before Phase 6.
- Email-delivery implementation for password recovery will share infrastructure concerns with F-004 but remains a separate product flow.

## Decisions

- Login uses email only.
- Successful login always opens `/home`; attempted-route return is not currently required.
- Invalid credentials use a generic message.
- Remember Me is unchecked by default.
- Multiple devices are allowed.
- Logout ends the current browser session and redirects to Login.
- Logout remains in the authenticated header rather than being duplicated in Profile.
- Email verification is owned by F-004.

## Related Documents

- [Backend design](./backend.md)
- [Frontend design](./frontend.md)
- [Feature assets](./assets/)

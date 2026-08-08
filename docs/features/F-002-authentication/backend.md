# F-002 — Authentication: Backend Design

**Status:** Active
**Implementation status:** Partially implemented
**Version:** 1.0
**Owner:** Mathieu Galidie
**Last updated:** 2026-08-06
**Dependencies:** F-003, F-004, F-008
**Related engineering initiatives:** E-004, E-005, E-008, E-017

## Canonical Contract

The feature `README.md` owns the canonical data model, database impact, endpoint list, request/response contracts, and error behavior. This document describes only implementation responsibilities for this technical side and must not redefine those contracts.

## Purpose

This document defines backend-specific behavior for credentials, cookie sessions, restoration, logout, recovery, password change, and future session management. Security remediation details remain in the referenced engineering initiatives.

## Current Backend State

### Implemented

- `AuthController` exposes `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/session`, and sign-up integration.
- `AuthService` validates input, verifies credentials through auth queries, creates the authentication ticket, and signs out.
- Cookie authentication returns `401` and `403` status codes rather than HTML redirects.
- Cookie configuration is HttpOnly, Secure, `SameSite=None`, uses a configurable expiration value, and enables sliding expiration.
- `GET /api/users/me` validates the authenticated principal and returns the current user.
- Password hashing uses the registered `IPasswordHasher` implementation.

### Known gaps

- Login has no Remember Me input or per-request persistence choice.
- Approved seven-day remembered and browser-session behavior is not represented as a complete contract.
- The absolute reauthentication limit and user-visible expiration reason are not present.
- Pending verification is not represented in login outcomes.
- Password recovery, password change, server-side session records, and revocation APIs are absent.

## Affected Modules

- API: `AuthController`, future recovery/session endpoints, `UsersController` current-user lookup.
- Application: `AuthService`, auth contracts, password policy, recovery/change/session use cases.
- Domain: account verification status and future session/recovery entities where introduced.
- Infrastructure: auth queries/repository, password hasher, cookie service, token storage, email delivery integration, database migrations.

## Use Cases

### Use Case 1 — Log in

- Actor: guest with a verified account.
- Input: normalized email, password, Remember Me.
- Server-owned fields: credential result, account status, claims, issued/expiry times.
- Authorization and ownership: anonymous endpoint; resulting principal belongs only to the matched account.
- Success result: session summary and authentication cookie.
- Failure behavior: generic invalid credentials, pending-verification result, throttled result, or validation error.

### Use Case 2 — Restore session

- Actor: browser presenting an authentication cookie.
- Input: cookie ticket.
- Server-owned fields: principal validity and current account eligibility.
- Authorization and ownership: only the authenticated principal's session.
- Success result: session summary.
- Failure behavior: `401` for missing, invalid, expired, or revoked session.

### Use Case 3 — Log out

- Actor: current browser session.
- Input: authentication cookie.
- Server-owned fields: cookie revocation/removal.
- Authorization and ownership: current session only.
- Success result: `204 No Content`.
- Failure behavior: safe idempotent result; client still clears local state.

## Data Model

### Tables and relationships

- Current phase: users and cookie authentication ticket.
- Password recovery: hashed single-use recovery token linked to one user with issue, expiry, and used timestamps.
- Active sessions: server-side session record linked to one user when Phase 6 is implemented.

### Constraints and indexes

- Unique normalized email remains authoritative.
- Recovery token hashes must be unique and indexed for lookup.
- Session IDs must be unique and indexed by user and revocation/expiry state.

### Ownership and deletion behavior

- Users can access and revoke only their own session records.
- Account closure must revoke sessions and remove or expire recovery material according to E-016.

### Concurrency and audit

- Token consumption and password update must be atomic.
- Session revocation and password-change version updates must prevent stale tickets from remaining trusted when policy requires revocation.

## API Intent

| Operation | Method and route | Permission | Notes |
|---|---|---|---|
| Login | `POST /api/auth/login` | Guest | Email, password, Remember Me; generic invalid result. |
| Restore session | `GET /api/auth/session` | Authenticated cookie | Returns current session summary. |
| Logout | `POST /api/auth/logout` | Current session | Ends current browser session. |
| Request recovery | Route to be finalized | Guest | Generic response regardless of account existence. |
| Confirm recovery | Route to be finalized | Guest with token | Single-use, time-limited token. |
| Change password | Route to be finalized | Authenticated user | Requires current password. |
| List sessions | Route to be finalized | Authenticated user | Own sessions only. |
| Revoke session | Route to be finalized | Authenticated user | Own session only. |

## Validation and Security Rules

- Normalize email consistently before lookup.
- Apply the server-owned password policy referenced by E-004.
- Never return different invalid-credential messages based on account existence.
- Validate verification status before issuing a cookie.
- Keep cookies HttpOnly and server-issued.
- Remember Me changes persistence; it does not weaken server validation.
- State-changing authentication operations follow E-005's request-intent protections.
- Do not store raw recovery or session secrets.

## Transactions, Idempotency, and Failure Recovery

- Transaction boundary: credential state changes and token consumption must complete atomically.
- Concurrency rule: only one use of a single-use recovery token can succeed.
- Retry or idempotency rule: logout is safe to repeat; recovery-request responses remain generic.
- External-resource failure handling: recovery email failure must not claim successful delivery internally; user-facing response remains privacy safe and retryable according to the final delivery contract.

## Backend Work by Feature Phase

### Phase 1 — Email login and protected routing foundation

**Status:** Completed

- Changes: Existing login, session, logout, cookie authentication, and current-user hydration support.
- Migration: None for the current cookie-only implementation.
- Authorization and ownership: Session principal identifies the current user.
- Unit tests: Existing service/query coverage where present.
- Integration tests: Authentication endpoints exist in the API test project.
- Failure and negative tests: Retain invalid-credential and missing-session cases.

### Phase 2 — Login experience completion

**Status:** Not started

- Changes: Extend login contract with Remember Me intent and stable product outcomes.
- Migration: None required unless session records are introduced early.
- Authorization and ownership: Anonymous login endpoint with no account disclosure.
- Unit tests: Validation and result mapping.
- Integration tests: Generic invalid message and pending-verification outcome.
- Failure and negative tests: Invalid email, wrong password, throttling behavior through E-004.

### Phase 3 — Remembered sessions and expiration experience

**Status:** Not started

- Changes: Browser-session versus seven-day persistence, sliding renewal, 30-day absolute limit, and revocation/validation integration.
- Migration: Add session/security-version data if the selected E-005 design requires it.
- Authorization and ownership: Session records belong to one user.
- Unit tests: Cookie properties and expiry calculations.
- Integration tests: Refresh, expiry, revocation, and concurrent devices.
- Failure and negative tests: Stale, copied, disabled, changed-password, and revoked tickets as defined by E-005.

### Phase 4 — Password recovery

**Status:** Not started

- Changes: Request, token generation, confirmation, password replacement, and token invalidation.
- Migration: Recovery-token storage and indexes.
- Authorization and ownership: Token proves possession; responses do not disclose account existence.
- Unit tests: Token lifecycle and password policy.
- Integration tests: Valid, expired, used, invalid, and repeat requests.
- Failure and negative tests: Enumeration, concurrency, and email-delivery failure.

### Phase 5 — Password change

**Status:** Not started

- Changes: Authenticated current-password verification and password replacement.
- Migration: Security/session version if required for revocation.
- Authorization and ownership: Current authenticated user only.
- Unit tests: Current-password and new-password validation.
- Integration tests: Own account success and stale-session effects.
- Failure and negative tests: Wrong current password and cross-user attempts.

### Phase 6 — Active-session management

**Status:** Not started

- Changes: Persist, list, and revoke session records.
- Migration: Session table with user, issue, last-seen, expiry, revocation, and minimized device metadata.
- Authorization and ownership: Own sessions only.
- Unit tests: Session state transitions.
- Integration tests: List/revoke one/revoke all others.
- Failure and negative tests: Cross-user IDs, stale session, and current-session revocation.

## Validation Commands

```text
dotnet build Appetee.sln
dotnet test Appetee.sln
```

## Backend Decisions

- Email remains the only credential identifier.
- F-004 owns verification tokens and pending-account activation; F-002 consumes account status during login.
- Cookie/session security implementation details remain canonical in E-005.
- Abuse thresholds remain canonical in E-004.

## Open Questions

- Finalize password-change session revocation before Phase 5.
- Select the server-side session-record design through E-005 before Phase 6.

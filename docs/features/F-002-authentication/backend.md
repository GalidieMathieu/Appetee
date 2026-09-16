# F-002 — Authentication: Backend Design

**Status:** Active
**Implementation status:** Phases 1–4 implemented; Phase 4 production ACS Email validation pending
**Version:** 1.3
**Owner:** Mathieu Galidie
**Last updated:** 2026-08-21
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
- Login accepts and validates the `rememberMe` intent while preserving generic invalid-credential behavior.
- Login outcomes distinguish authenticated, invalid-credential, and verification-required results without issuing a cookie for failures.
- Non-remembered login creates a browser-session cookie; remembered login creates a seven-day persistent cookie.
- Sliding renewal uses a shared server clock, while an immutable issuance claim enforces the 30-day absolute reauthentication limit.
- Expired or rejected cookies return `401` with `code: "session_expired"` and the approved message.
- Cookie configuration is HttpOnly, Secure, and `SameSite=None`.
- `GET /api/users/me` validates the authenticated principal and returns the current user.
- Password hashing uses the registered `IPasswordHasher` implementation.
- Anonymous recovery request and confirmation endpoints are implemented with generic request outcomes and a stable invalid-token error.
- Recovery issuance stores only a SHA-256 hash of a 256-bit random token and applies a serialized 60-second per-account cooldown.
- Recovery confirmation locks the token row, enforces the 60-minute lifetime, replaces the password, and invalidates all outstanding account tokens in one transaction.
- Azure Communication Services Email delivery is implemented behind `IPasswordRecoveryEmailSender` using the official singleton `EmailClient`; failed delivery removes the undelivered token without logging the bearer secret.
- Local Development can load `CommunicationEmail:AccessKey` from the `CommunicationEmail--AccessKey` Key Vault secret through `DefaultAzureCredential`; App Service consumes its platform-resolved Key Vault reference as ordinary configuration.
- `Program.cs` is a minimal composition root; API, infrastructure, authentication, application, and middleware registration live in focused startup extensions with typed validation.

### Known gaps

- Password change, server-side session records, and revocation APIs are absent.
- Production ACS endpoint, sender, and Key Vault-backed access key remain deployment configuration and require a live delivery check. Startup fails when the endpoint is not absolute HTTPS or any required ACS setting is missing or invalid.
- Persisted verification status is not yet available to the login query; F-004 will supply that state to the implemented verification-required outcome.
- Login throttling remains E-004 work.
- Disabled/deleted-account, password-change, permission-change, copied-cookie, and explicit-revocation validation remain E-005 work.

## Affected Modules

- API: `AuthController`, future session endpoints, `UsersController` current-user lookup.
- Application: `AuthService`, `PasswordRecoveryService`, auth contracts, password policy, change/session use cases.
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
- Failure behavior: `401` for missing authentication; expired or rejected cookies additionally return `code: "session_expired"` and the approved user message.

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
| Request recovery | `POST /api/auth/password-recovery/request` | Guest | Generic `202` regardless of account existence or hidden cooldown. |
| Confirm recovery | `POST /api/auth/password-recovery/confirm` | Guest with token | `204` on success; one stable `400` for invalid, expired, or used proof. |
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
- Keep the public reset-page URL in environment-specific configuration and point it to the frontend `/auth/reset-password` route. Keep the ACS access key in Key Vault, never tracked JSON, local user secrets, or source code.

### Password-recovery email configuration

The backend binds these environment-specific settings:

| ASP.NET key | Environment-variable form | Source |
|---|---|---|
| `PasswordRecovery:ResetPageUrl` | `PasswordRecovery__ResetPageUrl` | Local/deployed frontend URL; non-secret |
| `CommunicationEmail:Endpoint` | `CommunicationEmail__Endpoint` | ACS Communication Service endpoint; non-secret |
| `CommunicationEmail:FromAddress` | `CommunicationEmail__FromAddress` | Verified ACS MailFrom address; non-secret |
| `CommunicationEmail:AccessKey` | `CommunicationEmail__AccessKey` | Key Vault secret `CommunicationEmail--AccessKey`; secret |
| `KeyVault:Uri` | `KeyVault__Uri` | Local Development Key Vault URI; non-secret |

For local Development, set `KeyVault:Uri`, `CommunicationEmail:Endpoint`, and `CommunicationEmail:FromAddress` in development configuration or environment variables. Sign in with Azure CLI or Visual Studio so `DefaultAzureCredential` can read `CommunicationEmail--AccessKey`; never copy the key into local JSON. A local configuration shape may use placeholders such as:

```json
{
  "KeyVault": {
    "Uri": "https://<YOUR-KEY-VAULT>.vault.azure.net/"
  },
  "CommunicationEmail": {
    "Endpoint": "https://<YOUR-ACS-RESOURCE>.communication.azure.com",
    "FromAddress": "DoNotReply@<YOUR-AZURE-MANAGED-DOMAIN>.azurecomm.net"
  },
  "PasswordRecovery": {
    "ResetPageUrl": "https://localhost:4200/auth/reset-password"
  }
}
```

For an Azure development slot and production, configure the four environment-variable forms above in App Service. `CommunicationEmail__AccessKey` must be an App Service Key Vault reference to `CommunicationEmail--AccessKey`; App Service resolves it through its managed identity with the `Key Vault Secrets User` role. The application does not resolve App Service Key Vault references itself.

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

**Status:** Completed

- Changes: Login contract includes Remember Me intent; invalid credentials and verification-required results have stable product outcomes.
- Migration: None required unless session records are introduced early.
- Authorization and ownership: Anonymous login endpoint with no account disclosure.
- Unit tests: Validation, normalized email, Remember Me forwarding, and result mapping are covered.
- Integration tests: Generic invalid message and pending-verification outcome are covered without cookie issuance.
- Failure and negative tests: Invalid email and wrong password are covered; throttling remains E-004.

### Phase 3 — Remembered sessions and expiration experience

**Status:** Completed

- Changes: Browser-session versus seven-day persistence, sliding renewal, 30-day absolute limit, stable expiration response, and independent browser sessions are implemented.
- Migration: None; Phase 3 uses protected cookie tickets. Future E-005 session/security-version storage requires a separate migration.
- Authorization and ownership: Each ticket identifies one authenticated user; multiple browser tickets are permitted and logout clears only the current browser.
- Unit tests: Cookie properties, fail-closed issuance-claim parsing, and absolute-expiry calculations are covered.
- Integration tests: Cookie attributes, idle expiry, sliding renewal, absolute expiry, and concurrent browsers are covered.
- Failure and negative tests: Missing, malformed, idle-expired, and absolute-expired tickets are covered. Copied, disabled, changed-password, and explicitly revoked tickets remain E-005 work.

### Phase 4 — Password recovery

**Status:** Implemented — production ACS Email configuration and live delivery validation pending

- Changes: Generic request, 256-bit token generation, SHA-256 storage hash, ACS Email SDK delivery, confirmation, password replacement, and account-wide token invalidation are implemented.
- Migration: `20260823_005_f002_phase4_password_recovery.sql` adds unique token-hash lookup and the user/creation-time cooldown index.
- Authorization and ownership: The anonymous request ignores ambient session identity; the bearer token proves reset possession, and request responses do not disclose account existence.
- Unit tests: Token generation/hashing, generic outcomes, delivery cleanup, invalid-token mapping, and the 8–128 character password boundary are covered.
- Integration tests: Valid, expired, used, unknown, repeated, throttled issuance, and password-login replacement paths are covered.
- Failure and negative tests: Known/unknown response parity, concurrent consumption, ACS failure cleanup, sensitive-data-safe logging, startup configuration validation, and forward-migration indexes are covered.

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
dotnet build Appetee.sln --configuration Release --no-restore
dotnet test tests/Appetee.Api.Tests/Appetee.Api.Tests.csproj --configuration Release --no-restore
```

Recorded Phase 4 validation includes a warning-free build, the complete API test suite, focused recovery coverage, and a forward-migration index check. Exact test totals are intentionally omitted so this design document does not become stale as unrelated backend tests are added.

## Backend Decisions

- Email remains the only credential identifier.
- F-004 owns verification tokens and pending-account activation; F-002 consumes account status during login.
- Cookie/session security implementation details remain canonical in E-005.
- Abuse thresholds remain canonical in E-004.
- Remember Me is false by default, uses a browser-session cookie when false, and uses a seven-day persistent cookie when true.
- Sliding activity may renew the seven-day idle window, but never the 30-day absolute lifetime.

## Open Questions

- Finalize password-change session revocation before Phase 5.
- Select the server-side session-record design through E-005 before Phase 6.

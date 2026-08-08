# F-004 — Email Verification: Backend Design

**Status:** Active
**Implementation status:** Not started
**Version:** 1.0
**Owner:** Mathieu Galidie
**Last updated:** 2026-08-06
**Dependencies:** F-002, F-003
**Related engineering initiatives:** E-004, E-005, E-008, E-016, E-017

## Canonical Contract

The feature `README.md` owns the canonical data model, database impact, endpoint list, request/response contracts, and error behavior. This document describes only implementation responsibilities for this technical side and must not redefine those contracts.

## Purpose

This document defines pending-account state, verification tokens, email delivery, activation, resend enforcement, and scheduled account lifecycle.

## Current Backend State

### Implemented

- No F-004 backend behavior is implemented.
- Current sign-up creates the user and immediately calls the cookie sign-in service.
- Current login query/service has no verification-status branch.

### Known gaps

- Schema, migrations, repository/query operations, email provider integration, token service, status endpoints, resend controls, scheduled reminder/cleanup, and tests are all required.

## Affected Modules

- API: verification status, resend, and confirmation endpoints; modified sign-up/login outcomes.
- Application: pending registration, send, confirm, resend, reminder, and cleanup use cases.
- Domain: account status and verification-token lifecycle.
- Infrastructure: MySQL migrations/repositories, secure token generation/hashing, email provider, background scheduling/queue, observability.

## Use Cases

### Use Case 1 — Create pending account

- Actor: guest completing F-003.
- Input: validated onboarding payload.
- Server-owned fields: pending status, creation/expiry timestamps, token, send timestamps.
- Authorization and ownership: new pending account only.
- Success result: verification status summary; no cookie.
- Failure behavior: no partial preference/account state, or explicit pending-delivery state if the selected email architecture commits before send.

### Use Case 2 — Read verification status

- Actor: pending user with a safe verification context established by onboarding or validated login.
- Input: opaque pending-flow context; not an arbitrary email alone.
- Server-owned fields: mask, sent/expiry/account-expiry/retry timing, state.
- Authorization and ownership: only the pending account represented by the context.
- Success result: minimized status DTO.
- Failure behavior: missing/deleted/active state without exposing unrelated accounts.

### Use Case 3 — Confirm token

- Actor: holder of the verification link.
- Input: raw opaque token.
- Server-owned fields: token hash lookup, expiry, invalidation, account status.
- Authorization and ownership: token bound to one pending user.
- Success result: active account and consumed token.
- Failure behavior: expired, invalid, used, invalidated, already active, or deleted.

### Use Case 4 — Resend

- Actor: pending user with valid pending-flow context.
- Input: resend request.
- Server-owned fields: cooldown and broader rate state, replacement token, timestamps.
- Authorization and ownership: same pending account.
- Success result: new sent/expiry/retry timing.
- Failure behavior: Retry-After, general send failure, or no longer pending.

### Use Case 5 — Reminder and deletion

- Actor: background lifecycle worker.
- Input: current authoritative time and eligible pending records.
- Server-owned fields: reminder/deletion eligibility and idempotency markers.
- Authorization and ownership: system operation limited to pending accounts.
- Success result: reminder once at day five; deletion at day seven.
- Failure behavior: retryable item-level failure without affecting active accounts.

## Data Model

### Tables and relationships

Recommended target:

- `users`
  - account status such as `pending_verification` or `active`.
  - `email_verified_at` nullable.
  - `pending_expires_at` for pending accounts.
  - original creation timestamp.
- `email_verification_tokens`
  - user ID.
  - cryptographic token hash.
  - issued timestamp.
  - expiry timestamp.
  - used timestamp nullable.
  - invalidated timestamp nullable.
- Optional email-delivery/outbox record if the selected delivery architecture requires durable retries and audit of message state.

### Constraints and indexes

- Unique normalized user email.
- Unique token hash.
- Index pending users by status and pending expiry for lifecycle scans.
- Index verification tokens by user and active/expiry state.
- At most the intended number of currently valid verification tokens per pending user; accepted resend invalidates prior ones atomically.

### Ownership and deletion behavior

- Token belongs to one user and cannot activate another account.
- Deleting an expired pending user removes preference rows and verification tokens through verified transactional/cascade behavior.
- Active users are never selected by pending cleanup.

### Concurrency and audit

- Token consumption and account activation occur in one transaction with a conditional pending-state update.
- Concurrent confirm attempts allow one success.
- Resend cooldown check, old-token invalidation, new-token creation, and last-sent update are atomic before/during durable message dispatch according to the chosen outbox design.
- Reminder and cleanup workers use idempotent eligibility updates.

## API Intent

| Operation | Method and route | Permission | Notes |
|---|---|---|---|
| Get pending verification status | Route to be finalized | Pending-flow context | Returns masked/minimized timestamps and retry timing. |
| Resend verification | Route to be finalized | Pending-flow context | Backend-enforced cooldown and E-004 broader limits. |
| Confirm verification | Route to be finalized | Opaque token | Single-use activation result. |
| Login integration | `POST /api/auth/login` | Guest | Correct pending credentials return verification-required outcome, no cookie. |
| Onboarding integration | `POST /api/auth/sign-up` or future route | Guest | Creates pending account and initial verification, no cookie. |

## Validation and Security Rules

- Generate high-entropy opaque tokens with a cryptographically secure generator.
- Store token hashes, never raw tokens.
- Bind tokens to one user and purpose.
- Verification token lifetime is 24 hours.
- Validate account is pending before issue, resend, or activation.
- Use a safe pending-flow context so status/resend is not driven by arbitrary email alone.
- Backend minimum resend delay is 60 seconds; broader limits are defined by E-004.
- Return authoritative retry duration and do not create/send when rejected.
- Do not extend `pending_expires_at` on resend.
- State-changing endpoints follow E-005 request-intent controls where cookie context is used.
- Email/log telemetry must not contain raw tokens or unnecessary personal data.

## Transactions, Idempotency, and Failure Recovery

- Transaction boundary: account activation plus token consumption; resend state change plus replacement-token issuance; pending deletion plus related active data cleanup.
- Concurrency rule: one activation and controlled resend acceptance under concurrent requests.
- Retry or idempotency rule: confirmation is safe to repeat with already-verified/used result; reminder and cleanup are idempotent; resend uses authoritative cooldown.
- External-resource failure handling: use a reviewed outbox/queue or explicit delivery-state design so database and email-provider failures are recoverable and observable.

## Backend Work by Feature Phase

### Phase 1 — Pending-account registration

**Status:** Not started

- Changes: Account state, pending expiry, secure initial token, email send, sign-up response, and remove automatic cookie creation.
- Migration: User status/timestamps and verification token table.
- Authorization and ownership: New pending account only.
- Unit tests: State/timestamp/token generation and no-cookie behavior.
- Integration tests: Transactional creation, preference rows, initial email/outbox, duplicate email.
- Failure and negative tests: Email failure, invalid preferences, and retry behavior.

### Phase 2 — Verification-pending experience

**Status:** Not started

- Changes: Safe pending-flow context and minimized status endpoint; login pending outcome.
- Migration: Context/session storage if required by selected design.
- Authorization and ownership: Pending account only, no arbitrary email lookup.
- Unit tests: Masking, timestamp, and state mapping.
- Integration tests: Onboarding and login entry paths, refresh/status retrieval.
- Failure and negative tests: Active, deleted, unrelated, invalid context.

### Phase 3 — Email confirmation and account activation

**Status:** Not started

- Changes: Token lookup/hash/consume, conditional activation, result contract.
- Migration: Token state columns/indexes.
- Authorization and ownership: Token-bound pending account.
- Unit tests: Validity and transition rules.
- Integration tests: Valid/expired/invalid/used/invalidated/already-active.
- Failure and negative tests: Concurrent token use and deleted account.

### Phase 4 — Protected resend flow

**Status:** Not started

- Changes: 60-second cooldown, E-004 partitions, Retry-After result, old-token invalidation, new token/email.
- Migration: Last-send and rate state as required by selected implementation.
- Authorization and ownership: Pending account context only.
- Unit tests: Timing and replacement-token rules.
- Integration tests: Accepted, cooldown, broader limit, concurrent requests, delivery failure.
- Failure and negative tests: Ensure no token/email/deadline extension on rejection.

### Phase 5 — Pending-account lifecycle

**Status:** Not started

- Changes: Scheduled five-day reminder and seven-day deletion with idempotent state.
- Migration: Reminder-sent marker or durable lifecycle/outbox records as needed.
- Authorization and ownership: System worker; pending status condition is mandatory.
- Unit tests: Eligibility boundaries.
- Integration tests: Reminder once, deletion, cleanup, email reuse.
- Failure and negative tests: Active account exclusion, partial failure, retries, clock boundaries.

## Validation Commands

```text
dotnet build Appetee.sln
dotnet test Appetee.sln
```

## Backend Decisions

- Use pending status on the user account rather than creating an authenticated account immediately.
- Pending preferences remain associated with that account and are deleted with it after timeout.
- Resend protection exists in both client and server; server state is authoritative.
- Raw verification tokens are never persisted.
- A durable/recoverable email-delivery design must be selected before Phase 1 completion.

## Open Questions

- Select email provider, sender domain, and durable delivery/outbox implementation.
- Finalize safe pending-flow context and endpoint names.
- Decide the exact background-worker hosting model for reminder/cleanup.

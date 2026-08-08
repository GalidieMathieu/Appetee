# F-004 — Email Verification

**Status:** Active
**Implementation status:** Not started
**Version:** 1.0
**Owner:** Mathieu Galidie
**Last updated:** 2026-08-06
**Dependencies:** F-002, F-003, F-005
**Related engineering initiatives:** E-004, E-005, E-008, E-016, E-017

## Goal

Verify that a new user controls the submitted email address before allowing Login or access to Appetee, while preventing resend abuse and removing abandoned pending accounts.

## User Problem

Appetee must prevent automated or mistaken account creation from producing unlimited active accounts. A legitimate new user needs a clear verification page, predictable resend behavior, and a safe way to complete activation after receiving the email.

## Current Behavior

Implementation baseline reviewed from frontend `main` and backend `master` on 2026-08-06.

### Implemented

- None of the F-004 product flow is implemented.
- Current onboarding creates an account and immediately creates an authenticated cookie session.
- Current login does not check email-verification status.
- No verification route, token storage, email delivery, resend cooldown, reminder, pending-account status, or cleanup job exists.

### Known gaps

- Complete frontend and backend implementation is required.
- The users data model must represent pending and active accounts.
- Verification email infrastructure and templates must be selected.
- Frontend and backend resend restrictions must work together.
- Lifecycle cleanup must remove expired pending accounts and their preference data.

## Scope

### Included

- Pending unverified account state after onboarding.
- Initial verification email.
- `/auth/verify-email` pending page.
- Single-use, time-limited verification links.
- Account activation.
- Valid, expired, invalid, and already-used link outcomes.
- Frontend 60-second resend countdown.
- Backend authoritative resend cooldown and broader abuse restrictions.
- Display of masked email, last-sent date, and link-expiration date.
- Five-day reminder.
- Seven-day pending-account deletion.
- Redirect to Login after successful activation.
- Login integration for correct credentials on a pending account.

### Excluded

- General Login behavior, owned by F-002.
- Onboarding form steps, owned by F-003.
- Exact abuse thresholds and monitoring implementation, owned by E-004.
- General data-retention program, owned by E-016.
- Role and administrative permission definitions.
- Automatic Login after verification.

## Users and Permissions

| Actor | Allowed behavior |
|---|---|
| Guest with no pending account | Can complete F-003 to begin verification. |
| Pending unverified user | Can view verification status, resend within limits, and activate through a valid link. |
| Verified user | Can go to Login; already-used verification links do not change the account. |
| Administrator | Must also verify email before first Login unless provisioned through a separate future administrative process. |

## User Flows

### Flow 1 — Initial verification after onboarding

1. User completes F-003.
2. Appetee creates a pending account and initial preferences.
3. Appetee creates a single-use verification token.
4. Appetee sends the verification email.
5. No authenticated cookie is created.
6. Appetee opens `/auth/verify-email`.
7. The page displays the masked email, sent date, and expiration date.

### Flow 2 — Pending user attempts Login

1. Pending user submits correct email and password to F-002.
2. Appetee validates the credentials but does not create a session.
3. Appetee redirects to `/auth/verify-email`.
4. The page shows the most recent verification email date and lets the user resend when allowed.

### Flow 3 — Resend verification

1. User selects Resend Verification Email.
2. Frontend disables the button while pending.
3. Backend enforces the 60-second minimum delay and broader E-004 limits.
4. If accepted, previous unused tokens are invalidated and a new email is sent.
5. Backend returns authoritative sent, expiry, and retry timing.
6. Frontend displays success and starts the countdown.
7. Resending does not extend the seven-day account-deletion deadline.

### Flow 4 — Verify successfully

1. User opens the link before it expires.
2. Appetee validates and consumes the token atomically.
3. Account status becomes active and `email_verified_at` is recorded.
4. Appetee redirects to `/auth/login`.
5. Login displays `Your email has been verified. You can now log in.`

### Flow 5 — Expired or invalid link

1. User opens an expired, invalid, or already-used link.
2. Appetee displays the appropriate safe outcome.
3. Expired/invalid outcomes offer Resend and Back to Login where applicable.
4. Already-verified outcomes offer Go to Login.

### Flow 6 — Pending-account expiration

1. Pending account reaches five days without verification.
2. Appetee sends one reminder stating that deletion will occur in two days.
3. At seven days, Appetee deletes the pending account, its initial preferences, and outstanding tokens.
4. The email can be registered again.

## Functional Requirements

- **FR-001:** Successful onboarding must create a pending unverified account and no authenticated session.
- **FR-002:** An initial verification email must be sent to the submitted address.
- **FR-003:** `/auth/verify-email` must display a masked email, authoritative last-sent timestamp, and link-expiration timestamp in the user's local timezone.
- **FR-004:** Verification links must be opaque, single-use, and expire after 24 hours.
- **FR-005:** Successful verification must activate the account and redirect to `/auth/login` without automatic Login.
- **FR-006:** Unverified accounts cannot authenticate or access protected features.
- **FR-007:** Correct Login credentials for a pending account must redirect to `/auth/verify-email`.
- **FR-008:** Resend must have a visible 60-second frontend countdown and a backend-authoritative minimum delay.
- **FR-009:** When the backend rejects a resend due to cooldown, it must return the remaining retry duration without creating a token or sending email.
- **FR-010:** Accepted resend must invalidate previous unused tokens and return updated sent/expiry timing.
- **FR-011:** Resending must not extend the seven-day pending-account deadline.
- **FR-012:** A reminder must be sent after five days.
- **FR-013:** Pending accounts must be deleted after seven days.
- **FR-014:** Deletion must remove pending onboarding preferences and invalidate outstanding tokens.
- **FR-015:** Deleted pending emails may register again.
- **FR-016:** The page must provide Back to Login and resend actions where applicable.

## Business Rules

- **BR-001:** Email ownership verification is mandatory before first Login.
- **BR-002:** Verification-link lifetime is 24 hours.
- **BR-003:** Pending-account lifetime is seven days from original creation.
- **BR-004:** Reminder occurs after five days and does not modify the deadline.
- **BR-005:** Frontend cooldown is user experience only; backend enforcement is authoritative.
- **BR-006:** New accepted resend invalidates previous unused tokens.
- **BR-007:** Verification does not grant a role; normal versus administrator access is evaluated after Login.
- **BR-008:** Timestamps originate from the backend, not page-load time.

## Edge Cases and Failure Behavior

- Email-send failure leaves an explicit pending-delivery state and a retry path; it must not create an authenticated account.
- Multiple verification-link clicks allow only one activation; later clicks report already verified or invalid/used safely.
- Concurrent resend requests must not create uncontrolled valid tokens or multiple accepted sends.
- Refreshing the verification page retrieves current authoritative status and cooldown timing.
- If the pending account was deleted, the page explains that the account is no longer available and directs the user to register again.
- Invalid tokens do not expose account or token internals.
- Backend throttling may apply broader limits than the visible 60-second delay and returns safe retry feedback.
- Cleanup failure must be observable and retryable without deleting active accounts.

## Data Requirements

### Pending account

The account record must support:

```text
status
created_at
pending_expires_at
email_verified_at
verification_reminder_sent_at
```

Target account states for this feature:

```text
pending
active
```

Future disabled/deleted states may be introduced by other features without changing the verification rules.

### Verification token

Only a hash of the email token is stored.

```ts
interface EmailVerificationTokenRecord {
  id: number;
  userId: number;
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
  invalidatedAt: string | null;
}
```

### Verification status view

```ts
interface EmailVerificationStatus {
  state: 'pending' | 'verified' | 'expired_account';
  maskedEmail: string;
  lastSentAt: string | null;
  tokenExpiresAt: string | null;
  pendingAccountExpiresAt: string;
  resendAvailableAt: string | null;
}
```

All timestamps originate from the backend and are returned as UTC/offset-aware timestamps. The browser formats them in the user's local timezone.

## Database Impact

### Existing tables used

- `users`
- `user_diets`
- `user_ingredient_restrictions`

### Schema changes

Add pending-account lifecycle fields to `users`:

```text
status
email_verified_at
pending_expires_at
verification_reminder_sent_at
```

Add:

```text
email_verification_tokens
```

with token hash, user ownership, creation/expiry, use, and invalidation timestamps.

### Index changes

Required access patterns:

```text
users(status, pending_expires_at)
email_verification_tokens(token_hash) UNIQUE
email_verification_tokens(user_id, created_at)
email_verification_tokens(expires_at)
```

The exact migration definitions are owned by E-008.

### Data migration

Existing legitimate users are migrated to `status = active` with a documented verified baseline so the feature does not lock out current test accounts.

New registrations after F-004 activation are created as `pending`.

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/auth/email-verification/status` | Read authoritative pending/verified status using the email known by the current verification flow |
| `POST` | `/api/auth/email-verification/resend` | Request a new verification email |
| `POST` | `/api/auth/email-verification/confirm` | Validate and consume a verification token |

The email link opens a frontend route that extracts the opaque token and submits it to the confirm endpoint. Raw verification tokens must not be logged.

## Request Contracts

### Status

```json
{
  "email": "user@example.com"
}
```

### Resend

```json
{
  "email": "user@example.com"
}
```

### Confirm

```json
{
  "token": "opaque-email-token"
}
```

## Response Contracts

### Pending status

```json
{
  "state": "pending",
  "maskedEmail": "m******@example.com",
  "lastSentAt": "2026-08-07T04:00:00Z",
  "tokenExpiresAt": "2026-08-08T04:00:00Z",
  "pendingAccountExpiresAt": "2026-08-14T04:00:00Z",
  "resendAvailableAt": "2026-08-07T04:01:00Z"
}
```

### Accepted resend

Return the same authoritative timing fields with the new send/expiry values.

### Successful confirmation

```json
{
  "state": "verified",
  "redirectTo": "/auth/login"
}
```

No authentication cookie is created by confirmation.

## Error Behavior

- Resend before cooldown: `429` with authoritative retry duration; do not create a new token or send email.
- Broader abuse limit: `429` under E-004.
- Expired token: stable `verification_token_expired` outcome with resend action.
- Invalid token: stable safe invalid outcome without exposing account information.
- Already-used/already-verified token: idempotent verified/already-verified outcome.
- Deleted pending account: stable `pending_account_expired` outcome and registration action.
- Email delivery failure must remain observable and retryable; it must not authenticate the account.
- Concurrent confirmations may activate the account only once.
- Exact ProblemDetails formatting is owned by E-010.

## Delivery Phases

### Phase 1 — Pending-account registration

**Status:** Not started

#### User value delivered

- Completing onboarding creates a safe pending account instead of granting immediate access.

#### Included work

- Product behavior: Pending status, no session, initial email, verification status result.
- Backend: See [`backend.md`](./backend.md).
- Frontend: Update F-003 success handling through [`frontend.md`](./frontend.md).
- Data/API: Account status, verification token, initial send.
- Documentation/assets: Lifecycle diagram in [`assets/email-verification-lifecycle.svg`](./assets/email-verification-lifecycle.svg).

#### Tests and validation

- [ ] Pending-account transaction and no-cookie integration tests.
- [ ] Initial email/token tests.
- [ ] Onboarding redirect test.
- [ ] Failure test for email delivery and duplicate pending email.

#### Phase completion criteria

- [ ] New accounts remain pending and cannot access Appetee.
- [ ] Initial verification communication is produced.

### Phase 2 — Verification-pending experience

**Status:** Not started

#### User value delivered

- Pending users can see where and when verification was sent and what to do next.

#### Included work

- Product behavior: `/auth/verify-email`, masked email, timestamps, resend and Login actions, pending Login redirect.
- Backend: See [`backend.md`](./backend.md).
- Frontend: See [`frontend.md`](./frontend.md).
- Data/API: Verification-status operation.

#### Tests and validation

- [ ] Status contract tests.
- [ ] Pending Login redirect tests.
- [ ] Frontend loading, success, missing/deleted, and failure states.
- [ ] Local-time display and masking tests.

#### Phase completion criteria

- [ ] Pending users can understand and continue the verification flow safely.

### Phase 3 — Email confirmation and account activation

**Status:** Not started

#### User value delivered

- A valid email link activates the account and enables normal Login.

#### Included work

- Product behavior: Token confirmation, activation, safe outcomes, Login redirect.
- Backend: See [`backend.md`](./backend.md).
- Frontend: See [`frontend.md`](./frontend.md).
- Data/API: Atomic token consumption and account activation.

#### Tests and validation

- [ ] Valid, expired, invalid, used, invalidated, and concurrent-use tests.
- [ ] Login allowed only after activation.
- [ ] Frontend result-state and redirect tests.

#### Phase completion criteria

- [ ] One valid token activates exactly one pending account once.

### Phase 4 — Protected resend flow

**Status:** Not started

#### User value delivered

- Users can recover from missing or expired email without enabling spam or uncontrolled requests.

#### Included work

- Product behavior: Frontend countdown, backend cooldown, replacement token, server retry timing, success/failure messages.
- Backend: See [`backend.md`](./backend.md).
- Frontend: See [`frontend.md`](./frontend.md).
- Data/API: Resend request/result and authoritative timing.

#### Tests and validation

- [ ] Frontend duplicate-click and countdown tests.
- [ ] Backend 60-second, concurrent request, and broader-limit tests.
- [ ] Previous-token invalidation test.
- [ ] Verify resend does not extend pending expiry.

#### Phase completion criteria

- [ ] Frontend and backend restrictions agree, and the backend cannot be bypassed by client changes.

### Phase 5 — Pending-account lifecycle

**Status:** Not started

#### User value delivered

- Abandoned accounts do not remain indefinitely, while legitimate users receive one reminder.

#### Included work

- Product behavior: Five-day reminder, seven-day deletion, preference/token cleanup, email reuse.
- Backend: See [`backend.md`](./backend.md).
- Frontend: See [`frontend.md`](./frontend.md) for deleted/expired account outcomes.
- Data/API: Scheduled lifecycle operations and status behavior.

#### Tests and validation

- [ ] Time-bound reminder and deletion tests.
- [ ] Active-account exclusion tests.
- [ ] Complete relationship/token cleanup tests.
- [ ] Retry/idempotency tests for scheduled processing.

#### Phase completion criteria

- [ ] Pending accounts follow the approved lifecycle without affecting active users.

## Work Status

### Completed

- None.

### In progress

- None.

### Remaining

- [ ] Phase 1 — Pending-account registration.
- [ ] Phase 2 — Verification-pending experience.
- [ ] Phase 3 — Email confirmation and account activation.
- [ ] Phase 4 — Protected resend flow.
- [ ] Phase 5 — Pending-account lifecycle.

## Acceptance Criteria

- [ ] **AC-001:** New users cannot authenticate before verifying their email.
- [ ] **AC-002:** The initial email is represented by a single-use 24-hour token.
- [ ] **AC-003:** Pending users can see masked address and authoritative send/expiration times.
- [ ] **AC-004:** Resend is restricted in both frontend and backend and returns authoritative retry timing.
- [ ] **AC-005:** Successful verification activates the account and opens Login without auto-login.
- [ ] **AC-006:** Five-day reminder and seven-day deletion operate only on pending accounts.
- [ ] **AC-007:** Deletion removes pending preferences/tokens and permits re-registration.

## Risks and Open Questions

- Email provider, sender domain, queue/retry architecture, and deliverability monitoring must be selected before implementation.
- Exact broader resend limits remain canonical in E-004.
- Email templates and branded content require design during implementation without changing lifecycle rules.

## Decisions

- F-004 is an early standalone feature because both Login and Onboarding depend on it.
- Email verification is mandatory.
- Verification does not auto-login.
- Link lifetime is 24 hours.
- Pending account lifetime is seven days.
- Reminder is sent after five days.
- Frontend and backend both restrict resend; backend is authoritative.

## Related Documents

- [Backend design](./backend.md)
- [Frontend design](./frontend.md)
- [Feature assets](./assets/)

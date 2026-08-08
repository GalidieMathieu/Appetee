# F-004 — Email Verification: Frontend Design

**Status:** Active
**Implementation status:** Not started
**Version:** 1.0
**Owner:** Mathieu Galidie
**Last updated:** 2026-08-06
**Dependencies:** F-002, F-003
**Related engineering initiatives:** E-004, E-005, E-013, E-017

## Canonical Contract

The feature `README.md` owns the canonical data model, database impact, endpoint list, request/response contracts, and error behavior. This document describes only implementation responsibilities for this technical side and must not redefine those contracts.

## Purpose

This document defines the Angular routes, pages, status state, token result handling, and resend user experience for email verification.

## Current Frontend State

### Implemented

- None.

### Known gaps

- No verification routes, pages, API client, facade/store, or result components exist.
- F-003 currently navigates successful creation to `/home`.
- F-002 currently treats successful credentials as an authenticated result only.

## Routes and Entry Points

| Route | Access | Purpose |
|---|---|---|
| `/auth/verify-email` | Guest/pending user | Display current pending verification status and resend action. |
| `/auth/verify-email/confirm` | Guest with email token | Process/display verification-link result. |
| `/auth/login` | Guest | Destination after success or Back to Login. |
| `/auth/sign-up/account` | Guest | Re-registration destination after pending account deletion. |

The exact confirmation token transport may use query parameters or a route-safe token, but it must not be logged or persisted in client storage.

## Pages, Components, and State

- Verification pending page: masked email, sent time, link expiry, account expiry, resend countdown, Login action.
- Verification result page: loading, success, expired, invalid, already verified, and deleted-account outcomes.
- Feature API/facade/store: status retrieval, resend, confirm, and server-time/retry handling.
- Integration points: F-003 completion and F-002 pending-login outcome.
- State must be reloadable from the backend; it cannot depend only on in-memory onboarding state.

## User Interactions

### Interaction 1 — View pending status

1. Page loads verification status.
2. Displays masked address and backend timestamps in local time.
3. Resend button state uses server-provided retry timing.
4. User may return to Login.

### Interaction 2 — Resend

1. User activates Resend.
2. Button becomes pending and prevents repeated client requests.
3. Accepted response updates sent/expiry/retry timing and starts a 60-second countdown.
4. Cooldown response displays remaining duration from the server.
5. General failure leaves a retryable state without losing authoritative status.

### Interaction 3 — Confirm link

1. Confirmation page processes the opaque token once.
2. Success shows confirmation and routes/offers Login.
3. Expired/invalid states offer Resend where account context permits.
4. Already verified offers Login.
5. Deleted pending account offers Create Account.

## UI States

- Pending status loading.
- Ready with resend available.
- Ready with resend countdown.
- Resend in progress.
- Resend success.
- Broader backend rate limit with retry timing.
- Initial email-delivery problem.
- Confirmation processing.
- Confirmed successfully.
- Link expired.
- Link invalid.
- Link already used/account already verified.
- Pending account deleted or unavailable.
- Offline/network interruption.
- Unexpected safe error.

## Responsive and Accessibility Requirements

- Masked email and dates must be readable and announced as text.
- Countdown updates must not announce every second; announce availability changes or use a polite status summary.
- Resend disabled state must be conveyed programmatically, not by color alone.
- Confirmation outcomes use a page heading and focus target.
- Links/buttons have distinct action labels.
- Long emails remain masked and wrap safely on mobile.
- Local-time formatting includes sufficient date context.

## Frontend Work by Feature Phase

### Phase 1 — Pending-account registration

**Status:** Not started

- Changes: Replace F-003 automatic-home navigation with pending status handoff and `/auth/verify-email` navigation.
- Unit or component tests: F-003 success result and no authenticated-state update.
- Browser E2E tests: Complete onboarding to pending page.
- Accessibility validation: Navigation focus and status heading.
- Responsive and visual validation: Initial pending page shell.

### Phase 2 — Verification-pending experience

**Status:** Not started

- Changes: Add route/page, status API integration, masked address, dates, resend, and Login action; consume F-002 pending-login result.
- Unit or component tests: Loading/state/date/masking/actions.
- Browser E2E tests: Pending login to page and refresh restoration.
- Accessibility validation: Status announcements and keyboard flow.
- Responsive and visual validation: Narrow and desktop.

### Phase 3 — Email confirmation and account activation

**Status:** Not started

- Changes: Confirmation route/page and all token result states; redirect/CTA to Login.
- Unit or component tests: Each result state and token handling.
- Browser E2E tests: Valid, expired, invalid, and already-verified links.
- Accessibility validation: Focus and result announcement.
- Responsive and visual validation: Result screens.

### Phase 4 — Protected resend flow

**Status:** Not started

- Changes: Pending button, 60-second countdown, server Retry-After synchronization, success/error states, and no client-only trust.
- Unit or component tests: Duplicate clicks, refresh, server timing, and countdown completion.
- Browser E2E tests: Accepted resend and throttled resend.
- Accessibility validation: Controlled countdown announcements and disabled semantics.
- Responsive and visual validation: Long feedback and countdown labels.

### Phase 5 — Pending-account lifecycle

**Status:** Not started

- Changes: Handle warning/deleted status and direct deleted users to account creation.
- Unit or component tests: Near-expiry and deleted outcomes.
- Browser E2E tests: Deleted account status/re-registration entry.
- Accessibility validation: Clear next action.
- Responsive and visual validation: Lifecycle warning state.

## Validation Commands

```text
npm test
npm run build
```

## Frontend Decisions

- Backend status and retry timing are authoritative.
- No raw token is saved to localStorage or sessionStorage.
- The page can be reconstructed after refresh without the F-003 wizard.
- Countdown display is not treated as a security boundary.

## Open Questions

- Final confirmation token URL shape will be selected with the backend and email provider.

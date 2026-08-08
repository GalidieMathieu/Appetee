# F-003 — Account Onboarding: Backend Design

**Status:** Active
**Implementation status:** Partially implemented
**Version:** 1.0
**Owner:** Mathieu Galidie
**Last updated:** 2026-08-06
**Dependencies:** F-002, F-004, F-005, F-006, F-007, Ingredient Groups (feature ID pending)
**Related engineering initiatives:** E-004, E-008, E-017

## Canonical Contract

The feature `README.md` owns the canonical data model, database impact, endpoint list, request/response contracts, and error behavior. This document describes only implementation responsibilities for this technical side and must not redefine those contracts.

## Purpose

This document defines backend support for initial account data, email availability, transactional preference creation, and the boundary to F-004.

## Current Backend State

### Implemented

- `POST /api/auth/sign-up` accepts display-name/username, email, password, optional diet IDs, and optional ingredient restriction IDs.
- `AuthService.SignUpAsync` validates nonblank values, validates email format, hashes the password, creates the user/preferences, and currently signs the user in.
- `GET /api/users/exists-by-email` returns email existence for early client checking.
- User creation is delegated to the auth repository.
- Database scripts include users and preference relationships.

### Known gaps

- Server validation does not yet enforce approved display-name and password boundaries.
- Availability currently exposes a boolean rather than the complete available/active/pending onboarding outcome.
- Final creation must explicitly guarantee normalized email uniqueness under concurrency.
- Current creation immediately issues a cookie; F-004 requires pending creation without authentication.
- Pending-account status does not exist yet.
- Ingredient-group reads are not available.

## Affected Modules

- API: onboarding/sign-up and email-availability operations.
- Application: auth/onboarding request validation and creation use case.
- Domain: user display name, account status through F-004, initial preferences.
- Infrastructure: auth/user repositories and queries, database constraints/migrations, ingredient-group query when implemented.

## Use Cases

### Use Case 1 — Check email before preferences

- Actor: guest.
- Input: email.
- Server-owned fields: normalized email and account state.
- Authorization and ownership: anonymous, privacy-sensitive result.
- Success result: available, active, or pending flow outcome.
- Failure behavior: validation, throttling, or general failure without sensitive disclosure beyond the approved onboarding interaction.

### Use Case 2 — Create initial account and preferences

- Actor: guest completing onboarding.
- Input: display name, email, password, optional diet IDs, optional avoided-ingredient IDs.
- Server-owned fields: password hash, normalized email, account state, timestamps.
- Authorization and ownership: newly created account owns its preference rows.
- Success result: pending account outcome owned by F-004; no authentication cookie.
- Failure behavior: validation, duplicate email, invalid IDs, or transaction failure with no partial account.

## Data Model

### Tables and relationships

- `users`: display name, normalized unique email, password hash, and F-004 account status/timestamps.
- `user_diets`: zero-to-many selected diets.
- `user_ingredient_restrictions`: zero-to-many individual avoided ingredients.
- Future ingredient groups are read-side relationships and do not replace saved individual restrictions.

### Constraints and indexes

- Unique normalized email.
- Foreign keys from preference rows to user, diet, and ingredient.
- Unique `(user_id, diet_id)` and `(user_id, ingredient_id)` relationships.
- Display name length enforced before persistence.

### Ownership and deletion behavior

- Initial preferences belong to the newly created account.
- If F-004 deletes an expired pending account, related onboarding preferences are removed transactionally or by verified cascade behavior.

### Concurrency and audit

- Final account creation and initial preference inserts must share one transaction.
- Database uniqueness resolves concurrent duplicate-email attempts.
- Duplicate preference IDs are deduplicated or rejected consistently.

## API Intent

| Operation | Method and route | Permission | Notes |
|---|---|---|---|
| Email availability | Existing route may evolve | Guest | Must support available, active, and pending onboarding outcomes. |
| Submit onboarding | `POST /api/auth/sign-up` or future onboarding route | Guest | Creates pending account; no cookie after F-004. |
| Retrieve diets | Existing diet endpoint | Guest during onboarding | Zero-to-many selection. |
| Retrieve ingredients | Existing ingredient endpoint | Guest during onboarding | Individual choices. |
| Retrieve ingredient groups | Route to be defined | Guest during onboarding | Read-only group-to-ingredient model. |

## Validation and Security Rules

- Normalize email once and use the same representation for checks and creation.
- Display name: required, trimmed at edges, 2–30 characters, non-unique.
- Password: server-enforced 12–128 characters and referenced E-004 controls.
- Diet and ingredient arrays are optional and may be empty/null.
- Validate all referenced IDs before or during transactional insertion.
- Final uniqueness and database constraints are authoritative; early availability is not a reservation.
- Never trust client-provided account status, timestamps, or verification state.

## Transactions, Idempotency, and Failure Recovery

- Transaction boundary: user plus all initial preference rows.
- Concurrency rule: one normalized email can create at most one user.
- Retry or idempotency rule: repeated final submission after success must return the existing active/pending outcome rather than create another account.
- External-resource failure handling: F-004 defines email-send behavior; account state must remain explicit if delivery fails.

## Backend Work by Feature Phase

### Phase 1 — Three-step onboarding foundation

**Status:** Completed

- Changes: Existing sign-up contract and repository operation with optional diets/restrictions.
- Migration: Existing schema.
- Authorization and ownership: Guest creates only the new account represented by the request.
- Unit tests: Existing application coverage where present.
- Integration tests: Existing sign-up endpoint tests.
- Failure and negative tests: Basic validation and duplicate behavior should be retained.

### Phase 2 — Account-information rules

**Status:** Not started

- Changes: Enforce display-name and password boundaries server-side.
- Migration: Ensure column lengths support the approved limits.
- Authorization and ownership: No change.
- Unit tests: Boundary, trim, Unicode/space handling, and password limits.
- Integration tests: Frontend-equivalent valid/invalid payloads.
- Failure and negative tests: Oversized inputs and invalid email.

### Phase 3 — Reliable email availability and final uniqueness

**Status:** In progress

- Changes: Normalize consistently, represent active/pending outcome, final duplicate mapping, transaction, and database uniqueness.
- Migration: Unique normalized email and account state supplied through F-004.
- Authorization and ownership: Anonymous flow with E-004 privacy/abuse controls.
- Unit tests: Normalization and state mapping.
- Integration tests: Early outcome, final duplicate, and concurrent requests.
- Failure and negative tests: Invalid email, unavailable dependency, repeated request, and race.

### Phase 5 — Ingredient-group integration

**Status:** Not started

- Changes: Read group definitions and group ingredient membership.
- Migration: Defined by the Ingredient Groups feature.
- Authorization and ownership: Guest read access for selectable active groups.
- Unit tests: Group membership mapping.
- Integration tests: Active groups and ingredients returned consistently.
- Failure and negative tests: Missing/inactive groups and duplicate membership.

## Validation Commands

```text
dotnet build Appetee.sln
dotnet test Appetee.sln
```

## Backend Decisions

- `username` may remain the physical field temporarily, but its product meaning is display name and it is not unique.
- Final sign-up after F-004 creates a pending account and does not issue a cookie.
- Saved restrictions remain individual ingredient IDs.

## Open Questions

- The final email-availability contract must be designed jointly with F-004 and E-004.

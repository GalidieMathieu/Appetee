# F-003 — Account Onboarding

**Status:** Active
**Implementation status:** Partially implemented
**Version:** 1.0
**Owner:** Mathieu Galidie
**Last updated:** 2026-08-06
**Dependencies:** F-002, F-004, F-005, Ingredient Groups (feature ID pending)
**Related engineering initiatives:** E-004, E-008, E-013, E-017

## Goal

Guide a new user through a short account-creation flow that collects account information, optional diets, and optional avoided ingredients before handing the pending account to email verification.

## User Problem

A new user needs to provide enough information for Appetee to personalize recipes without facing a long or confusing registration process. The user should discover an unavailable email before completing preference steps and should never be forced to select a diet or ingredient that does not apply.

## Current Behavior

Implementation baseline reviewed from frontend `main` and backend `master` on 2026-08-06.

### Implemented

- Routed three-step wizard at Account, Diet, and Ingredient child routes.
- Shared in-memory `SignUpWizard` state preserves fields while moving backward within the flow.
- Account step collects email, username, password, and confirmation.
- Email availability is checked before moving from Account to Diet.
- Diet and ingredient data are loaded through shared facades.
- Multiple diets and multiple avoided ingredients can be selected.
- The final request submits account information and optional arrays together.
- Back and Next/Create Account controls are present.
- Progress bars are display-only.
- Login navigation is available from the wizard.
- Current backend creation stores the user, diets, and restrictions through the sign-up operation.

### Known gaps

- `username` is presented as a unique-style username rather than the approved non-unique display name.
- Current display-name validation is minimum four characters; approved behavior is 2–30 characters with trimmed outer whitespace.
- Current password validation is minimum eight characters; approved behavior is 12–128 characters with no composition requirement.
- Show/hide password is not implemented.
- Diet form currently carries a required validator even though selection must be optional.
- Final backend submission must recheck normalized email uniqueness and rely on a database uniqueness constraint.
- Existing active and pending email outcomes are not distinguished for onboarding navigation.
- Browser/guard forward-navigation behavior requires alignment with the approved route rules.
- Back to Appetee navigation is not present.
- The current success path automatically authenticates and opens `/home`; F-004 will replace that outcome with pending verification.
- Ingredient-group/category selection is not implemented.

## Scope

### Included

- Account, Diet, and Ingredients steps.
- Required email, display name, password, and password confirmation.
- Email availability check before preference steps.
- Optional zero-to-many diet selection.
- Optional zero-to-many avoided-ingredient selection.
- Shared temporary in-memory wizard state.
- Backward navigation and forward-step gating.
- Final combined submission.
- Login and Back to Appetee exit actions.
- Future category/group shortcuts for selecting multiple ingredients.

### Excluded

- Email ownership verification and pending-account lifecycle, owned by F-004.
- Legal acceptance and legal-page integration, owned by F-005.
- Editing preferences after registration.
- Recipe-search tags such as High Protein, Low Calorie, Quick Meal, and Budget Friendly.
- Medical allergy guarantees or severity tracking.
- Persistent onboarding drafts.

## Users and Permissions

| Actor | Allowed behavior |
|---|---|
| Guest | Complete onboarding and submit a new account request. |
| Pending unverified user | Uses F-004 rather than creating a duplicate account. |
| Authenticated user | Redirected away from guest-only onboarding routes. |
| Administrator | Uses the same onboarding flow only when creating a personal account; admin provisioning is outside scope. |

## User Flows

### Flow 1 — Complete onboarding

1. Guest opens `/auth/sign-up/account`.
2. Guest enters valid account information.
3. Appetee checks email availability.
4. Guest continues to Diet and may select zero or more diets.
5. Guest continues to Ingredients and may select zero or more ingredients to avoid.
6. Guest selects Create Account.
7. Appetee revalidates all fields and email uniqueness.
8. F-004 creates the pending verification outcome and opens `/auth/verify-email`.

### Flow 2 — Existing active email

1. Guest enters an email already assigned to an active account.
2. Appetee prevents forward navigation.
3. Appetee explains that the email is associated with an account and offers Login or password recovery when available.

### Flow 3 — Existing pending email

1. Guest enters an email assigned to a pending unverified account.
2. Appetee does not create another account.
3. Appetee routes the user to `/auth/verify-email` through F-004.

### Flow 4 — Navigate backward or leave

1. User may use Back or the browser Back action to visit an earlier completed step.
2. In-memory values remain while the wizard remains mounted.
3. Refreshing or leaving the flow clears the draft.
4. Login and Back to Appetee provide explicit exits.

## Functional Requirements

- **FR-001:** Onboarding must use Account, Diet, and Ingredients steps in that order.
- **FR-002:** Account must collect email, display name, password, and password confirmation.
- **FR-003:** Display name must be non-unique, used for personalized greetings, trimmed at the edges, and limited to 2–30 characters.
- **FR-004:** Password must support 12–128 characters, spaces, and paste without mandatory uppercase, number, or symbol composition.
- **FR-005:** Password and confirmation must match, and visibility controls must be available.
- **FR-006:** Appetee must check email availability before leaving Account.
- **FR-007:** Final account submission must recheck normalized email uniqueness and enforce it at the database level.
- **FR-008:** Diet selection must allow zero to many values.
- **FR-009:** Avoided ingredients must allow zero to many values.
- **FR-010:** All avoided ingredients have the same exclusion behavior; a matching recipe is omitted from discovery.
- **FR-011:** The user may continue from Diet without selecting a diet.
- **FR-012:** After Account is completed, the user may reach Ingredients even when Diet is empty.
- **FR-013:** Progress bars are display-only and cannot be used to skip forward.
- **FR-014:** Refreshing resets the flow to Account and discards the draft.
- **FR-015:** Login and Back to Appetee actions must be available.
- **FR-016:** No final Review step is required.
- **FR-017:** Future ingredient groups act as bulk-selection shortcuts and resolve into individual ingredient IDs.
- **FR-018:** Final success must integrate with F-004 and must not create an authenticated session before verification.

## Business Rules

- **BR-001:** Email is unique after normalization.
- **BR-002:** Display names may be duplicated and are not login identifiers.
- **BR-003:** Diets are persistent compatibility preferences; recipe tags are search-time filters and do not belong in onboarding.
- **BR-004:** Diet and avoided-ingredient selections are optional.
- **BR-005:** Avoided ingredients are neutral restrictions; Appetee does not promise medical allergy safety.
- **BR-006:** Ingredient groups are selection conveniences, not the stored filtering unit.
- **BR-007:** Email availability at Account is a convenience check; final submission and database constraints remain authoritative.

## Edge Cases and Failure Behavior

- If availability changes between Account and final submission, final creation fails safely without creating a duplicate; the wizard remains available for correction.
- A pending email routes to verification rather than exposing another account-creation path.
- Failed diet or ingredient loading displays a retryable error and must not silently invent options.
- Final network or validation failure keeps the current in-memory values and prevents duplicate submission.
- Browser refresh intentionally resets all fields, including password.
- A category may contain ingredients already individually selected; selections remain unique.
- Selecting a group followed by removing one ingredient stores the resulting individual set only.

## Data Requirements

### Account draft

The onboarding flow collects:

```ts
interface AccountOnboardingDraft {
  displayName: string;
  email: string;
  password: string;
  confirmPassword: string; // frontend validation only; never persisted
  dietIds: number[];
  ingredientRestrictionIds: number[];
}
```

`displayName` is personal display text. It is not a login identifier, is not public, and does not need to be unique.

Approved display-name rules:

- 2–30 characters
- leading/trailing whitespace trimmed
- internal spaces allowed
- duplicates allowed

Approved password rules:

- 12–128 characters
- spaces allowed
- paste allowed
- no forced uppercase, digit, or symbol composition rule
- confirmation must match before submission

### Temporary frontend ownership

The onboarding draft is temporary feature state. It must survive navigation between the Account, Diet, and Ingredient steps, but must be destroyed when the user leaves the sign-up flow or the flow is completed.

E-019 defines the implementation pattern: provide the wizard state from the sign-up shell/flow scope instead of storing it in a root singleton.

## Database Impact

### Existing tables used

- `users`
- `user_diets`
- `diets`
- `user_ingredient_restrictions`
- `ingredients`

### Schema changes

The current database column `users.username` is semantically used as a display name. To keep the model accurate for future work, F-003 requires a migration toward:

```text
users.display_name VARCHAR(30) NOT NULL
```

This is a rename/contract cleanup, not a new public username feature. Existing values must be preserved.

Pending/verified account fields are owned by F-004. Legal-acceptance persistence is owned by F-005.

### Index changes

The existing unique email index is required and remains authoritative:

```text
uq_users_email (email)
```

Existing composite primary keys already support saving selected diets and restrictions:

```text
user_diets PRIMARY KEY (user_id, diet_id)
user_ingredient_restrictions PRIMARY KEY (user_id, ingredient_id)
```

No additional F-003 index is required.

### Data migration

- Rename/migrate `username` to `display_name` through E-008.
- Preserve all existing display values.
- Update backend DTOs, frontend models, session/user contracts, and tests in the same compatibility plan.
- F-004 and F-005 migrations are separate but must be deployed before the final pending-account signup contract is enabled.

## API Endpoints

| Method | Endpoint | Purpose | State |
|---|---|---|---|
| `POST` | `/api/auth/sign-up/email-status` | Check availability before preference steps | Target; replaces the current boolean-only lookup |
| `GET` | `/api/diets` | Load available diet choices | Implemented |
| `GET` | `/api/ingredients` | Load available avoided-ingredient choices | Implemented |
| `POST` | `/api/auth/sign-up` | Create the pending account with preferences and legal acceptance | Implemented in older authenticated form; target contract changes with F-004/F-005 |

The current `GET /api/users/exists-by-email?email=...` returns only `{ exists }`. The target registration-status endpoint must distinguish the product outcomes required by this flow while remaining protected by E-004 abuse controls.

## Request Contracts

### Email-status check

```json
{
  "email": "user@example.com"
}
```

### Final signup

```json
{
  "displayName": "Mathieu",
  "email": "user@example.com",
  "password": "example-password",
  "dietIds": [1, 3],
  "ingredientRestrictionIds": [12, 18],
  "legalAcceptance": {
    "termsVersion": "1.0",
    "privacyVersion": "1.0",
    "accepted": true
  }
}
```

`dietIds` and `ingredientRestrictionIds` may both be empty.

`confirmPassword` is never sent.

## Response Contracts

### Email status

```json
{
  "state": "available"
}
```

Allowed product states:

```text
available
active_account
pending_verification
```

No user ID or profile information is returned.

### Successful final signup

F-004 owns the authoritative verification handoff. The target response is a pending result, not an authenticated session:

```json
{
  "status": "verification_required",
  "verification": {
    "maskedEmail": "m******@example.com",
    "sentAt": "2026-08-07T04:00:00Z",
    "expiresAt": "2026-08-08T04:00:00Z",
    "pendingAccountExpiresAt": "2026-08-14T04:00:00Z",
    "resendAvailableAt": "2026-08-07T04:01:00Z"
  }
}
```

No authentication cookie is created.

## Error Behavior

- Invalid account fields: `400`.
- Email already belongs to an active account: stable conflict outcome with Login/Recovery actions.
- Email belongs to a pending account: stable pending-verification outcome and handoff to F-004.
- Final uniqueness conflict after a successful pre-check: authoritative conflict outcome; preserve the in-memory wizard draft.
- Unknown diet or ingredient IDs: `400`; no partial account creation.
- F-005 legal acceptance missing or stale: reject final submission.
- Network/server failure: keep the user on the current step and preserve the temporary draft.
- Exact ProblemDetails/error-envelope shape is owned by E-010.

## Delivery Phases

### Phase 1 — Three-step onboarding foundation

**Status:** Completed

#### User value delivered

- Guests can enter account information, choose diets and avoided ingredients, navigate backward, and submit one combined request.

#### Included work

- Product behavior: Account, Diet, and Ingredients wizard.
- Backend: See [`backend.md`](./backend.md).
- Frontend: See [`frontend.md`](./frontend.md).
- Data/API: Sign-up request with optional preference IDs.
- Documentation/assets: Current and target flow in [`assets/onboarding-flow.svg`](./assets/onboarding-flow.svg).

#### Tests and validation

- [x] Sign-up shell tests exist.
- [x] Backend sign-up endpoint and test project exist.
- [ ] Complete intended-contract tests remain to be aligned through later phases and E-017.

#### Phase completion criteria

- [x] Three routed steps and combined submission exist.

### Phase 2 — Account-information rules

**Status:** Not started

#### User value delivered

- Users enter a friendly display name and a stronger but usable password under matching frontend and backend rules.

#### Included work

- Product behavior: Display-name semantics, 2–30 characters, trimming, 12–128 character password, visibility controls, matching confirmation.
- Backend: See [`backend.md`](./backend.md).
- Frontend: See [`frontend.md`](./frontend.md).
- Data/API: Matching validation boundaries.

#### Tests and validation

- [ ] Boundary tests for display name and password.
- [ ] Password visibility and confirmation tests.
- [ ] Frontend/backend validation alignment tests.

#### Phase completion criteria

- [ ] Approved account field rules are enforced on both sides.

### Phase 3 — Reliable email availability and final uniqueness

**Status:** In progress

#### User value delivered

- Users discover unavailable emails early, while final creation remains safe against duplicates and race conditions.

#### Included work

- Product behavior: Early availability check; active and pending outcomes; authoritative final recheck.
- Backend: See [`backend.md`](./backend.md).
- Frontend: See [`frontend.md`](./frontend.md).
- Data/API: Normalized unique email and transactional duplicate handling.

#### Tests and validation

- [x] Early availability call is present.
- [ ] Active and pending outcomes are not yet complete.
- [ ] Concurrent final-submission duplicate test.
- [ ] Database unique-constraint validation.

#### Phase completion criteria

- [ ] Early and final checks use consistent normalization.
- [ ] Duplicate creation is impossible under concurrent requests.
- [ ] Pending accounts enter F-004 instead of creating duplicates.

### Phase 4 — Navigation and abandonment completion

**Status:** In progress

#### User value delivered

- The short wizard is predictable, does not force preference selections, and offers clear ways to return or leave.

#### Included work

- Product behavior: Correct forward gating, optional Diet/Ingredients, browser Back alignment, display-only progress, Login and Back to Appetee exits, intentional refresh reset.
- Backend: None.
- Frontend: See [`frontend.md`](./frontend.md).
- Data/API: None.

#### Tests and validation

- [x] In-memory backward preservation exists.
- [x] Login exit exists.
- [ ] Optional diet validator and button behavior aligned.
- [ ] Direct-route guard tests.
- [ ] Browser Back and refresh-reset tests.
- [ ] Back to Appetee action test.

#### Phase completion criteria

- [ ] Users cannot skip required Account completion.
- [ ] Diets and ingredients remain optional.
- [ ] Navigation behavior matches the approved rules.

### Phase 5 — Ingredient-group integration

**Status:** Not started

#### User value delivered

- Users can select many related ingredients quickly without losing individual control.

#### Included work

- Product behavior: Expandable categories, group bulk selection, individual review and exceptions.
- Backend: See [`backend.md`](./backend.md) for group retrieval and individual-ID submission boundaries.
- Frontend: See [`frontend.md`](./frontend.md).
- Data/API: Group-to-ingredient read model; saved restrictions remain individual IDs.

#### Tests and validation

- [ ] Group expansion and bulk-selection tests.
- [ ] Duplicate and exception behavior tests.
- [ ] Saved individual-ID contract tests.

#### Phase completion criteria

- [ ] Group selection is a shortcut only and produces the correct individual restriction set.

## Work Status

### Completed

- Three routed steps.
- Shared in-memory wizard state.
- Combined account/preference request.
- Early email availability call.
- Optional ingredient selection in the current UI.
- Login exit.

### In progress

- Phase 3 — Reliable email availability and final uniqueness.
- Phase 4 — Navigation and abandonment completion.

### Remaining

- [ ] Phase 2 — Account-information rules.
- [ ] Complete Phase 3.
- [ ] Complete Phase 4.
- [ ] Phase 5 — Ingredient-group integration.
- [ ] Integrate F-004's pending-account outcome.

## Acceptance Criteria

- [ ] **AC-001:** A guest can complete all three steps and submit once.
- [ ] **AC-002:** Display name accepts duplicate human-readable names within 2–30 trimmed characters.
- [ ] **AC-003:** Password rules match on frontend and backend.
- [ ] **AC-004:** An existing email is detected before preference steps and again at final creation.
- [ ] **AC-005:** Zero diets and zero avoided ingredients are valid.
- [ ] **AC-006:** Direct navigation cannot bypass required Account completion.
- [ ] **AC-007:** Refresh resets the flow to Account; backward navigation within the mounted flow preserves values.
- [ ] **AC-008:** Successful creation hands off to F-004 without authenticating the user.
- [ ] **AC-009:** Group selection ultimately saves individual ingredient IDs.

## Risks and Open Questions

- Final active-versus-pending availability response shape must align with account-enumeration controls in E-004.
- Ingredient Groups has not yet received its final feature ID.
- Legal acceptance is owned by F-005 and integrates into the final onboarding submission without becoming owned by F-003.

## Decisions

- No final Review step.
- No persistent draft; refresh resets the flow.
- Diet and avoided ingredients are optional.
- Recipe tags are not onboarding preferences.
- Display name is personal greeting text, not a unique public username.
- Email ownership verification is mandatory and owned by F-004.

## Related Documents

- [Backend design](./backend.md)
- [Frontend design](./frontend.md)
- [Feature assets](./assets/)

# F-005 — Legal and Privacy

**Status:** Active
**Implementation status:** Not started
**Version:** 1.0
**Owner:** Mathieu Galidie
**Last updated:** 2026-08-06
**Dependencies:** F-003, F-004
**Related engineering initiatives:** E-008, E-010, E-016, E-017

## Goal

Provide one simple legal/privacy capability for Appetee: public Privacy and Terms pages, a public legal footer, required signup acknowledgement, and the basic disclosures needed for a small personal recipe project.

## User Problem

A user needs to understand what Appetee collects, how account data is used, how deletion can be requested, and the limitations of nutrition, pricing, and ingredient filtering before creating an account.

## Scope

### Included

- Public `/privacy` page.
- Public `/terms` page.
- Public legal footer.
- Required onboarding checkbox:
  `I agree to the Terms of Service and acknowledge the Privacy Policy.`
- Recording accepted Terms/Privacy versions and backend acceptance timestamp.
- Contact email: `thalohs@gmail.com`.
- Data collection, cookie, required-provider, retention, and deletion disclosures.
- No advertising/behavioral analytics statement for the current product.
- Nutrition, price, and ingredient/allergy disclaimers.
- Current statement that Appetee does not use user data to train AI models.
- Ability to update policy text and active versions later.

### Excluded

- Marketing consent.
- Advertising consent.
- Cookie banner for nonessential analytics/ads while those technologies are not used.
- Complex legal administration console.
- Forced reacceptance workflow.
- AI-training opt-in while AI training does not exist.
- Legal advice or a guarantee that generated policy text is sufficient for every jurisdiction.

## Product Rules

- Appetee does not sell personal information or share it for advertising.
- Required hosting/email providers may process information to operate the service.
- No behavioral advertising or nonessential analytics are planned initially.
- Technical logs may be used for operation, diagnostics, and security.
- Users may request deletion through `thalohs@gmail.com` until self-service account deletion is implemented.
- Standard application/diagnostic log target retention is 30 days; longer security retention is only for an active investigation.
- Appetee does not currently use personal information or user activity to train artificial-intelligence models.
- Price values are estimates and may differ by store, location, brand, date, package size, and availability.
- Nutrition values are estimates and are not professional medical or dietetic advice.
- Ingredient filtering may be incomplete or incorrect and does not guarantee allergen safety.

## Public Routes

```text
/privacy
/terms
```

Both are accessible without authentication.

## Signup Acceptance

The final onboarding step contains one required checkbox:

```text
I agree to the Terms of Service and acknowledge the Privacy Policy.
```

`Terms of Service` and `Privacy Policy` are links.

From onboarding, legal links open in a new tab so temporary wizard state is preserved.

## Data Requirements

### Current legal versions

```ts
interface CurrentLegalVersions {
  termsVersion: string;
  privacyVersion: string;
  termsPath: '/terms';
  privacyPath: '/privacy';
}
```

### Signup acceptance

```ts
interface LegalAcceptanceRequest {
  termsVersion: string;
  privacyVersion: string;
  accepted: true;
}
```

The frontend never supplies the authoritative acceptance timestamp.

### Persisted acceptance

```ts
interface UserLegalAcceptance {
  userId: number;
  termsVersion: string;
  privacyVersion: string;
  acceptedAt: string;
}
```

## Database Impact

### Existing tables used

- `users`

### Schema changes

Add a simple one-row-per-user table:

```text
user_legal_acceptances
- user_id
- terms_version
- privacy_version
- accepted_at
```

`user_id` is both the primary key and a foreign key to `users(id)` with `ON DELETE CASCADE`.

This intentionally stores only the current accepted pair. A future reacceptance/history feature may redesign the table if it becomes necessary.

### Index changes

No secondary index is required for the initial access pattern. The primary key on `user_id` is sufficient.

### Data migration

Existing accounts created before F-005 must not be silently assigned an acceptance they never made.

For the current personal-project test users, choose one explicit migration treatment before rollout:

1. require acknowledgement on the next applicable account interaction; or
2. delete/recreate test accounts in the development environment.

Do not invent an acceptance timestamp.

Production schema changes must use E-008.

## API Endpoints

| Method | Endpoint | Purpose | State |
|---|---|---|---|
| `GET` | `/api/legal/current` | Return the active Terms/Privacy versions and public paths | Planned |
| `POST` | `/api/auth/sign-up` | Persist legal acceptance atomically with account creation | Existing endpoint; target request extended by F-005 |

The public legal page content itself is delivered by Angular routes and does not require an API endpoint.

## Request Contracts

### `GET /api/legal/current`

No request body.

### Signup integration

F-003 submits:

```json
{
  "legalAcceptance": {
    "termsVersion": "1.0",
    "privacyVersion": "1.0",
    "accepted": true
  }
}
```

The backend validates that both versions are still current.

## Response Contracts

### `GET /api/legal/current`

```json
{
  "termsVersion": "1.0",
  "privacyVersion": "1.0",
  "termsPath": "/terms",
  "privacyPath": "/privacy"
}
```

### Signup acceptance persistence

No separate acceptance response is required. Successful pending-account creation means the acceptance row was stored in the same account-creation transaction.

## Error Behavior

- Checkbox not accepted: frontend blocks final submission.
- Missing acceptance in a direct API request: `400`.
- Stale Terms/Privacy versions: `409` or the common E-010 conflict outcome instructing the client to reload current legal versions.
- If acceptance persistence fails, account creation must not partially succeed.
- Public `/privacy` and `/terms` must remain viewable even when authenticated APIs are unavailable.
- Account deletion cascades the legal-acceptance row unless E-016 later identifies a specific lawful retention requirement.

## Public Footer

The shared public footer contains:

```text
Privacy Policy
Terms of Service
© 2026 Appetee
```

It is used by Landing and applicable public authentication/onboarding pages. F-005 owns the footer content and links.

## Privacy Content Requirements

The final policy must accurately describe the deployed application, including:

- email and display name;
- selected diets and avoided ingredients;
- favorites and meal-plan data when those features exist;
- authentication cookies;
- technical/security logs;
- Microsoft Azure as the hosting/data-service provider;
- the email-delivery provider once selected;
- account/data deletion;
- retention and backup limitations;
- no advertising sale/sharing;
- no current AI model training;
- contact at `thalohs@gmail.com`.

## Terms Content Requirements

The final Terms must include practical limitations for:

- estimated nutrition;
- estimated pricing;
- ingredient categorization/filtering;
- allergen/restriction accuracy;
- service availability;
- account misuse/abuse;
- free personal-project status.

The feature does not make medical or professional nutrition claims.

## Delivery Phases

### Phase 1 — Public legal pages

**Status:** Not started

- Implement `/privacy` and `/terms`.
- Add responsive typography and navigation back to Appetee.
- Display version/effective/last-updated information.
- Generate final text only after deployed providers and retention behavior are verified.

### Phase 2 — Public footer integration

**Status:** Not started

- Add shared public legal footer.
- Integrate it with Landing and public auth/onboarding layouts.
- Keep the footer implementation reusable.

### Phase 3 — Signup acknowledgement and persistence

**Status:** Not started

- Implement `GET /api/legal/current`.
- Add required onboarding checkbox and linked documents.
- Extend the signup request with accepted versions.
- Persist backend timestamp and versions atomically with account creation.
- Reject missing/stale acceptance.
- Add frontend/backend tests.

### Phase 4 — Deletion/contact alignment

**Status:** Not started

- Publish the current email deletion-request path.
- Update text when self-service account deletion is implemented under the owning profile/privacy engineering work.
- Verify cascade behavior and backup/log wording against production.

## Work Status

### Completed

- Product scope and baseline disclosures are approved.

### In Progress

None.

### Remaining

- [ ] Phase 1
- [ ] Phase 2
- [ ] Phase 3
- [ ] Phase 4

## Acceptance Criteria

- [ ] `/privacy` and `/terms` are public and readable.
- [ ] Signup cannot finish without the required acknowledgement.
- [ ] The backend records accepted versions and its own timestamp.
- [ ] Stale legal versions are rejected safely.
- [ ] Public pages/footer use the approved contact email.
- [ ] Privacy wording matches actual deployed collection/providers.
- [ ] Terms include the approved nutrition, pricing, and allergen/filtering limitations.

## Decisions

- All privacy/legal work is one product feature.
- One combined required checkbox is sufficient.
- No AI opt-in is implemented while AI training does not exist.
- No analytics/advertising consent flow is added while those technologies are absent.
- F-005 owns the public legal footer.

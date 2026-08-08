# E-016 — Privacy, Data Lifecycle, and Account Closure

## Initiative Information

- **Status:** Ready for implementation
- **Type:** Engineering initiative
- **Priority:** Medium
- **Implementation order:** 16
- **Last updated:** 2026-08-06

## Goal

Define what personal data is collected, where it flows, how long it is retained, and how export, deletion, privileged access, logs, media, and backups are handled.

## Problem

User profiles, diet choices, ingredient restrictions, favorites, collections, logs, and media have no complete inventory, purpose/retention rules, export process, deletion verification, or privileged-access procedure. Current public user routes overexpose data, and database cascades alone do not cover sessions, Blob objects, logs, caches, or backup retention.

## Why This Matters

Privacy incidents, inability to honor product commitments, excess retained data, and weak accountability. Data lineage and lifecycle stop at relational cascade behavior.

## Current Behavior

- The schema stores email, username, password hash, image URL, diet preferences, ingredient restrictions, favorites and collections. Cascades and a delete repository method exist, but no export format, retention schedule, backup-erasure handling, Blob deletion verification, administrator access review/audit, telemetry redaction policy, or privacy runbook is documented/implemented.

## Target Behavior

Appetee maintains a purpose-based data inventory and minimized responses. Users can obtain a defined export and close an account through a verified workflow that revokes access and handles every active data store. Retained logs/backups have documented limits, and privileged access is controlled and audited.

## Scope

### Included

- Data inventory and classification
- Purpose/minimization review
- Response DTO minimization
- Retention schedule
- User export
- Account closure workflow
- Hard/soft delete decisions
- Session/media/cache/log handling
- Backup retention disclosure
- Privileged support access and audit
- Frontend privacy/account UI

### Excluded

- Legal advice or jurisdiction-specific policy drafting
- Authorization implementation details, E-001/E-002
- Backup platform implementation, E-012

## Systems Affected

- Users and preference tables
- Favorites and collections
- Future meal plans/grocery/households
- Blob media
- Authentication/session records
- Application and platform logs
- Caches and backups
- Profile/privacy frontend

## Required Change Summary

### Backend

- Create a data inventory with category, purpose, source, destination, owner, sensitivity, retention, and deletion/export behavior.
- Minimize each API response to its purpose.

Remaining backend implementation details are maintained in [`backend.md`](./backend.md).

### Frontend

- Provide clear export and closure flows with reauthentication for destructive action.
- Show what closure removes immediately and what may remain in protected backups/logs under retention.

Remaining frontend implementation details are maintained in [`frontend.md`](./frontend.md).

### Operations

- Define log and backup retention/access, access reviews, and privacy incident handling.

### Tests

- Use synthetic accounts to verify complete export and active-system deletion.
- Test cross-user export/delete denial, stale sessions, missing Blob, partial failure, retries, backup/log disclosures, and privileged-access audit.

## Implementation Phases

Phases are completed in order unless a documented dependency requires otherwise. A phase that changes code is not complete until its listed tests pass. A phase containing only configuration, documentation, or operational work must attach equivalent validation evidence.

### Phase 1 — Inventory and minimize personal data

**Status:** Not started

#### Changes

- Document collected fields, purpose, storage, access, and retention.
- Minimize DTOs, logs, telemetry, and privileged access.

#### Tests and validation

- [ ] Response/log/telemetry assertions for unnecessary personal data.
- [ ] Access-control matrix for privileged data.

#### Phase completion rule

- [ ] All scoped changes are implemented or explicitly documented as not applicable.
- [ ] Every required automated test passes.
- [ ] Required manual, staging, migration, or operational evidence is attached.
- [ ] The initiative `Work Status` section is updated with verified evidence.

### Phase 2 — Implement export and account closure lifecycle

**Status:** Not started

#### Changes

- Define export contents and verification.
- Coordinate relational, session, media, and asynchronous deletion/anonymization.

#### Tests and validation

- [ ] Synthetic user export completeness test.
- [ ] Account deletion test across database, sessions, media, and retries.

#### Phase completion rule

- [ ] All scoped changes are implemented or explicitly documented as not applicable.
- [ ] Every required automated test passes.
- [ ] Required manual, staging, migration, or operational evidence is attached.
- [ ] The initiative `Work Status` section is updated with verified evidence.

### Phase 3 — Define retention and backup expiry

**Status:** Not started

#### Changes

- Set retention for active data, logs, audits, and backups.
- Document how deleted data expires from backup and restore paths.

#### Tests and validation

- [ ] Retention-policy configuration checks.
- [ ] Restore/deletion verification using synthetic data.

#### Phase completion rule

- [ ] All scoped changes are implemented or explicitly documented as not applicable.
- [ ] Every required automated test passes.
- [ ] Required manual, staging, migration, or operational evidence is attached.
- [ ] The initiative `Work Status` section is updated with verified evidence.

### Phase 4 — Audit and exercise privacy operations

**Status:** Not started

#### Changes

- Record administrator access/actions.
- Create request, breach, and deletion verification procedures.

#### Tests and validation

- [ ] Privacy request tabletop and privileged-access audit test.
- [ ] Evidence review with unresolved gaps recorded.

#### Phase completion rule

- [ ] All scoped changes are implemented or explicitly documented as not applicable.
- [ ] Every required automated test passes.
- [ ] Required manual, staging, migration, or operational evidence is attached.
- [ ] The initiative `Work Status` section is updated with verified evidence.

## Work Status

### Completed

None. Creating this plan does not count as implementation.

### In Progress

None.

### Remaining

- [ ] A maintained data inventory and retention schedule exist.
- [ ] Responses are purpose-minimized.
- [ ] Export and verified account closure are implemented.
- [ ] Logs, media, caches, sessions, and backups are included in lifecycle rules.
- [ ] Privileged access and recurring reviews are controlled.

## Risks and Edge Cases

- Database cascades can delete too much when authorization is wrong.
- Soft delete can conflict with uniqueness and accidental query visibility.
- Backups cannot always support immediate selective erasure and must be handled transparently.
- Exports can become a high-value data exfiltration endpoint.

## Product Features Affected

- Profile and preferences
- Favorites and collections
- Meal planning/grocery
- Households and sharing
- Account closure and support

## Validation

- A synthetic export contains all and only the defined user data.
- Account closure revokes active sessions and removes/anonymizes every active-system record and media item according to policy.
- Retries handle partial media/dependency failure safely.
- Privileged access is permissioned, minimal, and audited.
- Retention and backup behavior is documented and exercised.

## Completion Criteria

- [ ] A maintained data inventory and retention schedule exist.
- [ ] Responses are purpose-minimized.
- [ ] Export and verified account closure are implemented.
- [ ] Logs, media, caches, sessions, and backups are included in lifecycle rules.
- [ ] Privileged access and recurring reviews are controlled.

## Decisions

- Privacy lifecycle is designed per data class, not inferred from foreign-key cascades.
- Export and deletion are high-risk authorized workflows with reauthentication and audit.

## Detailed Implementation Documents

- [Backend implementation](./backend.md)
- [Frontend implementation](./frontend.md)

## Traceability

The codes below are retained only to map this implementation plan to the historical problem register.

| Reference | Problem |
|---|---|
| PRIV-001 | Data lifecycle, export, deletion verification, and privileged-access operations are undefined |
| SEC-001 | Anonymous callers can read, update, and delete arbitrary users |
| DB-003 | Concurrency, audit, ownership, and several integrity/index controls are missing |

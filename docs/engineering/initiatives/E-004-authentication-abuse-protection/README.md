# E-004 — Authentication Abuse Protection

## Initiative Information

- **Status:** Ready for implementation
- **Type:** Engineering initiative
- **Priority:** High
- **Implementation order:** 4
- **Last updated:** 2026-08-06

## Goal

Protect registration and login from weak credentials, account enumeration, password spraying, credential stuffing, and resource abuse.

## Problem

The server accepts nonblank passwords without meaningful length or quality enforcement, exposes an exact email-existence endpoint, performs different work for nonexistent and existing users, and has no per-account or network throttling, backoff, or lockout strategy.

## Why This Matters

Increased probability of account takeover, infrastructure cost, and support/incident load. Uncontrolled authentication resource consumption and weak credential assurance.

## Current Behavior

- Registration requires only nonblank values server-side. There is no ASP.NET rate limiter, per-account/IP control, lockout, progressive delay, or challenge. exists-by-email returns an exact result. A nonexistent email skips password hashing while a wrong password performs it, creating a timing distinction.

## Target Behavior

Registration enforces server-owned credential policy. Authentication uses generic failure behavior, fixed-cost absent-user verification, bounded rate partitions, privacy-safe metrics, and a safe recovery path. The frontend communicates limits without revealing account existence.

## Scope

### Included

- Server-side password policy
- Maximum request lengths
- Breached/common-password control
- Email normalization and enumeration reduction
- Dummy-hash verification
- Per-account and network rate limiting
- Backoff and `429` behavior
- Email verification/recovery foundations
- Authentication security metrics
- Frontend error behavior

### Excluded

- Cookie lifetime/revocation, E-005
- Authorization roles, E-002

## Systems Affected

- Auth service and queries
- Sign-up/login/existence endpoints
- ASP.NET rate limiter
- Password hasher
- Angular auth forms and wizard
- Metrics and alerting

## Required Change Summary

### Backend

- Enforce minimum/maximum password length and maximum email/username sizes before expensive work.
- Reject known breached/common passwords using a reviewed approach that does not disclose credentials.

Remaining backend implementation details are maintained in [`backend.md`](./backend.md).

### Frontend

- Apply matching client validation for usability while treating the backend as authoritative.
- Show generic login failure messages.

Remaining frontend implementation details are maintained in [`frontend.md`](./frontend.md).

### Tests

- Measure timing distributions for absent account, wrong password, and valid login.
- Test repeated attempts from one account, one source, and distributed sources.

Remaining tests implementation details are maintained in [`backend.md`](./backend.md).

### Documentation

- Document policy, thresholds, recovery behavior, and alert ownership.

## Implementation Phases

Phases are completed in order unless a documented dependency requires otherwise. A phase that changes code is not complete until its listed tests pass. A phase containing only configuration, documentation, or operational work must attach equivalent validation evidence.

### Phase 1 — Establish server-side credential rules

**Status:** Not started

#### Changes

- Define normalized email/username limits and password policy.
- Use a fixed-cost absent-user verification path.
- Reduce account-enumeration behavior.

#### Tests and validation

- [ ] Boundary tests for lengths and allowed values.
- [ ] Present/absent/wrong-password timing comparison within an accepted tolerance.

#### Phase completion rule

- [ ] All scoped changes are implemented or explicitly documented as not applicable.
- [ ] Every required automated test passes.
- [ ] Required manual, staging, migration, or operational evidence is attached.
- [ ] The initiative `Work Status` section is updated with verified evidence.

### Phase 2 — Add abuse controls

**Status:** Not started

#### Changes

- Add per-account and source-based rate controls with bounded backoff.
- Define generic 401/429 behavior and recovery paths.

#### Tests and validation

- [ ] Repeated-login, password-spray, distributed-source, and registration-abuse tests.
- [ ] Verify rate limits do not expose account existence.

#### Phase completion rule

- [ ] All scoped changes are implemented or explicitly documented as not applicable.
- [ ] Every required automated test passes.
- [ ] Required manual, staging, migration, or operational evidence is attached.
- [ ] The initiative `Work Status` section is updated with verified evidence.

### Phase 3 — Add observability and frontend behavior

**Status:** Not started

#### Changes

- Emit privacy-safe counters and security events.
- Display usable retry/recovery messages without exposing account state.

#### Tests and validation

- [ ] Frontend tests for 401/429 and retry timing.
- [ ] Alert test for sustained authentication abuse.

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

- [ ] Server-side password and request bounds are enforced.
- [ ] Enumeration paths are removed or safely constrained.
- [ ] Dummy-hash and multi-dimensional throttling are deployed.
- [ ] Recovery and verification behavior is defined.
- [ ] Adversarial authentication tests run in CI or a controlled scheduled suite.

## Risks and Edge Cases

- Account-only lockout can be weaponized to deny access to a victim.
- IP-only limiting can harm shared networks and is bypassable.
- Timing equalization must be measured rather than assumed.
- Breached-password providers create privacy and availability considerations.

## Product Features Affected

- Registration
- Login
- Email verification
- Password reset and recovery
- Account support

## Validation

- UI bypass cannot create weak or oversized credentials.
- Absent and existing-account failures are not practically distinguishable by body or measured timing.
- Repeated abuse produces controlled backoff/`429`.
- Metrics and alerts are privacy-safe and actionable.

## Completion Criteria

- [ ] Server-side password and request bounds are enforced.
- [ ] Enumeration paths are removed or safely constrained.
- [ ] Dummy-hash and multi-dimensional throttling are deployed.
- [ ] Recovery and verification behavior is defined.
- [ ] Adversarial authentication tests run in CI or a controlled scheduled suite.

## Decisions

- Credential policy is enforced by the server.
- Authentication failure messages do not confirm registration state.
- Throttling combines account and network signals rather than relying on one global rule.

## Detailed Implementation Documents

- [Backend implementation](./backend.md)
- [Frontend implementation](./frontend.md)

## Traceability

The codes below are retained only to map this implementation plan to the historical problem register.

| Reference | Problem |
|---|---|
| SEC-006 | Authentication abuse controls and meaningful server password policy are absent |

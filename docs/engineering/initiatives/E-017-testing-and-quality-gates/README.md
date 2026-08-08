# E-017 — Testing Strategy and Mandatory Quality Gates

## Initiative Information

- **Status:** Ready for implementation
- **Type:** Engineering initiative
- **Priority:** High
- **Implementation order:** 17
- **Last updated:** 2026-08-06

## Goal

Turn tests and engineering checks into required evidence for authorization, contracts, migrations, resilience, accessibility, performance, and recovery.

## Problem

The backend suite currently has failing tests and some existing tests encode broken authorization behavior. Important security, browser, migration, concurrency, fault, performance, accessibility, and recovery suites are absent, and current deployment does not require the backend integration tests.

## Why This Matters

Security and reliability defects reach production unnoticed. Automated specifications encode the wrong trust model and are nonblocking.

Unknown residual risk and expensive production discovery. Important trust boundaries and nonfunctional properties have no executable specification.

## Current Behavior

- Release integration run produced 28 pass, 11 fail, 0 skip due REL-001. More importantly, UsersEndpointsTests deliberately verifies anonymous user CRUD and AdminEndpointsTests verifies that a newly registered ordinary user can use admin endpoints. The backend workflow never runs tests.
- Backend has API integration coverage and frontend has 18 passing/1 skipped tests, but no security regression, real-browser E2E, contract, migration, Blob integration, accessibility, concurrency, load, failure-injection, deployment smoke, alert, or backup-restore suite is configured.

## Target Behavior

A layered test strategy verifies actual risk boundaries. Required pull-request and deployment gates block regressions, tests use isolated deterministic environments, and broader scheduled suites cover expensive adversarial, resilience, load, and restore scenarios.

## Scope

### Included

- Green baseline
- Authorization matrix
- Unit/integration/contract tests
- MySQL isolation
- Migration tests
- Browser E2E and CSRF
- Upload/fault/concurrency/idempotency tests
- Accessibility checks
- Performance/capacity suites
- Recovery/alert exercises
- Coverage ratchet
- Flakiness ownership
- Required CI/deployment gates

### Excluded

- Specific control implementation owned by other initiatives
- Toolchain supply-chain policy, E-007

## Systems Affected

- Backend test project
- Angular unit/component tests
- Playwright/E2E environment
- CI workflows
- Staging and scheduled test resources
- Coverage and test reporting

## Required Change Summary

### Baseline

- Fix the exception regression and make all existing tests pass for the intended contract.
- Rewrite tests that intentionally permit anonymous or ordinary-user privileged behavior.

### PR Gates

- Run format/lint, build/type, unit/integration, vulnerability, authorization, contract/OpenAPI, and clean/N-1 migration checks.
- Use isolated MySQL and deterministic seeded data.
- Require zero unexplained failures/skips and ratchet changed-code coverage without substituting coverage for risk tests.

### Security/Resilience

- Maintain anonymous/user A/user B/admin/removed-admin/disabled/stale-session matrices.
- Test CSRF in a real browser, malicious uploads, overposting, request bounds, concurrency, idempotency, cancellation, and dependency failure.

### Scheduled/Staging

- Run broader XSS/SQLi/protocol, load, accessibility, synthetic availability, resilience, alert, and restore exercises.
- Assign owners and acceptable flakiness bounds.

### Documentation

- Define which suite blocks PR, staging, production, nightly, and quarterly work.

## Implementation Phases

Phases are completed in order unless a documented dependency requires otherwise. A phase that changes code is not complete until its listed tests pass. A phase containing only configuration, documentation, or operational work must attach equivalent validation evidence.

### Phase 1 — Restore a trustworthy green baseline

**Status:** Not started

#### Changes

- Fix the error-pipeline regression.
- Rewrite tests that encode anonymous or ordinary-user privileged access.
- Define zero-failure/skip policy.

#### Tests and validation

- [ ] All existing backend and frontend tests pass for corrected behavior.
- [ ] Authorization regressions fail before fixes are applied.

#### Phase completion rule

- [ ] All scoped changes are implemented or explicitly documented as not applicable.
- [ ] Every required automated test passes.
- [ ] Required manual, staging, migration, or operational evidence is attached.
- [ ] The initiative `Work Status` section is updated with verified evidence.

### Phase 2 — Make core risk tests mandatory in pull requests

**Status:** Not started

#### Changes

- Require format/lint/build/type/unit/integration, vulnerability, authorization, contract, and migration checks.
- Use isolated deterministic MySQL data.

#### Tests and validation

- [ ] Seeded failures for each required gate must block.
- [ ] Clean and N-1 migration tests run in CI.

#### Phase completion rule

- [ ] All scoped changes are implemented or explicitly documented as not applicable.
- [ ] Every required automated test passes.
- [ ] Required manual, staging, migration, or operational evidence is attached.
- [ ] The initiative `Work Status` section is updated with verified evidence.

### Phase 3 — Add browser, security, and failure suites

**Status:** Not started

#### Changes

- Add E2E, CSRF, upload, overposting, bounds, concurrency, cancellation, idempotency, accessibility, and dependency-failure coverage.

#### Tests and validation

- [ ] Real-browser hostile-origin suite.
- [ ] Fault-injection and concurrency matrices with deterministic assertions.

#### Phase completion rule

- [ ] All scoped changes are implemented or explicitly documented as not applicable.
- [ ] Every required automated test passes.
- [ ] Required manual, staging, migration, or operational evidence is attached.
- [ ] The initiative `Work Status` section is updated with verified evidence.

### Phase 4 — Add scheduled resilience and recovery exercises

**Status:** Not started

#### Changes

- Schedule broader security, load, synthetic, alert, and restore tests.
- Assign owners and flakiness limits.

#### Tests and validation

- [ ] Scheduled run evidence, alert delivery, and restore drill results.
- [ ] Flaky or skipped test policy is enforced.

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

- [ ] All existing tests are green for the corrected contract.
- [ ] Core risk suites are required and deterministic.
- [ ] PR, staging, scheduled, and restore test responsibilities are documented.
- [ ] Coverage and flakiness policies are enforced.

## Risks and Edge Cases

- High coverage can coexist with missing authorization tests.
- Flaky required tests train developers to bypass gates.
- Tests sharing a database can hide ordering and isolation defects.
- Production-like destructive tests must run only in isolated resources.

## Product Features Affected

- Every engineering initiative and product feature
- Pull requests and deployments
- Incident and recovery readiness

## Validation

- A seeded authorization defect fails the required suite.
- A failing backend test blocks production deployment.
- Migrations are tested clean and N-1.
- Hostile-origin, upload, concurrency, and failure scenarios produce expected controlled behavior.
- Scheduled alert/restore exercises produce recorded evidence.

## Completion Criteria

- [ ] All existing tests are green for the corrected contract.
- [ ] Core risk suites are required and deterministic.
- [ ] PR, staging, scheduled, and restore test responsibilities are documented.
- [ ] Coverage and flakiness policies are enforced.

## Decisions

- Tests prove security invariants and failure behavior, not only happy paths.
- No failing security test is deleted merely to make CI green.

## Detailed Implementation Documents

This initiative currently requires only this `README.md`. Add `backend.md`, `frontend.md`, or `infrastructure.md` only when a separate technical responsibility becomes substantial enough to justify it.

## Traceability

The codes below are retained only to map this implementation plan to the historical problem register.

| Reference | Problem |
|---|---|
| TEST-001 | Backend suite is red and existing tests encode broken authorization |
| TEST-002 | Security, E2E, migration, resilience, accessibility, performance, and recovery suites are absent |

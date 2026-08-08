# E-011 — Safe CI/CD, Staging, and Production Promotion

## Initiative Information

- **Status:** Ready for implementation
- **Type:** Engineering initiative
- **Priority:** High
- **Implementation order:** 11
- **Last updated:** 2026-08-06

## Goal

Separate build from deployment and promote one verified artifact through protected staging and production gates.

## Problem

Pushes to deployment branches can build and deploy directly to the production target. The backend workflow does not run the integration suite, and neither side requires protected environments, migration/readiness checks, staging smoke, approval, concurrency control, or automated rollback/roll-forward handling.

## Why This Matters

Avoidable production outages, data incompatibility, rapid security regression, and slower recovery. Build and deployment are conflated; an unverified artifact reaches the only named production target.

## Current Behavior

- Workflows trigger on push to main/master or dispatch and target the Production slot. The frontend builds/tests but has no lint/security/E2E gate; the backend builds/publishes but never runs its 39-test integration project. Neither defines a GitHub environment, staging/slot verification, concurrency, migration, health, approval, canary, or rollback step.

## Target Behavior

Required pull-request checks build one reproducible artifact. A protected deployment workflow promotes that exact artifact to staging, applies reviewed migrations, verifies readiness and smoke behavior, requires production approval, observes health after promotion, and retains recovery evidence.

## Scope

### Included

- PR checks and branch protection
- Build-once artifact promotion
- Protected GitHub environments
- Environment-scoped OIDC
- Deployment concurrency
- Migration preflight
- Staging/slot deployment
- Readiness and smoke gates
- Manual approval
- Post-deploy observation
- Rollback/roll-forward and evidence retention

### Excluded

- Dependency scanning details, E-007
- Health and alert implementation, E-012
- Migration implementation, E-008

## Systems Affected

- Frontend and backend GitHub Actions
- GitHub repository rules/environments
- Azure App Service and slots
- OIDC identities and permissions
- MySQL migration identity
- Artifact storage and deployment history

## Required Change Summary

### CI

- Require frontend build/type/lint/test/security checks and backend format/build/integration/security checks on pull requests.
- Prevent direct and force pushes to deployment branches.
- Build and sign/attest one artifact digest per release.

### Deployment

- Use protected staging and production environments with scoped OIDC and reviewers.
- Serialize deployments with a concurrency group.
- Verify target configuration, identity, schema compatibility, and backup/PITR evidence.
- Apply reviewed forward migrations with a separate identity.
- Deploy to staging/slot and require live/ready health plus API/browser smoke.
- Promote the same artifact after approval and observe agreed SLIs.
- Stop/rollback the application artifact when safe, otherwise execute a reviewed roll-forward plan.
- Retain prior artifact, digest, migration, approval, and smoke evidence.

### Tests

- Seed failing tests, vulnerable dependencies, migration failure, readiness failure, concurrent deployment, and post-deploy smoke failure to prove each gate.

### Documentation

- Document routine release, emergency release, rollback/roll-forward, and ownership.

## Implementation Phases

Phases are completed in order unless a documented dependency requires otherwise. A phase that changes code is not complete until its listed tests pass. A phase containing only configuration, documentation, or operational work must attach equivalent validation evidence.

### Phase 1 — Create required pull-request gates

**Status:** Not started

#### Changes

- Separate CI from deployment.
- Require backend/frontend builds, tests, migrations/contracts, and security checks before merge.
- Add branch and environment protections.

#### Tests and validation

- [ ] Intentionally failing test, vulnerable dependency, and contract/migration failure must block.

#### Phase completion rule

- [ ] All scoped changes are implemented or explicitly documented as not applicable.
- [ ] Every required automated test passes.
- [ ] Required manual, staging, migration, or operational evidence is attached.
- [ ] The initiative `Work Status` section is updated with verified evidence.

### Phase 2 — Build once and deploy to staging

**Status:** Not started

#### Changes

- Produce minimal immutable artifacts with retained digest/evidence.
- Deploy the same artifact to protected staging using environment-scoped OIDC.

#### Tests and validation

- [ ] Artifact-content/digest verification.
- [ ] Concurrent deployment and wrong-environment protection tests.

#### Phase completion rule

- [ ] All scoped changes are implemented or explicitly documented as not applicable.
- [ ] Every required automated test passes.
- [ ] Required manual, staging, migration, or operational evidence is attached.
- [ ] The initiative `Work Status` section is updated with verified evidence.

### Phase 3 — Gate production promotion

**Status:** Not started

#### Changes

- Run migration preflight, readiness, API/browser smoke, and safe security checks.
- Require production approval and promote/swap the same artifact.

#### Tests and validation

- [ ] Broken migration, failed readiness, CSRF/auth/catalogue smoke, and approval-bypass tests.

#### Phase completion rule

- [ ] All scoped changes are implemented or explicitly documented as not applicable.
- [ ] Every required automated test passes.
- [ ] Required manual, staging, migration, or operational evidence is attached.
- [ ] The initiative `Work Status` section is updated with verified evidence.

### Phase 4 — Exercise rollback or roll-forward

**Status:** Not started

#### Changes

- Observe agreed SLIs after release.
- Automate application rollback when schema-compatible and document roll-forward otherwise.

#### Tests and validation

- [ ] Failed post-deploy smoke drill.
- [ ] Rollback/roll-forward rehearsal with retained deployment and migration evidence.

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

- [ ] Deployment branches and environments are protected.
- [ ] Build and deployment are separated.
- [ ] Staging, migration, readiness, smoke, approval, and observation gates are required.
- [ ] Recovery and evidence retention are tested.

## Risks and Edge Cases

- Rebuilding per environment means production may run untested bytes.
- Automatic rollback can be unsafe after incompatible schema migration.
- Broad OIDC permissions increase deployment compromise impact.
- Concurrent deployments can interleave migrations and application versions.

## Product Features Affected

- Every release
- Database evolution
- Incident recovery
- Operational accountability

## Validation

- A failing backend test blocks deployment.
- Only the attested artifact tested in staging reaches production.
- Broken migration/readiness/smoke scenarios stop promotion.
- Concurrent deployments do not overlap.
- A recovery exercise restores the prior application or completes a roll-forward.

## Completion Criteria

- [ ] Deployment branches and environments are protected.
- [ ] Build and deployment are separated.
- [ ] Staging, migration, readiness, smoke, approval, and observation gates are required.
- [ ] Recovery and evidence retention are tested.

## Decisions

- Production receives the exact artifact tested in staging.
- Schema recovery is explicitly roll-forward or restore-aware; rollback is not assumed.

## Detailed Implementation Documents

This initiative currently requires only this `README.md`. Add `backend.md`, `frontend.md`, or `infrastructure.md` only when a separate technical responsibility becomes substantial enough to justify it.

## Traceability

The codes below are retained only to map this implementation plan to the historical problem register.

| Reference | Problem |
|---|---|
| OPS-001 | Pushes can deploy directly to production without essential release gates |
| OPS-002 | Builds and artifacts are not fully reproducible, minimal, or supply-chain hardened |

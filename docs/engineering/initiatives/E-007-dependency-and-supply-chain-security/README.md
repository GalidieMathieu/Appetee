# E-007 — Dependency and Supply-Chain Security

## Initiative Information

- **Status:** Ready for implementation
- **Type:** Engineering initiative
- **Priority:** High
- **Implementation order:** 7
- **Last updated:** 2026-08-06

## Goal

Remove known vulnerable production dependencies and make builds reproducible, minimal, reviewable, and attributable.

## Problem

The production npm tree contains known high-severity advisories. Toolchain versions are not fully pinned, the backend has no locked restore, GitHub Actions use mutable references, artifacts are broader than necessary, and there is no required dependency review, SBOM, provenance, or mature static/secret scanning policy.

## Why This Matters

Potential browser compromise/data leak/denial of service depending advisory reachability; known-vulnerable framework versions also block a defensible production release. Exposure to listed GHSAs including Angular XSS/cache/OOM issues and path-to-regexp/body-parser/qs issues.

Build compromise, unverifiable releases, larger disclosure surface, and difficult incident attribution. Artifact contents and toolchain are insufficiently pinned, scanned, attested, or minimized.

## Current Behavior

- npm audit --omit=dev reported 9 affected production nodes: 7 High, 1 Moderate, 1 Low. Direct Angular common/compiler/core and dependent packages resolve to 21.2.4. Express transitives include body-parser 2.2.2, path-to-regexp 8.3.0, and qs 6.15.0.
- Frontend CI uses npm install instead of npm ci and uploads path '.', including source/tests/dev dependencies. Backend has no global.json or packages.lock.json. Actions use mutable major tags. There is no dependency review/update bot, CodeQL, action pinning, secret scanning, SBOM, license gate, or provenance. Full npm audit reports 2 Critical development/build nodes and 21 High: Vitest 4.0.17 includes GHSA-5xrq-8626-4rwp; transitive tar 7.5.11 includes GHSA-23hp-3jrh-7fpw and related advisories.

## Target Behavior

Frontend and backend dependencies are locked and patched, runtime/tool versions are pinned, third-party actions are immutable, high-risk dependency changes are reviewed, and each production artifact has a retained dependency inventory and provenance.

## Scope

### Included

- Angular/Express advisory remediation
- NuGet and npm locked restores
- Node/npm/.NET version pinning
- Action SHA pinning and permissions
- Dependency review and update automation
- Install-script review
- CodeQL/static scanning
- SBOM/license review
- Artifact digest/provenance
- Expiring vulnerability waivers

### Excluded

- Deployment staging/promotion flow, E-011
- Application-specific security tests, E-017

## Systems Affected

- `package.json` and lockfile
- NuGet project files and lockfiles
- GitHub Actions
- Build artifacts
- Repository security settings
- Dependency update automation

## Required Change Summary

### Frontend

- Upgrade the Angular suite together to a nonaffected compatible patch and refresh Express transitives.
- Run `npm ci` with a committed lockfile and reviewed install scripts.
- Pin Node and npm versions.
- Block unsuppressed production High/Critical advisories.

### Backend

- Pin the .NET SDK with `global.json`.
- Generate NuGet lockfiles and restore in locked mode.
- Run machine-readable vulnerable/outdated package checks.

### CI/CD

- Pin third-party actions to full commit SHAs.
- Minimize permissions and separate untrusted PR code from production credentials.
- Enable dependency review, CodeQL, secret scanning, SBOM/license generation, and artifact attestation.
- Require an owner, evidence, compensating controls, and expiry for every waiver.

### Tests

- Run build, type, unit, integration, browser, and advisory-specific regression tests after updates.
- Seed policy failures to prove gates block.

### Documentation

- Document update cadence, exception process, supported runtimes, and artifact retention.

## Implementation Phases

Phases are completed in order unless a documented dependency requires otherwise. A phase that changes code is not complete until its listed tests pass. A phase containing only configuration, documentation, or operational work must attach equivalent validation evidence.

### Phase 1 — Patch known vulnerable dependencies

**Status:** Not started

#### Changes

- Upgrade the Angular suite and affected Express transitives to reviewed compatible versions.
- Review advisory reachability and record any temporary waiver.

#### Tests and validation

- [ ] npm audit production/full, npm ls, build, type checks, unit tests, and targeted browser regressions.
- [ ] Backend vulnerable-package check.

#### Phase completion rule

- [ ] All scoped changes are implemented or explicitly documented as not applicable.
- [ ] Every required automated test passes.
- [ ] Required manual, staging, migration, or operational evidence is attached.
- [ ] The initiative `Work Status` section is updated with verified evidence.

### Phase 2 — Pin reproducible toolchains and restores

**Status:** Not started

#### Changes

- Pin Node/npm and .NET SDK versions.
- Use npm ci and locked NuGet restore.
- Pin third-party actions to immutable SHAs.

#### Tests and validation

- [ ] Clean-environment reproducibility test.
- [ ] Lockfile drift and action-policy tests.

#### Phase completion rule

- [ ] All scoped changes are implemented or explicitly documented as not applicable.
- [ ] Every required automated test passes.
- [ ] Required manual, staging, migration, or operational evidence is attached.
- [ ] The initiative `Work Status` section is updated with verified evidence.

### Phase 3 — Add repository security gates

**Status:** Not started

#### Changes

- Enable dependency review, CodeQL/static analysis, secret scanning, and install-script review.
- Minimize workflow permissions and isolate untrusted PR code.

#### Tests and validation

- [ ] Seeded vulnerable dependency, secret, unsafe action, and permission-policy failures must block.

#### Phase completion rule

- [ ] All scoped changes are implemented or explicitly documented as not applicable.
- [ ] Every required automated test passes.
- [ ] Required manual, staging, migration, or operational evidence is attached.
- [ ] The initiative `Work Status` section is updated with verified evidence.

### Phase 4 — Produce attributable artifacts

**Status:** Not started

#### Changes

- Generate SBOM, license report, digest, and provenance/attestation.
- Define expiring waiver ownership and review cadence.

#### Tests and validation

- [ ] Artifact-content, SBOM, signature/attestation, and expired-waiver tests.

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

- [ ] Current production dependency advisories are patched or time-bounded with approved evidence.
- [ ] Runtime and package restores are pinned and reproducible.
- [ ] Actions are SHA-pinned with minimal permissions.
- [ ] Dependency review, scanning, SBOM, and provenance are required.

## Risks and Edge Cases

- A vulnerability report does not prove reachability, but integrity does not prove safety.
- Unreviewed force upgrades can introduce breaking behavior.
- Install scripts execute during restore and need explicit review.
- Permanent waivers silently become accepted vulnerabilities.

## Product Features Affected

- All frontend and backend code
- Build and deployment
- Incident response and compliance evidence

## Validation

- Production audits report no unsuppressed High/Critical issues.
- Locked restore fails when manifests and lockfiles drift.
- A newly vulnerable dependency or mutable action reference is blocked.
- SBOM and artifact digest are retained with each release.

## Completion Criteria

- [ ] Current production dependency advisories are patched or time-bounded with approved evidence.
- [ ] Runtime and package restores are pinned and reproducible.
- [ ] Actions are SHA-pinned with minimal permissions.
- [ ] Dependency review, scanning, SBOM, and provenance are required.

## Decisions

- Dependency exceptions expire and block when expired.
- Build integrity and vulnerability reachability are evaluated separately.

## Detailed Implementation Documents

This initiative currently requires only this `README.md`. Add `backend.md`, `frontend.md`, or `infrastructure.md` only when a separate technical responsibility becomes substantial enough to justify it.

## Traceability

The codes below are retained only to map this implementation plan to the historical problem register.

| Reference | Problem |
|---|---|
| SEC-007 | Production npm dependency tree contains known High advisories |
| OPS-002 | Builds and artifacts are not fully reproducible, minimal, or supply-chain hardened |

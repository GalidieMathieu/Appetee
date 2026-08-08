# E-003 — Credential Logging and Secret Protection

## Initiative Information

- **Status:** Ready for implementation
- **Type:** Engineering initiative
- **Priority:** High
- **Implementation order:** 3
- **Last updated:** 2026-08-06

## Goal

Remove passwords and credentials from logs and source control, rotate exposed values, and establish secret-handling controls.

## Problem

Login and registration request objects are written to the console, and their generated string representation includes plaintext passwords. A development database credential is also tracked in source history. Database hashing does not protect credentials copied to logs or Git.

## Why This Matters

Account compromise in Appetee and potentially other services where a password was reused, plus severe privacy and incident-response impact. Direct credential disclosure into a secondary storage and access domain.

Local/test data access and a credential-reuse risk; severity rises immediately if the value was reused in shared or production infrastructure. Secret material is distributed through source control and remains in history.

## Current Behavior

- Both actions call Console.WriteLine(request). The positional request records include Password, so their generated record string representation includes the credential. Production console logging is enabled.
- appsettings.Development.json contains a nonempty connection-string user ID and password and is tracked in current HEAD/history. The value was redacted. The host is local, so this audit does not claim a production credential was exposed.

## Target Behavior

Authentication events use structured allowlisted logs that never contain credentials or unnecessary personal data. Local and deployed secrets come from user secrets, environment settings, or Key Vault references. Verified exposed credentials are rotated, and scanning prevents recurrence.

## Scope

### Included

- Removal of auth request serialization
- Log redaction and allowlists
- Historical log review without copying secrets
- Development secret migration
- Credential rotation
- Repository and CI secret scanning
- Publish-artifact secret checks

### Excluded

- General telemetry design, E-012
- Password policy and login throttling, E-004

## Systems Affected

- Auth controller and request records
- Console/Application Insights/App Service log pipeline
- Development configuration
- Git history and GitHub protection
- CI artifacts and deployment settings

## Required Change Summary

### Backend

- Delete all direct request-object logging for login and registration.
- Create structured authentication events with trace ID, coarse result code, and rate-limit outcome only.
- Add tests or analyzers preventing known sensitive fields from entering logs.

### Infrastructure

- Move local database credentials to .NET user secrets or environment variables.
- Commit only redacted configuration examples.
- Rotate any value that remains valid or was reused.
- Review log retention and access for the period in which password logging was possible.
- Enable history-aware secret scanning and repository-host push protection.
- Verify publish artifacts and workflow output do not contain secrets.

### Tests

- Send sentinel email/password/token values through success and failure paths and prove they are absent from captured logs.
- Verify the old database credential no longer authenticates where applicable.

### Documentation

- Document local secret setup, rotation ownership, and incident steps for future exposure.

## Implementation Phases

Phases are completed in order unless a documented dependency requires otherwise. A phase that changes code is not complete until its listed tests pass. A phase containing only configuration, documentation, or operational work must attach equivalent validation evidence.

### Phase 1 — Remove sensitive logging

**Status:** Not started

#### Changes

- Delete request-object logging from authentication flows.
- Use structured allowlisted authentication events only.

#### Tests and validation

- [ ] Sentinel password, email, token, cookie, and connection-string values must not appear in captured logs.
- [ ] Source/analyzer test preventing sensitive request serialization.

#### Phase completion rule

- [ ] All scoped changes are implemented or explicitly documented as not applicable.
- [ ] Every required automated test passes.
- [ ] Required manual, staging, migration, or operational evidence is attached.
- [ ] The initiative `Work Status` section is updated with verified evidence.

### Phase 2 — Move and rotate tracked secrets

**Status:** Not started

#### Changes

- Move developer credentials to user-secrets or environment variables.
- Commit only nonsecret configuration examples.
- Rotate any valid or reused value and document the response.

#### Tests and validation

- [ ] Verify old credentials no longer authenticate where applicable.
- [ ] Build/publish artifact scan for secret sentinels.

#### Phase completion rule

- [ ] All scoped changes are implemented or explicitly documented as not applicable.
- [ ] Every required automated test passes.
- [ ] Required manual, staging, migration, or operational evidence is attached.
- [ ] The initiative `Work Status` section is updated with verified evidence.

### Phase 3 — Prevent recurrence

**Status:** Not started

#### Changes

- Enable history-aware secret scanning and push protection.
- Define log retention, access, and redaction rules.

#### Tests and validation

- [ ] Seeded-secret test must fail the repository gate.
- [ ] Log-sink verification in local/test/deployed environments.

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

- [ ] Password-bearing logging is removed.
- [ ] Any valid/reused credential is rotated.
- [ ] Development configuration is nonsecret.
- [ ] Secret scanning and publish-artifact checks are required.
- [ ] Log access/retention and response actions are documented.

## Risks and Edge Cases

- Deleting a secret from the current file does not remove Git history.
- Log exporters and backups may retain prior entries.
- Overly broad structured logging can still disclose email or reset data.

## Product Features Affected

- Sign-up
- Login
- Local development
- Deployment and incident response

## Validation

- Sentinel credentials never appear in local, test, or deployed logs.
- No active secret remains in tracked configuration or generated artifacts.
- Secret scanning blocks a seeded credential.
- Rotation and local setup are reproducible by a new developer.

## Completion Criteria

- [ ] Password-bearing logging is removed.
- [ ] Any valid/reused credential is rotated.
- [ ] Development configuration is nonsecret.
- [ ] Secret scanning and publish-artifact checks are required.
- [ ] Log access/retention and response actions are documented.

## Decisions

- Request objects containing credentials are never serialized to logs.
- Secrets are injected at runtime and examples remain nonsecret.

## Detailed Implementation Documents

This initiative currently requires only this `README.md`. Add `backend.md`, `frontend.md`, or `infrastructure.md` only when a separate technical responsibility becomes substantial enough to justify it.

## Traceability

The codes below are retained only to map this implementation plan to the historical problem register.

| Reference | Problem |
|---|---|
| SEC-003 | Sign-up and login records containing passwords are logged |
| SEC-009 | A plaintext development database credential is tracked |

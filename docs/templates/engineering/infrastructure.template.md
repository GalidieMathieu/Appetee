# E-XXX — Engineering Initiative Name — Infrastructure

## Canonical Plan

The initiative [`README.md`](./README.md) owns the problem, target, scope, phases and completion criteria.

This document describes infrastructure/operations implementation details only.

## Systems

List affected infrastructure.

## Current Configuration

Describe only verified configuration.

Clearly label anything that has not been verified.

Do not infer live Azure configuration from repository source alone.

## Target Configuration

Describe intended infrastructure behavior.

## Environments

| Environment | Purpose | Deployment method |
|---|---|---|
| Development | | |
| Staging | | |
| Production | | |

Remove environments that do not exist.

## Identity and Access

Describe managed identities, RBAC, database identity/credentials, deployment identity, least privilege, and administrator access.

Never place secrets in this document.

## Configuration and Secrets

Describe required configuration names and ownership.

Do not include actual secret values.

## Networking

Document relevant public/private access, firewall, TLS, CORS origins, and service/private endpoints when applicable.

## Deployment

Describe:

```text
build
test
artifact
staging
validation
approval
production
```

## Database Migration Integration

Describe when migrations run, permissions, backup/PITR check, failure behavior and application compatibility.

## Monitoring

Describe health endpoint, readiness, metrics, logs, alerts and notification path.

## Backup and Recovery

When applicable:

```text
Backup:
PITR:
Restore validation:
RPO:
RTO:
```

Do not claim recovery capability without evidence.

## Rollback / Roll-forward

Describe the expected recovery action after failed deployment/configuration changes.

## Security

Document secret handling, identity, least privilege, public exposure, TLS, audit access, and dependency/tool provenance.

## Validation

- [ ] Configuration verified in target environment.
- [ ] Deployment test.
- [ ] Health/readiness test.
- [ ] Permission negative test.
- [ ] Migration test when applicable.
- [ ] Rollback/roll-forward test.
- [ ] Backup/restore evidence when applicable.
- [ ] Alert routing test when applicable.

## Completion Evidence

Record:

```text
Environment:
Date:
Configuration validated:
Deployment:
Health:
Migration:
Recovery:
Alerts:
Remaining manual work:
```

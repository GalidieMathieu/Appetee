# E-012 — Health, Observability, Alerting, and Recovery

## Initiative Information

- **Status:** Ready for implementation
- **Type:** Engineering initiative
- **Priority:** High
- **Implementation order:** 12
- **Last updated:** 2026-08-06

## Goal

Make failures detectable, diagnosable, and recoverable with health checks, telemetry, alerts, runbooks, and coordinated restore evidence.

## Problem

The application has no liveness/readiness endpoints, service-level metrics or dependency traces, actionable alerts, documented RPO/RTO, coordinated MySQL/Blob recovery procedure, or restore drill evidence. Source review also cannot verify many live Azure reliability settings.

## Why This Matters

Longer and less predictable outages, missed SLOs, data inconsistency, and no demonstrated recovery capability. The system lacks dependency-aware readiness, measurable service health, actionable alerts, and a tested recovery control plane.

## Current Behavior

- No health services/endpoints exist; Express falls back all GET paths to index.html. Logging has trace scopes and structured Blob/error logs but no successful request duration/status, metrics, exporter, dependency tracing, dashboards, alerts, availability tests, runbooks, RPO/RTO, coordinated MySQL/Blob restore procedure, or restore drill evidence.

## Target Behavior

The process exposes safe liveness and bounded dependency-aware readiness. Application Insights/OpenTelemetry records privacy-safe requests, dependencies, metrics, and traces. Owned alerts link to runbooks, and isolated restore drills prove a consistent database/media recovery within documented objectives.

## Scope

### Included

- `/health/live` and `/health/ready`
- MySQL/Blob/schema/identity readiness
- OpenTelemetry/Application Insights
- Request/dependency metrics and traces
- Dashboards and SLOs
- Alert ownership and routing
- RPO/RTO
- MySQL/Blob backup settings review
- Coordinated restore and reconciliation
- Incident runbooks and exercises
- Capacity/cost alerts

### Excluded

- Deployment workflow itself, E-011
- Media reconciliation implementation, E-006

## Systems Affected

- ASP.NET API
- Express frontend host
- Azure App Service
- Application Insights/monitoring
- Azure MySQL Flexible Server
- Azure Blob Storage
- Key Vault/managed identity dependencies
- Operational documentation

## Required Change Summary

### Application

- Add process-only liveness.
- Add short-timeout, cached readiness for MySQL, Blob, expected schema, and required identity/configuration.
- Instrument request duration/status, dependency calls, failures, retries, and key business/security events without sensitive payloads.
- Propagate trace IDs across logs and responses.

### Azure

- Configure availability tests, dashboards, alerts, log retention/sampling, backup retention, PITR, Blob redundancy/versioning/soft delete as required.
- Verify App Service Always On, health path, slots, scale settings, and connection budgets.

### Operations

- Define SLOs, RPO, RTO, owners, escalation, and runbooks.
- Perform isolated MySQL restore and coordinated Blob/reference recovery.
- Run incident and alert-routing exercises.

### Tests

- Simulate process, DB, Blob, identity, slow dependency, schema mismatch, alert, and restore scenarios.
- Verify readiness does not create excessive dependency load.

## Implementation Phases

Phases are completed in order unless a documented dependency requires otherwise. A phase that changes code is not complete until its listed tests pass. A phase containing only configuration, documentation, or operational work must attach equivalent validation evidence.

### Phase 1 — Implement liveness, readiness, and core telemetry

**Status:** Not started

#### Changes

- Add separate live/ready endpoints and dependency-aware readiness.
- Define structured logs, metrics, traces, correlation, and redaction.

#### Tests and validation

- [ ] Health endpoint tests for healthy/degraded/unavailable dependencies.
- [ ] Telemetry/redaction integration tests.

#### Phase completion rule

- [ ] All scoped changes are implemented or explicitly documented as not applicable.
- [ ] Every required automated test passes.
- [ ] Required manual, staging, migration, or operational evidence is attached.
- [ ] The initiative `Work Status` section is updated with verified evidence.

### Phase 2 — Create owned alerts and runbooks

**Status:** Not started

#### Changes

- Define actionable thresholds, severity, owner, and runbook for critical signals.
- Configure synthetic availability and authentication/security alerts.

#### Tests and validation

- [ ] Synthetic alert tests must reach the responsible notification path.
- [ ] Runbook tabletop for each critical alert.

#### Phase completion rule

- [ ] All scoped changes are implemented or explicitly documented as not applicable.
- [ ] Every required automated test passes.
- [ ] Required manual, staging, migration, or operational evidence is attached.
- [ ] The initiative `Work Status` section is updated with verified evidence.

### Phase 3 — Prove backup and coordinated restore

**Status:** Not started

#### Changes

- Document MySQL PITR/backup and Blob protection.
- Define restore order and reference reconciliation.
- Record RPO/RTO targets.

#### Tests and validation

- [ ] Isolated coordinated database/blob restore drill.
- [ ] Post-restore integrity and media-reference reconciliation tests.

#### Phase completion rule

- [ ] All scoped changes are implemented or explicitly documented as not applicable.
- [ ] Every required automated test passes.
- [ ] Required manual, staging, migration, or operational evidence is attached.
- [ ] The initiative `Work Status` section is updated with verified evidence.

### Phase 4 — Exercise incident and recovery operations

**Status:** Not started

#### Changes

- Define incident severity, containment, communications, evidence, access, and post-incident process.
- Review SLOs and alerts using beta evidence.

#### Tests and validation

- [ ] Outage/security tabletop and measured recovery drill.
- [ ] Action items tracked to closure.

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

- [ ] Live/ready endpoints are deployed and used by delivery infrastructure.
- [ ] Privacy-safe telemetry, dashboards, and owned alerts exist.
- [ ] RPO/RTO and runbooks are documented.
- [ ] Coordinated MySQL/Blob restore is exercised and measured.

## Risks and Edge Cases

- A readiness check that directly probes every dependency on every request can cause an outage.
- Logs without redaction can turn observability into a privacy breach.
- Provider backup settings do not prove that application-consistent restore works.
- Alerts without ownership or runbooks create noise, not reliability.

## Product Features Affected

- All production journeys
- Deployments
- Authentication and administration
- Database and media recovery
- Incident response

## Validation

- Load balancers stop routing to an unready instance.
- Trace IDs connect user-visible errors to dependency traces.
- Owned alerts fire for seeded failures and reach the responder.
- An isolated restore reconstructs a usable, reference-consistent application within measured RPO/RTO.

## Completion Criteria

- [ ] Live/ready endpoints are deployed and used by delivery infrastructure.
- [ ] Privacy-safe telemetry, dashboards, and owned alerts exist.
- [ ] RPO/RTO and runbooks are documented.
- [ ] Coordinated MySQL/Blob restore is exercised and measured.

## Decisions

- Liveness checks the process; readiness checks bounded dependency capability.
- Restore readiness is demonstrated by exercise, not assumed from provider defaults.

## Detailed Implementation Documents

This initiative currently requires only this `README.md`. Add `backend.md`, `frontend.md`, or `infrastructure.md` only when a separate technical responsibility becomes substantial enough to justify it.

## Traceability

The codes below are retained only to map this implementation plan to the historical problem register.

| Reference | Problem |
|---|---|
| REL-003 | Health, telemetry, alerting, recovery, and restore readiness are incomplete |

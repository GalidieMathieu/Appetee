# Engineering Initiatives

This directory contains only engineering initiative folders. Every initiative uses a directory, even when it currently needs only one document. This keeps paths predictable and avoids mixing standalone files with initiative directories.

## Rules

- The initiative `README.md` is the canonical plan and status document.
- Add `backend.md`, `frontend.md`, or `infrastructure.md` only when that technical area is substantial and independently useful.
- Implementation is organized into phases.
- Every code-changing phase must list and pass its tests before completion.
- Configuration, documentation, and operational phases must attach equivalent validation evidence.
- Audit identifiers appear only in the initiative traceability section.

| Order | Initiative | Priority | Status | Document |
|---:|---|---|---|---|
| 1 | E-001 — User Account Authorization and Ownership | Critical | Ready for implementation | [Open](./E-001-user-account-authorization/README.md) |
| 2 | E-002 — Administrative Permissions and Audit Trail | High | Ready for implementation | [Open](./E-002-administrative-permissions/README.md) |
| 3 | E-003 — Credential Logging and Secret Protection | High | Ready for implementation | [Open](./E-003-credential-and-secret-protection/README.md) |
| 4 | E-004 — Authentication Abuse Protection | High | Ready for implementation | [Open](./E-004-authentication-abuse-protection/README.md) |
| 5 | E-005 — Session, CSRF, and Browser Security | High | Ready for implementation | [Open](./E-005-session-csrf-browser-security/README.md) |
| 6 | E-006 — Secure Media Upload and Storage Consistency | High | Ready for implementation | [Open](./E-006-secure-media-workflow/README.md) |
| 7 | E-007 — Dependency and Supply-Chain Security | High | Ready for implementation | [Open](./E-007-dependency-and-supply-chain-security/README.md) |
| 8 | E-008 — Database Migrations, Integrity, and Concurrency | High | Ready for implementation | [Open](./E-008-database-migrations-integrity-concurrency/README.md) |
| 9 | E-009 — Server-Authoritative Nutrition and Cost Calculations | High | Ready for implementation | [Open](./E-009-server-authoritative-calculations/README.md) |
| 10 | E-010 — Stable API Contracts and Error Responses | High | Ready for implementation | [Open](./E-010-stable-api-contracts-errors/README.md) |
| 11 | E-011 — Safe CI/CD, Staging, and Production Promotion | High | Ready for implementation | [Open](./E-011-safe-delivery-pipeline/README.md) |
| 12 | E-012 — Health, Observability, Alerting, and Recovery | High | Ready for implementation | [Open](./E-012-observability-recovery/README.md) |
| 13 | E-013 — Frontend Routing, State Isolation, Accessibility, and Reliability | Medium | Ready for implementation | [Open](./E-013-frontend-reliability-accessibility/README.md) |
| 14 | E-014 — API, Frontend, and Capacity Performance | Medium | Ready for implementation | [Open](./E-014-performance-and-capacity/README.md) |
| 15 | E-015 — Backend Module Boundaries and Domain Model Refactoring | Medium | Ready for implementation | [Open](./E-015-module-boundaries-and-domain-model/README.md) |
| 16 | E-016 — Privacy, Data Lifecycle, and Account Closure | Medium | Ready for implementation | [Open](./E-016-privacy-and-data-lifecycle/README.md) |
| 17 | E-017 — Testing Strategy and Mandatory Quality Gates | High | Ready for implementation | [Open](./E-017-testing-and-quality-gates/README.md) |
| 18 | E-018 — Codebase Maintainability and Operational Documentation | Medium | Ready for implementation | [Open](./E-018-maintainability-and-documentation/README.md) |

## Status rules

- `Ready for implementation`: planning is sufficiently complete to begin the first phase.
- `In progress`: at least one implementation phase has started.
- `Blocked`: a named dependency or unresolved decision prevents progress.
- `Completed`: all phases, tests, evidence, and completion criteria are finished.

Creating or updating documentation does not count as implementation progress.

# E-018 — Codebase Maintainability and Operational Documentation

## Initiative Information

- **Status:** Ready for implementation
- **Type:** Engineering initiative
- **Priority:** Medium
- **Implementation order:** 18
- **Last updated:** 2026-08-06

## Goal

Remove misleading/dead code, enforce consistent naming and formatting, and keep setup, deployment, migration, recovery, and incident documentation aligned with the executable system.

## Problem

The backend contains inconsistent naming, a misspelled storage interface, incorrect DTO declarations, commented endpoint blocks, stale comments, and formatting diagnostics without required gates. Frontend/backend READMEs contradict the deployed architecture and do not document migrations, test database behavior, recovery, alerting, or incident procedures.

## Why This Matters

Slower onboarding and higher change defect rate. Inconsistent vocabulary and unenforced style obscure boundaries.

Operational error, longer onboarding/incidents, and knowledge concentration. The executable system and stated operating model disagree.

## Current Behavior

- IBlopStorageService is misspelled; an ingredient response is declared as DietDto; method/action casing is inconsistent; commented endpoint blocks and stale comments remain; dotnet format reports 37 whitespace diagnostics; no formatter/analyzer gate is enforced.
- Frontend README says the backend is not deployed while production environment code points to a public App Service and a backend production workflow exists. Backend Azure integration remains TODO. Dedicated test DB behavior, destructive scripts, migrations, rollback, health, recovery, alerting, access, and incident processes are not documented.

## Target Behavior

The codebase uses consistent module vocabulary and mandatory formatting/analyzers. Inactive code remains in version control rather than comments. Documentation is task-oriented, owned, validated by a new-maintainer exercise, and avoids repeating feature/API rules across multiple files.

## Scope

### Included

- Naming and dead-code cleanup
- EditorConfig/format/analyzers/warnings policy
- No-console and frontend quality alignment
- README correction
- Local development setup
- Test database safety
- Migration/release/runbook documentation
- Documentation ownership and validation
- Lean documentation rules

### Excluded

- Large architectural refactor, E-015
- Operational control implementation, E-011/E-012

## Systems Affected

- Backend interfaces/controllers/DTOs
- Frontend debug and formatting conventions
- Repository quality configuration
- READMEs and engineering docs
- Operations runbooks

## Required Change Summary

### Code Quality

- Correct misleading names and response types with contract review.
- Remove commented endpoints and stale code/comments.
- Adopt EditorConfig, `dotnet format`, analyzers, warnings policy, Angular ESLint, Prettier, and no-console rules.
- Keep changes scoped so formatting noise does not hide security/behavior changes.

### Documentation

- Make root/repository READMEs reflect actual deployed/local architecture.
- Document isolated test DB behavior and prohibit destructive scripts against production.
- Document configuration, migrations, release, rollback/roll-forward, health, monitoring, backup/restore, access, and incident procedures.
- Use one canonical feature README, backend details, frontend details, generated OpenAPI, and ADRs only for expensive-to-reverse decisions.
- Add owners and last-verified dates to operational docs.

### Validation

- Require clean format/analyzer/lint gates.
- Have a new maintainer perform setup and a nonproduction deploy from documentation.
- Run an incident tabletop using the documented procedures.

## Implementation Phases

Phases are completed in order unless a documented dependency requires otherwise. A phase that changes code is not complete until its listed tests pass. A phase containing only configuration, documentation, or operational work must attach equivalent validation evidence.

### Phase 1 — Clean misleading code and establish a formatting baseline

**Status:** Not started

#### Changes

- Correct misleading names/types and remove dead/commented production code.
- Apply scoped formatting without obscuring functional changes.

#### Tests and validation

- [ ] Build/type/unit/integration tests after renames.
- [ ] Repository search for superseded symbols and commented endpoints.

#### Phase completion rule

- [ ] All scoped changes are implemented or explicitly documented as not applicable.
- [ ] Every required automated test passes.
- [ ] Required manual, staging, migration, or operational evidence is attached.
- [ ] The initiative `Work Status` section is updated with verified evidence.

### Phase 2 — Add mandatory quality gates

**Status:** Not started

#### Changes

- Adopt EditorConfig, analyzers, dotnet format, Angular lint/format, and no-console rules.
- Define warnings and exception policy.

#### Tests and validation

- [ ] Format/lint/analyzer checks pass with zero unapproved warnings.
- [ ] Seeded violation test must block.

#### Phase completion rule

- [ ] All scoped changes are implemented or explicitly documented as not applicable.
- [ ] Every required automated test passes.
- [ ] Required manual, staging, migration, or operational evidence is attached.
- [ ] The initiative `Work Status` section is updated with verified evidence.

### Phase 3 — Align developer and operational documentation

**Status:** Not started

#### Changes

- Correct repository READMEs and local setup.
- Document test database safety, migrations, release, rollback/roll-forward, health, monitoring, restore, access, and incidents.
- Keep one source of truth.

#### Tests and validation

- [ ] Documentation link/check commands where practical.
- [ ] A clean local setup and nonproduction deploy performed from the docs.

#### Phase completion rule

- [ ] All scoped changes are implemented or explicitly documented as not applicable.
- [ ] Every required automated test passes.
- [ ] Required manual, staging, migration, or operational evidence is attached.
- [ ] The initiative `Work Status` section is updated with verified evidence.

### Phase 4 — Validate documentation through use

**Status:** Not started

#### Changes

- Assign ownership and last-verified dates.
- Run a new-maintainer exercise and incident tabletop.

#### Tests and validation

- [ ] New maintainer can configure, test, and deploy without undocumented steps.
- [ ] Tabletop identifies no unresolved critical procedure gap.

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

- [ ] Naming/dead-code/format debt is resolved for the documented scope.
- [ ] Mandatory code-quality gates are active.
- [ ] Setup, test, migration, deployment, recovery, and incident docs match reality.
- [ ] Documentation structure follows the lean source-of-truth rules.

## Risks and Edge Cases

- Large mechanical formatting changes can obscure functional review.
- Documentation without an owner quickly becomes false.
- Duplicating API schema in Markdown creates contract drift.
- Renames can be breaking API changes if serialization is not reviewed.

## Product Features Affected

- Developer onboarding
- Every future change
- Deployment and incident response
- API and architecture maintenance

## Validation

- Format/lint/analyzer checks pass with zero unapproved warnings.
- Repository search finds no superseded symbols or commented production endpoints.
- A new maintainer can configure, test, and deploy to nonproduction using the docs.
- An incident tabletop identifies no missing critical procedure.

## Completion Criteria

- [ ] Naming/dead-code/format debt is resolved for the documented scope.
- [ ] Mandatory code-quality gates are active.
- [ ] Setup, test, migration, deployment, recovery, and incident docs match reality.
- [ ] Documentation structure follows the lean source-of-truth rules.

## Decisions

- Documentation is organized by responsibility and source of truth, not duplicated by repository.
- Generated OpenAPI is the detailed HTTP schema; Markdown explains intent and behavior.

## Detailed Implementation Documents

This initiative currently requires only this `README.md`. Add `backend.md`, `frontend.md`, or `infrastructure.md` only when a separate technical responsibility becomes substantial enough to justify it.

## Traceability

The codes below are retained only to map this implementation plan to the historical problem register.

| Reference | Problem |
|---|---|
| BE-002 | Naming, dead code, formatting, and quality automation reduce maintainability |
| DOC-001 | Deployment, test, migration, and operational documentation is stale/incomplete |
| FE-004 | Debug residue, subscription cleanup, validation caps, and localization readiness need hardening |

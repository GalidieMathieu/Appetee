# E-010 — Stable API Contracts and Error Responses

## Initiative Information

- **Status:** Ready for implementation
- **Type:** Engineering initiative
- **Priority:** High
- **Implementation order:** 10
- **Last updated:** 2026-08-06

## Goal

Create bounded, versioned, machine-checked API contracts with consistent validation, status codes, and ProblemDetails across environments.

## Problem

Development exception handling currently turns expected client errors into `500`, request validation and limits are inconsistent, C# and TypeScript contracts are hand-copied and already disagree, and placeholder routes expose unavailable `501` behavior. Separate builds can pass while the wire contract is broken.

## Why This Matters

Regression escape, poor diagnostics, false incident signals, and client-flow failure. Environment-dependent error contracts and middleware behavior.

Denial-of-service risk, data-quality defects, brittle integrations, and slower multi-client development. Validation and protocol invariants are scattered rather than enforced at the trust boundary.

Login/UI defects, failed releases, and high coordination cost for mobile or additional frontends. Compile-time checks stop at repository boundaries and cannot detect serialized shape drift.

## Current Behavior

- The test factory forces Development. Current Program uses DeveloperExceptionPage in Development but maps /error only outside Development. Eleven validation/auth/conflict tests therefore receive 500 rather than expected 400/401/409. Committed HEAD previously always used UseExceptionHandler("/error").
- Important strings/arrays/numbers lack central maximum lengths/counts/ranges; no application multipart/body limits were found; recipes/ingredients are unbounded; create actions return 200 rather than location-bearing 201; IngredientsController declares DietDto while returning ingredients; several unfinished meal-prep routes expose 501 contracts.
- There is no /api/v1 or documented compatibility policy/generated client. AuthResult serializes userName while TypeScript expects username. IngredientsController declares ActionResult<IReadOnlyList<DietDto>> while returning ingredients. Meal-prep routes expose 501 placeholders and the corresponding frontend worktree was deleted/unwired.

## Target Behavior

The API exposes a reviewed `/api/v1` contract, consistent ProblemDetails and status semantics in every environment, strict request limits, generated or validated Angular types, and CI detection of breaking changes.

## Scope

### Included

- Unified exception/ProblemDetails pipeline
- Status-code conventions
- Request/body/list limits
- Purpose-specific DTOs and overposting prevention
- OpenAPI generation and lint
- API versioning/deprecation policy
- Generated Angular client/types
- Contract snapshots and breaking-change gate
- Removal of placeholder endpoints

### Excluded

- Business-specific authorization rules, E-001/E-002
- Performance implementation beyond contract bounds, E-014

## Systems Affected

- ASP.NET middleware and controllers
- Application exceptions and request models
- OpenAPI output
- Angular API clients/models
- Integration tests and CI
- All current and future endpoints

## Required Change Summary

### Backend

- Use one exception-handler/ProblemDetails pipeline in Testing, Development, and Production; vary detail disclosure only.
- Define status semantics for validation, authentication, authorization, missing resources, conflict, rate limit, unsupported media, and payload too large.

Remaining backend implementation details are maintained in [`backend.md`](./backend.md).

### Frontend

- Generate or validate TypeScript models/client from OpenAPI.
- Centralize ProblemDetails mapping and user-safe error presentation.

Remaining frontend implementation details are maintained in [`frontend.md`](./frontend.md).

### Tests

- Restore all backend tests to green and add schema assertions for ProblemDetails.
- Test malformed JSON, unknown fields, overposting, boundary sizes, environment parity, serialization names, and N-1 compatibility.

Remaining tests implementation details are maintained in [`backend.md`](./backend.md).

### Documentation

- Document API conventions once; feature docs reference them rather than restating global behavior.

## Implementation Phases

Phases are completed in order unless a documented dependency requires otherwise. A phase that changes code is not complete until its listed tests pass. A phase containing only configuration, documentation, or operational work must attach equivalent validation evidence.

### Phase 1 — Restore a stable error baseline

**Status:** Not started

#### Changes

- Use consistent ProblemDetails/status semantics in every environment.
- Make the existing backend suite green for the corrected contract.
- Inventory active and placeholder routes.

#### Tests and validation

- [ ] All backend tests pass.
- [ ] Malformed JSON, unexpected exception, validation, auth, conflict, cache-header, and trace-ID assertions.

#### Phase completion rule

- [ ] All scoped changes are implemented or explicitly documented as not applicable.
- [ ] Every required automated test passes.
- [ ] Required manual, staging, migration, or operational evidence is attached.
- [ ] The initiative `Work Status` section is updated with verified evidence.

### Phase 2 — Define the canonical versioned contract

**Status:** Not started

#### Changes

- Introduce API versioning and purpose-specific DTOs.
- Generate/lint OpenAPI from the backend.
- Remove or hide unsupported placeholder endpoints.

#### Tests and validation

- [ ] OpenAPI schema validation and snapshot/compatibility tests.
- [ ] Overposting and response-minimization tests.

#### Phase completion rule

- [ ] All scoped changes are implemented or explicitly documented as not applicable.
- [ ] Every required automated test passes.
- [ ] Required manual, staging, migration, or operational evidence is attached.
- [ ] The initiative `Work Status` section is updated with verified evidence.

### Phase 3 — Generate and migrate the frontend client

**Status:** Not started

#### Changes

- Generate or validate TypeScript contracts from OpenAPI.
- Replace hand-copied drifting models incrementally.

#### Tests and validation

- [ ] Generated-client compilation and frontend integration tests.
- [ ] Contract mismatch must fail CI.

#### Phase completion rule

- [ ] All scoped changes are implemented or explicitly documented as not applicable.
- [ ] Every required automated test passes.
- [ ] Required manual, staging, migration, or operational evidence is attached.
- [ ] The initiative `Work Status` section is updated with verified evidence.

### Phase 4 — Enforce compatibility and deprecation rules

**Status:** Not started

#### Changes

- Define compatible-change, breaking-change, version, and deprecation policy.
- Add required contract gates to CI.

#### Tests and validation

- [ ] Seeded breaking-change test must block.
- [ ] N-1 client/server compatibility smoke where required.

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

- [ ] Consistent ProblemDetails/status behavior exists in all environments.
- [ ] All active endpoints are versioned and represented in OpenAPI.
- [ ] Angular contract types are generated or mechanically validated.
- [ ] Request limits and overposting protections are complete.
- [ ] Contract and breaking-change checks are required.

## Risks and Edge Cases

- Changing wire casing or status codes can break the deployed frontend.
- Returning detailed exceptions in Development can create behavior that tests do not exercise in Production.
- Generated clients can become noisy if the backend contract is poorly designed.
- Keeping placeholder endpoints invites consumers to depend on unavailable behavior.

## Product Features Affected

- Every frontend/backend integration
- Authentication and profile
- Catalogue and administration
- Future mobile or external clients
- Meal planning and grocery

## Validation

- Expected client errors never become unhandled `500` responses.
- Serialized names and schemas compile into the Angular client.
- Breaking changes are blocked unless versioned and reviewed.
- Requests above defined limits fail before expensive work.
- Unavailable routes are absent rather than advertised as placeholders.

## Completion Criteria

- [ ] Consistent ProblemDetails/status behavior exists in all environments.
- [ ] All active endpoints are versioned and represented in OpenAPI.
- [ ] Angular contract types are generated or mechanically validated.
- [ ] Request limits and overposting protections are complete.
- [ ] Contract and breaking-change checks are required.

## Decisions

- The wire contract has one machine-readable source of truth.
- Environment changes never alter status/shape semantics.
- Unavailable features are not represented by permanent placeholder routes.

## Detailed Implementation Documents

- [Backend implementation](./backend.md)
- [Frontend implementation](./frontend.md)

## Traceability

The codes below are retained only to map this implementation plan to the historical problem register.

| Reference | Problem |
|---|---|
| REL-001 | Current Development exception pipeline converts expected 4xx paths into 500 |
| BE-001 | Boundary validation, request limits, response contracts, and status semantics are inconsistent |
| ARC-002 | API contracts are unversioned, hand-copied, and already drifting |

# E-006 — Secure Media Upload and Storage Consistency

## Initiative Information

- **Status:** Ready for implementation
- **Type:** Engineering initiative
- **Priority:** High
- **Implementation order:** 6
- **Last updated:** 2026-08-06

## Goal

Accept only bounded, decoded, canonical image content and make MySQL/Blob changes recoverable and reconcilable.

## Problem

Upload endpoints trust browser-provided MIME or filename information, relabel original bytes as AVIF, and do not enforce application-level size, signature, decode, dimension, metadata, or malware controls. Blob writes and relational writes are separate resources; current best-effort cleanup can leave orphaned or missing media.

## Why This Matters

Storage abuse, broken catalogue images, content-safety incident, availability degradation, and possible downstream client/parser exposure. Unrestricted content ingestion and content-type spoofing at a privileged catalogue boundary.

Missing images, storage leaks/cost, inconsistent catalogue data, and hard-to-repair failures. Cross-resource workflow has no durable state or exactly-once guarantee.

## Current Behavior

- Server validation checks presence/length but does not enforce an application size limit, signature, MIME, extension, successful decode, dimensions, frame count, or metadata policy. UploadImageAsAvifAsync assigns an .avif name and image/avif header but streams original bytes; its quality argument is unused. Client validation accepts the asserted MIME type or filename extension.
- Create uploads before the DB transaction and performs best-effort cleanup on failure. Recipe cleanup swallows errors; ingredient cleanup only logs. Updates obtain old Blob state outside the transaction, commit the new reference, then delete the old Blob. There is no outbox, durable operation state, idempotency key, inventory reconciliation, or repair job.

## Target Behavior

Images enter a private pending state, are bounded and decoded under resource limits, canonicalized, scanned where required, and promoted only after acceptance. Database references and Blob lifecycle use durable operation state, idempotency, retries, and reconciliation.

## Scope

### Included

- Request/body limits
- Magic-byte and decoder validation
- Canonical AVIF re-encoding
- Dimension/pixel/frame limits
- Metadata removal
- Quarantine/private storage
- Malware-scanning integration decision
- Media IDs instead of trusting URLs
- Outbox/workflow state
- Orphan/missing reconciliation
- Upload UI behavior and tests

### Excluded

- General authorization policy, E-002
- Complete CDN/image optimization, E-014

## Systems Affected

- Admin multipart endpoints
- Recipe and ingredient application services
- Blob storage adapter and containers
- Recipe/ingredient schema and media references
- Angular file selection/upload UI
- Background worker or reconciliation job

## Required Change Summary

### Backend

- Enforce endpoint and server body limits before buffering.
- Read a bounded stream and validate signature independently of declared MIME/extension.

Remaining backend implementation details are maintained in [`backend.md`](./backend.md).

### Frontend

- Validate size/type early for user feedback, while documenting that server validation is authoritative.
- Show upload progress, rejection reasons, retry state, and final processing state.

Remaining frontend implementation details are maintained in [`frontend.md`](./frontend.md).

### Infrastructure

- Verify anonymous access, shared-key access, firewall/private endpoint, lifecycle, soft delete/versioning, and scanning settings.
- Define retention for pending, superseded, and orphaned objects.

### Tests

- Test empty, oversized, wrong MIME, wrong extension, magic mismatch, truncated, polyglot, huge dimensions, resource bombs, metadata, duplicates, cancellation, scanner failure, DB failure, Blob failure, ambiguous commit, and concurrent replacement.

### Documentation

- Document the media state machine, limits, accepted formats, and repair procedure.

## Implementation Phases

Phases are completed in order unless a documented dependency requires otherwise. A phase that changes code is not complete until its listed tests pass. A phase containing only configuration, documentation, or operational work must attach equivalent validation evidence.

### Phase 1 — Enforce upload boundaries

**Status:** Not started

#### Changes

- Define request/file size, dimensions, pixel, frame, decode-time, and accepted-format limits.
- Reject untrusted extension/MIME assumptions.
- Add failing malicious-upload tests first.

#### Tests and validation

- [ ] Wrong extension/MIME, magic mismatch, truncation, polyglot, oversized body, huge dimensions, and resource-bomb tests.

#### Phase completion rule

- [ ] All scoped changes are implemented or explicitly documented as not applicable.
- [ ] Every required automated test passes.
- [ ] Required manual, staging, migration, or operational evidence is attached.
- [ ] The initiative `Work Status` section is updated with verified evidence.

### Phase 2 — Canonicalize and isolate media

**Status:** Not started

#### Changes

- Decode with a maintained library under resource limits.
- Strip metadata and re-encode to canonical AVIF.
- Store new content privately or in quarantine until accepted.

#### Tests and validation

- [ ] Decode/re-encode fidelity and metadata-removal tests.
- [ ] Private access and content-type tests.

#### Phase completion rule

- [ ] All scoped changes are implemented or explicitly documented as not applicable.
- [ ] Every required automated test passes.
- [ ] Required manual, staging, migration, or operational evidence is attached.
- [ ] The initiative `Work Status` section is updated with verified evidence.

### Phase 3 — Make MySQL and Blob workflow durable

**Status:** Not started

#### Changes

- Introduce durable operation state, idempotency, reconciliation, or outbox behavior.
- Define create/update/delete compensation and retry rules.

#### Tests and validation

- [ ] DB/Blob fault-injection tests at every failure boundary.
- [ ] Duplicate/replay and reconciliation tests proving no silent orphan/reference loss.

#### Phase completion rule

- [ ] All scoped changes are implemented or explicitly documented as not applicable.
- [ ] Every required automated test passes.
- [ ] Required manual, staging, migration, or operational evidence is attached.
- [ ] The initiative `Work Status` section is updated with verified evidence.

### Phase 4 — Complete frontend and operational handling

**Status:** Not started

#### Changes

- Show bounded upload progress and actionable errors.
- Add reconciliation visibility and lifecycle cleanup.

#### Tests and validation

- [ ] Frontend tests for invalid/oversized/scanner-failure responses.
- [ ] Scheduled reconciliation test with seeded orphaned and missing objects.

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

- [ ] Untrusted bytes are never directly relabeled and published.
- [ ] All accepted images pass bounded server decode/canonicalization.
- [ ] Media lifecycle is private/pending until accepted.
- [ ] MySQL/Blob workflows are idempotent and reconcilable.
- [ ] Failure and malicious-file test corpus passes.

## Risks and Edge Cases

- A decoder can be vulnerable or resource-exhausted even when the file extension is correct.
- MySQL cannot atomically roll back Blob Storage.
- Deleting an old image after commit can race with another update.
- Public Blob delivery may turn mislabeled content into a browser risk.

## Product Features Affected

- Ingredient images
- Recipe images
- Profile images if added
- Imports and moderation
- Storage cost and cleanup

## Validation

- Invalid or oversized inputs return controlled `400`, `413`, or `415` with no durable accepted object.
- Stored accepted bytes are a server-generated canonical image.
- Fault injection leaves one consistent active reference or an eventually repairable durable state.
- Reconciliation detects and repairs/reports orphaned and missing objects.
- Upload UI correctly represents processing and rejection states.

## Completion Criteria

- [ ] Untrusted bytes are never directly relabeled and published.
- [ ] All accepted images pass bounded server decode/canonicalization.
- [ ] Media lifecycle is private/pending until accepted.
- [ ] MySQL/Blob workflows are idempotent and reconcilable.
- [ ] Failure and malicious-file test corpus passes.

## Decisions

- The server, not the browser, determines media validity and final format.
- Cross-resource consistency is achieved through durable workflow and reconciliation, not claimed atomicity.

## Detailed Implementation Documents

- [Backend implementation](./backend.md)
- [Frontend implementation](./frontend.md)

## Traceability

The codes below are retained only to map this implementation plan to the historical problem register.

| Reference | Problem |
|---|---|
| SEC-004 | Image uploads accept and relabel unverified arbitrary bytes |
| REL-002 | MySQL and Blob writes are not atomic or reconciled |

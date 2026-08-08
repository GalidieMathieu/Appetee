# E-006 — Secure Media Upload and Storage Consistency: Backend Implementation

## Purpose

This file contains backend-specific implementation detail. The canonical problem, target behavior, scope, status, risks, validation, and completion criteria remain in [`README.md`](./README.md).

## Engineering Rules

- Keep identity, authorization, ownership, server-owned fields, transaction behavior, and failure recovery explicit.
- Map HTTP and infrastructure types at the boundary; application use cases remain neutral where the initiative touches architecture.
- Use versioned migrations, bounded I/O, cancellation, purpose-specific contracts, and negative tests.
- Do not make unrelated refactors while implementing this initiative.

## Backend

- Enforce endpoint and server body limits before buffering.
- Read a bounded stream and validate signature independently of declared MIME/extension.
- Decode with a maintained library under time/memory/pixel constraints.
- Reject unsupported content or re-encode to a canonical AVIF output; never simply rename bytes.
- Strip metadata and generate server-owned media identifiers and content headers.
- Store unaccepted content in a private pending/quarantine location.
- Represent media state and durable operations in MySQL.
- Use an outbox/worker or equivalent durable pattern for promotion and deletion.
- Make create/update requests idempotent and use independent bounded cleanup cancellation.
- Run reconciliation comparing database references and Blob inventory.

## Infrastructure

- Verify anonymous access, shared-key access, firewall/private endpoint, lifecycle, soft delete/versioning, and scanning settings.
- Define retention for pending, superseded, and orphaned objects.

## Documentation

- Document the media state machine, limits, accepted formats, and repair procedure.

## Tests

- Test empty, oversized, wrong MIME, wrong extension, magic mismatch, truncated, polyglot, huge dimensions, resource bombs, metadata, duplicates, cancellation, scanner failure, DB failure, Blob failure, ambiguous commit, and concurrent replacement.

## Delivery Order

Follow the implementation phases in the initiative README. Update status and completion evidence only there so the two documents cannot drift.

# E-005 — Session, CSRF, and Browser Security: Backend Implementation

## Purpose

This file contains backend-specific implementation detail. The canonical problem, target behavior, scope, status, risks, validation, and completion criteria remain in [`README.md`](./README.md).

## Engineering Rules

- Keep identity, authorization, ownership, server-owned fields, transaction behavior, and failure recovery explicit.
- Map HTTP and infrastructure types at the boundary; application use cases remain neutral where the initiative touches architecture.
- Use versioned migrations, bounded I/O, cancellation, purpose-specific contracts, and negative tests.
- Do not make unrelated refactors while implementing this initiative.

## Backend

- Choose same-origin reverse proxy/BFF or keep cross-origin with a documented threat model.
- Issue a bound antiforgery token and require a custom header for every `POST`, `PUT`, `PATCH`, and `DELETE`.
- Reject missing/untrusted `Origin` and unsafe Fetch Metadata combinations as defense in depth.
- Use one coherent cookie expiry configuration with shorter idle lifetime and a hard absolute maximum.
- Add account/session security version and `OnValidatePrincipal` or equivalent bounded revalidation.
- Invalidate sessions on password, role, account-state, and security-version changes.
- Require recent authentication for destructive or privileged actions where appropriate.
- Set `Cache-Control: no-store` on auth/session/profile and other sensitive responses.
- Configure CSP, `frame-ancestors`, `nosniff`, referrer, permissions, and HSTS policies deliberately.

## Infrastructure

- Persist and protect Data Protection keys across restarts, instances, and slot swaps.
- Verify real custom-domain cookie, CORS, preflight, and header behavior at the public edge.

## Documentation

- Record the domain topology, cookie contract, reauthentication rules, and key-persistence design.

## Tests

- Use a real hostile-origin browser page for form, multipart, JSON/preflight, logout, upload, and destructive requests.
- Test idle/absolute expiry, password/role change, disabled user, copied cookie, restart, multi-instance, and slot swap.
- Run public-edge header and cache checks.

## Delivery Order

Follow the implementation phases in the initiative README. Update status and completion evidence only there so the two documents cannot drift.

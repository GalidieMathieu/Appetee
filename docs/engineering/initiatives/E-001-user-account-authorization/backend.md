# E-001 — User Account Authorization and Ownership: Backend Implementation

## Purpose

This file contains backend-specific implementation detail. The canonical problem, target behavior, scope, status, risks, validation, and completion criteria remain in [`README.md`](./README.md).

## Engineering Rules

- Keep identity, authorization, ownership, server-owned fields, transaction behavior, and failure recovery explicit.
- Map HTTP and infrastructure types at the boundary; application use cases remain neutral where the initiative touches architecture.
- Use versioned migrations, bounded I/O, cancellation, purpose-specific contracts, and negative tests.
- Do not make unrelated refactors while implementing this initiative.

## Backend

- Make authentication the default for account routes.
- Replace consumer-facing `/api/users/{id}` account mutations with `/api/users/me` operations.
- Resolve the account ID from a validated server principal; never accept `userId` or owner fields from the browser for self-service actions.
- Remove the general user list from the consumer API. If support search is needed later, create a separate policy and minimal DTO.
- Define consistent non-leaking `401`, `403`, and `404` behavior.
- Minimize profile responses so diets, restrictions, email, and internal fields are returned only when required.
- Ensure account deletion revokes active sessions and coordinates relational and media cleanup.

## Phase 1 Route Contract

Phase 1 contains the legacy consumer account surface while claim-scoped write and deletion operations are built in later phases.

| Request | Anonymous caller | Authenticated caller |
|---|---:|---:|
| `GET /api/users/me` | `401 ProblemDetails` | `200` for a valid current session |
| `PUT /api/users/me` | `401 ProblemDetails` | `200` for a valid update; `400 ProblemDetails` for invalid input |
| `GET /api/users` | `401 ProblemDetails` | `404 ProblemDetails` |
| `GET /api/users/exists-by-email` | `401 ProblemDetails` | `404 ProblemDetails` |
| `GET /api/users/{id}` | `401 ProblemDetails` | `404 ProblemDetails` |
| `PUT /api/users/{id}` | `401 ProblemDetails` | `404 ProblemDetails` |
| `DELETE /api/users/{id}` | `401 ProblemDetails` | `404 ProblemDetails` |
| `GET /api/auth/exists-by-email?email=...` | `200 { "exists": boolean }` | `200 { "exists": boolean }` |

The legacy routes are retained only as OpenAPI-hidden tombstones. They perform no account lookup or mutation. Their authenticated `404` response is identical for the caller's own ID, another user's ID, and an ID that does not exist, so it cannot be used to infer account existence. Phase 4 will add claim-scoped account closure and its cleanup semantics.

Authentication middleware returns RFC 7807 responses with `status`, `title`, `detail`, `instance`, and `traceId`. It uses `401` when no valid principal is present and `403` when an authenticated principal fails a separate authorization policy. Account-existence checks do not select between `403` and `404`; the disabled legacy surface always uses the generic `404` contract after authentication.

## Phase 2 Current-User Contract

`GET /api/users/me` resolves the account from the validated cookie principal and returns only:

```json
{
  "username": "current_name",
  "imageUrl": "https://cdn.example/profile.png"
}
```

`PUT /api/users/me` accepts the same two editable fields. Either field may be omitted to leave it unchanged, but at least one must be supplied. The route never accepts an account or owner ID. Unknown members are rejected with `400 ValidationProblemDetails`, preventing identity, email, preference, and other server-owned-field overposting.

The controller extracts `currentUserId` from the validated principal before calling the application service. The service and repository carry that server-derived value separately from the request, and the SQL write is constrained by `WHERE id = @currentUserId`. A principal whose account no longer exists receives `401 ProblemDetails` because the session is stale.

Email availability is a deliberate public sign-up capability at `GET /api/auth/exists-by-email`. It returns only `{ "exists": true|false }`, validates the email syntax, and exposes no user profile or account identifier. The former `/api/users/exists-by-email` route remains disabled so public authentication concerns do not weaken the protected account controller.

## Database

- Review delete cascades and document which records are deleted, retained, anonymized, or handled asynchronously.
- Add account state/security version fields through E-005/E-008 where required.

## Documentation

- Document the current-user route contract and account-deletion semantics.

## Tests

- Run an authorization matrix for anonymous, user A, user B, disabled/deleted user, support/admin, and stale session.
- Verify user A cannot infer whether user B exists through response differences.
- Verify account deletion cannot be triggered for another user and all expected cleanup is performed.

## Delivery Order

Follow the implementation phases in the initiative README. Update status and completion evidence only there so the two documents cannot drift.

# E-002 — Administrative Permissions and Audit Trail: Frontend Implementation

## Purpose

This file contains frontend-specific implementation detail. The canonical problem, target behavior, scope, status, risks, validation, and completion criteria remain in [`README.md`](./README.md).

## Engineering Rules

- The frontend improves usability and state management but never grants authorization or owns authoritative business truth.
- All user-scoped state is cleared on identity change and network waits are bounded.
- Use generated/validated API contracts, documented error states, strict typing, and accessible interaction patterns.
- Do not duplicate the business rules from the initiative README; reference and implement them.

## Frontend

### Approved current-session contract (2026-10-12)

The user approved resolving the missing retrieval contract through an additive
backend change. `GET /api/auth/session` now returns:

```typescript
interface UserSession {
  userId: number;
  username: string;
  permissions: string[];
}
```

The existing identity fields are unchanged. `permissions` is always a non-null
array of exact, current server-side permission codes, ordered ordinally with no
duplicates. An ordinary account returns `[]`; the approved codes are
`Catalog.ReadAdmin` and `Catalog.Write`, independently granted.

This is a current-user endpoint with no query parameters: selectors such as
`userId`/`ownerId` and attempted permission input return `400`, never another
account's capabilities. Anonymous, disabled, missing and stale sessions return
`401`; clients must follow the existing authentication error contract. Responses
are `no-store`, including errors. Retrieval grants nothing and accepts no
assignment operation. The backend reads durable grants and validates active
account/security version together; neither cookie permission claims nor client
input provide authority. Every administrative request still checks permissions
independently; a successful session response is not an authorization token.

The DTO is reflected in generated OpenAPI. Verify the deployed API has this
change before frontend rollout; an older backend still returning identity only
is a contract mismatch. Do not infer permissions or probe admin routes to build
a permission list. Backend verification evidence is recorded in the README.

### Permission-aware navigation and state

Implement against the current-session contract:

- Maintain explicit loading, authenticated, unauthenticated and unavailable
  capability states. Unknown/loading/failed state must not enable admin controls.
  A missing or invalid permissions field is a contract error, not admin access.
- `Catalog.ReadAdmin` enables administrative reads; `Catalog.Write` enables
  catalogue mutations. Match codes exactly and ignore unknown codes. Neither
  permission implies the other. Do not add a generic administrator role.
- A read-only moderator may inspect but not mutate. A write-only account may
  use supported create operations, but must not be given read access. Existing
  record editing requires its protected admin read to obtain the record/ETag;
  show it only when both permissions are present. Do not substitute a public
  read or fabricate a token to bypass this dependency.
- Load current capabilities during session initialization and revalidate before
  entering administrative pages. Browser guards/navigation are usability only:
  the backend checks current permissions on every admin request.
- Sign-up/login responses retain their existing contracts: fetch `/api/auth/session`
  after successful authentication rather than expecting permissions in those
  responses. Use credentialed requests and the existing session/error flow.
- Clear capabilities, admin data, draft ownership and ETags on logout or identity
  change. Ignore in-flight responses belonging to an earlier identity/session.
  Do not persist capabilities as authority in local storage or cookies.
- On `401`, clear user-scoped state and use the existing sign-in flow. Permission
  grants/revocations advance the security version, so an old session may receive
  `401` and require sign-in, not merely `403`.
- On admin `403`, stop the action, clear admin-specific state and revalidate
  capabilities with the session endpoint. If revalidation fails, stay fail-closed
  and leave the restricted page. Do not repeatedly retry the denied request.
- Bound network waits and handle refresh failures without displaying stale
  privileged data. There is no promised push notification for permission loss;
  server denial remains authoritative between refreshes.

### Implemented administrative API contract

The implemented endpoint inventory is:

| Endpoint | Required permission |
| --- | --- |
| `GET /api/admin/ingredient-details/{id}` | `Catalog.ReadAdmin` |
| `GET /api/admin/recipe-details/{id}` | `Catalog.ReadAdmin` |
| `POST /api/admin/ingredient-details` | `Catalog.Write` |
| `POST /api/admin/recipe-details` | `Catalog.Write` |
| `PUT /api/admin/recipe-details/{id}` | `Catalog.Write` |

Do not invent ingredient-update, permission-assignment, or audit-list endpoints.
Normal recipe discovery, favorites, detail and Preview contracts remain unchanged.

Admin success bodies use the envelope:

```typescript
interface CatalogueResource<T> {
  resource: T; // Existing endpoint-specific detail or mutation-summary DTO.
  resourceVersion: string; // Decimal string; do not convert to a JS number.
  createdByUserId: number | null;
  updatedByUserId: number | null;
}
```

Read admin detail responses with headers available (for example Angular
`observe: 'response'`). Keep the exact quoted `ETag` with the resource and send
it unchanged as `If-Match` on its update. Treat it as opaque: do not derive it
from `resourceVersion`, alter quotes, use a wildcard or reuse another resource's
token. Successful creates/updates return a new envelope and ETag; a mutation
summary is not necessarily a complete detail DTO. Obtain a protected fresh
detail read when needed and authorized. Creates need no `If-Match`.

- `428`, `catalog_precondition_required`: missing update header; correct the
  client flow. Do not retry without the precondition.
- `412`, `catalog_precondition_failed`: rejected token/stale edit; nothing was
  saved. Explain the conflict, offer an authorized fresh read and require user
  review before resubmission. Never automatically replay an old draft with a
  fresh ETag. If permissions were lost, clear the draft rather than retaining
  privileged content.
- `404`: show unavailable/deleted resource and invalidate its cached data/ETag.
- Handle existing validation failures through the documented API error contract.

Version/audit metadata are server-owned, never form fields. Catalogue ETags are
separate from `X-Meal-Plan-Revision`; do not send the planner revision instead.
Use the existing credentialed API/CSRF flow from E-005 for mutations. Do not
log tokens, cookies or sensitive payloads and do not blindly replay writes
after authentication, CSRF, timeout or network failures.

### Required frontend verification

- Ordinary account: no administrative navigation or actions.
- Read-only, write-only and both-permission accounts: independent UI/guard
  behavior matching the endpoint inventory, including the edit-read dependency.
- Loading, missing/invalid capabilities and failed session refresh: fail-closed.
- Identity changes and late prior-session responses: no capabilities, drafts,
  records or ETags leak to the next user.
- Permission removal while a page is open: both `401` stale-session and `403`
  denial paths clear restricted state; grants take effect after a valid fresh
  session, not local UI assignment.
- Envelope mapping and exact resource-bound `If-Match`; successful token refresh,
  `428`, `412`, `404`, validation and CSRF paths; no automatic mutation replay.
- Browser integration against the implemented session contract, credentialed
  requests and CORS-exposed `ETag`, not only mocked permission arrays.

### Copyable frontend implementation prompt

```text
Implement ONLY the E-002 frontend, following this frontend.md, backend.md and
README.md, applicable AGENTS.md, and the existing E-005 CSRF/session contract.
Inspect git status/diff first and preserve existing work.

First verify the real GET /api/auth/session response and OpenAPI. The approved
backend contract is {userId:number, username:string, permissions:string[]}.
The backend implementation was added on 2026-10-12. If the deployed API still
omits permissions, STOP and report a backend deployment/contract mismatch;
do not infer privileges, probe admin routes for grants, or change backend code.

Once the capability contract exists, implement independent Catalog.ReadAdmin
and Catalog.Write navigation, guards and actions, fail-closed session states,
identity-safe request handling, and 401/403 permission-loss cleanup. Implement
the documented admin resource envelopes and exact ETag/If-Match update flow,
including 428/412 handling without automatic write replay. Preserve normal
recipe response contracts, existing CSRF behavior and unrelated planner work.
Do not add permission assignment UI or undocumented endpoints.

Add unit and browser integration coverage listed in this document. Run the
required frontend build/tests. Report files changed, API contract verified,
exact commands/results and any blockers. Do not mark E-002 frontend complete
until the real backend contract and meaningful frontend tests pass.
```

## Documentation

- Document permission meanings, assignment process, emergency removal, and access review cadence.

## Delivery Order

Follow the implementation phases in the initiative README. Update status and completion evidence only there so the two documents cannot drift.

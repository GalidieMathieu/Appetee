# E-013 — Frontend Routing, State Isolation, Accessibility, and Reliability: Frontend Implementation

## Purpose

This file contains frontend-specific implementation detail. The canonical problem, target behavior, scope, status, risks, validation, and completion criteria remain in [`README.md`](./README.md).

## Engineering Rules

- The frontend improves usability and state management but never grants authorization or owns authoritative business truth.
- All user-scoped state is cleared on identity change and network waits are bounded.
- Use generated/validated API contracts, documented error states, strict typing, and accessible interaction patterns.
- Do not duplicate the business rules from the initiative README; reference and implement them.

## Frontend

- Create a route/product inventory and remove links to unavailable pages or implement the routes.
- Replace indefinite initializer waits with bounded timeout, safe fallback, and later retry.
- Clear every principal-scoped store on logout, failed restoration, account switch, and session revocation.
- Fix sign-up step guards and redirect state so refresh/back navigation cannot create invalid wizard state.
- Use lifecycle-safe subscription patterns and remove debug logging/residue.
- Align client validation caps with server contracts.
- Remediate labels, focus order, keyboard operation, visible focus, semantics, dialog behavior, contrast, and responsive text.
- Centralize locale-aware currency, unit, date, and number formatting.
- Add ESLint/Prettier and zero-warning frontend gates.

## Tests

- Test offline, DNS failure, refusal, never-completing requests, `401`, `500`, and slow restoration.
- Test logout/login as a different user without stale recipes/preferences/profile.
- Run route smoke, component tests, axe, keyboard-only, contrast, and selected screen-reader acceptance.

## Delivery Order

Follow the implementation phases in the initiative README. Update status and completion evidence only there so the two documents cannot drift.

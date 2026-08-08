# F-005 — Legal and Privacy — Backend

## Canonical Contract

The feature `README.md` owns the shared endpoint, request/response, persistence, and error contracts.

## Responsibilities

- Expose the active legal versions through `/api/legal/current`.
- Validate the legal versions submitted with signup.
- Reject missing, false, or stale acceptance.
- Persist `accepted_at` using server time.
- Store legal acceptance in the same transaction as pending account creation.
- Cascade the acceptance row when the account is deleted unless later retention requirements explicitly change that rule.
- Keep public legal content out of the database unless a future administration requirement justifies server-managed policy documents.

## Database

Use the E-008 migration process for `user_legal_acceptances`.

No extra index beyond the `user_id` primary key is needed for the initial access pattern.

## Tests

- Current-version endpoint.
- Missing acceptance.
- False acceptance.
- Stale version.
- Atomic signup + acceptance persistence.
- Account-delete cascade.

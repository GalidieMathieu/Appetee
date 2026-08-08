# F-005 — Legal and Privacy — Frontend

## Canonical Contract

The feature `README.md` owns data models, database impact, endpoint contracts, and error behavior.

## Responsibilities

- Add public `/privacy` and `/terms` routes.
- Render static legal documents responsively.
- Provide the reusable public legal footer.
- Load current legal versions before final signup acceptance is submitted.
- Add one required acknowledgement checkbox to the final onboarding step.
- Open legal links in a new tab from the onboarding wizard.
- Prevent final submission while acknowledgement is false.
- Handle stale-version conflict by reloading legal versions and asking the user to acknowledge the current documents.
- Keep legal pages independent from authenticated API availability.

## State

The legal-page content itself is static.

Current legal versions may be cached for the active onboarding flow. They do not need a long-lived root store.

The checkbox is temporary onboarding state and follows the F-003/E-019 wizard-state lifetime.

## Tests

- Public route rendering.
- Footer links.
- Required checkbox behavior.
- New-tab legal links from onboarding.
- Current-version loading.
- Stale-version retry flow.
- Mobile/desktop readability and keyboard access.

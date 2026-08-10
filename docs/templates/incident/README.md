# Incident Template

Use this template when unexpected behavior is discovered during development, testing, staging, or production use and the issue cannot or should not be fixed immediately.

An Incident Report records an observation. It is not automatically a product feature or engineering initiative.

## Real incident structure

Create incidents as folders:

```text
docs/incidents/
├── open/
│   └── IR-XXX-short-description/
│       ├── README.md
│       └── assets/          # optional
└── resolved/
```

Copy `README.template.md` into the incident folder and rename it to `README.md`.

Create `assets/` only when useful evidence exists.

## Incident IDs

Use one global sequential series:

```text
IR-001
IR-002
IR-003
```

Never reuse an ID.

## Status

Allowed statuses:

- Open
- Investigating
- Planned
- Resolved
- Won't fix

## Severity

Allowed severities:

- Low
- Medium
- High
- Critical

Severity describes impact, not implementation priority.

## Resolution

After triage, an incident may be resolved through:

- a `fix/...` branch;
- an existing feature phase;
- an existing engineering initiative;
- a new feature;
- a new engineering initiative;
- a deliberate `Won't fix` decision.

When resolved and verified, move the entire incident folder from:

```text
docs/incidents/open/
```

to:

```text
docs/incidents/resolved/
```

Do not delete resolved incident reports.

## Evidence

Useful evidence can include:

- screenshots;
- sanitized API requests/responses;
- browser console evidence;
- relevant log extracts;
- query evidence;
- reproduction recordings or images.

Never store:

- passwords;
- cookies;
- authentication tokens;
- connection strings;
- secrets;
- unnecessary personal information.

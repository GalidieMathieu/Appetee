# IR-XXX — Short Incident Title

**Status:** Open
**Severity:** Medium
**Discovered:** YYYY-MM-DD
**Environment:** Development
**Area:** Frontend / Backend / Database / Infrastructure / Cross-system
**Related feature:** None
**Related engineering initiative:** None
**Discovered during:** None
**Resolution reference:** None

## Summary

Briefly describe the unexpected behavior that was observed.

Keep this factual and concise.

## Expected Behavior

Describe what should have happened.

Base this on the approved feature/engineering specification when one exists.

## Actual Behavior

Describe what actually happened.

Do not mix assumptions about the cause into this section.

## Reproduction

1.
2.
3.

Include any required preconditions such as authentication state, test data, route, device, or environment.

## Evidence

Add only evidence that helps reproduce, understand, or verify the incident.

### Screenshots

When screenshots exist:

```md
![Short evidence description](./assets/screenshot-01.png)
```

### API / Network Evidence

When useful, record:

```text
Method:
Endpoint:
Status:
Relevant request fields:
Relevant response fields:
```

Do not store authentication cookies, tokens, passwords, secrets, or unnecessary personal data.

### Logs

Include only the smallest useful sanitized extract or link to a file under `assets/`.

## Impact

Describe what the incident affects.

Examples:

- visual defect only;
- feature partially unusable;
- feature completely blocked;
- incorrect data;
- authorization/security impact;
- destructive data behavior;
- production availability.

## Initial Assessment

Record only what is currently known.

Do not invent or prematurely declare a root cause.

Possible observations:

- likely frontend;
- likely backend;
- likely persistence/query;
- reproducible only under specific conditions;
- regression;
- scope still unknown.

## Triage

**Blocking current work:** No
**Requires immediate fix:** No
**Likely owner:** Unknown

### Intended resolution path

Choose when known:

- [ ] Standalone bug fix
- [ ] Existing feature phase
- [ ] Existing engineering initiative
- [ ] New feature requirement
- [ ] New engineering initiative
- [ ] Won't fix
- [ ] Undetermined

### Assigned work

```text
Feature:
Engineering initiative:
Phase:
Branch:
Pull request:
```

Fill only fields that apply.

## Resolution

**Resolution status:** Not resolved

When resolved, document:

### Root Cause

What actually caused the incident?

### Change Made

What was changed?

### Tests Added or Updated

-

### Database / Migration Impact

None.

### Configuration / Infrastructure Impact

None.

## Verification

- [ ] Original reproduction steps no longer fail.
- [ ] Relevant regression tests pass.
- [ ] Authorization/security negative tests pass when applicable.
- [ ] Database/query behavior verified when applicable.
- [ ] Related feature or engineering documentation updated when required.
- [ ] Resolution reference added.
- [ ] Sensitive evidence has not been committed.
- [ ] Incident status changed to `Resolved` or `Won't fix`.
- [ ] Incident folder moved to `docs/incidents/resolved/`.

## Resolution Reference

Record the final traceability information.

```text
Branch:
Pull request:
Commit:
Feature / initiative:
Phase:
```

## Notes

Optional context that does not belong in the sections above.

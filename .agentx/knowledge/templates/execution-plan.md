# Execution Plan Template

Author this plan BEFORE writing any code for issues with 3+ files or high `risk_surface`. Share with the team in the issue comment.

---

## Issue

#{{ issue_number }} — {{ issue title }}

**Type:** {{ story | bug | feature | epic }}
**Priority:** {{ P0 | P1 | P2 }}
**Risk surface:** {{ low | high }}
**Estimated file count:** {{ N }}

## Scope

{{ One paragraph describing what this plan covers and what it explicitly excludes. }}

## Files to Change

| File | Change type | Notes |
|---|---|---|
| `{{ file_path }}` | {{ add | modify | delete }} | {{ why }} |
| `{{ file_path }}` | {{ add | modify | delete }} | {{ why }} |

## Risk Surface Classification

- [ ] Touches `src/shared/**` (cross-boundary contract)
- [ ] Touches `src/server/**` (backend protocol)
- [ ] Touches `*Contract*`, `*Schema*`, `*Types*` files
- [ ] Touches `.github/workflows/**` (CI pipeline)

If any are checked → **architect review required before implementation**.

## Implementation Steps

1. {{ Step 1 — specific action with file path }}
2. {{ Step 2 }}
3. {{ Step 3 }}
4. Run `npm run validate` and confirm it passes.
5. Push branch and open PR using `templates/pr-description.md`.

## Test Plan

- Unit tests: {{ what to test, which file }}
- Integration: {{ if applicable }}
- Manual verification: {{ what to observe in the running app }}

## Rollback

{{ How to revert if this breaks production. }}

## Open Questions

- {{ Any uncertainty that needs architect or PM input before starting }}

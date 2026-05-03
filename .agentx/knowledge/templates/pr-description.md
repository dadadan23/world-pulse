# PR Description Template

Use this template for every pull request. Replace all `{{ }}` placeholders before submitting.

---

## Summary

Closes #{{ issue_number }} — {{ one-line description of what changed }}

{{ 2-4 bullet points describing the key changes }}

- 
- 
- 

## Files Changed

| File | Change |
|---|---|
| `{{ file_path }}` | {{ what changed }} |
| `{{ file_path }}` | {{ what changed }} |

**Risk surface:** {{ low | high }} — {{ explain if high }}

## Test Plan

- [ ] `npm run validate` passes (typecheck + test + lint + build)
- [ ] {{ Specific behavior verified manually or by test }}
- [ ] {{ Edge case tested }}
- [ ] No regressions in {{ affected component/feature }}

## Rollback

{{ Describe how to revert this change if it causes issues in production. For most changes: "Revert the commit. No migration needed." For data changes, describe the migration rollback. }}

## Definition of Done

- [ ] Behavior matches acceptance criteria in issue #{{ issue_number }}
- [ ] New code has test coverage (>70% target)
- [ ] No `any` types introduced
- [ ] No `console.log()` in production code
- [ ] Oblivion aesthetic applied to all UI changes (see `.agentx/knowledge/skills/oblivion-component.md`)
- [ ] Shared contract changes reviewed by architect (if `risk_surface == high`)

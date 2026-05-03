# Instruction: Commit Standards

All commits must follow Conventional Commits format. This is enforced by `commitlint` + `husky` pre-commit hooks. CI also validates commit messages in PRs (`quality-gates.yml`).

---

## Format

```
<type>(<scope>): <description> (#<issue>)

[optional body]

[optional footer]
```

**Rules:**
- `type` must be lowercase from the allowed list.
- `scope` is optional but recommended for clarity.
- `description` starts with a lowercase verb, no period at end.
- Issue reference `(#123)` in the description or body is required by the quality gate.
- Subject line ≤ 72 characters.
- Body lines ≤ 100 characters.

---

## Allowed Types

| Type | Use |
|---|---|
| `feat` | New user-facing feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no logic change |
| `refactor` | Code restructure, no behavior change |
| `perf` | Performance improvement |
| `test` | Adding or correcting tests |
| `build` | Build system, dependencies |
| `ci` | CI/CD configuration |
| `chore` | Maintenance, tooling |
| `revert` | Reverts a previous commit |

---

## Breaking Changes

Append `!` to the type for breaking changes:

```
feat!(api)!: rename events:initial to events:bootstrap (#99)

BREAKING CHANGE: clients expecting events:initial must update to events:bootstrap.
```

---

## Examples

```
feat(globe): add GeoJSON coastline rendering (#41)
fix(socket): enter dormant-retry after reconnect_failed (#58)
chore(ci): upgrade setup-node@v4 to @v6 (#75)
docs(agentx): add risk_surface severity gate description (#103)
test(collectors): add recovery test for BaseCollector (#32)
refactor(store): extract event deduplication to utility (#44)
```

---

## Pre-Commit Hook

`lint-staged` runs on every `git commit`:
- ESLint autofix on staged `.ts`/`.tsx` files.
- Prettier format on staged `.ts`/`.tsx` files.

If ESLint finds unfixable errors, the commit is blocked. Fix the errors, re-stage, and commit again.

---

## Quality Gate

The `quality-gates.yml` workflow checks:
1. Every commit message contains `#<issue-number>`.
2. The first word of the description matches a conventional type.

Non-conventional commits cause a warning (not failure) for the type check, but missing issue references **block** the PR.

---

## Squash Policy

Feature branches should have clean, meaningful commits — not `wip` or `fix fix fix`. Squash before merging when the branch history is noisy. Each squashed commit should still follow these conventions.

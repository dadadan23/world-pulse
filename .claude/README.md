# .claude — Claude Code view of AgentX

Generated from `.github/` (Copilot) and `.agentx/` by `python3 .claude/sync-agentx.py`. **Edit the sources (or the script's selection lists), not the generated files**, then re-run. Exception: `skills/agent-x/` and `settings.json` are hand-written.

| Here | Source | Notes |
|---|---|---|
| `agents/` (8) | `.github/agents/*.agent.md` | Claude subagents. Copilot `constraints`/`boundaries`/`handoffs` frontmatter is folded into the body (Claude ignores it). Models: opus = product-manager, architect, reviewer, customer-coach; sonnet = the rest. Path boundaries are **advisory**, not tool-enforced. |
| `skills/agent-x/` | `.github/agents/agent-x.agent.md` | Rewritten as the coordinator **skill** (`/agent-x [issue]`): subagents cannot spawn subagents, so the main session dispatches. Original kept in `reference/`. |
| `skills/` (50 more) | `.agentx/knowledge/skills/*.md` (9, project-specific) + all 42 in `.github/skills/` |  |
| `commands/` (11) | `.github/prompts/*.prompt.md` | `/ax-prd`, `/ax-architecture`, `/ax-ux-design`, `/ax-test-gen`, `/ax-refactor`, `/ax-bug-triage`, `/ax-code-review`, `/ax-security-review`, `/ax-devops`, `/ax-ai-agent`, `/ax-evaluation`. `ax-` prefix avoids clashing with built-in `/code-review`, `/security-review`. |
| `rules/` (13) | `.github/instructions/*.instructions.md` | `applyTo` → `paths:` globs retargeted to this repo's layout. |
| `settings.json` | `.github/security/allowed-commands.json` (intent) | Narrow allowlist (read-only AgentX + validate/test) and deny for force-push, hard reset, global installs, `.env.local`. |

## Scope
Everything is converted, including skills/rules/prompts outside this stack (C#, Blazor, Go, Rust, Python, SQL Server, PostgreSQL, Fabric, Azure, Terraform/Bicep, AI agents). Rules and skills load only when their paths/descriptions match, so the cost of the extras is the skill description lines. If that becomes noisy, delete the unwanted folders (the script restores them on re-run) or narrow the selection in `sync-agentx.py`.
Deviation: the `ai` rule's Copilot glob `**/*ai*` matches almost any file, so it is narrowed to `*agent*`, `*llm*`, `agents/**`.

## Known gaps
- Helper scripts inside skills are mostly PowerShell (`.ps1`); install `pwsh` or use the `.sh`/`.py` equivalents where present.
- Copilot-only items are untouched: `.github/copilot-instructions.md`, workflows, hooks (`.husky` already covers git hooks).
- Doc conflict: agent files say 80% coverage; `CLAUDE.md` says >70%. Agents are told CLAUDE.md wins — decide and align.

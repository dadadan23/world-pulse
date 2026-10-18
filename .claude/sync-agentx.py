#!/usr/bin/env python3
"""Regenerate .claude/{agents,skills,commands,rules} from .github/ and .agentx/.

Sources (.github/agents, .github/skills, .github/prompts, .github/instructions,
.agentx/knowledge/skills) stay the single source of truth for Copilot/AgentX;
this script only produces the Claude Code view of them. Re-run after
`agentx upgrade`. Add a skill with:  python3 .claude/sync-agentx.py --include csharp
"""
import argparse, re, shutil, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / ".claude"
GH = ROOT / ".github"
AX = ROOT / ".agentx"

# --- selection ---------------------------------------------------------------
# .github/skills entries relevant to this stack (TypeScript/React/Three.js/Node/Electron/SQLite/Docker/GH Actions)
SKILLS = {
    "api-design", "code-organization", "core-principles", "database", "performance", "security",
    "containerization", "frontend-ui", "react", "testing", "type-safety", "error-handling",
    "logging-monitoring", "dependency-management", "documentation", "version-control",
    "configuration", "code-review-and-audit", "ux-ui-design", "github-actions-workflows",
    "release-management", "remote-git-operations",
}
# (agent file stem) -> (claude name, model, tools, description override or None)
RO = "Read, Grep, Glob, Bash, WebFetch, WebSearch"
RW = "Read, Grep, Glob, Edit, Write, Bash, WebFetch, WebSearch"
GHT = ", mcp__github"
AGENTS = {
    "product-manager": ("product-manager", "opus", RW + GHT),
    "ux-designer": ("ux-designer", "sonnet", RW + GHT),
    "architect": ("architect", "opus", RW + GHT),
    "engineer": ("engineer", "sonnet", RW + GHT),
    "devops": ("devops-engineer", "sonnet", RW + GHT),
    "reviewer": ("reviewer", "opus", RW + GHT),
    "reviewer-auto": ("reviewer-auto", "sonnet", RW + GHT),
    "customer-coach": ("customer-coach", "opus", RW + ", WebSearch"),
}
# prompt stem -> (command name, agent)
PROMPTS = {
    "architecture": ("ax-architecture", "architect"),
    "bug-triage": ("ax-bug-triage", "engineer"),
    "code-review": ("ax-code-review", "reviewer"),
    "devops": ("ax-devops", "devops-engineer"),
    "prd-gen": ("ax-prd", "product-manager"),
    "refactor": ("ax-refactor", "engineer"),
    "security-review": ("ax-security-review", "reviewer"),
    "test-gen": ("ax-test-gen", "engineer"),
    "ux-design": ("ax-ux-design", "ux-designer"),
}
# instruction stem -> paths
RULES = {
    "typescript": ["src/**/*.ts", "e2e/**/*.ts", "scripts/**/*.ts"],
    "react": ["src/renderer/**/*.tsx", "src/renderer/components/**", "src/renderer/hooks/**"],
    "api": ["src/server/**"],
    "devops": [".github/workflows/**", "Dockerfile", ".dockerignore"],
    "yaml": ["**/*.yml", "**/*.yaml"],
    "ux-methodology": ["docs/ux/**", "**/UX-*", "**/prototypes/**", "**/wireframe*"],
}

# --- helpers -----------------------------------------------------------------
def split_fm(text):
    m = re.match(r"^---\n(.*?)\n---\n?(.*)$", text, re.S)
    return (m.group(1), m.group(2)) if m else ("", text)

def fm_get(fm, key):
    m = re.search(rf"^{key}:\s*(.+)$", fm, re.M)
    return m.group(1).strip().strip("'\"") if m else ""

def fm_list(fm, key):
    """Collect '- item' lines under a top-level key (tolerates inconsistent indentation)."""
    out, on = [], False
    for line in fm.splitlines():
        if re.match(rf"^{key}:\s*$", line):
            on = True; continue
        if on:
            if re.match(r"^\S", line) and not line.startswith("-"):
                break
            m = re.match(r"^\s*-\s+(.*)$", line)
            if m: out.append(m.group(1).strip().strip("'\""))
    return out

def fm_block(fm, key):
    """Return nested 'can_modify'/'cannot_modify' style lists under key."""
    sect, cur, res = False, None, {}
    for line in fm.splitlines():
        if re.match(rf"^{key}:\s*$", line): sect = True; continue
        if sect:
            if re.match(r"^\S", line): break
            m = re.match(r"^\s*(\w+):\s*$", line)
            if m: cur = m.group(1); res[cur] = []; continue
            m = re.match(r"^\s*-\s+(.*)$", line)
            if m and cur: res[cur].append(m.group(1).strip().strip("'\""))
    return res

def fm_handoffs(fm):
    items, cur = [], None
    on = False
    for line in fm.splitlines():
        if re.match(r"^handoffs:\s*$", line): on = True; continue
        if on:
            if re.match(r"^\S", line): break
            m = re.match(r"^\s*-\s+label:\s*(.*)$", line)
            if m: cur = {"label": m.group(1).strip("'\"")}; items.append(cur); continue
            m = re.match(r"^\s*(agent|context):\s*(.*)$", line)
            if m and cur: cur[m.group(1)] = m.group(2).strip("'\"")
    return items

def cli(text):
    """Translate PowerShell AgentX CLI calls to the bash CLI used on Linux/macOS/cloud sessions."""
    text = re.sub(r"\.agentx/agentx\.ps1 hook -Phase start -Agent ([\w-]+) -Issue (<\w+>|\$\{?\w+\}?|\d+)",
                  r"./.agentx/agentx.sh hook start \1 \2", text)
    text = re.sub(r"\.agentx/agentx\.ps1 hook -Phase finish -Agent ([\w-]+) -Issue (<\w+>|\$\{?\w+\}?|\d+)",
                  r"./.agentx/agentx.sh hook complete \1 \2", text)
    text = text.replace(".\\.agentx\\agentx.ps1", "./.agentx/agentx.sh").replace(".agentx/agentx.ps1", "./.agentx/agentx.sh")
    return text.replace("././.agentx", "./.agentx")

def esc(s):
    return s.replace('"', '\\"')

def reset(d):
    if d.exists(): shutil.rmtree(d)
    d.mkdir(parents=True)

# --- agents ------------------------------------------------------------------
def build_agents():
    d = OUT / "agents"; reset(d)
    names = []
    for stem, (name, model, tools) in AGENTS.items():
        fm, body = split_fm((GH / "agents" / f"{stem}.agent.md").read_text())
        desc = fm_get(fm, "description")
        cons = fm_list(fm, "constraints")
        bounds = fm_block(fm, "boundaries")
        hands = fm_handoffs(fm)
        pre = ["", "## Claude Code Runtime Contract", "",
               "Ported from `.github/agents/%s.agent.md` (Copilot). Frontmatter rules are preserved below because Claude "
               "does not read Copilot frontmatter." % stem,
               "You run as a **subagent**: you cannot spawn other agents. Do not attempt handoffs yourself; finish your "
               "deliverable, then end your reply with a `NEXT:` line naming the recommended next agent and issue so the "
               "main session (`/agent-x`) can dispatch it.", ""]
        if cons:
            pre += ["### Constraints (MUST/MUST NOT)", ""] + [f"- {c}" for c in cons] + [""]
        if bounds:
            pre += ["### File Boundaries", ""]
            for k, v in bounds.items():
                pre += [f"**{k.replace('_', ' ')}:**"] + [f"- {x}" for x in v] + [""]
            pre += ["_Boundaries are not tool-enforced; treat them as hard rules._", ""]
        if hands:
            pre += ["### Handoffs (for the `NEXT:` line)", ""] + [f"- {h['label']} -> `{h.get('agent','')}` ({h.get('context','')})" for h in hands] + [""]
        pre += ["Lifecycle: `./.agentx/agentx.sh hook start %s <issue>` first, `hook complete` when done, `hook failed <msg>` on error. "
                "Project conventions are in `/CLAUDE.md`; load matching skills from `.claude/skills/`." % name, ""]
        pre += ["### World Pulse overrides (take precedence over the rules above)", "",
                "- `/CLAUDE.md` wins on conflicts: tests are co-located as `src/**/*.test.{ts,tsx}` (no `tests/` dir); coverage target is >70%; "
                "full check is `npm run validate`; Conventional Commits; PR bodies need `Closes #N`.",
                "- `src/shared/**`, `src/server/**`, `*Contract*|*Schema*|*Types*`, `.github/workflows/**` are high-risk surface: architect review required.",
                "- Use the bash CLI (`./.agentx/agentx.sh`), not PowerShell. Never create a PR, merge, or force-push unless the user asks.", ""]
        pre = [cli(x) for x in pre]
        text = (f"---\nname: {name}\ndescription: \"{esc(desc)} Use proactively for this role's work.\"\n"
                f"tools: {tools}\nmodel: {model}\n---\n" + cli(body.lstrip("\n")))
        # inject contract after first H1
        m = re.search(r"^# .*$", text, re.M)
        text = text[:m.end()] + "\n" + "\n".join(pre) + text[m.end():]
        (d / f"{name}.md").write_text(text)
        names.append(name)
    return names

# --- skills ------------------------------------------------------------------
def build_skills(extra):
    d = OUT / "skills"; d.mkdir(exist_ok=True)
    for old in d.iterdir():  # agent-x is hand-written (Claude-native coordinator); keep it
        if old.name != "agent-x": shutil.rmtree(old)
    wanted = SKILLS | set(extra)
    found = set()
    for sk in sorted((GH / "skills").glob("*/*/SKILL.md")):
        name = sk.parent.name
        if name not in wanted: continue
        found.add(name)
        shutil.copytree(sk.parent, d / name)
        p = d / name / "SKILL.md"
        p.write_text(cli(p.read_text()))
    missing = wanted - found - {"agent-x"}
    if missing: print("WARN unknown skills:", ", ".join(sorted(missing)), file=sys.stderr)
    # project knowledge skills (.agentx/knowledge/skills/*.md -> proper SKILL.md)
    for f in sorted((AX / "knowledge" / "skills").glob("*.md")):
        text = f.read_text()
        title = re.search(r"^# Skill:\s*(.+)$", text, re.M)
        when = re.search(r"\*\*When to use:\*\*\s*(.+)", text)
        name = f.stem
        desc = (when.group(1).strip() if when else (title.group(1) if title else name))
        body = re.sub(r"^# Skill:.*\n", f"# {title.group(1) if title else name}\n", text, count=1, flags=re.M)
        (d / name).mkdir()
        (d / name / "SKILL.md").write_text(
            f"---\nname: {name}\ndescription: \"World Pulse: {esc(desc)}\"\n---\n\n{body}")
    return sorted(p.name for p in d.iterdir())

# --- commands ----------------------------------------------------------------
def build_commands():
    d = OUT / "commands"; reset(d)
    for stem, (name, agent) in PROMPTS.items():
        fm, body = split_fm((GH / "prompts" / f"{stem}.prompt.md").read_text())
        desc = fm_get(fm, "description")
        head = (f"---\ndescription: \"{esc(desc)}\"\nargument-hint: \"[issue number or target]\"\n---\n\n"
                f"Delegate this task to the `{agent}` subagent (Agent tool, subagent_type: `{agent}`), "
                f"passing the full prompt below plus the target: $ARGUMENTS\n\n")
        (d / f"{name}.md").write_text(head + cli(body.lstrip("\n")))
    return sorted(p.stem for p in d.iterdir())

# --- rules -------------------------------------------------------------------
def build_rules():
    d = OUT / "rules"; reset(d)
    for stem, paths in RULES.items():
        fm, body = split_fm((GH / "instructions" / f"{stem}.instructions.md").read_text())
        pl = "\n".join(f'  - "{p}"' for p in paths)
        (d / f"{stem}.md").write_text(f"---\ndescription: \"{esc(fm_get(fm, 'description'))}\"\npaths:\n{pl}\n---\n{body}")
    return sorted(p.stem for p in d.iterdir())

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--include", action="append", default=[], help="extra .github/skills name to install")
    a = ap.parse_args()
    print("agents  :", build_agents())
    print("skills  :", len(build_skills(a.include)), "(agent-x is hand-written; preserved separately)")
    print("commands:", build_commands())
    print("rules   :", build_rules())

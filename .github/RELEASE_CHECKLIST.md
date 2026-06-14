# World Pulse — MVP Release Checklist

Run each gate in order. Do **not** proceed to the next gate if the current one fails.
Record evidence (CI link, command output, screenshot) for each gate before signing off.

---

## Gate 1 — CI Green

| Check | Command / Link | Status | Evidence |
|---|---|---|---|
| All CI jobs pass on this branch | GitHub Actions → CI workflow | [ ] | _CI run URL_ |
| No `type:bug` issues open (P0/P1) | `gh issue list --label type:bug --label priority:p0` | [ ] | _Issue list URL or "none"_ |
| All P0 stories closed | `gh issue list --label priority:p0 --state open` | [ ] | _Issue list URL or "none"_ |

**Remediation:** Fix failing tests or open bugs before advancing. A red CI gate blocks all downstream gates.

---

## Gate 2 — Static Quality

| Check | Command | Status | Evidence |
|---|---|---|---|
| TypeScript: zero errors | `npm run typecheck` | [ ] | _Paste last line of output_ |
| Tests: ≥ 80% coverage, zero failures | `npm run test:coverage` | [ ] | _Paste coverage summary_ |
| Lint: zero warnings | `npm run lint` | [ ] | _Paste last line of output_ |
| Renderer build succeeds | `npm run build:renderer` | [ ] | _Paste last line of output_ |

Single command for all four: `npm run validate`

**Remediation:** Fix TypeScript errors, failing tests, or lint violations. Coverage below 80% requires new tests, not a threshold bypass.

---

## Gate 3 — Security Audit

| Check | Command | Status | Evidence |
|---|---|---|---|
| No high/critical production vulnerabilities | `npm audit --production` | [ ] | _Paste summary or "0 vulnerabilities"_ |
| No secrets committed to history | `git log --all --oneline \| head -20` + manual spot-check | [ ] | _"clean" or remediation PR link_ |

**Remediation:** Run `npm audit fix` for auto-fixable issues. For non-fixable high/critical CVEs, document the risk and open a follow-up issue before proceeding.

---

## Gate 4 — Smoke Validation

| Check | Command | Status | Evidence |
|---|---|---|---|
| Web smoke tests pass | `npm run test:e2e:smoke` | [ ] | _Paste test result summary_ |
| Health endpoint responds OK | `curl http://localhost:3000/health` | [ ] | _`"status":"ok"`_ |
| Dashboard renders and shows LIVE status | Manual or smoke test | [ ] | _Screenshot or test output_ |
| Globe canvas visible | Manual or smoke test | [ ] | _Screenshot or "confirmed"_ |
| No console errors in browser DevTools | Manual | [ ] | _"0 errors" or screenshot_ |

**Remediation:** Fix failing smoke tests before tagging the release. Console errors must be resolved — warnings are acceptable.

---

## Gate 5 — Electron Build

| Check | Command | Status | Evidence |
|---|---|---|---|
| Electron build succeeds | `npm run build:electron` | [ ] | _Build output directory path_ |
| App launches and health check passes | Manual launch → `/health` | [ ] | _"status":"ok" in Electron_ |
| Backend auto-restart circuit-breaker active | Check `src/main/main.ts` config | [ ] | _`RESTART_MAX=3` confirmed_ |
| App starts within 5 seconds (cold launch) | Stop-watch from launch to first render | [ ] | _Measured time (target < 5s)_ |
| No menu bar / title bar in production window | Manual inspection | [ ] | _`autoHideMenuBar: true` confirmed_ |

**Remediation:** Electron build failures are usually dependency or path issues. Check `dist/` output matches `electron-builder.yml` targets.

---

## Gate 6 — Release Artifact

| Check | Action | Status | Evidence |
|---|---|---|---|
| Version bumped in `package.json` | `npm version <patch\|minor\|major>` | [ ] | _New version string_ |
| CHANGELOG updated | Edit `CHANGELOG.md` | [ ] | _Entry added_ |
| Tag created and pushed | `git tag v<X.Y.Z> && git push origin v<X.Y.Z>` | [ ] | _Tag URL_ |
| Release workflow triggered | GitHub Actions → Release workflow | [ ] | _Workflow run URL_ |
| Draft release assets attached (`.dmg`, `.AppImage`) | GitHub Releases page | [ ] | _Release URL_ |
| Draft release promoted to published | GitHub Releases → Publish | [ ] | _Release URL_ |

**Remediation:** If the release workflow fails, check artifact paths in `release.yml` match `electron-builder` output (`release/*`).

---

## Sign-Off

| Role | Name | Date | Signature |
|---|---|---|---|
| Engineer | | | |
| Reviewer | | | |

By signing, each party confirms they have run the relevant gates and reviewed the evidence.

---

## Automation Notes

The `validate` script (`npm run validate`) covers Gate 2 in a single command.
The `quality-gates.yml` workflow runs Gate 1 + Gate 2 on every PR automatically.
Gate 4 (smoke) runs via `npm run test:e2e:smoke` (Playwright, requires a running server).
Gate 5 (Electron build) is not in CI by default — run it locally before tagging.

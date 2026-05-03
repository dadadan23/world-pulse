# Changelog Entry Template

Append to `CHANGELOG.md` under the appropriate version heading. Follow [Keep a Changelog](https://keepachangelog.com) format. Entries are generated automatically by `release-please` from conventional commits — use this template for manual entries only.

---

## [{{ version }}] - {{ YYYY-MM-DD }}

### Added

- {{ Description of new feature }} (#{{ issue_number }})
- {{ Description of new feature }} (#{{ issue_number }})

### Changed

- {{ Description of changed behavior }} (#{{ issue_number }})

### Fixed

- {{ Description of bug fix }} (#{{ issue_number }})

### Removed

- {{ Description of removed feature or deprecated API }} (#{{ issue_number }})

### Security

- {{ Description of security fix }} (#{{ issue_number }})

---

## Entry Guidelines

- Write entries from the **user's perspective**, not the developer's.
  - Good: "Globe now displays high-fidelity GeoJSON coastlines"
  - Bad: "Refactored earthTexture.ts into composable modules"
- Link every entry to a GitHub issue number.
- Group under the correct heading (Added/Changed/Fixed/Removed/Security).
- `release-please` auto-generates entries from `feat:` and `fix:` commits — only add manual entries for changes not captured by conventional commits.
- Keep descriptions to one sentence. Use the PR description body for detail.

# Release Process & Manual Recovery

## How releases publish

Pushing a `v*` tag runs `.github/workflows/release.yml`:

1. `build-electron` builds and packages the app per-OS (macOS `.dmg`, Linux `.AppImage`), plus the
   `latest-mac.yml` / `latest-linux.yml` update metadata and `.blockmap` files `electron-builder`
   generates alongside them.
2. `release` publishes all of the above as a **non-draft** GitHub Release. Non-draft is required —
   `electron-updater`'s GitHub provider only discovers published releases, never drafts.

## How the app updates itself

Per Feature #229, World Pulse never shows an interactive "restart to update" prompt. Instead
(`src/main/updateManager.ts`):

- The app checks for updates on launch and every 4 hours, downloading silently in the background.
- Once downloaded, the update installs itself at the next natural opportunity: either when the user
  quits and relaunches the app, or automatically during a daily **quiet-hours window (3–5am local
  time)** if the app has been left running.
- A small passive status glyph (an `UPDATE` row in the top-left HUD panel) may show `CHECKING`,
  `DOWNLOADING`, or `READY` — it is never clickable and never demands action.
- Check/download/install outcomes, including failures, are logged to
  `<user-data>/logs/world-pulse-update.log` (via Electron's `app.getPath('logs')`). A failed check or
  download is retried on the next interval; it is never surfaced as an error dialog.

## Manual recovery from a bad release

Automatic rollback is out of scope for v1 — if a published release is broken, recover manually:

1. Go to the repository's [Releases page](https://github.com/dadadan23/world-pulse/releases) and
   identify the last known-good version (the one before the broken tag).
2. Download the installer for your OS from that release (`.dmg` for macOS, `.AppImage` for Linux,
   `.exe`/portable for Windows).
3. Quit World Pulse if it's running.
4. **macOS:** open the `.dmg` and drag the app into `/Applications`, replacing the existing copy.
   **Linux (AppImage):** replace the existing `.AppImage` file with the downloaded one and re-mark it
   executable (`chmod +x`). **Windows:** run the downloaded installer, or replace the portable `.exe`.
5. Relaunch the app. Since the known-good version is now installed, the next background check will
   only offer updates newer than it — it will not re-offer the broken release.

Because installs only happen automatically during the quiet-hours window (3–5am) or on a manual
relaunch (see above), a broken release cannot silently reinstall itself between when you replace the
binary and when you next open the app.

If in doubt about which release is "last known-good", check the Release's own notes/CI status on
GitHub before rolling back to it.

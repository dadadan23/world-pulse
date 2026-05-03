# Instruction: Security

Apply these rules to every change. Security is non-negotiable in an always-on, network-connected dashboard application.

---

## Electron Context Isolation (ENFORCED)

```ts
// src/main/main.ts — do not weaken these settings
webPreferences: {
  contextIsolation: true,   // MUST be true
  nodeIntegration: false,   // MUST be false
}
```

Any PR that sets `contextIsolation: false` or `nodeIntegration: true` must be rejected immediately. These settings prevent renderer-process code from accessing Node.js APIs directly.

---

## IPC Input Validation

Never trust data coming from the renderer process:

```ts
// Validate before acting
ipcMain.handle('open-external', (_event, url: string) => {
  if (typeof url !== 'string' || !url.startsWith('https://')) {
    throw new Error('Invalid URL');
  }
  return shell.openExternal(url);
});
```

All IPC handlers must validate type and range of every argument.

---

## Content Security Policy (CSP)

When setting CSP headers (via `session.defaultSession.webRequest` or `<meta http-equiv>`), follow the principle of least privilege:

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
connect-src 'self' ws://localhost:* http://localhost:*;
img-src 'self' data:;
```

Do not use `'unsafe-eval'` — Three.js does not require it.

---

## Secrets and Environment Variables

- **Never** commit `.env.local` — it is gitignored.
- **Never** hardcode API keys, passwords, or tokens in source files.
- All secrets go in `.env.local` (local dev) or GitHub Secrets (CI).
- Environment variables are listed in `.env.example` with placeholder values only.
- The `quality-gates.yml` workflow scans diffs for secret patterns — do not bypass it.

Required env vars: `OPENWEATHER_API_KEY`, `NEWSAPI_KEY` (see `.env.example`).

---

## Dependency Security

- `npm audit` runs in CI on every push to `main`.
- High/critical vulnerabilities block the security workflow.
- Dependabot PRs for security updates should be merged promptly.
- Never use `npm audit --production` to hide dev-dependency vulnerabilities from the scan.

---

## No Remote Module Loading

```ts
// Blocked in Electron security model
// Never do this:
require('electron').remote.require('fs');

// The `remote` module was removed in Electron 14+
// Use contextBridge + ipcMain.handle instead
```

---

## External URL Validation

Before passing any URL to `shell.openExternal()` or loading into a BrowserWindow:

```ts
function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['https:', 'http:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}
```

---

## Data Collector Security

Collectors fetch from external APIs. Treat all API responses as untrusted:
- Parse JSON with error handling.
- Validate the shape before mapping to `Event` objects.
- Do not eval or execute any content from API responses.
- API keys go in environment variables, never in collector source code.

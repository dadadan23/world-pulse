# World Pulse - Technical Specification

**Version:** 0.2.0  
**Created:** 2026-01-31  
**Status:** Planning

---

## 1. Project Overview

**World Pulse** is a real-time information radiator that visualizes global events, natural phenomena, and personal context on an interactive 3D globe with supporting data displays.

### Vision
A command center for life - showing what's happening around the world (weather, earthquakes, news sentiment, astronomical events, cultural moments) alongside personal schedule and recommendations, reducing stress through context and awareness.

### Inspiration
- Movie aesthetics: Oblivion, The Matrix
- GitHub global commit visualizer
- Real-time security attack maps

### Primary Use Case
Large screen display (TV/iPad/dedicated monitor) running 24/7 as an ambient information dashboard.

---

## 2. Goals

### Functional Goals
- **Real-time global visualization** of natural/news/astronomical events
- **News sentiment heat mapping** by geographic region
- **Personal context integration** (calendar, weather for user location, recommendations)
- **Portable deployment** (desktop app primary, web app secondary)
- **Modular data pipeline** for easy addition of new sources

### Non-Functional Goals
- **Testable:** Unit tests for business logic, integration tests for data pipelines
- **Secure:** Dependency scanning, CVE remediation, API key management
- **Production-ready:** CI/CD pipeline, logging, error handling, graceful degradation
- **Performant:** Smooth 60fps globe rendering, efficient data updates
- **Maintainable:** Clean architecture, documented code, conventional commits

---

## 3. Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Presentation Layer                    │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ 3D Globe    │  │ Ticker Tape  │  │ Side Panels   │  │
│  │ (Three.js)  │  │              │  │ (Reports)     │  │
│  └─────────────┘  └──────────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    Application Layer                     │
│  ┌──────────────────┐  ┌─────────────────────────────┐  │
│  │ Event Bus        │  │ State Management            │  │
│  │ (real-time sync) │  │ (Zustand/Redux)             │  │
│  └──────────────────┘  └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                      Data Layer                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │ API      │  │ Cache    │  │ Aggreg.  │  │ Storage │ │
│  │ Gateway  │  │ (Redis?) │  │          │  │ (SQLite)│ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                  Data Collectors (Plugins)               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │ Weather  │  │ News API │  │ USGS     │  │ Spotify │ │
│  │          │  │ GDELT    │  │ Quakes   │  │ Music   │ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Deployment Modes

**Mode 1: Desktop App (Primary)**
- Electron wrapper around web frontend
- Node.js backend runs in-process
- Single executable, auto-updates
- Local SQLite for historical data

**Mode 2: Web App (Secondary)**
- Same frontend code deployed to web server
- Shared Node.js backend (containerized)
- Multiple clients can connect
- Deployed via Docker/Docker Compose

---

## 4. Technology Stack

### Frontend
- **Framework:** React 18+ (functional components, hooks)
- **3D Rendering:** Three.js + react-three-fiber
- **State Management:** Zustand (simpler than Redux, good for real-time)
- **Styling:** Tailwind CSS (utility-first, easy theming)
- **Build Tool:** Vite (fast dev server, optimized builds)

**Justification:** React ecosystem is mature, Three.js is industry standard for WebGL, Vite gives us speed.

### Backend
- **Runtime:** Node.js 20+ LTS
- **Framework:** Express (lightweight, well-understood)
- **WebSocket:** Socket.io (real-time event streaming)
- **Database:** SQLite (embedded, zero-config, good for desktop)
- **Cache:** In-memory Map (start simple, can add Redis later)
- **HTTP Client:** axios with retry logic

**Justification:** Node.js for full-stack JS, Express is proven, SQLite eliminates external deps.

### Desktop Wrapper
- **Electron:** Latest stable (security updates critical)
- **Auto-updater:** electron-updater
- **Packaging:** electron-builder

### DevOps & Quality
- **Testing:** Vitest (unit), Playwright (E2E), Supertest (API)
- **Linting:** ESLint + Prettier
- **Type Safety:** TypeScript (strict mode)
- **Git Hooks:** Husky + lint-staged
- **CI/CD:** GitHub Actions
- **Security Scanning:** npm audit, Snyk, Dependabot
- **Conventional Commits:** commitlint

---

## 5. Data Sources

### Phase 1 (MVP)

| Source | Provider | Data Type | Update Frequency | API Limits |
|--------|----------|-----------|------------------|------------|
| Weather | OpenWeather | Current conditions, forecasts | 10 min | 1000/day free |
| Earthquakes | USGS | Recent seismic events | 5 min | No limit |
| News | NewsAPI | Headlines by region | 15 min | 100 req/day free |
| Astronomy | NASA APOD | Daily image/event | Daily | No limit |

### Phase 2 (Expansion)

| Source | Provider | Data Type | Notes |
|--------|----------|-----------|-------|
| News Sentiment | GDELT + local ML | Geo-tagged sentiment | Run sentiment analysis locally |
| Music | Spotify API | New releases, recommendations | Requires OAuth |
| Ocean Data | NOAA Buoys | Temperature, wave height | Real-time |
| ISS Position | Open Notify | Current location | Real-time |
| Historical Events | Wikipedia API | "On this day" | Daily |

### Data Pipeline Pattern

Each data source is a **plugin module**:

```typescript
interface DataCollector {
  name: string;
  interval: number; // ms between fetches
  fetch(): Promise<Event[]>;
  validate(data: unknown): data is Event[];
}

interface Event {
  id: string;
  timestamp: number;
  type: string; // 'weather' | 'quake' | 'news' | etc
  location: { lat: number; lon: number } | null;
  severity?: number; // 0-10 for visualization scaling
  data: Record<string, any>;
}
```

**Benefits:**
- Testable in isolation
- Easy to add new sources
- Graceful degradation if one source fails
- Can mock for development

---

## 6. Security

### Principles
1. **Never commit secrets** - use environment variables
2. **Regular dependency updates** - automated PRs via Dependabot
3. **CVE scanning** - fail CI on high/critical vulnerabilities
4. **Input validation** - sanitize all external API data
5. **Rate limiting** - prevent API abuse
6. **HTTPS only** - for web deployment mode

### Implementation

**Secrets Management:**
```
.env.local (gitignored)
.env.example (template for developers)
Use dotenv for Node.js
Electron-store for desktop app config
```

**Dependency Security:**
- `npm audit` in CI (fail on high/critical)
- Snyk integration for deeper scanning
- Renovate or Dependabot for automated updates
- Lock file (`package-lock.json`) committed

**API Key Rotation:**
- Document key rotation process
- Support multiple API keys for failover
- Log (but don't expose) API errors

---

## 7. Testing Strategy

### Unit Tests (70% coverage target)
- **What:** Business logic, data transformers, utilities
- **Tool:** Vitest
- **Pattern:** Co-located `*.test.ts` files

```typescript
// Example
describe('EventAggregator', () => {
  it('should merge events from multiple sources', () => {
    const weather = [/* ... */];
    const quakes = [/* ... */];
    const merged = aggregator.merge(weather, quakes);
    expect(merged).toHaveLength(/* ... */);
  });
});
```

### Integration Tests
- **What:** Data collector modules, API endpoints
- **Tool:** Vitest + Supertest
- **Pattern:** Mock external APIs, test real data flow

### E2E Tests
- **What:** Critical user flows (app startup, globe interaction, ticker display)
- **Tool:** Playwright
- **Pattern:** Runs against packaged Electron app

### Visual Regression (Future)
- **Tool:** Percy or Chromatic
- **What:** Ensure UI doesn't break unintentionally

### Test Commands
```bash
npm test              # Run all tests
npm test:unit         # Unit tests only
npm test:integration  # Integration tests
npm test:e2e          # E2E tests
npm test:coverage     # Generate coverage report
```

---

## 8. Development Workflow

### Branch Strategy
- `main` - production-ready code
- `develop` - integration branch
- `feature/*` - new features
- `fix/*` - bug fixes

### Commit Convention
Follow [Conventional Commits](https://www.conventionalcommits.org/):
```
feat: add earthquake visualization layer
fix: resolve timezone bug in ticker
docs: update API documentation
test: add coverage for news aggregator
chore: bump dependencies
```

### Code Review
- All changes via PR
- Required checks: tests pass, lint clean, no high CVEs
- One approval required (can be self-approved for solo dev, but review own code)

### Local Development Setup
```bash
git clone <repo>
cd world-pulse
npm install
cp .env.example .env.local
# Edit .env.local with API keys
npm run dev  # Start dev server
```

---

## 9. Build & Deployment

### Development Build
```bash
npm run dev        # Frontend (Vite) + Backend (Nodemon)
npm run dev:electron  # Launch Electron wrapper
```

### Production Build
```bash
npm run build      # Build optimized frontend
npm run build:electron  # Package desktop app (macOS/Windows/Linux)
npm run build:web  # Build for web deployment
```

### Desktop App Distribution
- **macOS:** .dmg (signed with Developer ID for Gatekeeper)
- **Windows:** .exe installer (code signing recommended)
- **Linux:** AppImage or .deb

**Auto-update flow:**
1. New version built, uploaded to GitHub releases
2. App checks for updates on launch
3. Downloads and installs in background
4. Prompts user to restart

### Web Deployment (Docker)
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3000
CMD ["node", "dist/server/index.js"]
```

Deploy to VPS, Fly.io, or Render.com.

---

## 10. Project Structure

```
world-pulse/
├── .github/
│   └── workflows/
│       ├── ci.yml              # Run tests, lint, security scan
│       ├── release.yml         # Build and publish desktop apps
│       └── deploy-web.yml      # Deploy web version
├── src/
│   ├── main/                   # Electron main process
│   │   ├── main.ts
│   │   └── preload.ts
│   ├── renderer/               # Frontend (React)
│   │   ├── components/
│   │   │   ├── Globe/
│   │   │   ├── Ticker/
│   │   │   └── Panels/
│   │   ├── hooks/
│   │   ├── store/              # Zustand state
│   │   ├── utils/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── server/                 # Node.js backend
│   │   ├── collectors/         # Data source plugins
│   │   │   ├── weather.ts
│   │   │   ├── earthquakes.ts
│   │   │   ├── news.ts
│   │   │   └── base.ts         # Abstract base class
│   │   ├── aggregator.ts       # Merge events from collectors
│   │   ├── api.ts              # Express routes
│   │   ├── db.ts               # SQLite connection
│   │   ├── socket.ts           # Socket.io setup
│   │   └── index.ts            # Server entry
│   └── shared/                 # Types, constants shared across layers
│       └── types.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── public/                     # Static assets
├── docs/                       # Additional documentation
├── scripts/                    # Build/deploy scripts
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── vite.config.ts
├── electron-builder.config.js
└── README.md
```

---

## 11. Development Phases

### Phase 0: Foundation (Week 1)
- [x] Project spec complete
- [ ] Repository setup with CI/CD skeleton
- [ ] Development environment documented
- [ ] Basic project structure scaffolded
- [ ] Linting, formatting, commit hooks configured

### Phase 1: MVP - Globe + Basic Data (Week 2-3)
- [ ] 3D globe rendering (rotate, zoom, basic interaction)
- [ ] Earthquake data collector + visualization (pins on globe)
- [ ] Weather data collector + simple overlay
- [ ] Basic ticker showing recent events
- [ ] Electron wrapper running locally

**Success Criteria:** Can launch app, see spinning globe with earthquake pins and basic ticker.

### Phase 2: News & Sentiment (Week 4)
- [ ] News API integration
- [ ] Basic sentiment analysis (positive/negative scoring)
- [ ] Heat map overlay showing news density/sentiment
- [ ] Side panel with news details on click

**Success Criteria:** Globe shows colored regions based on news sentiment.

### Phase 3: Personal Context (Week 5)
- [ ] Calendar integration (Google Calendar or iCal)
- [ ] Personal weather (location-based forecast)
- [ ] Daily summary panel ("Your day at a glance")

**Success Criteria:** Personal events displayed alongside global data.

### Phase 4: Enrichment (Week 6+)
- [ ] Music recommendations (Spotify)
- [ ] Astronomical events (meteor showers, ISS passes)
- [ ] Historical "on this day" facts
- [ ] Ocean/marine data
- [ ] Customizable data source toggles

### Phase 5: Production Polish (Week 7-8)
- [ ] Auto-update implementation
- [ ] Performance optimization (lazy loading, data pagination)
- [ ] Error monitoring (Sentry or similar)
- [ ] User settings persistence
- [ ] Theme customization (dark/light, color schemes)
- [ ] Multi-monitor support
- [ ] Accessibility audit

### Phase 6: Web Deployment (Week 9)
- [ ] Dockerize backend
- [ ] Multi-user support (if needed)
- [ ] Deploy to production server
- [ ] Documentation for self-hosting

---

## 12. Production Readiness Checklist

Before declaring "production ready":

**Functionality:**
- [ ] All Phase 1-3 features working
- [ ] Graceful degradation when data sources fail
- [ ] User can customize which data sources are active
- [ ] Settings persist across restarts

**Quality:**
- [ ] >70% test coverage
- [ ] No high/critical CVEs
- [ ] All lint warnings resolved
- [ ] Performance: 60fps globe rendering, <5s app startup
- [ ] Runs continuously for 24+ hours without memory leaks

**Documentation:**
- [ ] README with setup instructions
- [ ] API documentation (if exposing endpoints)
- [ ] Troubleshooting guide
- [ ] Changelog

**Operations:**
- [ ] Logging to file (rotate daily)
- [ ] Error reporting (Sentry or similar)
- [ ] Auto-update working
- [ ] Uninstaller tested

**Security:**
- [ ] No secrets in code
- [ ] HTTPS for all external API calls
- [ ] Dependencies up to date
- [ ] Code signing (macOS/Windows)

---

## 13. Open Questions / Future Considerations

1. **Multi-language support?** Start English-only, add i18n later if needed.
2. **Mobile version?** Not in scope initially, but React Native could be explored.
3. **Customizable layouts?** User-defined grid/panel arrangements?
4. **Data export?** Allow users to export historical event data?
5. **Collaboration?** Multi-user mode where teams share a dashboard?
6. **Voice commands?** "Hey Pulse, show me weather over Europe."
7. **AR/VR mode?** Globe in VR headset could be wild.

---

## 14. References

**Inspiration:**
- [Oblivion UI Design](https://www.youtube.com/watch?v=...)
- [GitHub Globe Visualization](https://github.blog/2020-12-21-get-up-to-speed-with-partial-clone-and-shallow-clone/)
- [Kaspersky Cybermap](https://cybermap.kaspersky.com/)

**Technical:**
- [Three.js Documentation](https://threejs.org/docs/)
- [Electron Security Checklist](https://www.electronjs.org/docs/latest/tutorial/security)
- [USGS Earthquake API](https://earthquake.usgs.gov/fdsnws/event/1/)
- [OpenWeather API](https://openweathermap.org/api)
- [GDELT Project](https://www.gdeltproject.org/)

---

**End of Specification**

_This document will evolve as we build. Revisit and update as decisions are made._

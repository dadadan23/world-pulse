# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# deps: install once, shared by the build stages.
# ---------------------------------------------------------------------------
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---------------------------------------------------------------------------
# build-renderer: compile the React/Three.js frontend to static assets.
# ---------------------------------------------------------------------------
FROM deps AS build-renderer
COPY tsconfig.json vite.config.ts tailwind.config.js postcss.config.js index.html ./
COPY public ./public
COPY scripts ./scripts
COPY src ./src
RUN npm run build:renderer

# ---------------------------------------------------------------------------
# build-server: bundle the Express/Socket.io backend into a single file via
# esbuild (resolves the @shared/* path aliases and produces plain Node-ESM
# output, sidestepping tsc's noEmit/path-alias limitations for this target).
# ---------------------------------------------------------------------------
FROM deps AS build-server
COPY tsconfig.json ./
COPY src ./src
RUN npm run build:server

# ---------------------------------------------------------------------------
# runtime: production image. Express serves the API, Socket.io, and the
# built frontend from a single process/port.
# ---------------------------------------------------------------------------
FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY --from=build-server /app/dist/server ./dist/server
COPY --from=build-renderer /app/dist/renderer ./dist/renderer

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 3000) + '/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

USER node
CMD ["node", "dist/server/index.js"]

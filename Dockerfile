# wcloud.sa deployment — SalonFlow
# Stack: Vite (React) + Express (Node) + PostgreSQL (Drizzle)
# Pattern: single container — nginx serves frontend + proxies /api/* to Express

# ── Stage 1: Build ─────────────────────────────────────────────────
FROM node:20-alpine AS build

RUN npm install -g pnpm@9

WORKDIR /app

# Copy workspace manifests first (layer cache: re-runs only when deps change)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./

# All workspace package.json files (required for pnpm --frozen-lockfile)
COPY scripts/package.json ./scripts/
COPY lib/api-zod/package.json ./lib/api-zod/
COPY lib/api-spec/package.json ./lib/api-spec/
COPY lib/api-client-react/package.json ./lib/api-client-react/
COPY lib/db/package.json ./lib/db/
COPY artifacts/salon-flow/package.json ./artifacts/salon-flow/
COPY artifacts/api-server/package.json ./artifacts/api-server/
COPY artifacts/mockup-sandbox/package.json ./artifacts/mockup-sandbox/

RUN pnpm install --no-frozen-lockfile --shamefully-hoist

# Copy source (after install so package layer is cached separately)
COPY lib/ ./lib/
COPY artifacts/salon-flow/ ./artifacts/salon-flow/
COPY artifacts/api-server/ ./artifacts/api-server/

# Replit vite.config.ts requires PORT and BASE_PATH at import time (not used in output)
# NODE_ENV=production disables Replit-specific plugins (cartographer, devBanner)
ENV PORT=3000
ENV BASE_PATH=/
ENV NODE_ENV=production

# Build Vite frontend → artifacts/salon-flow/dist/public/
RUN pnpm --filter @workspace/salon-flow build

# Build Express API → artifacts/api-server/dist/ (esbuild bundles all deps)
RUN pnpm --filter @workspace/api-server build

# ── Stage 2: Production runner ─────────────────────────────────────
FROM node:20-alpine AS runner

RUN apk add --no-cache nginx supervisor

WORKDIR /app

# nginx site config
COPY nginx.conf /etc/nginx/http.d/default.conf

# supervisord: runs nginx + node in one container
COPY supervisord.conf /etc/supervisord.conf

# Frontend: Vite static build (output is dist/public/ per vite.config.ts)
COPY --from=build /app/artifacts/salon-flow/dist/public /usr/share/nginx/html

# Backend: esbuild self-contained bundle (all JS deps bundled — no node_modules needed)
COPY --from=build /app/artifacts/api-server/dist ./api/dist

EXPOSE 80

# Health check hits Express /api/healthz via nginx proxy
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost/api/healthz || exit 1

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]

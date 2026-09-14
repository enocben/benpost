# apps/front/Dockerfile — Benpost Front (Astro SSR standalone)
FROM oven/bun:1.4-slim AS builder
WORKDIR /app

# Monorepo manifests
COPY package.json bun.lock ./
COPY apps/back/package.json ./apps/back/package.json
COPY apps/front/package.json ./apps/front/package.json

RUN bun install --frozen-lockfile 2>&1 | tail -20

# Code front + config Astro
COPY apps/front ./apps/front

WORKDIR /app/apps/front

# Build Astro — prebuild sync:content tente de fetch le back (pas dispo au build) => || true donc pas d'échec
RUN bun run build 2>&1 | tail -50

# Runtime — Node 22 (adapter @astrojs/node standalone)
FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321

COPY --from=builder /app/apps/front/dist ./dist
COPY --from=builder /app/apps/front/package.json ./package.json

# Astro standalone n'a besoin que de dist/, mais on garde un node_modules minimal pour sharp si inclus
# Si build statique échoue sur sharp, décommenter:
# COPY --from=builder /app/node_modules ./node_modules

EXPOSE 4321
CMD ["node", "dist/server/entry.mjs"]

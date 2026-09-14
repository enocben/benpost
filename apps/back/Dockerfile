# apps/back/Dockerfile — Benpost API (Elysia + Bun + SQLite)
FROM oven/bun:1.4-slim
WORKDIR /app

# Monorepo: copier root manifests pour que Bun résolve workspaces
COPY package.json bun.lock ./
COPY apps/back/package.json ./apps/back/package.json
COPY apps/front/package.json ./apps/front/package.json

# Installer uniquement deps du back (mais Bun installe workspaces, cache optimisé)
RUN bun install -p --frozen-lockfile 2>&1 | tail -20

# Copier code du back
COPY apps/back ./apps/back

WORKDIR /app/apps/back

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# db.ts exécute drizzle migrate() au boot automatiquement
CMD ["bun", "src/index.ts"]

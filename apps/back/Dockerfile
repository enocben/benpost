FROM oven/bun:1.4.2 AS build

WORKDIR /app

# Cache packages installation — le back est déployé indépendamment du workspace.
COPY ./apps/back/package.json package.json

RUN bun install --production

COPY ./apps/back/src ./src

FROM oven/bun:1.4.2-slim

WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/src ./src

ENV NODE_ENV=production

CMD ["bun", "run", "src/server.ts"]

EXPOSE 3000
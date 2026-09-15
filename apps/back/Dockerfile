FROM oven/bun AS build

WORKDIR /app

# Cache packages installation — manifests du back seul (pas de bun.lock dédié)
COPY ./apps/backpackage.json package.json

RUN bun install

COPY ./apps/back/src ./src

ENV NODE_ENV=production

RUN bun build \
	--compile \
	--minify-whitespace \
	--minify-syntax \
	--outfile server \
	src/index.ts

FROM gcr.io/distroless/base

WORKDIR /app

COPY --from=build /app/server server

ENV NODE_ENV=production

CMD ["./server"]

EXPOSE 3000
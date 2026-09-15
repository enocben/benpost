FROM oven/bun AS build

WORKDIR /app

# Cache packages installation
COPY ./apps/back/package.json package.json
COPY ./apps/back/bun.lock bun.lock

RUN bun install

COPY ./apps/back/src ./src

ENV NODE_ENV=production

RUN bun build \
	--compile \
	--minify-whitespace \
	--minify-syntax \
	--outfile server \
	./apps/back/src/index.ts

FROM gcr.io/distroless/base

WORKDIR /app

COPY --from=build /app/server server

ENV NODE_ENV=production

CMD ["./server"]

EXPOSE 3000
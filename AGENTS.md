# AGENTS.md — Benpost

> Instructions pour tout agent (Hermes, Claude, Codex, etc.) travaillant sur ce repo.
> Stack, conventions et workflows à respecter strictement.

## 1. Projet

**Benpost** — CMS blog minimal : API headless + site public + back-office intégré.
Monorepo Bun workspaces `apps/*` — 2 apps uniquement :

| App | Dossier | Stack | Port |
|-----|---------|-------|------|
| **back** | `apps/back` | Elysia 1.4 + drizzle-orm + bun:sqlite + @elysiajs/jwt/cors/openapi | 3002 en local (3000 en prod via `PORT`/`BACK_PORT`) |
| **front** | `apps/front` | Astro 7 (SSR `output: server` + `@astrojs/node` standalone) + React 19 + TanStack Query/Table + Tailwind 4 + MDXEditor | 4321 |

Le back-office admin **n'est plus une app séparée** : il vit dans `apps/front/src/admin/` et est servi via une route catch-all Astro `src/pages/admin/[...path].astro` (`prerender = false`, `client:only="react"`). Le site public (`/`, `/about`, `/blog/*`) reste en `prerender = true`.

**Contenu blog statique depuis la DB :** les posts `published` sont synchronisés en fichiers `src/content/blog/<slug>.md` (via `scripts/sync-content.ts` + `utils/sync-front.ts` côté back + webhook `POST /api/webhook/posts`). Ils sont pré-rendus au build comme les exemples `first-post.md`.

## 2. Runtime — Bun obligatoire

- `bun <file>` pas `node` / `ts-node`
- `bun install` pas `npm/yarn/pnpm`
- `bun test` pas `jest/vitest`
- `bun run <script>` / `bunx <pkg>`
- Bun charge `.env` automatiquement — pas de `dotenv`
- APIs Bun : `Bun.serve()`, `bun:sqlite` (`Database from "bun:sqlite"`), `Bun.file`, `Bun.$`
- Ne jamais introduire `express`, `better-sqlite3`, `ioredis`, `pg`, `ws`, `vite` standalone pour le front (on utilise le Vite d'Astro)

## 3. Commandes

```bash
# install (racine, installe tous les workspaces)
bun install

# dev (2 terminaux ou via root) — back sur 3002 en local (3000 occupé par Dokploy)
PORT=3002 bun --filter=back run dev     # ou BACK_PORT=3002 — Elysia lit PORT/BACK_PORT
bun --filter=front run dev              # astro dev → http://localhost:4321
# via root (concurrently)
bun run dev

# build
bun --filter=front run build         # astro build (SSR standalone → dist/) — lance prebuild sync:content avant
# back n'a pas de build — c'est un serveur Elysia direct (bun src/index.ts)

# contenu statique depuis la DB
bun --filter=front run sync:content             # génère src/content/blog/*.md depuis GET /posts (published)
API_URL=http://localhost:3002 bun --filter=front run sync:content -- --dry-run

# tests back
bun --filter=back test               # bun test (tests/ : auth, posts, categories, tags, users)
# ou
cd apps/back && bun test

# DB (back)
bun --filter=back run db:generate    # drizzle-kit generate (schema → migrations)
bun --filter=back run db:migrate     # bun src/database/db.ts (migrate + drizzle)
bun --filter=back run db:seed        # bun src/scripts/seed-admin.ts (crée admin)
```

Paths DB : `apps/back/src/database/sqlite.db` (prod) / `:memory:` en test. Config `drizzle.config.ts` dialect `sqlite`.

## 4. Architecture & conventions

### Back (`apps/back`)

- **Framework** : Elysia avec préfixes `/posts`, `/auth`, `/categories`, `/tags`, `/users`, `/files`. Types partagés via `export type App`.
- **DB** : drizzle-orm sqlite. Tables : `users` (role `admin|editor`), `categories`, `tags`, `media`, `posts` (+ `post_tags` many-to-many). Relations dans `schema.ts`.
- **Auth** : `@elysiajs/jwt` — secret `process.env.APP_SECRET` (obligatoire). Helpers `isAuthenticated` / `isAdmin` dans `src/middlewares/auth.ts`. `getToken()` strip `Bearer `. JWT payload `{ id, role }`.
- **CORS** : `origin: ["http://localhost:4321"]` uniquement (front). Ne pas ré-ajouter `3001` (ancien admin Vite).
- **Validation** : `PostModel`, `CategoryModel`, etc. (schémas Elysia/TypeBox) dans `src/routes/*/model.ts`. Services dans `service.ts`.
- **Réponses** : enveloppe `{ success, message, data }` — le front la déballe. Helpers `src/utils/reponses.ts`.
- **Fichiers** : `src/routes/files` + `src/utils/s3.ts` — upload cover image via `FormData` (`multipart/form-data`).
- **OpenAPI** : exposé via `@elysiajs/openapi` sur `/openapi` (ou `/swagger` selon version).
- **Port** : `src/index.ts` lit `PORT` / `BACK_PORT` (défaut 3000). En local, lancer sur `3002` car Dokploy occupe `3000`.
- **Synchro front** : `src/utils/sync-front.ts` — `syncPostToFront()` / `deletePostFromFront()` appelés fire-and-forget depuis `PostService` (create → si `published`, update → si `published` upsert sinon delete, delete → delete). Écrit en local dans `../front/src/content/blog/<slug>.md` si le dossier existe, + `POST FRONT_WEBHOOK_URL` (`/api/webhook/posts`) avec `WEBHOOK_SECRET` en prod.
- **Env requis** : `APP_SECRET` (JWT). Optionnel `FRONT_WEBHOOK_URL`, `WEBHOOK_SECRET`, S3.

### Front (`apps/front`)

- **Astro SSR** : `output: "server"`, `adapter: node({ mode: "standalone" })`. Les pages publiques ont `export const prerender = true` (pré-rendues à `astro build`), la page admin a `export const prerender = false`.
- **Alias** : `@` → `apps/front/src` (défini dans `tsconfig.json` `paths` + `astro.config.mjs` `vite.resolve.alias`). Imports admin : `@/admin/lib/api`, `@/admin/pages/*`, etc. Ne pas créer d'alias `@admin`.
- **Tailwind** : Tailwind 4 via `@tailwindcss/vite` (plugin Vite dans `astro.config.mjs`). Styles admin dans `src/admin/global.css` (importé par `AdminApp.tsx`), styles front dans `src/styles/global.css`. Contient `@plugin "@tailwindcss/typography"` + `tw-animate-css` + vars `:root`.
- **Admin SPA** : `src/admin/AdminApp.tsx` (QueryClient + ThemeProvider + RouterProvider + Toaster) + `src/admin/router.tsx` (`createBrowserRouter`, routes préfixées `/admin`, guards `RequireAuth`/`RedirectIfAuthenticated` via `localStorage` clé `benpost.token` dans `src/admin/lib/auth.ts`). Sidebar `src/admin/components/layout/sidebar.tsx` — tous les `to` doivent être `/admin/...`.
- **API client** : `src/admin/lib/api.ts` — `API_BASE = import.meta.env.PUBLIC_API_URL ?? API_URL ?? "http://localhost:3002"` (configurable, 3002 en local). `request()` gère `FormData` vs JSON, injecte `Authorization: Bearer <token>`, redirige `401` → `/admin/login`, déballe l'enveloppe `{ success, data }`.
- **State** : `src/admin/hooks/api.ts` — hooks TanStack Query (`usePosts`, `useCategories`, `useTags`, `useUsers`, mutations `useCreatePost` etc.) + `queryKey` `keys`. Mutations invalident les queries et toast via `sonner`.
- **Éditeur** : `@mdxeditor/editor` pour les posts. Création en `FormData` (cover image = `File`), update en `FormData` si nouvelle image sinon JSON.
- **Shell Astro** : `src/pages/admin/[...path].astro` — `<AdminApp client:only="react" />` sans layout Astro autour (pas de `Header.astro`).
- **Contenu statique DB** : `src/content.config.ts` étendu (`coverImageUrl`, `benpostId`, `benpostSlug`, `status`, `author`, `category`, `tags`). `src/content/blog/*.md` avec `benpostId` sont générés par `scripts/sync-content.ts` (ne pas éditer à la main). `src/layouts/BlogPost.astro` et `src/pages/blog/index.astro` affichent `coverImageUrl` en fallback si `heroImage` absent. `scripts/sync-content.ts` fetch `GET /posts` (filtre `published`), génère `src/content/blog/<slug>.md`, supprime les obsolètes. `src/pages/api/webhook/posts.ts` (`prerender = false`) reçoit `POST { action: "upsert"|"delete", post }` depuis le back (prod). Scripts front : `sync:content` et `prebuild` (`bun run sync:content || true` avant `astro build`).
- **Ne pas** réintroduire `apps/admin` comme workspace séparé — le build root est `back (no build) + front`.

### Root

- `package.json` workspaces `apps/*`, `packages/*`. Scripts : `dev = concurrently "bun --filter=back run dev" "bun --filter=front run dev"` (back lit `PORT`), `build = bun --filter=front run build` (back n'a pas de build ; ne pas ajouter `bun --filter=back run build` qui échoue).
- `concurrently` en `devDependencies` root.
- `bun.lock` à committer.

## 5. Workflows

- **Nouvelle route back** : `src/routes/<nom>/{index.ts,model.ts,service.ts}` + enregistrement dans `src/index.ts` (`.use(xxxRoutes)`). Ajouter tests dans `tests/`.
- **Nouvelle page admin** : créer `src/admin/pages/<nom>.tsx` + route dans `src/admin/router.tsx` (`children` de `/admin`) + entrée sidebar si besoin + hooks dans `hooks/api.ts` + types dans `types/index.ts`.
- **Nouvelle page publique Astro** : `src/pages/<nom>.astro` avec `export const prerender = true` + layout `src/layouts/`.
- **Nouveau post blog (DB → statique)** : créer/éditer via back-office ou `POST /posts` avec `status: "published"` → `sync-front.ts` écrit `src/content/blog/<slug>.md` en local et/ou appelle le webhook ; le fichier est pré-rendu au prochain `bun --filter=front run build` (ou `prebuild`). Pour forcer : `bun --filter=front run sync:content` puis `bun --filter=front run build`. Dépublier (`draft`/`archived`) ou `DELETE /posts/:id` supprime le `.md`.
- **Migrations DB** : éditer `schema.ts` → `bun --filter=back run db:generate` → vérifier `src/database/migrations/` → `bun --filter=back run db:migrate`.
- **Env front** : `PUBLIC_API_URL` pour pointer l'admin vers le back (défaut `http://localhost:3002` en local, URL publique en prod). `WEBHOOK_SECRET` pour sécuriser `/api/webhook/posts`.

## 6. Tests

- Back : `bun test` (bun:test). Fichiers `tests/*.test.ts`. Utilise DB `:memory:` quand `NODE_ENV=test`. Toujours passer avant de proposer un merge.
- Front : pas de tests unitaires actuellement — vérification par `bun --filter=front run build` (build SSR + prerender + images optimisées). Vérifier que `sync:content` génère bien les `.md` et que le build pré-rend `/blog/<slug>` (voir `dist/client/blog/<slug>/index.html`).

## 7. Pitfalls

- `output: server` obligatoire côté front — sinon `/admin/*` renverrait 404 en static.
- `prerender = false` uniquement sur `admin/[...path].astro`, `true` sur les pages publiques — ne pas inverser.
- `isAdmin` vérifie `user.role === "admin"` — les `editor` peuvent lire mais pas écrire (403). `isAuthenticated` seul pour les routes lecture.
- `App` type Elysia est exporté pour Eden (`@elysia/eden` côté front si usage treaty).
- Ne pas introduire `dotenv`, `express`, `pg`, `better-sqlite3`.
- Ports : back `3002` en local (`3000` occupé par Dokploy) / front `4321` — CORS doit refléter le port front. En prod, back sur `3000` (ou `PORT`/`BACK_PORT`) derrière Traefik.
- Fichiers `src/content/blog/*.md` avec `benpostId` sont générés — ne pas les éditer manuellement, ils seront écrasés par `sync:content` ou `sync-front.ts`.

## 8. Frontend Astro — pattern HTML imports (si besoin d'ajouter une route API Bun)

Utiliser `Bun.serve({ routes: { "/api/...": { GET: ... } } })` ou les routes Astro, jamais Express. Pour un serveur Bun standalone hors Astro, suivre `Bun.serve()` avec `routes` (voir docs `node_modules/bun-types/docs`).

## 9. Qualité

- Avant tout commit : `bun --filter=front run build` doit passer (pas d'erreur TS/alias). Vérifier aussi `bun --filter=front run sync:content` si des posts ont été modifiés.
- Back : `bun --filter=back test` doit passer si la logique métier a changé.
- Commits : messages conventionnels (`feat(back): ...`, `feat(front): ...`, `chore: ...`), pas de `co-authored` auto.

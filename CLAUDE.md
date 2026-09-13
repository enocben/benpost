# CLAUDE.md — Benpost

> Instructions pour tout agent (Hermes, Claude, Codex, etc.) travaillant sur ce repo.
> Stack, conventions et workflows à respecter strictement.

## 1. Projet

**Benpost** — CMS blog minimal : API headless + site public + back-office intégré.
Monorepo Bun workspaces `apps/*` — 2 apps uniquement :

| App | Dossier | Stack | Port |
|-----|---------|-------|------|
| **back** | `apps/back` | Elysia 1.4 + drizzle-orm + bun:sqlite + @elysiajs/jwt/cors/openapi | 3000 |
| **front** | `apps/front` | Astro 7 (SSR `output: server` + `@astrojs/node` standalone) + React 19 + TanStack Query/Table + Tailwind 4 + MDXEditor | 4321 |

Le back-office admin **n'est plus une app séparée** : il vit dans `apps/front/src/admin/` et est servi via une route catch-all Astro `src/pages/admin/[...path].astro` (`prerender = false`, `client:only="react"`). Le site public (`/`, `/about`, `/blog/*`) reste en `prerender = true`.

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

# dev (2 terminaux ou via root)
bun run dev                          # concurrently: back:watch + front:astro dev
# ou séparé :
bun --filter=back run dev            # bun --watch src/index.ts → http://localhost:3000
bun --filter=front run dev           # astro dev               → http://localhost:4321

# build
bun --filter=front run build         # astro build (SSR standalone → dist/)
# back n'a pas de build — c'est un serveur Elysia direct (bun src/index.ts)

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
- **Env requis** : `APP_SECRET` (JWT). Optionnel S3 si `s3.ts` configuré.

### Front (`apps/front`)

- **Astro SSR** : `output: "server"`, `adapter: node({ mode: "standalone" })`. Les pages publiques ont `export const prerender = true` (pré-rendues à `astro build`), la page admin a `export const prerender = false`.
- **Alias** : `@` → `apps/front/src` (défini dans `tsconfig.json` `paths` + `astro.config.mjs` `vite.resolve.alias`). Imports admin : `@/admin/lib/api`, `@/admin/pages/*`, etc. Ne pas créer d'alias `@admin`.
- **Tailwind** : Tailwind 4 via `@tailwindcss/vite` (plugin Vite dans `astro.config.mjs`). Styles admin dans `src/admin/global.css` (importé par `AdminApp.tsx`), styles front dans `src/styles/global.css`. Contient `@plugin "@tailwindcss/typography"` + `tw-animate-css` + vars `:root`.
- **Admin SPA** : `src/admin/AdminApp.tsx` (QueryClient + ThemeProvider + RouterProvider + Toaster) + `src/admin/router.tsx` (`createBrowserRouter`, routes préfixées `/admin`, guards `RequireAuth`/`RedirectIfAuthenticated` via `localStorage` clé `benpost.token` dans `src/admin/lib/auth.ts`). Sidebar `src/admin/components/layout/sidebar.tsx` — tous les `to` doivent être `/admin/...`.
- **API client** : `src/admin/lib/api.ts` — `API_BASE = import.meta.env.PUBLIC_API_URL ?? API_URL ?? "http://localhost:3000"` (configurable). `request()` gère `FormData` vs JSON, injecte `Authorization: Bearer <token>`, redirige `401` → `/admin/login`, déballe l'enveloppe `{ success, data }`.
- **State** : `src/admin/hooks/api.ts` — hooks TanStack Query (`usePosts`, `useCategories`, `useTags`, `useUsers`, mutations `useCreatePost` etc.) + `queryKey` `keys`. Mutations invalident les queries et toast via `sonner`.
- **Éditeur** : `@mdxeditor/editor` pour les posts. Création en `FormData` (cover image = `File`), update en `FormData` si nouvelle image sinon JSON.
- **Shell Astro** : `src/pages/admin/[...path].astro` — `<AdminApp client:only="react" />` sans layout Astro autour (pas de `Header.astro`).
- **Ne pas** réintroduire `apps/admin` comme workspace séparé — le build root est `back (no build) + front`.

### Root

- `package.json` workspaces `apps/*`, `packages/*`. Scripts : `dev = concurrently "bun --filter=back run dev" "bun --filter=front run dev"`, `build = bun --filter=front run build` (back n'a pas de build ; ne pas ajouter `bun --filter=back run build` qui échoue).
- `concurrently` en `devDependencies` root.
- `bun.lock` à committer.

## 5. Workflows

- **Nouvelle route back** : `src/routes/<nom>/{index.ts,model.ts,service.ts}` + enregistrement dans `src/index.ts` (`.use(xxxRoutes)`). Ajouter tests dans `tests/`.
- **Nouvelle page admin** : créer `src/admin/pages/<nom>.tsx` + route dans `src/admin/router.tsx` (`children` de `/admin`) + entrée sidebar si besoin + hooks dans `hooks/api.ts` + types dans `types/index.ts`.
- **Nouvelle page publique Astro** : `src/pages/<nom>.astro` avec `export const prerender = true` + layout `src/layouts/`.
- **Migrations DB** : éditer `schema.ts` → `bun --filter=back run db:generate` → vérifier `src/database/migrations/` → `bun --filter=back run db:migrate`.
- **Env front** : `PUBLIC_API_URL` pour pointer l'admin vers le back (défaut `http://localhost:3000`). En prod, mettre l'URL publique du back.

## 6. Tests

- Back : `bun test` (bun:test). Fichiers `tests/*.test.ts`. Utilise DB `:memory:` quand `NODE_ENV=test`. Toujours passer avant de proposer un merge.
- Front : pas de tests unitaires actuellement — vérification par `bun --filter=front run build` (build SSR + prerender + images optimisées).

## 7. Pitfalls

- `output: server` obligatoire côté front — sinon `/admin/*` renverrait 404 en static.
- `prerender = false` uniquement sur `admin/[...path].astro`, `true` sur les pages publiques — ne pas inverser.
- `isAdmin` vérifie `user.role === "admin"` — les `editor` peuvent lire mais pas écrire (403). `isAuthenticated` seul pour les routes lecture.
- `App` type Elysia est exporté pour Eden (`@elysia/eden` côté front si usage treaty).
- Ne pas introduire `dotenv`, `express`, `pg`, `better-sqlite3`.
- Ports : back 3000 / front 4321 — CORS doit refléter le port front.

## 8. Frontend Astro — pattern HTML imports (si besoin d'ajouter une route API Bun)

Utiliser `Bun.serve({ routes: { "/api/...": { GET: ... } } })` ou les routes Astro, jamais Express. Pour un serveur Bun standalone hors Astro, suivre `Bun.serve()` avec `routes` (voir docs `node_modules/bun-types/docs`).

## 9. Qualité

- Avant tout commit : `bun --filter=front run build` doit passer (pas d'erreur TS/alias).
- Back : `bun --filter=back test` doit passer si la logique métier a changé.
- Commits : messages conventionnels (`feat(back): ...`, `feat(front): ...`, `chore: ...`), pas de `co-authored` auto.

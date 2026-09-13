# Benpost

CMS blog minimal — API headless + site public + back-office intégré. Monorepo Bun workspaces, 2 apps : **back** (Elysia) + **front** (Astro SSR + React admin embarqué).

## Stack

| Couche | Tech |
|--------|------|
| **back** | Elysia 1.4, drizzle-orm, `bun:sqlite`, `@elysiajs/jwt` / `cors` / `openapi` |
| **front public** | Astro 7 (`output: server` + `@astrojs/node` standalone), MDX, sitemap, Tailwind 4 |
| **front admin** | React 19 + react-router 7 + TanStack Query/Table + shadcn/ui + MDXEditor, embarqué en `client:only` via Astro |
| **runtime** | Bun 1.4 — `bun install` / `bun run` / `bun test` (pas npm, pas dotenv) |
| **DB** | SQLite (`bun:sqlite` + drizzle-kit), fichier `apps/back/src/database/sqlite.db` (`:memory:` en test) |

## Structure

```
benpost/
├── package.json              # workspaces apps/*, scripts dev/build
├── bun.lock
├── apps/
│   ├── back/                 # API Elysia :3000
│   │   ├── src/
│   │   │   ├── index.ts      # app Elysia + CORS + routes
│   │   │   ├── database/     # schema.ts, db.ts, migrations/, sqlite.db
│   │   │   ├── routes/       # auth, posts, categories, tags, users, files
│   │   │   ├── middlewares/  # auth.ts (isAuthenticated / isAdmin)
│   │   │   ├── utils/        # reponses.ts, s3.ts, getToken()
│   │   │   └── scripts/      # seed-admin.ts
│   │   ├── tests/            # bun:test (auth, posts, categories, tags, users)
│   │   ├── drizzle.config.ts
│   │   └── package.json
│   └── front/                # Astro SSR :4321
│       ├── astro.config.mjs  # output: server + adapter node standalone + alias @
│       ├── src/
│       │   ├── pages/        # index.astro, about.astro, blog/* (prerender:true)
│       │   │   └── admin/[...path].astro  # shell admin (prerender:false → AdminApp client:only)
│       │   ├── admin/        # back-office React (migré depuis apps/admin)
│       │   │   ├── AdminApp.tsx + router.tsx (routes /admin/*)
│       │   │   ├── pages/    # dashboard, posts/index, posts/editor, categories, tags, users, login
│       │   │   ├── components/{layout,ui} + hooks/api.ts + lib/{api,auth,theme}
│       │   │   └── global.css
│       │   ├── components/, layouts/, content/blog/, assets/, styles/
│       │   └── consts.ts
│       └── package.json
└── docs/
```

> L'ancien workspace `apps/admin` (Vite SPA séparée) a été supprimé — son code vit désormais dans `apps/front/src/admin`.

## Prérequis

- Bun ≥ 1.3 (`curl -fsSL https://bun.sh/install | bash`)
- Node ≥ 22.12 pour le build Astro (engines front)

## Installation

```bash
git clone <repo> benpost && cd benpost
bun install
```

### Variables d'environnement

**Back** (`apps/back/.env` ou env système) :

```env
APP_SECRET=change-me-en-prod   # obligatoire — secret JWT
# optionnel si upload S3 configuré dans src/utils/s3.ts
# S3_ENDPOINT=...
# S3_ACCESS_KEY_ID=...
# S3_SECRET_ACCESS_KEY=...
# S3_BUCKET=...
```

**Front** (`apps/front/.env`) :

```env
PUBLIC_API_URL=http://localhost:3000  # URL du back (défaut ci-dessus si absent)
```

Bun charge les `.env` automatiquement.

### Base de données

```bash
bun --filter=back run db:generate   # génère une migration depuis schema.ts
bun --filter=back run db:migrate    # applique les migrations (crée sqlite.db)
bun --filter=back run db:seed       # crée l'utilisateur admin initial
```

## Développement

```bash
# les deux apps en parallèle
bun run dev
# → back  http://localhost:3000  (bun --watch src/index.ts)
# → front http://localhost:4321  (astro dev)

# ou séparé
bun --filter=back run dev
bun --filter=front run dev
```

- API docs OpenAPI : `http://localhost:3000/openapi` (ou `/swagger` selon version Elysia)
- Admin : `http://localhost:4321/admin` → redirection `/admin/login` si non authentifié (token `benpost.token` en localStorage)
- Site public : `http://localhost:4321/`, `/about`, `/blog/*`

## Build

```bash
bun --filter=front run build    # Astro SSR standalone → apps/front/dist/
# back n'a pas de build : on lance directement `bun src/index.ts` en prod
bun --filter=front run preview  # preview du build front
```

> `bun run build` à la racine lance uniquement le build front (le back est un serveur Bun sans étape de build).

## API

Base `http://localhost:3000`. Enveloppe de réponse : `{ success, message, data }`.

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/auth/login` | non | login → `{ token }` |
| GET | `/auth/me` | Bearer | profil courant |
| GET | `/posts` | non | liste publiée |
| GET | `/posts/:id` | non | détail |
| GET | `/posts/slug/:slug` | non | par slug |
| POST | `/posts` | admin (FormData) | création (cover image en `File`) |
| PUT | `/posts/:id` | admin | mise à jour (JSON ou FormData si nouvelle image) |
| DELETE | `/posts/:id` | admin | suppression |
| GET/POST/PUT/DELETE | `/categories`, `/tags` | admin pour écriture | CRUD taxonomies |
| GET/PUT/DELETE | `/users`, `/users/:id/role` | admin | gestion utilisateurs/rôles |
| POST | `/files` | admin | upload fichier |

**Auth** : header `Authorization: Bearer <jwt>` (payload `{ id, role }`). Middleware `isAuthenticated` / `isAdmin` (`role === "admin"` requis pour l'écriture, `editor` = lecture seule).

**CORS** : autorise `http://localhost:4321` uniquement (front).

## Tests

```bash
bun --filter=back test          # tous les tests (DB :memory: quand NODE_ENV=test)
# ou
cd apps/back && bun test
```

Fichiers : `apps/back/tests/{auth,posts,categories,tags,users}.test.ts`.

Front : vérification par build — `bun --filter=front run build` doit passer (alias `@`, SSR, prerender).

## Déploiement (aperçu)

- **Back** : `bun src/index.ts` (ou Docker `oven/bun`). Env `APP_SECRET` obligatoire. SQLite → monter un volume pour `src/database/sqlite.db` ou migrer vers Postgres si besoin.
- **Front** : `bun --filter=front run build` produit un serveur Node standalone (`dist/server/entry.mjs` + `dist/client/`). Lancer avec `node dist/server/entry.mjs` ou `bun dist/server/entry.mjs`. Configurer `PUBLIC_API_URL` vers l'URL publique du back.
- Adapter Astro : `@astrojs/node` en `mode: "standalone"` — pas de `output: static`.

## Conventions (résumé pour contributeurs)

- Bun partout (`bun install`, `bun test`, `bun:sqlite`, `Bun.file`). Pas `dotenv`, pas `express/pg`.
- Front : `output: server` obligatoire, `prerender:true` sur pages publiques / `false` sur `admin/[...path].astro`, alias `@` → `src`, Tailwind via `@tailwindcss/vite`.
- Back : validation via `model.ts` (TypeBox), logique dans `service.ts`, routes dans `index.ts`, enregistrement dans `src/index.ts`.
- Admin : routes `react-router` préfixées `/admin/*`, guard `RequireAuth` via `localStorage`, `api.ts` gère `401 → /admin/login` et déballe l'enveloppe.

Voir `AGENTS.md` pour les instructions détaillées à destination des agents.

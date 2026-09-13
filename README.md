# Benpost

CMS blog minimal — API headless + site public + back-office intégré. Monorepo Bun workspaces, 2 apps : **back** (Elysia) + **front** (Astro SSR + React admin embarqué). Les posts `published` de la DB sont synchronisés en fichiers `src/content/blog/*.md` et pré-rendus statiquement par Astro.

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
│   ├── back/                 # API Elysia :3002 en local (PORT/BACK_PORT, 3000 en prod)
│   │   ├── src/
│   │   │   ├── index.ts      # app Elysia + CORS + routes (PORT env)
│   │   │   ├── database/     # schema.ts, db.ts, migrations/, sqlite.db
│   │   │   ├── routes/       # auth, posts, categories, tags, users, files
│   │   │   ├── middlewares/  # auth.ts (isAuthenticated / isAdmin)
│   │   │   ├── utils/        # reponses.ts, s3.ts, getToken(), sync-front.ts
│   │   │   └── scripts/      # seed-admin.ts
│   │   ├── tests/            # bun:test (auth, posts, categories, tags, users)
│   │   ├── drizzle.config.ts
│   │   └── package.json
│   └── front/                # Astro SSR :4321
│       ├── astro.config.mjs  # output: server + adapter node standalone + alias @
│       ├── scripts/sync-content.ts  # DB → src/content/blog/*.md
│       ├── src/
│       │   ├── content.config.ts    # collection blog (coverImageUrl, benpostId, etc.)
│       │   ├── content/blog/        # *.md statiques + <slug>.md générés (benpostId)
│       │   ├── pages/
│       │   │   ├── index.astro, about.astro, blog/* (prerender:true)
│       │   │   ├── blog/[...slug].astro
│       │   │   ├── admin/[...path].astro  # shell admin (prerender:false → AdminApp client:only)
│       │   │   └── api/webhook/posts.ts   # webhook synchro (prerender:false)
│       │   ├── admin/        # back-office React (migré depuis apps/admin)
│       │   │   ├── AdminApp.tsx + router.tsx (routes /admin/*)
│       │   │   ├── pages/    # dashboard, posts/index, posts/editor, categories, tags, users, login
│       │   │   ├── components/{layout,ui} + hooks/api.ts + lib/{api,auth,theme}
│       │   │   └── global.css
│       │   ├── layouts/BlogPost.astro
│       │   ├── components/, assets/, styles/
│       │   └── consts.ts
│       └── package.json      # scripts sync:content, prebuild
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
PORT=3002                      # en local (3000 occupé par Dokploy), 3000 en prod
# optionnel
FRONT_WEBHOOK_URL=http://localhost:4321/api/webhook/posts  # en prod : URL publique du front
WEBHOOK_SECRET=change-me                           # secret partagé webhook
# S3 si upload configuré
# S3_ENDPOINT=...
# S3_ACCESS_KEY_ID=...
# S3_SECRET_ACCESS_KEY=...
# S3_BUCKET=...
```

**Front** (`apps/front/.env`) :

```env
PUBLIC_API_URL=http://localhost:3002  # URL du back (3002 local, prod: URL publique)
WEBHOOK_SECRET=change-me               # même secret que back pour /api/webhook/posts
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
# les deux apps en parallèle (back sur 3002)
PORT=3002 bun run dev
# → back  http://localhost:3002  (bun --watch src/index.ts)
# → front http://localhost:4321  (astro dev)

# ou séparé
PORT=3002 bun --filter=back run dev
bun --filter=front run dev
```

- API docs OpenAPI : `http://localhost:3002/openapi` (ou `/swagger`)
- Admin : `http://localhost:4321/admin` → redirection `/admin/login` si non authentifié (token `benpost.token` en localStorage)
- Site public : `http://localhost:4321/`, `/about`, `/blog/*`
- Contenu statique : `bun --filter=front run sync:content` génère les `src/content/blog/<slug>.md` depuis la DB

## Contenu statique depuis la DB

Les articles créés dans le back-office avec `status: "published"` sont automatiquement transformés en fichiers markdown statiques :

- **En local (monorepo)** : `apps/back/src/utils/sync-front.ts` écrit directement `apps/front/src/content/blog/<slug>.md` après `POST /posts` / `PUT /posts/:id` / `DELETE`, et `scripts/sync-content.ts` fait la même chose via `GET /posts`.
- **En prod** : le back appelle `POST FRONT_WEBHOOK_URL` (`/api/webhook/posts`) avec `WEBHOOK_SECRET` ; le front écrit le `.md`.
- Dépublier (`draft`/`archived`) ou supprimer supprime le `.md`.
- Les fichiers avec `benpostId` dans le frontmatter sont générés — ne pas les éditer à la main.

```bash
# forcer la synchro
bun --filter=front run sync:content
API_URL=http://localhost:3002 bun --filter=front run sync:content -- --dry-run

# build pré-rend les pages (prebuild lance sync:content automatiquement)
bun --filter=front run build   # → dist/client/blog/<slug>/index.html
```

Exemple généré `src/content/blog/hello-benpost-statique.md` :
```md
---
title: 'Hello Benpost — post DB statique'
description: '...'
pubDate: '2026-09-13T16:49:06.352Z'
benpostId: '01a09bac-...'
benpostSlug: 'hello-benpost-statique'
status: 'published'
author: 'Admin'
---

# Hello Benpost
...
```

## Build

```bash
bun --filter=front run build    # Astro SSR standalone → apps/front/dist/ (prebuild sync:content)
# back n'a pas de build : on lance directement `bun src/index.ts` en prod (PORT env)
bun --filter=front run preview  # preview du build front
```

> `bun run build` à la racine lance uniquement le build front (le back est un serveur Bun sans étape de build).

## API

Base `http://localhost:3002` en local (`http://localhost:3000` en prod si `PORT=3000`). Enveloppe de réponse : `{ success, message, data }`.

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/auth/login` | non | login → `{ token }` |
| GET | `/auth/me` | Bearer | profil courant |
| GET | `/posts` | non | liste (filtre `published` pour le front) |
| GET | `/posts/:id` | non | détail |
| GET | `/posts/slug/:slug` | non | par slug |
| POST | `/posts` | admin (FormData) | création — si `published`, génère le `.md` statique |
| PUT | `/posts/:id` | admin | mise à jour — `published` → upsert `.md`, `draft`/`archived` → delete `.md` |
| DELETE | `/posts/:id` | admin | suppression — delete `.md` |
| GET/POST/PUT/DELETE | `/categories`, `/tags` | admin pour écriture | CRUD taxonomies |
| GET/PUT/DELETE | `/users`, `/users/:id/role` | admin | gestion utilisateurs/rôles |
| POST | `/files` | admin | upload fichier |

**Auth** : header `Authorization: Bearer <jwt>` (payload `{ id, role }`). Middleware `isAuthenticated` / `isAdmin` (`role === "admin"` requis pour l'écriture, `editor` = lecture seule).

**CORS** : autorise `http://localhost:4321` uniquement (front).

**Webhook front** : `POST /api/webhook/posts` (`prerender: false`) — `{ action: "upsert"|"delete", post?: {...}, slug?, id? }`, header `X-Webhook-Secret: WEBHOOK_SECRET`.

## Tests

```bash
bun --filter=back test          # tous les tests (DB :memory: quand NODE_ENV=test)
# ou
cd apps/back && bun test
```

Fichiers : `apps/back/tests/{auth,posts,categories,tags,users}.test.ts`.

Front : vérification par build + sync — `bun --filter=front run sync:content && bun --filter=front run build` doit passer (alias `@`, SSR, prerender, génération `.md`).

## Déploiement (aperçu)

- **Back** : `bun src/index.ts` (ou Docker `oven/bun`). Env `APP_SECRET` + `PORT` (3000 en prod) obligatoire. SQLite → monter un volume pour `src/database/sqlite.db` ou migrer vers Postgres. Configurer `FRONT_WEBHOOK_URL` + `WEBHOOK_SECRET` pour la synchro.
- **Front** : `bun --filter=front run build` produit un serveur Node standalone (`dist/server/entry.mjs` + `dist/client/`). Lancer avec `node dist/server/entry.mjs` ou `bun dist/server/entry.mjs`. Configurer `PUBLIC_API_URL` vers l'URL publique du back et `WEBHOOK_SECRET`.
- Adapter Astro : `@astrojs/node` en `mode: "standalone"` — pas de `output: static`.

## Conventions (résumé pour contributeurs)

- Bun partout (`bun install`, `bun test`, `bun:sqlite`, `Bun.file`). Pas `dotenv`, pas `express/pg`.
- Front : `output: server` obligatoire, `prerender:true` sur pages publiques / `false` sur `admin/[...path].astro` + `api/webhook/posts.ts`, alias `@` → `src`, Tailwind via `@tailwindcss/vite`.
- Back : validation via `model.ts` (TypeBox), logique dans `service.ts`, routes dans `index.ts`, enregistrement dans `src/index.ts`. Synchro front via `utils/sync-front.ts`.
- Admin : routes `react-router` préfixées `/admin/*`, guard `RequireAuth` via `localStorage`, `api.ts` gère `401 → /admin/login` et déballe l'enveloppe.
- Contenu : fichiers `src/content/blog/*.md` avec `benpostId` sont générés — ne pas éditer manuellement.
- Ports : back `3002` local / `3000` prod, front `4321`.

Voir `AGENTS.md` pour les instructions détaillées à destination des agents.

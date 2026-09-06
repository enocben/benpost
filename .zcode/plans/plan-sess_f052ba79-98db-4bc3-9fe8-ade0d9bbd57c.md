# Dashboard Admin pour Benpost — `apps/admin`

Nouvelle SPA React servie par **Bun.serve** (imports HTML, conformément aux conventions du workspace) : React + Tailwind + shadcn/ui, look "shadcn-admin" (sidebar collapsible, dark mode, data tables), interface en français. Elle consomme l'API Elysia existante (port 3000) et tourne sur le **port 3001**.

## 1. Ajustements backend (`apps/back`) — minimes

1. **CORS** : ajouter `@elysia/cors` dans `src/index.ts` (origines localhost:3001/4321 en dev).
2. **Enrichir `PostService.getAll()`** : left join sur `users` (nom de l'auteur) et `categories` (nom) pour alimenter proprement la table des posts.
3. **Seed du premier admin** : `src/scripts/seed-admin.ts` + script npm `db:seed` — crée `admin@benpost.local` (mot de passe par défaut `ChangeMe123!`, surchargeable via `.env`), rôle `admin`, hash `Bun.password`.

## 2. Nouvelle app `apps/admin`

**Scaffold** : `package.json` (workspace, `dev: bun --hot src/index.ts` — picked up par le `bun --filter '*' dev` racine), `tsconfig.json`, et :
- `src/index.ts` : `Bun.serve({ routes: { "/": index, "/*": index }, development: { hmr: true } })` sur 3001
- `src/index.html` : import HTML (charge `main.tsx` + `global.css`)
- Dépendances : react, react-dom, react-router v7, @tanstack/react-query, @tanstack/react-table, react-hook-form + zod, lucide-react, radix (dialog, dropdown-menu, select, label, slot, alert-dialog…), sonner, tailwindcss v4, clsx, tailwind-merge, cva

**Fondations** :
- `global.css` : Tailwind v4 + tokens de thème shadcn (light/dark via classe `dark` + toggle persisté en localStorage)
- `components/ui/*` : composants shadcn/ui nécessaires (button, card, input, label, select, table, dialog, alert-dialog, dropdown-menu, badge, skeleton, sonner, textarea, separator, avatar, tooltip) — via CLI shadcn si compatible Bun, sinon sources copiées
- `lib/api.ts` : client fetch typé — base URL `http://localhost:3000` (surchargeable `import.meta.env`), header `Bearer`, unwrap de l'enveloppe `{success, message, data}`, redirection `/login` sur 401
- `lib/auth.ts` : stockage du token (localStorage), décodage du payload JWT (`id`, `role`), logout
- `types/index.ts` : User, Post, Category, Tag, ApiResponse
- hooks react-query par ressource (usePosts, useCategories, useTags, useUsers + mutations avec invalidation)

**Layout & navigation** :
- Sidebar collapsible (icônes lucide) : Dashboard, Posts, Catégories, Tags, Utilisateurs
- Topbar : toggle dark/light, menu utilisateur (email + rôle, déconnexion)
- `router.tsx` : react-router v7 en mode library, layout protégé (redirige vers `/login` sans token)

**Pages** (français) :
1. `/login` — formulaire email/mot de passe, appel `POST /auth/login`
2. `/` Dashboard — cartes stats (posts publiés/brouillons/archivés, utilisateurs, catégories, tags, calculées depuis les GET existants) + table des derniers posts
3. `/posts` — data table TanStack (titre, statut badge, catégorie, auteur, dates), recherche + filtre statut, actions éditer/supprimer (alert-dialog de confirmation)
4. `/posts/new` et `/posts/:id/edit` — formulaire partagé : titre, slug (auto-généré depuis le titre), extrait, contenu (textarea), statut, catégorie (select), champs SEO ; validation zod alignée sur les modèles Elysia
5. `/categories` — table + dialogs créer/modifier/supprimer
6. `/tags` — table + dialogs créer/modifier/supprimer
7. `/users` — table, switch de rôle (`PUT /users/:id/role`), suppression

## 3. Vérification

- `bun install`, seed admin, lancement back (3000) + admin (3001)
- Test complet au navigateur (captures d'écran) : login, navigation, CRUD posts/catégories/tags/users, dark mode

## Hors scope (éventuelles suites)

- Gestion des médias (routes API à créer)
- Attache de tags aux posts (post_tags non exposé par l'API)
- Pagination côté API (listes actuelles non paginées)
- Politique "éditeurs peuvent écrire des posts" (mutations actuellement admin-only)
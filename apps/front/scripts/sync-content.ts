/**
 * sync-content.ts — Synchronise les posts publiés de la DB vers src/content/blog/*.md
 *
 * - Récupère GET /posts depuis le back (filtre status === published)
 * - Génère un fichier markdown par post dans src/content/blog/<slug>.md
 * - Frontmatter compatible avec src/content.config.ts (title, description, pubDate, etc.)
 * - Marqueur benpostId pour distinguer les fichiers gérés vs les exemples statiques
 * - Supprime les fichiers DB obsolètes (slug renommé ou post dépublié)
 *
 * Usage:
 *   bun run sync:content              # sync depuis http://localhost:3000
 *   API_URL=http://localhost:3000 bun run scripts/sync-content.ts
 *   bun run scripts/sync-content.ts --dry-run
 */

import { mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// scripts/ -> src/content/blog  :  scripts est à apps/front/scripts
const CONTENT_DIR = path.resolve(__dirname, '../src/content/blog');
const API_URL = process.env.API_URL ?? process.env.PUBLIC_API_URL ?? 'http://localhost:3002';

type ApiEnvelope<T> = { success: boolean; message: string; data: T };
type PostRow = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  content: string;
  cover_image_url?: string | null;
  status: string;
  author_id: string;
  author_name?: string | null;
  author_email?: string | null;
  category_id?: string | null;
  category_name?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  published_at?: string | null;
  created_at: string;
  updated_at?: string | null;
};

function slugToFilename(slug: string): string {
  // sécurise le slug pour un nom de fichier
  return slug.replace(/[^a-z0-9-]/gi, '-').toLowerCase() + '.md';
}

function escapeYaml(str: string): string {
  // échappe les quotes simples pour YAML entre '
  return str.replace(/'/g, "''");
}

function toFrontmatter(post: PostRow): string {
  const description = post.excerpt || post.seo_description || post.title;
  const pubDate = post.published_at || post.created_at;
  const updatedDate = post.updated_at && post.updated_at !== pubDate ? post.updated_at : undefined;
  const cover = post.cover_image_url || undefined;

  const lines: string[] = ['---'];
  lines.push(`title: '${escapeYaml(post.title)}'`);
  lines.push(`description: '${escapeYaml(description)}'`);
  lines.push(`pubDate: '${pubDate}'`);
  if (updatedDate) lines.push(`updatedDate: '${updatedDate}'`);
  // heroImage est optionnel et attend un import local — on ne le génère pas pour les posts DB
  // on utilise coverImageUrl pour les URLs externes (S3 / http)
  if (cover) {
    // si c'est une URL externe, on met coverImageUrl
    // si c'est un chemin local (peu probable), on le met aussi en coverImageUrl
    lines.push(`coverImageUrl: '${escapeYaml(cover)}'`);
  }
  lines.push(`benpostId: '${escapeYaml(post.id)}'`);
  lines.push(`benpostSlug: '${escapeYaml(post.slug)}'`);
  lines.push(`status: 'published'`);
  if (post.author_name || post.author_email) {
    lines.push(`author: '${escapeYaml(post.author_name || post.author_email || '')}'`);
  }
  if (post.category_name) {
    lines.push(`category: '${escapeYaml(post.category_name)}'`);
  }
  lines.push('---');
  return lines.join('\n');
}

function toMarkdown(post: PostRow): string {
  const fm = toFrontmatter(post);
  // le contenu en DB est déjà du markdown (éditeur MDXEditor)
  // on le place tel quel après le frontmatter
  const body = (post.content ?? '').trim();
  return `${fm}\n\n${body}\n`;
}

async function fetchPublishedPosts(): Promise<PostRow[]> {
  const url = `${API_URL.replace(/\/$/, '')}/posts`;
  console.log(`[sync:content] GET ${url}`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`GET /posts failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as unknown;
  // L'API enveloppe en { success, data } via RouteResponse.success
  let rows: PostRow[] = [];
  if (json && typeof json === 'object' && 'data' in (json as Record<string, unknown>)) {
    rows = (json as ApiEnvelope<PostRow[]>).data;
  } else if (Array.isArray(json)) {
    rows = json as PostRow[];
  } else {
    throw new Error(`Unexpected /posts response shape: ${JSON.stringify(json).slice(0, 500)}`);
  }
  return rows.filter((p) => p.status === 'published');
}

function isBenpostFile(content: string): boolean {
  return content.includes('benpostId:');
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  console.log(`[sync:content] API_URL=${API_URL} CONTENT_DIR=${CONTENT_DIR} dryRun=${dryRun}`);

  await mkdir(CONTENT_DIR, { recursive: true });

  let published: PostRow[] = [];
  try {
    published = await fetchPublishedPosts();
  } catch (e) {
    console.error('[sync:content] fetch failed:', (e as Error).message);
    console.log('[sync:content] Aucun post récupéré — on ne supprime rien par sécurité.');
    if (!dryRun) process.exitCode = 1;
    return;
  }

  console.log(`[sync:content] ${published.length} post(s) publié(s) trouvé(s)`);

  // map slug -> post pour détection des fichiers obsolètes
  const wantedFilenames = new Set(published.map((p) => slugToFilename(p.slug)));
  const wantedIds = new Set(published.map((p) => p.id));

  // 1) Écrire / mettre à jour les fichiers voulus
  for (const post of published) {
    const filename = slugToFilename(post.slug);
    const dest = path.join(CONTENT_DIR, filename);
    const md = toMarkdown(post);
    if (dryRun) {
      console.log(`[dry-run] would write ${filename} (${post.title})`);
      continue;
    }
    await writeFile(dest, md, 'utf-8');
    console.log(`[sync:content] ✓ ${filename} ← ${post.id} "${post.title}"`);
  }

  // 2) Nettoyer les fichiers benpost obsolètes (slug renommé ou dépublié)
  const entries = await readdir(CONTENT_DIR);
  for (const entry of entries) {
    if (!entry.endsWith('.md') && !entry.endsWith('.mdx')) continue;
    // ne pas toucher aux exemples statiques qui n'ont pas benpostId
    const full = path.join(CONTENT_DIR, entry);
    const raw = await readFile(full, 'utf-8').catch(() => '');
    if (!isBenpostFile(raw)) continue;

    // extrait benpostId du frontmatter
    const m = raw.match(/benpostId:\s*'([^']+)'/);
    const fileId = m?.[1];
    const isWantedFile = wantedFilenames.has(entry);
    const isWantedId = fileId ? wantedIds.has(fileId) : false;

    // cas slug renommé : même id mais ancien filename -> supprimer l'ancien
    // cas dépublié : id plus dans wantedIds -> supprimer
    if (!isWantedFile || !isWantedId) {
      // si l'id est encore wanted mais filename différent, on garde seulement si c'est le nouveau filename
      // ici on supprime tout fichier benpost dont le filename n'est pas dans wanted OU dont l'id n'est plus publié
      // pour le cas rename, l'ancien fichier sera supprimé et le nouveau déjà écrit ci-dessus
      if (dryRun) {
        console.log(`[dry-run] would delete obsolete ${entry}`);
        continue;
      }
      await unlink(full);
      console.log(`[sync:content] ✗ deleted obsolete ${entry}`);
    }
  }

  console.log('[sync:content] done');
}

await main();

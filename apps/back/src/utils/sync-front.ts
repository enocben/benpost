/**
 * sync-front.ts — Synchronise un post publié vers le front Astro en tant que fichier markdown.
 *
 * - En local (monorepo) : écrit directement dans apps/front/src/content/blog/<slug>.md
 * - En prod (FRONT_WEBHOOK_URL défini) : POST vers le webhook Astro /api/webhook/posts
 *
 * Ne fait jamais échouer la requête principale — log en warning si la synchro échoue.
 */

import path from 'node:path';
import { mkdir, unlink, writeFile, readdir, readFile } from 'node:fs/promises';

type PostForFront = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  content: string;
  cover_image_url?: string | null;
  status: string;
  author_name?: string | null;
  author_email?: string | null;
  category_name?: string | null;
  seo_description?: string | null;
  published_at?: string | null;
  created_at: string;
  updated_at?: string | null;
};

// Chemin monorepo : apps/back/src/utils -> apps/front/src/content/blog
const FRONT_CONTENT_DIR = path.resolve(import.meta.dir, '../../../front/src/content/blog');

function slugToFilename(slug: string): string {
  return slug.replace(/[^a-z0-9-]/gi, '-').toLowerCase() + '.md';
}

function escapeYaml(str: string): string {
  return str.replace(/'/g, "''");
}

function toMarkdown(post: PostForFront): string {
  const description = post.excerpt || post.seo_description || post.title;
  const pubDate = post.published_at || post.created_at;
  const updatedDate = post.updated_at && post.updated_at !== pubDate ? post.updated_at : undefined;
  const cover = post.cover_image_url || undefined;

  const lines: string[] = ['---'];
  lines.push(`title: '${escapeYaml(post.title)}'`);
  lines.push(`description: '${escapeYaml(description)}'`);
  lines.push(`pubDate: '${pubDate}'`);
  if (updatedDate) lines.push(`updatedDate: '${updatedDate}'`);
  if (cover) lines.push(`coverImageUrl: '${escapeYaml(cover)}'`);
  lines.push(`benpostId: '${escapeYaml(post.id)}'`);
  lines.push(`benpostSlug: '${escapeYaml(post.slug)}'`);
  lines.push(`status: 'published'`);
  if (post.author_name || post.author_email) {
    lines.push(`author: '${escapeYaml(post.author_name || post.author_email || '')}'`);
  }
  if (post.category_name) lines.push(`category: '${escapeYaml(post.category_name)}'`);
  lines.push('---');
  return `${lines.join('\n')}\n\n${post.content.trim()}\n`;
}

async function writeLocal(post: PostForFront): Promise<void> {
  const filename = slugToFilename(post.slug);
  const dest = path.join(FRONT_CONTENT_DIR, filename);
  await mkdir(FRONT_CONTENT_DIR, { recursive: true });
  const md = toMarkdown(post);
  await writeFile(dest, md, 'utf-8');
  // nettoyer ancien slug si renommé (même id, autre filename)
  const entries = await readdir(FRONT_CONTENT_DIR).catch(() => [] as string[]);
  for (const entry of entries) {
    if (entry === filename) continue;
    const full = path.join(FRONT_CONTENT_DIR, entry);
    const raw = await readFile(full, 'utf-8').catch(() => '');
    if (raw.includes(`benpostId: '${post.id}'`)) {
      await unlink(full).catch(() => {});
      console.log(`[sync-front] cleaned old slug file ${entry} for ${post.id}`);
    }
  }
  console.log(`[sync-front] wrote local ${filename} for ${post.id}`);
}

async function deleteLocal(post: { id: string; slug: string }): Promise<void> {
  const filename = slugToFilename(post.slug);
  const dest = path.join(FRONT_CONTENT_DIR, filename);
  await unlink(dest).catch(() => {});
  // fallback : scan par id si slug a changé
  const entries = await readdir(FRONT_CONTENT_DIR).catch(() => [] as string[]);
  for (const entry of entries) {
    const full = path.join(FRONT_CONTENT_DIR, entry);
    const raw = await readFile(full, 'utf-8').catch(() => '');
    if (raw.includes(`benpostId: '${post.id}'`)) {
      await unlink(full).catch(() => {});
      console.log(`[sync-front] deleted ${entry} for ${post.id}`);
    }
  }
}

async function callWebhook(post: PostForFront | null, action: 'upsert' | 'delete', meta?: { id: string; slug: string }): Promise<void> {
  const url = process.env.FRONT_WEBHOOK_URL;
  if (!url) return;
  const secret = process.env.WEBHOOK_SECRET;
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (secret) headers['x-webhook-secret'] = secret;

  const body =
    action === 'delete'
      ? { action: 'delete', id: meta!.id, slug: meta!.slug }
      : { action: 'upsert', post };

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`webhook ${res.status}: ${text.slice(0, 500)}`);
  }
  console.log(`[sync-front] webhook ${action} ok for ${post?.slug || meta?.slug}`);
}

export async function syncPostToFront(post: PostForFront): Promise<void> {
  // Si le post n'est plus publié, on supprime le fichier
  if (post.status !== 'published') {
    await deletePostFromFront({ id: post.id, slug: post.slug });
    return;
  }

  try {
    // 1) local file si le dossier front existe (monorepo dev / build sur même host)
    // on teste l'existence via mkdir (no-op si déjà là)
    await writeLocal(post);
  } catch (e) {
    console.warn('[sync-front] writeLocal failed:', (e as Error).message);
  }

  try {
    await callWebhook(post, 'upsert');
  } catch (e) {
    console.warn('[sync-front] webhook upsert failed:', (e as Error).message);
  }
}

export async function deletePostFromFront(post: { id: string; slug: string }): Promise<void> {
  try {
    await deleteLocal(post);
  } catch (e) {
    console.warn('[sync-front] deleteLocal failed:', (e as Error).message);
  }
  try {
    await callWebhook(null, 'delete', post);
  } catch (e) {
    console.warn('[sync-front] webhook delete failed:', (e as Error).message);
  }
}

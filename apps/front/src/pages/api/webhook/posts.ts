export const prerender = false;

import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// src/pages/api/webhook/posts.ts -> src/content/blog
const CONTENT_DIR = path.resolve(__dirname, '../../../content/blog');

function slugToFilename(slug: string): string {
  return slug.replace(/[^a-z0-9-]/gi, '-').toLowerCase() + '.md';
}

function escapeYaml(str: string): string {
  return str.replace(/'/g, "''");
}

function resolveCoverUrl(cover: string | null | undefined): string | undefined {
  if (!cover) return undefined;
  if (cover.startsWith('http://') || cover.startsWith('https://') || cover.startsWith('//')) return cover;
  if (cover.startsWith('cover/')) {
    // le back expose /files/cover/... — on reconstruit l'URL absolue si on connaît le back
    // en prod le back envoie déjà l'URL absolue, ce fallback ne sert qu'en local mal configuré
    const base = process.env.BACK_PUBLIC_URL || process.env.PUBLIC_API_URL || process.env.API_URL || '';
    if (base) return `${base.replace(/\/$/, '')}/files/${cover}`;
    // sinon on laisse la clé et le layout la résoudra côté front via PUBLIC_API_URL
    return cover;
  }
  return cover;
}

function toMarkdown(post: {
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
}): string {
  const description = post.excerpt || post.seo_description || post.title;
  const pubDate = post.published_at || post.created_at;
  const updatedDate = post.updated_at && post.updated_at !== pubDate ? post.updated_at : undefined;
  const cover = resolveCoverUrl(post.cover_image_url);

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

export async function POST({ request }: { request: Request }) {
  // Sécurité simple : token partagé via header X-Webhook-Secret
  const expected = process.env.WEBHOOK_SECRET;
  if (expected) {
    const got = request.headers.get('x-webhook-secret') || request.headers.get('authorization')?.replace('Bearer ', '');
    if (got !== expected) {
      return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), { status: 401 });
    }
  }

  let body: {
    action: 'upsert' | 'delete';
    post?: {
      id: string;
      title: string;
      slug: string;
      excerpt?: string | null;
      content: string;
      cover_image_url?: string | null;
      status: string;
      author_name?: string | null;
      category_name?: string | null;
      seo_description?: string | null;
      published_at?: string | null;
      created_at: string;
      updated_at?: string | null;
    };
    slug?: string;
    id?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return new Response(JSON.stringify({ success: false, message: 'Invalid JSON' }), { status: 400 });
  }

  try {
    await mkdir(CONTENT_DIR, { recursive: true });

    if (body.action === 'delete') {
      const slug = body.slug || '';
      const id = body.id || '';
      // supprime par slug
      if (slug) {
        const filename = slugToFilename(slug);
        const dest = path.join(CONTENT_DIR, filename);
        await unlink(dest).catch(() => {});
        return new Response(JSON.stringify({ success: true, message: `Deleted ${filename}` }), { status: 200 });
      }
      // fallback : scan par benpostId
      if (id) {
        const { readdir, readFile: rf } = await import('node:fs/promises');
        const entries = await readdir(CONTENT_DIR);
        for (const entry of entries) {
          const full = path.join(CONTENT_DIR, entry);
          const raw = await rf(full, 'utf-8').catch(() => '');
          if (raw.includes(`benpostId: '${id}'`)) {
            await unlink(full).catch(() => {});
            return new Response(JSON.stringify({ success: true, message: `Deleted ${entry}` }), { status: 200 });
          }
        }
      }
      return new Response(JSON.stringify({ success: true, message: 'Nothing to delete' }), { status: 200 });
    }

    if (body.action === 'upsert' && body.post) {
      const post = body.post;
      // Si status != published, on supprime le fichier (dépublié)
      if (post.status !== 'published') {
        const filename = slugToFilename(post.slug);
        const dest = path.join(CONTENT_DIR, filename);
        await unlink(dest).catch(() => {});
        // aussi cleaner ancien slug si renommé
        // scan par id pour supprimer ancien slug
        const { readdir, readFile: rf } = await import('node:fs/promises');
        const entries = await readdir(CONTENT_DIR);
        for (const entry of entries) {
          const full = path.join(CONTENT_DIR, entry);
          const raw = await rf(full, 'utf-8').catch(() => '');
          if (raw.includes(`benpostId: '${post.id}'`) && entry !== filename) {
            await unlink(full).catch(() => {});
          }
        }
        return new Response(JSON.stringify({ success: true, message: 'Depublished' }), { status: 200 });
      }

      const filename = slugToFilename(post.slug);
      const dest = path.join(CONTENT_DIR, filename);
      const md = toMarkdown(post as any);
      await writeFile(dest, md, 'utf-8');

      // si slug a changé, supprimer ancien fichier avec même benpostId
      const { readdir, readFile: rf } = await import('node:fs/promises');
      const entries = await readdir(CONTENT_DIR);
      for (const entry of entries) {
        if (entry === filename) continue;
        const full = path.join(CONTENT_DIR, entry);
        const raw = await rf(full, 'utf-8').catch(() => '');
        if (raw.includes(`benpostId: '${post.id}'`)) {
          await unlink(full).catch(() => {});
        }
      }

      return new Response(JSON.stringify({ success: true, message: `Upserted ${filename}` }), { status: 200 });
    }

    return new Response(JSON.stringify({ success: false, message: 'Invalid action' }), { status: 400 });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, message: (e as Error).message }), { status: 500 });
  }
}

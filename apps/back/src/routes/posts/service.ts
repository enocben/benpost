import { status } from "elysia";
import { db } from "../../database/db";
import { postSchema, userSchema, categorySchema } from "../../database/schema";
import {eq} from "drizzle-orm";
import { RouteResponse } from "../../utils/reponses";
import { type PostModel } from './model'
import {S3Files} from "../../utils/s3";
import { syncPostToFront, deletePostFromFront } from "../../utils/sync-front";

export abstract class PostService {
  static async getAll() {
    const posts = await db
      .select({
        id: postSchema.id,
        title: postSchema.title,
        slug: postSchema.slug,
        excerpt: postSchema.excerpt,
        content: postSchema.content,
        cover_image_url: postSchema.cover_image_url,
        status: postSchema.status,
        author_id: postSchema.author_id,
        category_id: postSchema.category_id,
        seo_title: postSchema.seo_title,
        seo_description: postSchema.seo_description,
        published_at: postSchema.published_at,
        created_at: postSchema.created_at,
        updated_at: postSchema.updated_at,
        author_name: userSchema.name,
        author_email: userSchema.email,
        category_name: categorySchema.name,
      })
      .from(postSchema)
      .leftJoin(userSchema, eq(postSchema.author_id, userSchema.id))
      .leftJoin(categorySchema, eq(postSchema.category_id, categorySchema.id));
    return RouteResponse.success("Posts retrieved successfully", posts);
  }

  static async getById(id: string) {
    const posts = await db.select().from(postSchema).where(eq(postSchema.id, id)).limit(1);
    if (posts.length === 0) {
      throw status(404, "Post not found");
    }
    return RouteResponse.success("Post retrieved successfully", posts[0]);
  }

  static async getBySlug(slug: string) {
    const posts = await db.select().from(postSchema).where(eq(postSchema.slug, slug)).limit(1);
    if (posts.length === 0) {
      throw status(404, "Post not found");
    }
    return RouteResponse.success("Post retrieved successfully", posts[0]);
  }

  static async create(data: PostModel["create"], authorId: string) {
    const existing = await db
      .select()
      .from(postSchema)
      .where(eq(postSchema.slug, data.slug))
      .limit(1);

    if (existing.length > 0) {
      throw status(400, "Post with this slug already exists");
    }
    let coverImage: string | undefined

    if (data.cover_image_url){
      const image = await S3Files.uploadCoverImage(data.cover_image_url)
      coverImage = image.name
    }

    const now = new Date().toISOString();
    const newPost = {
      id: Bun.randomUUIDv7(),
      title: data.title,
      slug: data.slug,
      excerpt: data.excerpt || null,
      content: data.content,
      cover_image_url: coverImage,
      status: data.status || "draft",
      author_id: authorId,
      category_id: data.category_id || null,
      seo_title: data.seo_title || null,
      seo_description: data.seo_description || null,
      published_at: data.status === "published" ? now : null,
      created_at: now,
      updated_at: now,
    };

    await db.insert(postSchema).values(newPost);
    // Fire-and-forget : génère le .md statique si publié (n'échoue pas la requête si la synchro échoue)
    if (newPost.status === "published") {
      const author = await db.select({ name: userSchema.name, email: userSchema.email }).from(userSchema).where(eq(userSchema.id, authorId)).limit(1);
      const category = newPost.category_id ? await db.select({ name: categorySchema.name }).from(categorySchema).where(eq(categorySchema.id, newPost.category_id)).limit(1) : [];
      syncPostToFront({
        id: newPost.id,
        title: newPost.title,
        slug: newPost.slug,
        excerpt: newPost.excerpt,
        content: newPost.content,
        cover_image_url: newPost.cover_image_url,
        status: newPost.status,
        author_name: author[0]?.name ?? null,
        author_email: author[0]?.email ?? null,
        category_name: category[0]?.name ?? null,
        seo_description: newPost.seo_description,
        published_at: newPost.published_at,
        created_at: newPost.created_at,
        updated_at: newPost.updated_at ?? null,
      }).catch((e) => console.warn("[posts] syncPostToFront failed:", (e as Error).message));
    }
    return status(201, RouteResponse.success("Post created successfully", newPost));
  }

  static async update(id: string, data: PostModel['update']) {

    if (data.slug) {
      const existing = await db
        .select()
        .from(postSchema)
        .where(eq(postSchema.slug, data.slug))
        .limit(1);

      if (existing.length > 0 && existing[0].id !== id) {
        throw status(400, "Post with this slug already exists");
      }
    }

    let coverImage: string | File | undefined = data.cover_image_url;

    // Nouvelle image upload : on remplace l'ancienne, y compris dans le stockage
    if (coverImage instanceof File) {
      const posts = await db
        .select({ cover_image_url: postSchema.cover_image_url })
        .from(postSchema)
        .where(eq(postSchema.id, id))
        .limit(1);
      const old = posts[0]?.cover_image_url;
      // Les anciens posts peuvent référencer une URL externe : ne supprimer que nos clés S3
      if (old && old.startsWith("cover/")) {
        await S3Files.deleteCoverImage(old);
      }
      const image = await S3Files.uploadCoverImage(coverImage);
      coverImage = image.name;
    }

    const updateData = {
      ...data,
      cover_image_url: coverImage,
      published_at: undefined as string | undefined,
      updated_at: new Date().toISOString(),
    };

    if (data.status === "published") {
        updateData.published_at = new Date().toISOString();
    }

    const result = await db
      .update(postSchema)
      .set(updateData)
      .where(eq(postSchema.id, id))
      .returning();

    if (result.length === 0) {
      throw status(404, "Post not found");
    }

    const updated = result[0] as typeof result[0] & { status: string; slug: string };
    // Synchro front : upsert si publié, delete si dépublié/archivé
    // On fetch l'auteur/catégorie pour enrichir le frontmatter
    const author = updated.author_id ? await db.select({ name: userSchema.name, email: userSchema.email }).from(userSchema).where(eq(userSchema.id, updated.author_id)).limit(1) : [];
    const category = (updated as any).category_id ? await db.select({ name: categorySchema.name }).from(categorySchema).where(eq(categorySchema.id, (updated as any).category_id)).limit(1) : [];
    if (updated.status === "published") {
      syncPostToFront({
        id: updated.id,
        title: (updated as any).title,
        slug: (updated as any).slug,
        excerpt: (updated as any).excerpt ?? null,
        content: (updated as any).content,
        cover_image_url: (updated as any).cover_image_url ?? null,
        status: updated.status,
        author_name: author[0]?.name ?? null,
        author_email: author[0]?.email ?? null,
        category_name: category[0]?.name ?? null,
        seo_description: (updated as any).seo_description ?? null,
        published_at: (updated as any).published_at ?? null,
        created_at: (updated as any).created_at,
        updated_at: (updated as any).updated_at ?? null,
      }).catch((e) => console.warn("[posts] syncPostToFront failed:", (e as Error).message));
    } else if (data.status && data.status !== "published") {
      // dépublication explicite (draft/archived)
      deletePostFromFront({ id: updated.id, slug: (updated as any).slug }).catch((e) => console.warn("[posts] deletePostFromFront failed:", (e as Error).message));
    } else if (updated.status !== "published") {
      // cas où le post était déjà non publié et on l'édite : pas de synchro
    }

    return RouteResponse.success("Post updated successfully", result[0]);
  }

  static async delete(id: string) {
    const result = await db.delete(postSchema).where(eq(postSchema.id, id)).returning();
    if (result.length === 0) {
      throw status(404, "Post not found");
    }
    const deleted = result[0] as { id: string; slug: string };
    deletePostFromFront({ id: deleted.id, slug: deleted.slug }).catch((e) => console.warn("[posts] deletePostFromFront failed:", (e as Error).message));
    return RouteResponse.success("Post deleted successfully", result[0]);
  }
}

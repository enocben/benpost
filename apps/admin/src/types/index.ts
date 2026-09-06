export type Role = "admin" | "editor";
export type PostStatus = "draft" | "published" | "archived";

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  role: Role;
  created_at: string;
  updated_at: string | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
}

export interface PostListItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  status: PostStatus;
  author_id: string;
  category_id: string | null;
  seo_title: string | null;
  seo_description: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string | null;
  author_name: string | null;
  author_email: string | null;
  category_name: string | null;
}

export interface Post extends PostListItem {
  content: string;
}

export interface PostInput {
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  cover_image_url?: string;
  status?: PostStatus;
  category_id?: string;
  seo_title?: string;
  seo_description?: string;
}

// À la création, l'API attend l'image de couverture en upload (multipart)
export interface PostCreateInput extends Omit<PostInput, "cover_image_url"> {
  cover_image_url?: File;
}

import z from "zod";

export const postSchema = z.object({
  title: z
    .string()
    .min(2, "2 caractères minimum")
    .max(200, "200 caractères maximum"),
  slug: z
    .string()
    .min(2, "2 caractères minimum")
    .max(200, "200 caractères maximum"),
  excerpt: z.string().optional(),
  content: z.string().min(10, "10 caractères minimum"),
  status: z.enum(["draft", "published", "archived"]),
  category_id: z.string().optional(),
  // Création : fichier uploadé (FileList via input file) ; édition : URL existante
  cover_image_url: z.union([z.instanceof(FileList), z.string()]).optional(),
  seo_title: z.string().optional(),
  seo_description: z.string().optional(),
});

export const categorySchema = z.object({
  name: z.string().min(2, "2 caractères minimum").max(100),
  slug: z.string().min(2, "2 caractères minimum").max(100),
  description: z.string().optional(),
});

export const tagSchema = z.object({
  name: z.string().min(2, "2 caractères minimum").max(50),
  slug: z.string().min(2, "2 caractères minimum").max(50),
});

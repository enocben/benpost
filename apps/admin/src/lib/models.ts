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
  cover_image_url: z.string().optional(),
  seo_title: z.string().optional(),
  seo_description: z.string().optional(),
});

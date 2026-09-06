import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, Loader2, Save } from "lucide-react";

import { slugify } from "@/lib/utils";
import {
  useCategories,
  useCreatePost,
  usePost,
  useUpdatePost,
  statusLabels,
} from "@/hooks/api";
import type { PostStatus } from "@/types";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const postSchema = z.object({
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

type PostForm = z.infer<typeof postSchema>;

const emptyForm: PostForm = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  status: "draft",
  category_id: "",
  cover_image_url: "",
  seo_title: "",
  seo_description: "",
};

export default function PostEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const { data: categories = [] } = useCategories();
  const { data: post, isLoading } = usePost(id);
  const createPost = useCreatePost();
  const updatePost = useUpdatePost();
  const saving = createPost.isPending || updatePost.isPending;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<PostForm>({
    resolver: zodResolver(postSchema),
    defaultValues: emptyForm,
  });

  // Slug auto-généré depuis le titre tant que l'utilisateur ne l'a pas édité
  const slugTouched = useRef(false);
  const title = watch("title");
  useEffect(() => {
    if (!slugTouched.current) {
      setValue("slug", slugify(title ?? ""), { shouldDirty: false });
    }
  }, [title, setValue]);

  // En édition, pré-remplit le formulaire une fois l'article chargé
  const loadedId = useRef<string | null>(null);
  useEffect(() => {
    if (post && loadedId.current !== post.id) {
      loadedId.current = post.id;
      slugTouched.current = true;
      reset({
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt ?? "",
        content: post.content,
        status: post.status,
        category_id: post.category_id ?? "",
        cover_image_url: post.cover_image_url ?? "",
        seo_title: post.seo_title ?? "",
        seo_description: post.seo_description ?? "",
      });
    }
  }, [post, reset]);

  function onSubmit(values: PostForm) {
    const input = {
      ...values,
      category_id: values.category_id || undefined,
      cover_image_url: values.cover_image_url || undefined,
      excerpt: values.excerpt || undefined,
      seo_title: values.seo_title || undefined,
      seo_description: values.seo_description || undefined,
    };
    if (isEdit && id) {
      updatePost.mutate(
        { id, input },
        { onSuccess: () => navigate("/posts") }
      );
    } else {
      createPost.mutate(input, { onSuccess: () => navigate("/posts") });
    }
  }

  if (isEdit && isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEdit ? "Modifier l'article" : "Nouvel article"}
        description={
          isEdit
            ? "Les modifications sont enregistrées via l'API Benpost"
            : "Rédigez un nouvel article pour votre blog"
        }
        actions={
          <Button variant="outline" asChild>
            <Link to="/posts">
              <ArrowLeft />
              Retour
            </Link>
          </Button>
        }
      />

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid items-start gap-6 lg:grid-cols-[1fr_320px]"
      >
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contenu</CardTitle>
              <CardDescription>
                Le corps de l'article, en Markdown
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Titre</Label>
                <Input
                  id="title"
                  placeholder="Mon superbe article"
                  {...register("title")}
                />
                {errors.title && (
                  <p className="text-destructive text-xs">
                    {errors.title.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-sm">/</span>
                  <Input
                    id="slug"
                    placeholder="mon-superbe-article"
                    {...register("slug", {
                      onChange: () => {
                        slugTouched.current = true;
                      },
                    })}
                  />
                </div>
                {errors.slug && (
                  <p className="text-destructive text-xs">
                    {errors.slug.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="excerpt">Extrait</Label>
                <Textarea
                  id="excerpt"
                  placeholder="Court résumé affiché dans les listes d'articles"
                  rows={3}
                  {...register("excerpt")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Contenu</Label>
                <Textarea
                  id="content"
                  placeholder="# Titre&#10;&#10;Écrivez votre article en Markdown…"
                  rows={16}
                  className="font-mono text-sm"
                  {...register("content")}
                />
                {errors.content && (
                  <p className="text-destructive text-xs">
                    {errors.content.message}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>SEO</CardTitle>
              <CardDescription>
                Optimisez le référencement de l'article
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="seo_title">Titre SEO</Label>
                <Input
                  id="seo_title"
                  placeholder="Titre affiché dans les moteurs de recherche"
                  {...register("seo_title")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seo_description">Description SEO</Label>
                <Textarea
                  id="seo_description"
                  placeholder="Meta-description de l'article (≈ 160 caractères)"
                  rows={3}
                  {...register("seo_description")}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Publication</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="status">Statut</Label>
                <Select
                  value={watch("status")}
                  onValueChange={(value) =>
                    setValue("status", value as PostStatus, {
                      shouldDirty: true,
                    })
                  }
                >
                  <SelectTrigger id="status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(statusLabels) as PostStatus[]).map(
                      (status) => (
                        <SelectItem key={status} value={status}>
                          {statusLabels[status]}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Catégorie</Label>
                <Select
                  value={watch("category_id") || "none"}
                  onValueChange={(value) =>
                    setValue("category_id", value === "none" ? "" : value, {
                      shouldDirty: true,
                    })
                  }
                >
                  <SelectTrigger id="category" className="w-full">
                    <SelectValue placeholder="Sans catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sans catégorie</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cover_image_url">Image de couverture (URL)</Label>
                <Input
                  id="cover_image_url"
                  placeholder="https://…"
                  {...register("cover_image_url")}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : <Save />}
              {saving
                ? "Enregistrement…"
                : isEdit
                  ? "Enregistrer les modifications"
                  : "Créer l'article"}
            </Button>
            {isEdit && !isDirty && (
              <p className="text-muted-foreground text-center text-xs">
                Aucune modification non enregistrée
              </p>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

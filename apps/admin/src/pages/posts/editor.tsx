import React, {useEffect, useRef, useState} from "react";
import {useTheme} from "@/lib/theme";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {z} from "zod";
import {Link, useNavigate, useParams} from "react-router";
import {ArrowLeft, Loader2, Save} from "lucide-react";

import {slugify} from "@/lib/utils";
import {API_BASE} from "@/lib/api";
import {
  useCategories,
  useCreatePost,
  usePost,
  useUpdatePost,
  statusLabels,
} from "@/hooks/api";
import type {PostStatus} from "@/types";
import {PageHeader} from "@/components/page-header";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Textarea} from "@/components/ui/textarea";
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
import {Skeleton} from "@/components/ui/skeleton";
import {
  MDXEditor,
  headingsPlugin,
  type MDXEditorMethods,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
  UndoRedo,
  BoldItalicUnderlineToggles,
  linkDialogPlugin,
  imagePlugin,
  linkPlugin,
  tablePlugin,
  markdownShortcutPlugin,
  BlockTypeSelect,
  CreateLink,
  InsertImage,
  InsertTable,
  ListsToggle,
  codeBlockPlugin,
  InsertCodeBlock,
  diffSourcePlugin,
  DiffSourceToggleWrapper,
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import {postSchema} from "@/lib/models";




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
  const {id} = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const markdownRef = useRef<MDXEditorMethods>(null)
  const { theme } = useTheme();

  const {data: categories = []} = useCategories();
  const {data: post, isLoading} = usePost(id);
  const createPost = useCreatePost();
  const updatePost = useUpdatePost();
  const saving = createPost.isPending || updatePost.isPending;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: {errors, isDirty},
  } = useForm<PostForm>({
    resolver: zodResolver(postSchema),
    defaultValues: emptyForm,
  });

  // Slug auto-généré depuis le titre tant que l'utilisateur ne l'a pas édité
  const slugTouched = useRef(false);
  const title = watch("title");
  useEffect(() => {
    if (!slugTouched.current) {
      setValue("slug", slugify(title ?? ""), {shouldDirty: false});
    }
  }, [title, setValue]);

  // Aperçu de l'image de couverture :
  // - création : aperçu local du fichier choisi
  // - édition : image stockée servie par /files/, ou URL externe
  const coverValue = watch("cover_image_url");
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  useEffect(() => {
    if (coverValue instanceof FileList && coverValue.length > 0) {
      const url = URL.createObjectURL(coverValue.item(0)!);
      setLocalPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setLocalPreview(null);
  }, [coverValue]);

  const coverPreviewSrc =
    localPreview ??
    (typeof coverValue === "string" && coverValue
      ? coverValue.startsWith("http")
        ? coverValue
        : `${API_BASE}/files/${coverValue}`
      : null);

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
      setTimeout(() => {
        markdownRef.current?.setMarkdown(post.content);
      }, 0);
    }
  }, [post, reset]);

  function onSubmit(values: PostForm) {
    const {cover_image_url, ...rest} = values;
    const optional = {
      category_id: values.category_id || undefined,
      excerpt: values.excerpt || undefined,
      seo_title: values.seo_title || undefined,
      seo_description: values.seo_description || undefined,
    };
    if (isEdit && id) {
      // L'édition conserve une URL d'image (l'API PUT accepte une string)
      updatePost.mutate(
        {
          id,
          input: {
            ...rest,
            ...optional,
            cover_image_url:
              typeof cover_image_url === "string" && cover_image_url
                ? cover_image_url
                : undefined,
          },
        },
        {onSuccess: () => navigate("/posts")}
      );
    } else {
      // La création envoie l'image de couverture comme fichier (multipart)
      const coverFile =
        cover_image_url instanceof FileList
          ? cover_image_url.item(0) ?? undefined
          : undefined;
      createPost.mutate(
        {...rest, ...optional, cover_image_url: coverFile},
        {onSuccess: () => navigate("/posts")}
      );
    }
  }

  async function handleFormSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    // Synchroniser le contenu de l'éditeur vers le formulaire AVANT la validation
    const content = markdownRef.current?.getMarkdown() ?? "";
    setValue("content", content, { shouldValidate: true, shouldDirty: true });
    // Déclencher la validation + soumission
    await handleSubmit(onSubmit)();
  }

  if (isEdit && isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64"/>
        <div className="flex flex-col gap-6">
          <Skeleton className="h-96 w-full"/>
          <Skeleton className="h-64 w-full"/>
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
              <ArrowLeft/>
              Retour
            </Link>
          </Button>
        }
      />

      <form
        onSubmit={handleFormSubmit}
        className="flex flex-col gap-6"
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
                <div className="border rounded-md overflow-hidden">
                  <MDXEditor
                    markdown={post?.content || ""}
                    onChange={(markdown) => setValue("content", markdown, { shouldDirty: true, shouldValidate: true })}
                    plugins={[
                      headingsPlugin(),
                      listsPlugin(),
                      quotePlugin(),
                      thematicBreakPlugin(),
                      linkPlugin(),
                      linkDialogPlugin(),
                      tablePlugin(),
                      markdownShortcutPlugin(),
                      imagePlugin({
                        imageUploadHandler: () => {
                          return Promise.resolve('https://picsum.photos/200/300')
                        },
                        imageAutocompleteSuggestions: ['https://picsum.photos/200/300', 'https://picsum.photos/200']
                      }),
                      codeBlockPlugin({ defaultCodeBlockLanguage: "bash" }),
                      diffSourcePlugin({ viewMode: "rich-text" }),
                      toolbarPlugin({
                        toolbarClassName: 'toolbar',
                        toolbarPosition: 'top',
                        toolbarContents: () => (
                          <DiffSourceToggleWrapper>
                            <div className="flex flex-wrap gap-2 items-center">
                              <UndoRedo/>
                              <div className="w-px h-4 bg-border mx-1" />
                              <BlockTypeSelect />
                              <BoldItalicUnderlineToggles/>
                              <div className="w-px h-4 bg-border mx-1" />
                              <ListsToggle />
                              <div className="w-px h-4 bg-border mx-1" />
                              <CreateLink />
                              <InsertImage />
                              <InsertTable />
                              <InsertCodeBlock />
                            </div>
                          </DiffSourceToggleWrapper>
                        )
                      })
                    ]}
                    ref={markdownRef}
                    className={theme === "dark" ? "dark-theme dark-editor" : ""}
                    contentEditableClassName="min-h-[400px] p-4 prose prose-sm dark:prose-invert max-w-none"
                  />
                </div>
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
                    <SelectValue/>
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
                    <SelectValue placeholder="Sans catégorie"/>
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
                <Label htmlFor="cover_image_url">
                  {isEdit ? "Image de couverture (URL)" : "Image de couverture"}
                </Label>
                {isEdit ? (
                  <Input
                    id="cover_image_url"
                    placeholder="https://…"
                    {...register("cover_image_url")}
                  />
                ) : (
                  <Input
                    id="cover_image_url"
                    type="file"
                    accept="image/*"
                    {...register("cover_image_url")}
                  />
                )}
                {coverPreviewSrc && (
                  <img
                    src={coverPreviewSrc}
                    alt="Aperçu de l'image de couverture"
                    className="max-h-48 w-auto rounded-md border object-cover"
                  />
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2">
            <Button type="submit">
              {saving ? <Loader2 className="animate-spin"/> : <Save/>}
              {saving
                ? "Enregistrement…"
                : isEdit
                  ? "Enregistrer les modifications"
                  : "Créer l'article"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

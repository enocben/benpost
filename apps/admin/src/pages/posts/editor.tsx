import React, {useEffect, useRef, useState} from "react";
import {useTheme} from "@/lib/theme";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {z} from "zod";
import {useNavigate, useParams} from "react-router";
import {Loader2, Save} from "lucide-react";

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
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Textarea} from "@/components/ui/textarea";
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
  const {theme} = useTheme();

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
      if (cover_image_url instanceof FileList && cover_image_url.length > 0) {
        // Nouvelle image : envoi en multipart, l'API remplace l'ancienne (y compris dans le stockage)
        const form = new FormData();
        for (const [key, value] of Object.entries({...rest, ...optional})) {
          if (value !== undefined && value !== "") {
            form.append(key, value as string);
          }
        }
        form.append("cover_image_url", cover_image_url.item(0)!);
        updatePost.mutate(
          {id, input: form},
          {onSuccess: () => navigate("/posts")}
        );
      } else {
        // Pas de nouvelle image : JSON, l'image existante est conservée
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
      }
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
    setValue("content", content, {shouldValidate: true, shouldDirty: true});
    // Déclencher la validation + soumission
    await handleSubmit(onSubmit)();
  }

  // Aperçu de l'image de couverture :
  // - création : aperçu local du fichier choisi
  // - édition : image stockée servie par /files/, ou URL externe
  const coverValue = watch("cover_image_url");
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  // Champ fichier caché, ouvert en cliquant sur l'image (ou le cadre pointillé)
  const {ref: coverRegisterRef, ...coverRegisterRest} = register("cover_image_url");
  const coverInputRef = useRef<HTMLInputElement | null>(null);

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

  const borderless =
    "h-auto border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 dark:bg-transparent";

  return (
    <div className="mx-auto w-full max-w-3xl">
      <form onSubmit={handleFormSubmit} className="flex flex-col gap-3">
        {/* Titre + enregistrement sur la même ligne */}
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <Input
              id="title"
              placeholder="Titre de l'article"
              className={`${borderless} text-3xl font-bold md:text-4xl placeholder:text-muted-foreground/40`}
              {...register("title")}
            />
            {errors.title && (
              <p className="text-destructive text-xs">
                {errors.title.message}
              </p>
            )}
          </div>
          <Button type="submit" className="shrink-0">
            {saving ? <Loader2 className="animate-spin"/> : <Save/>}
            {saving
              ? "Enregistrement…"
              : isEdit
                ? "Enregistrer"
                : "Créer l'article"}
          </Button>
        </div>


        <input
          id="cover_image_input"
          type="file"
          accept="image/*"
          className="hidden"
          ref={(el) => {
            coverRegisterRef(el);
            coverInputRef.current = el;
          }}
          {...coverRegisterRest}
        />
        {coverPreviewSrc ? (
          <button
            type="button"
            onClick={() => coverInputRef.current?.click()}
            className="group relative block w-full cursor-pointer overflow-hidden rounded-xl"
            title="Cliquer pour changer l'image de couverture"
          >
            <img
              src={coverPreviewSrc}
              alt="Image de couverture de l'article"
              className="max-h-128 w-full object-contain"
            />
            <span
              className="absolute inset-0 hidden items-center justify-center bg-black/50 text-sm font-medium text-white group-hover:flex">
              Changer l'image
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => coverInputRef.current?.click()}
            className="flex h-40 w-full cursor-pointer items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground hover:bg-muted/40"
          >
            Cliquer pour ajouter une image de couverture
          </button>
        )}


        {/* Contenu */}
        <div>
          <MDXEditor
            markdown={post?.content || ""}
            onChange={(markdown) => setValue("content", markdown, {shouldDirty: true, shouldValidate: true})}
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
              codeBlockPlugin({defaultCodeBlockLanguage: "bash"}),
              diffSourcePlugin({viewMode: "rich-text"}),
              toolbarPlugin({
                toolbarClassName: 'toolbar',
                toolbarPosition: 'top',
                toolbarContents: () => (
                  <DiffSourceToggleWrapper>
                    <div className="flex flex-wrap gap-2 items-center">
                      <UndoRedo/>
                      <div className="w-px h-4 bg-border mx-1"/>
                      <BlockTypeSelect/>
                      <BoldItalicUnderlineToggles/>
                      <div className="w-px h-4 bg-border mx-1"/>
                      <ListsToggle/>
                      <div className="w-px h-4 bg-border mx-1"/>
                      <CreateLink/>
                      <InsertImage/>
                      <InsertTable/>
                      <InsertCodeBlock/>
                    </div>
                  </DiffSourceToggleWrapper>
                )
              })
            ]}
            ref={markdownRef}
            className={theme === "dark" ? "dark-theme dark-editor" : ""}
            contentEditableClassName="min-h-[400px] p-4 prose prose-sm dark:prose-invert max-w-none"
          />
          {errors.content && (
            <p className="text-destructive text-xs">
              {errors.content.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          {/* Panneau de propriétés, comme le frontmatter Obsidian */}
          <div className="grid gap-x-1 gap-y-1 rounded-lg bg-muted/40 px-4 py-3 sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <Label
                htmlFor="slug"
                className="w-16 shrink-0 text-xs text-muted-foreground"
              >
                Slug
              </Label>
              <Input
                id="slug"
                placeholder="mon-superbe-article"
                className={`text-sm pl-2 pr-2`}
                {...register("slug", {
                  onChange: () => {
                    slugTouched.current = true;
                  },
                })}
              />
            </div>
            {errors.slug && (
              <p className="text-destructive text-xs sm:col-span-2">
                {errors.slug.message}
              </p>
            )}

            <div className="flex items-center">
              <Label className="w-18 shrink-0 text-xs text-muted-foreground">
                Statut
              </Label>
              <Select
                value={watch("status")}
                onValueChange={(value) =>
                  setValue("status", value as PostStatus, {
                    shouldDirty: true,
                  })
                }
              >
                <SelectTrigger
                  id="status"
                  className="h-8 w-full border-0 bg-transparent pl-2 pr-2 shadow-none focus:ring-0"
                >
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

            <div className="flex items-center">
              <Label className="w-18 shrink-0 text-xs text-muted-foreground">
                Catégorie
              </Label>
              <Select
                value={watch("category_id") || "none"}
                onValueChange={(value) =>
                  setValue("category_id", value === "none" ? "" : value, {
                    shouldDirty: true,
                  })
                }
              >
                <SelectTrigger
                  id="category"
                  className="h-8 w-full border-0 bg-transparent pr-2 pl-2 shadow-none focus:ring-0"
                >
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
          </div>

          {/* SEO, replié par défaut */}
          <details className="rounded-lg bg-muted/40 px-4 py-3">
            <summary className="cursor-pointer select-none text-sm font-medium text-muted-foreground">
              SEO
            </summary>
            <div className="mt-3 space-y-3">
              <div className="space-y-1">
                <Label
                  htmlFor="seo_title"
                  className="text-xs text-muted-foreground"
                >
                  Titre SEO
                </Label>
                <Input
                  id="seo_title"
                  placeholder="Titre affiché dans les moteurs de recherche"
                  {...register("seo_title")}
                />
              </div>
              <div className="space-y-1">
                <Label
                  htmlFor="seo_description"
                  className="text-xs text-muted-foreground"
                >
                  Description SEO
                </Label>
                <Textarea
                  id="seo_description"
                  placeholder="Meta-description de l'article (≈ 160 caractères)"
                  rows={2}
                  className="resize-none border-0 bg-transparent pl-2 pr-2 shadow-none focus-visible:ring-2"
                  {...register("seo_description")}
                />
              </div>
            </div>
          </details>
        </div>
      </form>
    </div>
  );
}

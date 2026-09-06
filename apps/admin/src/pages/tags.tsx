import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Plus, Tag, Trash2 } from "lucide-react";

import { slugify } from "@/lib/utils";
import { useCreateTag, useDeleteTag, useTags, useUpdateTag } from "@/hooks/api";
import type { Tag as TagType } from "@/types";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const tagSchema = z.object({
  name: z.string().min(2, "2 caractères minimum").max(50),
  slug: z.string().min(2, "2 caractères minimum").max(50),
});

type TagForm = z.infer<typeof tagSchema>;

export default function TagsPage() {
  const { data: tags = [], isLoading } = useTags();
  const createTag = useCreateTag();
  const updateTag = useUpdateTag();
  const deleteTag = useDeleteTag();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TagType | null>(null);
  const [tagToDelete, setTagToDelete] = useState<TagType | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TagForm>({
    resolver: zodResolver(tagSchema),
    defaultValues: { name: "", slug: "" },
  });

  const slugTouched = useRef(false);
  const name = watch("name");
  useEffect(() => {
    if (!slugTouched.current) {
      setValue("slug", slugify(name ?? ""));
    }
  }, [name, setValue]);

  function openCreate() {
    slugTouched.current = false;
    setEditing(null);
    reset({ name: "", slug: "" });
    setDialogOpen(true);
  }

  function openEdit(tag: TagType) {
    slugTouched.current = true;
    setEditing(tag);
    reset({ name: tag.name, slug: tag.slug });
    setDialogOpen(true);
  }

  function onSubmit(values: TagForm) {
    if (editing) {
      updateTag.mutate(
        { id: editing.id, input: values },
        { onSuccess: () => setDialogOpen(false) }
      );
    } else {
      createTag.mutate(values, { onSuccess: () => setDialogOpen(false) });
    }
  }

  const columns: ColumnDef<TagType, any>[] = [
    {
      accessorKey: "name",
      header: "Nom",
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-2 font-medium">
          <Tag className="text-muted-foreground size-3.5" />
          {row.original.name}
        </span>
      ),
    },
    {
      accessorKey: "slug",
      header: "Slug",
      cell: ({ row }) => (
        <span className="text-muted-foreground font-mono text-xs">
          /{row.original.slug}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              <MoreHorizontal />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => openEdit(row.original)}>
              <Pencil />
              Modifier
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setTagToDelete(row.original)}
            >
              <Trash2 />
              Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const saving = createTag.isPending || updateTag.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tags"
        description={`${tags.length} tag${tags.length > 1 ? "s" : ""}`}
        actions={
          <Button onClick={openCreate}>
            <Plus />
            Nouveau tag
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={tags}
        isLoading={isLoading}
        emptyLabel="Aucun tag — créez le premier !"
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier le tag" : "Nouveau tag"}</DialogTitle>
            <DialogDescription>
              Un tag court pour qualifier vos articles.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tag-name">Nom</Label>
              <Input id="tag-name" placeholder="React" {...register("name")} />
              {errors.name && (
                <p className="text-destructive text-xs">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="tag-slug">Slug</Label>
              <Input
                id="tag-slug"
                placeholder="react"
                {...register("slug", {
                  onChange: () => {
                    slugTouched.current = true;
                  },
                })}
              />
              {errors.slug && (
                <p className="text-destructive text-xs">{errors.slug.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={saving}>
                {editing ? "Enregistrer" : "Créer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={tagToDelete !== null}
        onOpenChange={(open) => !open && setTagToDelete(null)}
        title="Supprimer ce tag ?"
        description={
          <>
            Le tag <strong>« {tagToDelete?.name} »</strong> sera définitivement
            supprimé.
          </>
        }
        loading={deleteTag.isPending}
        onConfirm={() => {
          if (!tagToDelete) return;
          deleteTag.mutate(tagToDelete.id, {
            onSettled: () => setTagToDelete(null),
          });
        }}
      />
    </div>
  );
}

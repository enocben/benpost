import { useMemo, useState } from "react";
import { Link } from "react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";

import { formatDate } from "@/lib/utils";
import { useDeletePost, usePosts, statusLabels } from "@/hooks/api";
import type { PostListItem, PostStatus } from "@/types";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function PostsPage() {
  const { data: posts = [], isLoading } = usePosts();
  const deletePost = useDeletePost();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [postToDelete, setPostToDelete] = useState<PostListItem | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return posts.filter((post) => {
      const matchesQuery =
        query.length === 0 ||
        post.title.toLowerCase().includes(query) ||
        post.slug.toLowerCase().includes(query);
      const matchesStatus =
        statusFilter === "all" || post.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [posts, search, statusFilter]);

  const columns: ColumnDef<PostListItem, any>[] = [
    {
      accessorKey: "title",
      header: "Titre",
      cell: ({ row }) => (
        <div className="max-w-80">
          <Link
            to={`/posts/${row.original.id}/edit`}
            className="font-medium hover:text-primary hover:underline"
          >
            {row.original.title}
          </Link>
          <div className="text-muted-foreground truncate text-xs">
            /{row.original.slug}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Statut",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "category_name",
      header: "Catégorie",
      cell: ({ row }) =>
        row.original.category_name ? (
          <Badge variant="outline">{row.original.category_name}</Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: "author_name",
      header: "Auteur",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.author_name ?? row.original.author_email ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "created_at",
      header: "Créé le",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {formatDate(row.original.created_at)}
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
            <DropdownMenuItem asChild>
              <Link to={`/posts/${row.original.id}/edit`}>
                <Pencil />
                Modifier
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setPostToDelete(row.original)}
            >
              <Trash2 />
              Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Articles"
        description={`${posts.length} article${posts.length > 1 ? "s" : ""} au total`}
        actions={
          <Button asChild>
            <Link to="/posts/new">
              <Plus />
              Nouvel article
            </Link>
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
          <Input
            placeholder="Rechercher un article…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {(Object.keys(statusLabels) as PostStatus[]).map((status) => (
              <SelectItem key={status} value={status}>
                {statusLabels[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        emptyLabel={
          search || statusFilter !== "all"
            ? "Aucun article ne correspond à votre recherche"
            : "Aucun article — créez le premier !"
        }
      />

      <ConfirmDialog
        open={postToDelete !== null}
        onOpenChange={(open) => !open && setPostToDelete(null)}
        title="Supprimer cet article ?"
        description={
          <>
            L'article <strong>« {postToDelete?.title} »</strong> sera
            définitivement supprimé. Cette action est irréversible.
          </>
        }
        loading={deletePost.isPending}
        onConfirm={() => {
          if (!postToDelete) return;
          deletePost.mutate(postToDelete.id, {
            onSettled: () => setPostToDelete(null),
          });
        }}
      />
    </div>
  );
}

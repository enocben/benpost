import { useState } from "react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, ShieldCheck, Trash2, UserRound } from "lucide-react";

import { getSessionUser } from "@/lib/auth";
import { formatDate, initials } from "@/lib/utils";
import { roleLabels, useDeleteUser, useUpdateUserRole, useUsers } from "@/hooks/api";
import type { Role, User } from "@/types";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function RoleBadge({ role }: { role: Role }) {
  return role === "admin" ? (
    <Badge className="border-transparent bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400">
      <ShieldCheck />
      {roleLabels[role]}
    </Badge>
  ) : (
    <Badge variant="secondary">{roleLabels[role]}</Badge>
  );
}

export default function UsersPage() {
  const { data: users = [], isLoading } = useUsers();
  const updateUserRole = useUpdateUserRole();
  const deleteUser = useDeleteUser();
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const currentUser = getSessionUser();

  function changeRole(user: User, role: Role) {
    if (user.id === currentUser?.id) {
      toast.error("Vous ne pouvez pas modifier votre propre rôle.");
      return;
    }
    updateUserRole.mutate({ id: user.id, role });
  }

  const columns: ColumnDef<User, any>[] = [
    {
      accessorKey: "name",
      header: "Utilisateur",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <span className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
            {initials(row.original.name ?? row.original.email)}
          </span>
          <div className="min-w-0">
            <div className="font-medium">
              {row.original.name ?? "Sans nom"}
            </div>
            <div className="text-muted-foreground truncate text-xs">
              {row.original.email}
            </div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "role",
      header: "Rôle",
      cell: ({ row }) => <RoleBadge role={row.original.role} />,
    },
    {
      accessorKey: "created_at",
      header: "Inscrit le",
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
      cell: ({ row }) => {
        const isSelf = row.original.id === currentUser?.id;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreHorizontal />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Changer le rôle</DropdownMenuLabel>
              <DropdownMenuItem
                disabled={isSelf || row.original.role === "admin"}
                onClick={() => changeRole(row.original, "admin")}
              >
                <ShieldCheck />
                Promouvoir administrateur
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={isSelf || row.original.role === "editor"}
                onClick={() => changeRole(row.original, "editor")}
              >
                <UserRound />
                Rétrograder éditeur
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                disabled={isSelf}
                onClick={() => setUserToDelete(row.original)}
              >
                <Trash2 />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Utilisateurs"
        description={`${users.length} utilisateur${users.length > 1 ? "s" : ""} inscrit${users.length > 1 ? "s" : ""}`}
      />

      <DataTable
        columns={columns}
        data={users}
        isLoading={isLoading}
        emptyLabel="Aucun utilisateur"
      />

      <ConfirmDialog
        open={userToDelete !== null}
        onOpenChange={(open) => !open && setUserToDelete(null)}
        title="Supprimer cet utilisateur ?"
        description={
          <>
            Le compte <strong>« {userToDelete?.email} »</strong> sera
            définitivement supprimé, ainsi que tous ses articles.
          </>
        }
        loading={deleteUser.isPending}
        onConfirm={() => {
          if (!userToDelete) return;
          deleteUser.mutate(userToDelete.id, {
            onSettled: () => setUserToDelete(null),
          });
        }}
      />
    </div>
  );
}

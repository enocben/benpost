import { Link } from "react-router";
import { FileText, FolderOpen, Plus, Tags, Users } from "lucide-react";

import { formatDate } from "@/lib/utils";
import {
  useCategories,
  usePosts,
  useTags,
  useUsers,
} from "@/hooks/api";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const postsQuery = usePosts();
  const usersQuery = useUsers();
  const categoriesQuery = useCategories();
  const tagsQuery = useTags();

  const posts = postsQuery.data ?? [];
  const published = posts.filter((p) => p.status === "published").length;
  const drafts = posts.filter((p) => p.status === "draft").length;
  const recentPosts = [...posts]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Vue d'ensemble de votre blog"
        actions={
          <Button asChild>
            <Link to="/posts/new">
              <Plus />
              Nouvel article
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title="Articles"
          value={posts.length}
          hint={`${published} publiés · ${drafts} brouillons`}
          icon={FileText}
          isLoading={postsQuery.isLoading}
        />
        <StatCard
          title="Utilisateurs"
          value={usersQuery.data?.length}
          icon={Users}
          isLoading={usersQuery.isLoading}
        />
        <StatCard
          title="Catégories"
          value={categoriesQuery.data?.length}
          icon={FolderOpen}
          isLoading={categoriesQuery.isLoading}
        />
        <StatCard
          title="Tags"
          value={tagsQuery.data?.length}
          icon={Tags}
          isLoading={tagsQuery.isLoading}
          className="sm:col-span-2 xl:col-span-1"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Derniers articles</CardTitle>
          <CardDescription>
            Les 5 articles les plus récemment créés
          </CardDescription>
        </CardHeader>
        <CardContent>
          {postsQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : recentPosts.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              Aucun article pour le moment.{" "}
              <Link to="/posts/new" className="text-primary underline-offset-4 hover:underline">
                Créez le premier
              </Link>
              .
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Titre</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Auteur</TableHead>
                  <TableHead>Créé le</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentPosts.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell className="font-medium">
                      <Link
                        to={`/posts/${post.id}/edit`}
                        className="hover:text-primary hover:underline"
                      >
                        {post.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={post.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {post.author_name ?? post.author_email ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(post.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

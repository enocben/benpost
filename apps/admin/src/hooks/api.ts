import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type {
  Category,
  Post,
  PostCreateInput,
  PostInput,
  PostListItem,
  PostStatus,
  Role,
  Tag,
  User,
} from "@/types";

export const keys = {
  posts: ["posts"] as const,
  post: (id: string) => ["posts", id] as const,
  categories: ["categories"] as const,
  tags: ["tags"] as const,
  users: ["users"] as const,
};

// ----------------------
// QUERIES
// ----------------------

export function usePosts() {
  return useQuery({
    queryKey: keys.posts,
    queryFn: () => api.get<PostListItem[]>("/posts"),
  });
}

export function usePost(id: string | undefined) {
  return useQuery({
    queryKey: keys.post(id ?? ""),
    queryFn: () => api.get<Post>(`/posts/${id}`),
    enabled: Boolean(id),
  });
}

export function useCategories() {
  return useQuery({
    queryKey: keys.categories,
    queryFn: () => api.get<Category[]>("/categories"),
  });
}

export function useTags() {
  return useQuery({
    queryKey: keys.tags,
    queryFn: () => api.get<Tag[]>("/tags"),
  });
}

export function useUsers() {
  return useQuery({
    queryKey: keys.users,
    queryFn: () => api.get<User[]>("/users"),
  });
}

// ----------------------
// POSTS
// ----------------------

// La création attend du multipart/form-data (l'image de couverture est un fichier)
function toFormData(input: PostCreateInput): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === "") continue;
    form.append(key, value as string | File);
  }
  return form;
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PostCreateInput) =>
      api.post<Post>("/posts", toFormData(input)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: keys.posts });
      toast.success("Article créé avec succès");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpdatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<PostInput> }) =>
      api.put<Post>(`/posts/${id}`, input),
    onSuccess: async (post) => {
      await queryClient.invalidateQueries({ queryKey: keys.posts });
      await queryClient.invalidateQueries({ queryKey: keys.post(post.id) });
      toast.success("Article mis à jour");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/posts/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: keys.posts });
      toast.success("Article supprimé");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

// ----------------------
// CATEGORIES
// ----------------------

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; slug: string; description?: string }) =>
      api.post<Category>("/categories", input),
    onSuccess: async() => {
      await queryClient.invalidateQueries({ queryKey: keys.categories });
      toast.success("Catégorie créée");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: { name?: string; slug?: string; description?: string };
    }) => api.put<Category>(`/categories/${id}`, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: keys.categories });
      toast.success("Catégorie mise à jour");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/categories/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: keys.categories });
      toast.success("Catégorie supprimée");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

// ----------------------
// TAGS
// ----------------------

export function useCreateTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; slug: string }) =>
      api.post<Tag>("/tags", input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: keys.tags });
      toast.success("Tag créé");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpdateTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: { name?: string; slug?: string };
    }) => api.put<Tag>(`/tags/${id}`, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: keys.tags });
      toast.success("Tag mis à jour");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/tags/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: keys.tags });
      toast.success("Tag supprimé");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

// ----------------------
// USERS
// ----------------------

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) =>
      api.put<User>(`/users/${id}/role`, { role }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: keys.users });
      toast.success("Rôle mis à jour");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/users/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: keys.users });
      toast.success("Utilisateur supprimé");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

// ----------------------
// Helpers UI
// ----------------------

export const statusLabels: Record<PostStatus, string> = {
  draft: "Brouillon",
  published: "Publié",
  archived: "Archivé",
};

export const roleLabels: Record<Role, string> = {
  admin: "Administrateur",
  editor: "Éditeur",
};

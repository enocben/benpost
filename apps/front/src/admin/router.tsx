import { createBrowserRouter, Navigate } from "react-router";
import type { ReactNode } from "react";

import { getToken } from "@/admin/lib/auth";
import { AppLayout } from "@/admin/components/layout/app-layout";
import LoginPage from "@/admin/pages/login";
import DashboardPage from "@/admin/pages/dashboard";
import PostsPage from "@/admin/pages/posts";
import PostEditorPage from "@/admin/pages/posts/editor";
import CategoriesPage from "@/admin/pages/categories";
import TagsPage from "@/admin/pages/tags";
import UsersPage from "@/admin/pages/users";
import NotFoundPage from "@/admin/pages/not-found";

function RequireAuth({ children }: { children: ReactNode }) {
  if (!getToken()) {
    return <Navigate to="/admin/login" replace />;
  }
  return <>{children}</>;
}

function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  if (getToken()) {
    return <Navigate to="/admin" replace />;
  }
  return <>{children}</>;
}

export const router = createBrowserRouter([
  {
    path: "/admin/login",
    element: (
      <RedirectIfAuthenticated>
        <LoginPage />
      </RedirectIfAuthenticated>
    ),
  },
  {
    path: "/admin",
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "posts", element: <PostsPage /> },
      { path: "posts/new", element: <PostEditorPage /> },
      { path: "posts/:id/edit", element: <PostEditorPage /> },
      { path: "categories", element: <CategoriesPage /> },
      { path: "tags", element: <TagsPage /> },
      { path: "users", element: <UsersPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);

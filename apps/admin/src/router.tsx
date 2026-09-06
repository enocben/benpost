import { createBrowserRouter, Navigate } from "react-router";
import type { ReactNode } from "react";

import { getToken } from "@/lib/auth";
import { AppLayout } from "@/components/layout/app-layout";
import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import PostsPage from "@/pages/posts";
import PostEditorPage from "@/pages/posts/editor";
import CategoriesPage from "@/pages/categories";
import TagsPage from "@/pages/tags";
import UsersPage from "@/pages/users";
import NotFoundPage from "@/pages/not-found";

function RequireAuth({ children }: { children: ReactNode }) {
  if (!getToken()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  if (getToken()) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export const router = createBrowserRouter([
  {
    path: "/login",
    element: (
      <RedirectIfAuthenticated>
        <LoginPage />
      </RedirectIfAuthenticated>
    ),
  },
  {
    path: "/",
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

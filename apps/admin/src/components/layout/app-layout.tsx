import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router";

import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/posts": "Articles",
  "/categories": "Catégories",
  "/tags": "Tags",
  "/users": "Utilisateurs",
};

function resolveTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  if (pathname.startsWith("/posts/new")) return "Nouvel article";
  if (/^\/posts\/[^/]+\/edit$/.test(pathname)) return "Modifier l'article";
  return "Admin";
}

export function AppLayout() {
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("benpost.sidebar") === "collapsed";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(
        "benpost.sidebar",
        collapsed ? "collapsed" : "expanded"
      );
    } catch {
      // ignore
    }
  }, [collapsed]);

  return (
    <div className="flex min-h-dvh">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={resolveTitle(pathname)} />
        <main className="bg-muted/40 flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

import { NavLink } from "react-router";
import {
  FolderOpen,
  LayoutDashboard,
  Newspaper,
  PanelLeftClose,
  PanelLeftOpen,
  Tags,
  Users,
  FileText,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/posts", label: "Articles", icon: FileText },
  { to: "/categories", label: "Catégories", icon: FolderOpen },
  { to: "/tags", label: "Tags", icon: Tags },
  { to: "/users", label: "Utilisateurs", icon: Users },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  return (
    <aside
      data-collapsed={collapsed}
      className={cn(
        "bg-sidebar text-sidebar-foreground border-sidebar-border sticky top-0 z-30 hidden h-dvh shrink-0 border-r transition-[width] duration-200 md:flex md:flex-col",
        collapsed ? "w-[3.5rem]" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 border-b px-3">
        <div className="bg-primary text-primary-foreground flex size-7 shrink-0 items-center justify-center rounded-lg">
          <Newspaper className="size-4" />
        </div>
        {!collapsed && <span className="font-semibold">Benpost</span>}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="ml-auto size-8"
          aria-label={collapsed ? "Déplier le menu" : "Replier le menu"}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4" />
          ) : (
            <PanelLeftClose className="size-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 p-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              cn(
                "flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              )
            }
          >
            <item.icon className="size-4 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Pied */}
      <div className="border-t p-2">
        <a
          href="http://localhost:4321"
          target="_blank"
          rel="noreferrer"
          title="Voir le blog"
          className="text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium"
        >
          <Newspaper className="size-4 shrink-0" />
          {!collapsed && <span>Voir le blog</span>}
        </a>
        {!collapsed && (
          <div className="text-muted-foreground mt-2 hidden px-2.5 md:block">
            <Badge variant="outline" className="text-[10px]">
              v0.1
            </Badge>
          </div>
        )}
      </div>
    </aside>
  );
}

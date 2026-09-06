import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Moon, Sun, UserRound } from "lucide-react";

import { clearSession, getSessionUser } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { initials } from "@/lib/utils";
import { roleLabels } from "@/hooks/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Topbar({ title }: { title: string }) {
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = getSessionUser();

  function handleLogout() {
    clearSession();
    queryClient.clear();
    navigate("/login", { replace: true });
  }

  return (
    <header className="bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-20 flex h-14 items-center gap-3 border-b px-4 backdrop-blur md:px-6">
      <h2 className="text-sm font-medium">{title}</h2>

      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          aria-label="Changer de thème"
        >
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 px-2">
              <span className="bg-primary/10 text-primary flex size-7 items-center justify-center rounded-full text-xs font-semibold">
                {initials(user?.email || user?.name)}
              </span>
              <span className="hidden text-sm font-medium sm:inline">
                {user?.email || "Utilisateur"}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span className="truncate">{user?.email || "Utilisateur"}</span>
            </DropdownMenuLabel>
            <div className="px-2 pb-1.5">
              <Badge variant="secondary">
                {roleLabels[user?.role as "admin" | "editor"] ?? user?.role}
              </Badge>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              <UserRound />
              Mon profil
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={handleLogout}
            >
              <LogOut />
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

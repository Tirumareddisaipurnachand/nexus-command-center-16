import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Brain,
  Briefcase,
  FolderKanban,
  LayoutDashboard,
  ListChecks,
  Layers,
  LogOut,
  Menu,
  Timer,
  UserRound,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/tasks", label: "Tasks", icon: ListChecks },
  { to: "/study", label: "Study", icon: Timer },
  { to: "/materials", label: "Materials", icon: BookOpen },
  { to: "/quizzes", label: "Quizzes", icon: Brain },
  { to: "/flashcards", label: "Flashcards", icon: Layers },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/internships", label: "Internships", icon: Briefcase },
  { to: "/profile", label: "Profile", icon: UserRound },
] as const;

export function AppShell({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background lg:flex">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-5 py-6">
          <Link to="/dashboard" className="font-display text-lg font-bold tracking-tight">
            Nexus<span className="text-sidebar-primary">.</span>
          </Link>
          <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-foreground/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <main className="flex-1">
        <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-4 sm:px-8">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xl font-bold sm:text-2xl">{title}</h1>
              {description && (
                <p className="truncate text-sm text-muted-foreground">{description}</p>
              )}
            </div>
            {action}
          </div>
        </header>
        <div className="px-4 py-6 sm:px-8">{children}</div>
      </main>
    </div>
  );
}

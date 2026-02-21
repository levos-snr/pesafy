import {
  ChevronRight,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  User,
  Webhook,
  X,
  Zap,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const NAV = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/payments", label: "Payments", icon: CreditCard },
  { path: "/webhooks", label: "Webhooks", icon: Webhook },
  { path: "/settings", label: "Settings", icon: Settings },
  { path: "/account", label: "Account", icon: User },
];

interface LayoutProps {
  children: ReactNode;
  user?: { name?: string | null; email?: string | null } | null;
}

export default function Layout({ children, user }: LayoutProps) {
  const [open, setOpen] = useState(false);
  const loc = useLocation();

  const signOut = async () => {
    await authClient.signOut();
    window.location.reload();
  };

  const initials = (user?.name?.[0] ?? user?.email?.[0] ?? "U").toUpperCase();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {open && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-20 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 flex w-56 flex-col bg-sidebar border-r border-sidebar-border transition-transform duration-300 ease-out lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary shadow-lg shadow-primary/30">
            <Zap className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-display text-base font-bold tracking-tight text-foreground">
            Pesafy
          </span>
          <button
            type="button"
            aria-label="Close"
            className="ml-auto rounded p-1 text-muted-foreground hover:text-foreground lg:hidden"
            onClick={() => setOpen(false)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {NAV.map(({ path, label, icon: Icon }) => {
            const active = loc.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                onClick={() => setOpen(false)}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                  active
                    ? "bg-primary/12 text-primary"
                    : "text-sidebar-foreground/55 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                <Icon
                  className="h-[15px] w-[15px] shrink-0"
                  strokeWidth={active ? 2.5 : 2}
                />
                {label}
                {active && (
                  <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-40" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="border-t border-sidebar-border p-2">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold font-display">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium leading-tight text-foreground">
                {user?.name ?? "User"}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {user?.email}
              </p>
            </div>
            <button
              type="button"
              onClick={signOut}
              title="Sign out"
              className="shrink-0 rounded p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Topbar */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/80 backdrop-blur-md px-4 lg:px-5">
          <button
            type="button"
            aria-label="Open menu"
            className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors lg:hidden"
            onClick={() => setOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-1 text-sm">
            <span className="text-muted-foreground/60">Pesafy</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30" />
            <span className="font-medium text-foreground capitalize">
              {loc.pathname === "/" ? "Dashboard" : loc.pathname.slice(1)}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Connected
            </div>
          </div>
        </header>

        {/* Page */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

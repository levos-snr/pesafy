import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ChevronRight,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Settings,
  User,
  Webhook,
  X,
  Zap,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Header from "@/components/Header";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import {
  backdrop,
  fadeUp,
  pageTransition,
  slideInLeft,
  stagger,
  staggerItem,
  tapSpring,
} from "@/lib/variants";

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const loc = useLocation();
  const shouldReduceMotion = useReducedMotion();

  const signOut = async () => {
    await authClient.signOut();
    window.location.reload();
  };

  const initials = (user?.name?.[0] ?? user?.email?.[0] ?? "U").toUpperCase();

  return (
    <div className="flex h-screen overflow-hidden bg-background transition-colors duration-300">
      {/* ── Mobile overlay — staging-dim-background ────────── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.button
            type="button"
            aria-label="Close menu"
            key="overlay"
            variants={shouldReduceMotion ? undefined : backdrop}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-20 bg-black/50 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <AnimatePresence>
        {/* Desktop: always visible via CSS, mobile: animated */}
      </AnimatePresence>

      {/* Sidebar — mobile animated, desktop static */}
      <motion.aside
        variants={shouldReduceMotion ? undefined : slideInLeft}
        initial={false} /* no entrance animation on desktop */
        animate={sidebarOpen || undefined}
        className={cn(
          "fixed inset-y-0 left-0 z-30 flex w-60 flex-col",
          "bg-sidebar border-r border-sidebar-border",
          "transition-transform duration-[280ms] ease-out" /* timing-under-300ms */,
          "lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <motion.div
          variants={shouldReduceMotion ? undefined : fadeUp}
          initial="hidden"
          animate="visible"
          className="flex h-14 shrink-0 items-center gap-2.5 border-b border-sidebar-border px-4"
        >
          <motion.div
            whileHover={{ rotate: [0, -12, 8, -4, 0], scale: 1.1 }}
            transition={{ duration: 0.45 }}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary shadow-lg shadow-primary/30"
          >
            <Zap className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
          </motion.div>
          <span className="font-display text-base font-bold tracking-tight text-sidebar-foreground">
            Pesafy
          </span>
          <motion.button
            type="button"
            aria-label="Close sidebar"
            onClick={() => setSidebarOpen(false)}
            {...tapSpring}
            className="ml-auto rounded-lg p-1.5 text-muted-foreground hover:text-foreground lg:hidden"
          >
            <X className="h-4 w-4" />
          </motion.button>
        </motion.div>

        {/* Nav */}
        <motion.nav
          variants={shouldReduceMotion ? undefined : stagger}
          initial="hidden"
          animate="visible"
          className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5"
          aria-label="Main navigation"
        >
          {NAV.map(({ path, label, icon: Icon }) => {
            const active = loc.pathname === path;
            return (
              <motion.div
                key={path}
                variants={shouldReduceMotion ? undefined : staggerItem}
              >
                <Link
                  to={path}
                  onClick={() => setSidebarOpen(false)}
                  aria-current={active ? "page" : undefined}
                >
                  <motion.div
                    /* physics-active-state */
                    whileHover={{ x: active ? 0 : 3 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
                      "transition-colors duration-150 cursor-pointer",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    )}
                  >
                    <Icon
                      className="h-[15px] w-[15px] shrink-0 transition-none"
                      strokeWidth={active ? 2.5 : 2}
                    />
                    {label}
                    {active && (
                      <motion.span
                        layoutId="nav-indicator"
                        className="ml-auto flex items-center"
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 32,
                        }}
                      >
                        <ChevronRight className="h-3.5 w-3.5 opacity-40" />
                      </motion.span>
                    )}
                  </motion.div>
                </Link>
              </motion.div>
            );
          })}
        </motion.nav>

        {/* User */}
        <motion.div
          variants={shouldReduceMotion ? undefined : fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.25 }}
          className="shrink-0 border-t border-sidebar-border p-2 pb-safe"
        >
          <div className="flex items-center gap-2.5 rounded-xl px-2 py-2">
            <motion.div
              whileHover={{ scale: 1.08 }}
              transition={{ type: "spring", stiffness: 500, damping: 28 }}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold font-display"
            >
              {initials}
            </motion.div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold leading-tight text-sidebar-foreground">
                {user?.name ?? "User"}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {user?.email}
              </p>
            </div>
            <motion.button
              type="button"
              onClick={signOut}
              title="Sign out"
              aria-label="Sign out"
              {...tapSpring}
              className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-destructive transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
            </motion.button>
          </div>
        </motion.div>
      </motion.aside>

      {/* ── Main area ───────────────────────────────────────── */}
      <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
        <Header onMenuOpen={() => setSidebarOpen(true)} />

        {/* Page content — route-keyed transition (staging-one-focal-point) */}
        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={loc.pathname}
              variants={shouldReduceMotion ? undefined : pageTransition}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="p-4 sm:p-5 lg:p-6 xl:p-8 min-h-full"
            >
              <div className="mx-auto w-full max-w-screen-xl">{children}</div>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

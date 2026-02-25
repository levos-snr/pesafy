/**
 * Layout.tsx — Pesafy SaaS Shell
 */
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  BarChart2,
  BarChart3,
  Bell,
  Box,
  ChevronDown,
  ChevronRight,
  CreditCard,
  DollarSign,
  FileText,
  KeyRound,
  LayoutDashboard,
  LineChart,
  Link2,
  LogOut,
  Monitor,
  Package,
  Percent,
  ReceiptText,
  RefreshCcw,
  Settings,
  Settings2,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Tag,
  TrendingUp,
  User,
  Users,
  Wallet,
  Webhook,
  X,
  Zap,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Header from "@/components/Header";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { tapSpring } from "@/lib/variants";

// ── Nav config ────────────────────────────────────────────────────────────────

const NAV_TOP = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/payments", label: "Payments", icon: CreditCard },
];

const ANALYTICS_SUB = [
  { path: "/analytics/metrics", label: "Metrics", icon: LineChart },
  { path: "/analytics/events", label: "Events", icon: BarChart2 },
];

const PRODUCTS_SUB = [
  { path: "/products/catalogue", label: "Catalogue", icon: Package },
  { path: "/products/checkout-links", label: "Checkout Links", icon: Link2 },
  { path: "/products/discounts", label: "Discounts", icon: Percent },
  { path: "/products/benefits", label: "Benefits", icon: Sparkles },
  { path: "/products/meters", label: "Meters", icon: BarChart3 },
];

const SALES_SUB = [
  { path: "/sales/orders", label: "Orders", icon: ShoppingBag },
  { path: "/sales/subscriptions", label: "Subscriptions", icon: RefreshCcw },
  { path: "/sales/checkouts", label: "Checkouts", icon: ShoppingCart },
];

const FINANCE_SUB = [
  { path: "/finance/income", label: "Income", icon: TrendingUp },
  { path: "/finance/payouts", label: "Payouts", icon: Wallet },
  { path: "/finance/account", label: "Account", icon: ReceiptText },
];

const SETTINGS_SUB = [
  { path: "/settings/general", label: "General", icon: Settings2 },
  { path: "/settings/billing", label: "Billing", icon: FileText },
  { path: "/settings/members", label: "Members", icon: Users },
  { path: "/settings/webhooks", label: "Webhooks", icon: Webhook },
  { path: "/settings/custom-fields", label: "Custom Fields", icon: Tag },
  { path: "/settings/mpesa", label: "M-Pesa", icon: KeyRound },
  { path: "/settings/appearance", label: "Appearance", icon: Monitor },
  { path: "/settings/notifications", label: "Notifications", icon: Bell },
];

const NAV_SYSTEM = [{ path: "/account", label: "Account", icon: User }];

// ── Flat nav link ─────────────────────────────────────────────────────────────

function NavLink({
  path,
  label,
  icon: Icon,
  sub = false,
  onClick,
}: {
  path: string;
  label: string;
  icon: React.ElementType;
  sub?: boolean;
  onClick?: () => void;
}) {
  const loc = useLocation();
  // Each component calls the hook directly — hooks cannot be passed as props
  const shouldReduceMotion = useReducedMotion();

  const active =
    path === "/dashboard"
      ? loc.pathname === "/dashboard"
      : loc.pathname === path || loc.pathname.startsWith(path + "/");

  return (
    <Link to={path} onClick={onClick}>
      <motion.div
        whileHover={shouldReduceMotion ? undefined : { x: active ? 0 : 2 }}
        whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={cn(
          "group flex items-center gap-3 rounded-xl text-sm font-medium cursor-pointer transition-colors duration-150",
          sub ? "px-3 py-[7px] pl-[38px] text-[12.5px]" : "px-3 py-[9px]",
          active
            ? "bg-primary/10 text-primary"
            : "text-sidebar-foreground/55 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        )}
      >
        <Icon
          className={cn(
            "shrink-0 transition-none",
            sub ? "h-3.5 w-3.5" : "h-[15px] w-[15px]",
            active ? "opacity-100" : "opacity-60 group-hover:opacity-90"
          )}
          strokeWidth={active ? 2.5 : 2}
        />
        <span className="flex-1 truncate">{label}</span>
        {active && sub && (
          <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
        )}
        {active && !sub && (
          <ChevronRight className="h-3 w-3 opacity-30 shrink-0" />
        )}
      </motion.div>
    </Link>
  );
}

// ── Collapsible nav group ─────────────────────────────────────────────────────

function NavGroup({
  label,
  icon: Icon,
  basePath,
  items,
  onNavigate,
}: {
  label: string;
  icon: React.ElementType;
  basePath: string;
  items: { path: string; label: string; icon: React.ElementType }[];
  onNavigate: () => void;
}) {
  const loc = useLocation();
  const shouldReduceMotion = useReducedMotion();
  const isActive = loc.pathname.startsWith(basePath);
  const [open, setOpen] = useState(isActive);

  useEffect(() => {
    if (isActive) setOpen(true);
  }, [isActive]);

  return (
    <div>
      <motion.button
        type="button"
        onClick={() => setOpen((o) => !o)}
        whileHover={shouldReduceMotion ? undefined : { x: 2 }}
        whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={cn(
          "w-full group flex items-center gap-3 rounded-xl px-3 py-[9px]",
          "text-sm font-medium cursor-pointer transition-colors duration-150",
          isActive
            ? "text-primary"
            : "text-sidebar-foreground/55 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        )}
      >
        <Icon
          className={cn(
            "h-[15px] w-[15px] shrink-0",
            isActive ? "opacity-100" : "opacity-60 group-hover:opacity-90"
          )}
          strokeWidth={isActive ? 2.5 : 2}
        />
        <span className="flex-1 text-left truncate">{label}</span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : { duration: 0.2, ease: [0.4, 0, 0.2, 1] }
          }
        >
          <ChevronDown className="h-3.5 w-3.5 opacity-40" />
        </motion.div>
      </motion.button>

      <motion.div
        initial={false}
        animate={{
          height: open ? items.length * 37 : 0,
          opacity: open ? 1 : 0,
        }}
        transition={
          shouldReduceMotion
            ? { duration: 0 }
            : { duration: 0.22, ease: [0.4, 0, 0.2, 1] }
        }
        className="overflow-hidden"
      >
        <div className="mt-0.5 space-y-0.5 pb-0.5">
          {items.map((item) => (
            <NavLink key={item.path} {...item} sub onClick={onNavigate} />
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  user?: { name?: string | null; email?: string | null } | null;
}

function Sidebar({ open, onClose, user }: SidebarProps) {
  const shouldReduceMotion = useReducedMotion();
  const initials = (user?.name?.[0] ?? user?.email?.[0] ?? "U").toUpperCase();

  const signOut = async () => {
    await authClient.signOut();
    window.location.reload();
  };

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 flex w-60 flex-col",
        "bg-sidebar border-r border-sidebar-border",
        "transition-transform duration-[260ms] ease-out will-change-transform",
        "lg:static lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full"
      )}
    >
      {/* Logo */}
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-sidebar-border px-4">
        <motion.div
          whileHover={
            shouldReduceMotion
              ? undefined
              : { rotate: [0, -12, 8, -4, 0], scale: 1.1 }
          }
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
          onClick={onClose}
          {...tapSpring}
          className="ml-auto rounded-lg p-1.5 text-sidebar-foreground/40 hover:text-sidebar-foreground lg:hidden"
        >
          <X className="h-4 w-4" />
        </motion.button>
      </div>

      {/* Nav */}
      <nav
        className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5"
        aria-label="Main navigation"
      >
        {NAV_TOP.map((item) => (
          <NavLink key={item.path} {...item} onClick={onClose} />
        ))}

        <NavGroup
          label="Products"
          icon={Box}
          basePath="/products"
          items={PRODUCTS_SUB}
          onNavigate={onClose}
        />

        <NavLink
          path="/customers"
          label="Customers"
          icon={Users}
          onClick={onClose}
        />

        <NavGroup
          label="Analytics"
          icon={BarChart2}
          basePath="/analytics"
          items={ANALYTICS_SUB}
          onNavigate={onClose}
        />

        <NavGroup
          label="Sales"
          icon={ShoppingBag}
          basePath="/sales"
          items={SALES_SUB}
          onNavigate={onClose}
        />

        <NavGroup
          label="Finance"
          icon={DollarSign}
          basePath="/finance"
          items={FINANCE_SUB}
          onNavigate={onClose}
        />

        {/* System section */}
        <div className="pt-3">
          <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/30">
            System
          </p>

          <NavGroup
            label="Settings"
            icon={Settings}
            basePath="/settings"
            items={SETTINGS_SUB}
            onNavigate={onClose}
          />

          {NAV_SYSTEM.map((item) => (
            <NavLink key={item.path} {...item} onClick={onClose} />
          ))}
        </div>
      </nav>

      {/* User footer */}
      <div className="shrink-0 border-t border-sidebar-border p-2">
        <div className="flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-sidebar-accent transition-colors">
          <motion.div
            whileHover={shouldReduceMotion ? undefined : { scale: 1.08 }}
            transition={{ type: "spring", stiffness: 500, damping: 28 }}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold font-display"
          >
            {initials}
          </motion.div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold leading-tight text-sidebar-foreground">
              {user?.name ?? "User"}
            </p>
            <p className="truncate text-[11px] text-sidebar-foreground/40">
              {user?.email}
            </p>
          </div>
          <motion.button
            type="button"
            onClick={signOut}
            title="Sign out"
            aria-label="Sign out"
            {...tapSpring}
            className="shrink-0 rounded-lg p-1.5 text-sidebar-foreground/40 hover:bg-sidebar-accent hover:text-destructive transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
          </motion.button>
        </div>
      </div>
    </aside>
  );
}

// ── Root layout ───────────────────────────────────────────────────────────────

interface LayoutProps {
  children: ReactNode;
  user?: { name?: string | null; email?: string | null } | null;
}

export default function Layout({ children, user }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const loc = useLocation();

  useEffect(() => {
    setSidebarOpen(false);
  }, [loc.pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AnimatePresence>
        {sidebarOpen && (
          <motion.button
            key="overlay"
            type="button"
            aria-label="Close menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-20 bg-black/50 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
      />

      <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
        <Header onMenuOpen={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-5 lg:p-6 xl:p-8">
            <div className="mx-auto w-full max-w-screen-xl">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}

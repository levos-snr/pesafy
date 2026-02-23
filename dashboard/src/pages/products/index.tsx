/**
 * pages/products/index.tsx — /products/*
 *
 * Shell with the sub-nav tab bar.
 * Each tab navigates to its own route; the child component is rendered via <Outlet />.
 * Mirrors how Finance/Analytics/Sales work but with an in-page tab bar for discoverability.
 */
import { AnimatePresence, motion } from "framer-motion";
import { BarChart3, Link2, Package, Percent, Sparkles } from "lucide-react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "catalogue", label: "Catalogue", icon: Package },
  { id: "checkout-links", label: "Checkout Links", icon: Link2 },
  { id: "discounts", label: "Discounts", icon: Percent },
  { id: "benefits", label: "Benefits", icon: Sparkles },
  { id: "meters", label: "Meters", icon: BarChart3 },
] as const;

export default function ProductsShell() {
  const loc = useLocation();
  const navigate = useNavigate();

  const pathSegment = loc.pathname.split("/").pop();
  const activeTab = TABS.find((t) => t.id === pathSegment)?.id ?? "catalogue";

  return (
    <div className="space-y-5">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground">
          Products
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your M-Pesa payment products and services
        </p>
      </motion.div>

      {/* Tab bar */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-center gap-1 border-b border-border overflow-x-auto pb-px"
      >
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => navigate(`/products/${id}`)}
              className={cn(
                "relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon
                className="h-3.5 w-3.5 shrink-0"
                strokeWidth={isActive ? 2.5 : 2}
              />
              {label}
              {isActive && (
                <motion.div
                  layoutId="products-tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
                  transition={{ type: "spring", stiffness: 500, damping: 32 }}
                />
              )}
            </button>
          );
        })}
      </motion.div>

      {/* Tab content via router */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        >
          <Outlet />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

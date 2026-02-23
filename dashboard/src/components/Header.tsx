import { motion } from "framer-motion";
import { ChevronRight, Menu } from "lucide-react";
import { useLocation } from "react-router-dom";
import { ModeToggle } from "@/components/mode-toggle";
import { cn } from "@/lib/utils";
import { fadeUp, tapSpring } from "@/lib/variants";

interface HeaderProps {
  onMenuOpen?: () => void;
  pageLabel?: string;
  rightSlot?: React.ReactNode;
  className?: string;
}

const ROUTE_LABELS: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/payments": "Payments",
  // Products
  "/products/catalogue": "Catalogue",
  "/products/checkout-links": "Checkout Links",
  "/products/discounts": "Discounts",
  "/products/benefits": "Benefits",
  "/products/meters": "Meters",
  // Customers
  "/customers": "Customers",
  // Analytics
  "/analytics/metrics": "Metrics",
  "/analytics/events": "Events",
  // Sales
  "/sales/orders": "Orders",
  "/sales/subscriptions": "Subscriptions",
  "/sales/checkouts": "Checkouts",
  // Finance
  "/finance/income": "Income",
  "/finance/payouts": "Payouts",
  "/finance/account": "Payout Account",
  // Settings sub-routes
  "/settings/general": "General",
  "/settings/billing": "Billing",
  "/settings/members": "Members",
  "/settings/webhooks": "Webhooks",
  "/settings/custom-fields": "Custom Fields",
  "/settings/mpesa": "M-Pesa",
  "/settings/appearance": "Appearance",
  "/settings/notifications": "Notifications",
  // System
  "/webhooks": "Webhooks",
  "/account": "Account",
};

function usePageLabel(override?: string): string {
  const loc = useLocation();
  if (override) return override;
  if (ROUTE_LABELS[loc.pathname]) return ROUTE_LABELS[loc.pathname];
  const last = loc.pathname.split("/").filter(Boolean).pop() ?? "";
  return last
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function Header({
  onMenuOpen,
  pageLabel: pageLabelProp,
  rightSlot,
  className,
}: HeaderProps) {
  const pageLabel = usePageLabel(pageLabelProp);

  return (
    <motion.header
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className={cn(
        "flex h-14 shrink-0 items-center gap-3",
        "border-b border-border bg-background/80 backdrop-blur-md",
        "px-4 sm:px-5 lg:px-6",
        "sticky top-0 z-20 transition-colors duration-300",
        className
      )}
    >
      {onMenuOpen && (
        <motion.button
          type="button"
          aria-label="Open navigation menu"
          onClick={onMenuOpen}
          {...tapSpring}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-xl",
            "text-muted-foreground hover:text-foreground hover:bg-muted",
            "transition-colors duration-150 lg:hidden"
          )}
        >
          <Menu className="h-5 w-5" />
        </motion.button>
      )}

      <nav
        aria-label="Breadcrumb"
        className="flex min-w-0 items-center gap-1 text-sm"
      >
        <span className="hidden sm:block text-muted-foreground/60 shrink-0">
          Pesafy
        </span>
        <ChevronRight className="hidden sm:block h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
        <motion.span
          key={pageLabel}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="font-semibold text-foreground truncate"
        >
          {pageLabel}
        </motion.span>
      </nav>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="hidden sm:flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground"
        >
          <motion.span
            className="h-1.5 w-1.5 rounded-full bg-emerald-400"
            animate={{ scale: [1, 1.4, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          <span>Connected</span>
        </motion.div>
        {rightSlot}
        <ModeToggle />
      </div>
    </motion.header>
  );
}

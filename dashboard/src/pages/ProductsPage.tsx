/**
 * ProductsPage — M-Pesa payment product management
 * Sub-routes: Catalogue | Checkout Links | Discounts | Benefits | Meters
 * Inspired by Polar's products UI but adapted for Pesafy/M-Pesa context
 */
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Code2,
  Copy,
  Gift,
  Link2,
  MoreHorizontal,
  Package,
  Percent,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

// ── Shared types ──────────────────────────────────────────────
type SubPage =
  | "catalogue"
  | "checkout-links"
  | "discounts"
  | "benefits"
  | "meters";

// ── Sub-nav tabs ──────────────────────────────────────────────
const TABS = [
  { id: "catalogue", label: "Catalogue", icon: Package },
  { id: "checkout-links", label: "Checkout Links", icon: Link2 },
  { id: "discounts", label: "Discounts", icon: Percent },
  { id: "benefits", label: "Benefits", icon: Sparkles },
  { id: "meters", label: "Meters", icon: BarChart3 },
] as const;

// ── Empty state component ─────────────────────────────────────
function EmptyState({
  icon: Icon,
  title,
  desc,
  actionLabel,
  onAction,
  codeSnippet,
}: {
  icon: any;
  title: string;
  desc: string;
  actionLabel: string;
  onAction: () => void;
  codeSnippet?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    if (codeSnippet) {
      navigator.clipboard.writeText(codeSnippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto"
    >
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-muted/30">
        <Icon className="h-6 w-6 text-muted-foreground/60" strokeWidth={1.5} />
      </div>
      <h3 className="font-display text-lg font-semibold text-foreground mb-2">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground leading-relaxed mb-6">
        {desc}
      </p>

      {codeSnippet && (
        <div className="w-full mb-5 rounded-xl border border-border bg-muted/20 overflow-hidden text-left">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Code2 className="h-3.5 w-3.5" />
              <span className="font-mono">example.ts</span>
            </div>
            <button
              type="button"
              onClick={copyCode}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {copied ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <pre className="px-4 py-3 text-xs text-muted-foreground overflow-x-auto font-mono leading-relaxed">
            <code>{codeSnippet}</code>
          </pre>
        </div>
      )}

      <motion.button
        type="button"
        onClick={onAction}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/20 hover:bg-primary/85 transition-colors"
      >
        <Plus className="h-4 w-4" />
        {actionLabel}
      </motion.button>
    </motion.div>
  );
}

// ── Mock product data for catalogue ──────────────────────────
const MOCK_PRODUCTS = [
  {
    id: "1",
    name: "STK Push Integration",
    type: "one_time",
    price: 5000,
    status: "active",
    sales: 142,
    revenue: 710000,
  },
  {
    id: "2",
    name: "B2C Payout Service",
    type: "subscription",
    price: 15000,
    status: "active",
    sales: 38,
    revenue: 570000,
  },
  {
    id: "3",
    name: "Webhook Pro Plan",
    type: "subscription",
    price: 8000,
    status: "draft",
    sales: 0,
    revenue: 0,
  },
];

// ── Catalogue sub-page ────────────────────────────────────────
function CataloguePage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const _navigate = useNavigate();

  const filtered = MOCK_PRODUCTS.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || p.status === filter;
    return matchSearch && matchFilter;
  });

  if (MOCK_PRODUCTS.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="No products yet"
        desc="Create your first product to start accepting M-Pesa payments from customers."
        actionLabel="Create Product"
        onAction={() => {}}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            className="w-full rounded-xl border border-border bg-input pl-9 pr-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {["all", "active", "draft"].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-2 rounded-lg text-xs font-semibold capitalize transition-colors border",
                filter === f
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {f}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {}}
            className="ml-auto sm:ml-0 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary/85 shadow-md shadow-primary/20 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            New Product
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Product
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden sm:table-cell">
                  Type
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Price
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">
                  Sales
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">
                  Revenue
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center text-sm text-muted-foreground"
                  >
                    No products match your search
                  </td>
                </tr>
              ) : (
                filtered.map((p, i) => (
                  <motion.tr
                    key={p.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                    className="hover:bg-muted/20 transition-colors group"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                          <Package className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {p.name}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">
                            #{p.id}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider",
                          p.type === "subscription"
                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                            : "bg-violet-500/10 text-violet-600 dark:text-violet-400"
                        )}
                      >
                        {p.type === "subscription" ? "Recurring" : "One-time"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-bold text-foreground tabular-nums">
                        KES {p.price.toLocaleString()}
                      </p>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <p className="text-sm text-foreground tabular-nums">
                        {p.sales}
                      </p>
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell">
                      <p className="text-sm font-semibold text-foreground tabular-nums">
                        KES {p.revenue.toLocaleString()}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold border",
                          p.status === "active"
                            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "border-border bg-muted/30 text-muted-foreground"
                        )}
                      >
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            p.status === "active"
                              ? "bg-emerald-400"
                              : "bg-muted-foreground/40"
                          )}
                        />
                        {p.status === "active" ? "Active" : "Draft"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        className="opacity-0 group-hover:opacity-100 transition-opacity flex h-7 w-7 items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Checkout Links sub-page ───────────────────────────────────
function CheckoutLinksPage() {
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Left: list panel */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h3 className="font-display font-semibold text-foreground">
              Checkout Links
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Shareable payment pages
            </p>
          </div>
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-white hover:bg-primary/85 transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              className="w-full rounded-xl border border-border bg-input pl-9 pr-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              placeholder="Search links..."
            />
          </div>
        </div>
        <EmptyState
          icon={Link2}
          title="No Checkout Links"
          desc="Create a shareable link that lets customers pay via M-Pesa directly."
          actionLabel="Create Checkout Link"
          onAction={() => {}}
        />
      </div>

      {/* Right: info panel */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Link2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-foreground">
              How Checkout Links work
            </h3>
            <p className="text-xs text-muted-foreground">
              Share & collect M-Pesa payments
            </p>
          </div>
        </div>

        {[
          {
            step: "1",
            label: "Create a link",
            desc: "Set an amount, description and optional expiry date",
          },
          {
            step: "2",
            label: "Share with customer",
            desc: "Send via WhatsApp, SMS, email or embed in your site",
          },
          {
            step: "3",
            label: "Customer pays via M-Pesa",
            desc: "STK Push prompt is sent to their phone automatically",
          },
          {
            step: "4",
            label: "Get notified instantly",
            desc: "Webhook fires on payment confirmation",
          },
        ].map(({ step, label, desc }) => (
          <div key={step} className="flex gap-3.5">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary mt-0.5">
              {step}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Discounts sub-page ────────────────────────────────────────
function DiscountsPage() {
  const [search, setSearch] = useState("");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            className="w-full rounded-xl border border-border bg-input pl-9 pr-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            placeholder="Search discounts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="ml-auto inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-white hover:bg-primary/85 shadow-md shadow-primary/20 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          New Discount
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Name
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Code
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden sm:table-cell">
                  Amount
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">
                  Redemptions
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">
                  Expires
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={5} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-muted/30">
                      <Percent
                        className="h-5 w-5 text-muted-foreground/50"
                        strokeWidth={1.5}
                      />
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      No discounts yet
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Create discount codes to offer deals to your customers
                    </p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Benefits sub-page ─────────────────────────────────────────
function BenefitsPage() {
  return (
    <div className="grid lg:grid-cols-2 gap-5">
      {/* Left: Benefits list */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h3 className="font-display font-semibold text-foreground">
              Benefits
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Attach perks to your products
            </p>
          </div>
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-white hover:bg-primary/85 transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              className="w-full rounded-xl border border-border bg-input pl-9 pr-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              placeholder="Search benefits..."
            />
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-muted/30">
            <Sparkles
              className="h-5 w-5 text-muted-foreground/50"
              strokeWidth={1.5}
            />
          </div>
          <p className="text-sm font-semibold text-foreground">No benefits</p>
          <p className="text-xs text-muted-foreground text-center px-6">
            Create a benefit to get started
          </p>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary/85 transition-colors mt-1"
          >
            <Plus className="h-3.5 w-3.5" />
            Create Benefit
          </button>
        </div>
      </div>

      {/* Right: benefit types */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <h3 className="font-display font-semibold text-foreground">
          Benefit Types
        </h3>
        <p className="text-sm text-muted-foreground">
          Attach any of these benefits to your products and subscriptions.
        </p>

        {[
          {
            icon: Gift,
            label: "Custom Benefit",
            desc: "Any manual or automated perk — API keys, access codes, file downloads",
            color: "bg-violet-500/10 text-violet-500",
          },
          {
            icon: Zap,
            label: "API Access",
            desc: "Auto-provision API keys when a customer pays",
            color: "bg-primary/10 text-primary",
          },
          {
            icon: Link2,
            label: "Webhook Trigger",
            desc: "Fire a webhook to your backend on purchase confirmation",
            color: "bg-blue-500/10 text-blue-500",
          },
          {
            icon: Tag,
            label: "Discount Grant",
            desc: "Automatically issue a discount code to paying customers",
            color: "bg-amber-500/10 text-amber-500",
          },
        ].map(({ icon: Icon, label, desc, color }) => (
          <div
            key={label}
            className="flex items-start gap-3 p-3.5 rounded-xl border border-border hover:border-primary/20 hover:bg-muted/20 transition-colors cursor-pointer group"
          >
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                color
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                {label}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                {desc}
              </p>
            </div>
            <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors ml-auto mt-0.5 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Meters sub-page ───────────────────────────────────────────
function MetersPage() {
  return (
    <div className="grid lg:grid-cols-2 gap-5">
      {/* Left: Meters list */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h3 className="font-display font-semibold text-foreground">
              Meters
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Usage-based billing
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-white hover:bg-primary/85 transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              className="w-full rounded-xl border border-border bg-input pl-9 pr-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              placeholder="Search meters..."
            />
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-muted/30">
            <BarChart3
              className="h-5 w-5 text-muted-foreground/50"
              strokeWidth={1.5}
            />
          </div>
          <p className="text-sm font-semibold text-foreground">No meters yet</p>
          <p className="text-xs text-muted-foreground">
            Create a meter to start usage billing
          </p>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary/85 transition-colors mt-1"
          >
            <Plus className="h-3.5 w-3.5" />
            Create Meter
          </button>
        </div>
      </div>

      {/* Right: explanation */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-foreground">
              Usage Billing with Meters
            </h3>
            <p className="text-xs text-muted-foreground">
              Charge customers based on what they use
            </p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">
          Meters aggregate usage events you send via the Pesafy API to calculate
          how much to bill your customers. Perfect for API call billing,
          transaction volume pricing, or any consumption-based model.
        </p>

        <div className="rounded-xl border border-border bg-muted/20 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30">
            <span className="text-xs text-muted-foreground font-mono flex items-center gap-2">
              <Code2 className="h-3.5 w-3.5" />
              Ingest a usage event
            </span>
          </div>
          <pre className="px-4 py-3 text-xs text-muted-foreground font-mono leading-relaxed overflow-x-auto">
            {`// Report usage from your backend
await pesafy.meters.ingest({
  events: [{
    name: "api_call",
    externalCustomerId: req.customerId,
    metadata: {
      route: "/api/payments/stk",
      method: "POST",
    },
  }],
});`}
          </pre>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "API calls", example: "1,000 calls / mo" },
            { label: "STK Pushes", example: "Per transaction" },
            { label: "Webhooks sent", example: "Per delivery" },
          ].map(({ label, example }) => (
            <div
              key={label}
              className="rounded-xl border border-border bg-muted/10 p-3 text-center"
            >
              <p className="text-xs font-semibold text-foreground">{label}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {example}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main ProductsPage ─────────────────────────────────────────
export default function ProductsPage() {
  const loc = useLocation();
  const navigate = useNavigate();

  // Determine active tab from URL
  const pathSegment = loc.pathname.split("/").pop() as SubPage | undefined;
  const activeTab = (TABS.find((t) => t.id === pathSegment)?.id ??
    "catalogue") as SubPage;

  const handleTabChange = (id: string) => {
    navigate(`/products/${id}`);
  };

  const renderContent = () => {
    switch (activeTab) {
      case "catalogue":
        return <CataloguePage />;
      case "checkout-links":
        return <CheckoutLinksPage />;
      case "discounts":
        return <DiscountsPage />;
      case "benefits":
        return <BenefitsPage />;
      case "meters":
        return <MetersPage />;
      default:
        return <CataloguePage />;
    }
  };

  return (
    <div className="space-y-5">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground">
            Products
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your M-Pesa payment products and services
          </p>
        </div>
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
              onClick={() => handleTabChange(id)}
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

      {/* Tab content */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

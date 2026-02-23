/**
 * SubscriptionsPage.tsx — /sales/subscriptions
 * Lists recurring M-Pesa subscription arrangements.
 *
 * Backend TODO: when you create api.subscriptions.getSubscriptions in Convex,
 * replace the `const subscriptions = []` line with the real useQuery call:
 *   const subscriptions = useQuery(api.subscriptions.getSubscriptions, businessId ? { businessId } : "skip");
 */

import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { motion, useReducedMotion } from "framer-motion";
import { Download, RefreshCcw } from "lucide-react";
import { useState } from "react";
import { cn, formatDate, formatKES } from "@/lib/utils";
import { fadeUp, stagger, staggerItem, tapSpring } from "@/lib/variants";

// ── Helpers ───────────────────────────────────────────────────────────────────

function Skel({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded", className)} />;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active:
      "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
    paused:
      "bg-amber-500/10  text-amber-700  border-amber-500/20  dark:text-amber-400",
    cancelled:
      "bg-red-500/10    text-red-700    border-red-500/20    dark:text-red-400",
    expired: "bg-zinc-500/10   text-zinc-500   border-zinc-500/20",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize",
        styles[status] ?? styles.expired
      )}
    >
      {status}
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SubscriptionsPage() {
  const businesses = useQuery(api.businesses.getUserBusinesses);
  const _businessId = businesses?.[0]?._id;

  /**
   * Replace the two lines below with your real query once it exists:
   *   const subscriptions = useQuery(
   *     api.subscriptions.getSubscriptions,
   *     businessId ? { businessId } : "skip"
   *   );
   *
   * For now we show the empty state once the business loads.
   */
  const subsLoading = businesses === undefined; // true while Convex is fetching
  const subscriptions: any[] = []; // swap for real query result

  const [statusFilter, setStatusFilter] = useState("active");
  const [productFilter, setProductFilter] = useState("all");
  const reduce = useReducedMotion();

  // Filter locally once real data flows in
  const filtered = subscriptions.filter((s) => {
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    const matchProduct =
      productFilter === "all" || s.productId === productFilter;
    return matchStatus && matchProduct;
  });

  return (
    <div className="space-y-5">
      {/* ── Page header ──────────────────────────────────── */}
      <motion.div
        variants={reduce ? undefined : fadeUp}
        initial="hidden"
        animate="visible"
        className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
      >
        <div>
          <h1 className="font-display text-fluid-xl font-bold tracking-tight text-foreground">
            Subscriptions
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Recurring M-Pesa payment subscriptions
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none"
          >
            <option value="active">Active</option>
            <option value="all">All statuses</option>
            <option value="paused">Paused</option>
            <option value="cancelled">Cancelled</option>
            <option value="expired">Expired</option>
          </select>

          {/* Product filter */}
          <select
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            className="rounded-xl border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none"
          >
            <option value="all">All products</option>
          </select>

          <motion.button
            type="button"
            {...tapSpring}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </motion.button>
        </div>
      </motion.div>

      {/* ── Table card ────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {/* Loading skeleton */}
        {subsLoading && (
          <div className="px-5 py-4 space-y-3.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skel className="h-9 w-9 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skel className="h-3.5 w-28" />
                  <Skel className="h-3 w-20" />
                </div>
                <Skel className="h-4 w-16" />
                <Skel className="h-4 w-16" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!subsLoading && filtered.length === 0 && (
          <motion.div
            variants={reduce ? undefined : fadeUp}
            initial="hidden"
            animate="visible"
            className="flex flex-col items-center justify-center py-20 gap-2.5"
          >
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <RefreshCcw className="h-8 w-8 text-muted-foreground/20" />
            </motion.div>
            <p className="text-sm font-semibold text-foreground">No Results</p>
            <p className="text-xs text-muted-foreground">
              Active subscriptions will appear here once created.
            </p>
          </motion.div>
        )}

        {/* Data table */}
        {!subsLoading && filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="border-b border-border bg-muted/15">
                  {[
                    "Customer",
                    "Status",
                    "Subscription Date",
                    "Renewal Date",
                    "Product",
                    "Amount",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <motion.tbody
                variants={reduce ? undefined : stagger}
                initial="hidden"
                animate="visible"
                className="divide-y divide-border"
              >
                {filtered.map((sub) => (
                  <motion.tr
                    key={sub._id}
                    variants={reduce ? undefined : staggerItem}
                    className="hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-4 py-3.5 font-medium text-foreground">
                      {sub.customer ?? "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={sub.status ?? "active"} />
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground text-xs whitespace-nowrap">
                      {sub.startDate ? formatDate(sub.startDate) : "—"}
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground text-xs whitespace-nowrap">
                      {sub.renewalDate ? formatDate(sub.renewalDate) : "—"}
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground">
                      {sub.product ?? "—"}
                    </td>
                    <td className="px-4 py-3.5 font-bold tabular-nums">
                      {formatKES(sub.amount ?? 0)}
                    </td>
                  </motion.tr>
                ))}
              </motion.tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

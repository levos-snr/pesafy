/**
 * OrdersPage.tsx — /sales/orders
 * Lists completed M-Pesa payment orders.
 *
 * Backend TODO: when you create api.orders.getOrders in Convex,
 * uncomment the real useQuery line and remove the `const orders = []` line.
 */

import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { motion, useReducedMotion } from "framer-motion";
import { Download, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { cn, formatDate, formatKES } from "@/lib/utils";
import { fadeUp, stagger, staggerItem, tapSpring } from "@/lib/variants";

// ── Helpers ───────────────────────────────────────────────────────────────────

function Skel({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded", className)} />;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    paid: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
    pending:
      "bg-amber-500/10  text-amber-700  border-amber-500/20  dark:text-amber-400",
    failed:
      "bg-red-500/10    text-red-700    border-red-500/20    dark:text-red-400",
    refunded: "bg-zinc-500/10   text-zinc-500   border-zinc-500/20",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize",
        styles[status] ?? styles.pending
      )}
    >
      {status}
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const businesses = useQuery(api.businesses.getUserBusinesses);
  const _businessId = businesses?.[0]?._id;

  /**
   * Replace the two lines below with your real query once it exists:
   *   const orders = useQuery(api.orders.getOrders, businessId ? { businessId } : "skip");
   *
   * For now we show the empty state once the business loads.
   */
  const ordersLoading = businesses === undefined; // true while Convex is still fetching
  const orders: any[] = []; // swap for real query result

  const [productFilter, setProductFilter] = useState("all");
  const reduce = useReducedMotion();

  // KPI totals (derived from orders array once real data flows in)
  const todayRevenue = orders
    .filter(
      (o) => new Date(o.createdAt).toDateString() === new Date().toDateString()
    )
    .reduce((sum, o) => sum + (o.amount ?? 0), 0);
  const cumulativeRevenue = orders.reduce((sum, o) => sum + (o.amount ?? 0), 0);

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
            Orders
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Completed M-Pesa payment orders
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
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

      {/* ── KPI cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: "Orders",
            value: ordersLoading ? null : String(orders.length),
          },
          {
            label: "Today's Revenue",
            value: ordersLoading ? null : formatKES(todayRevenue),
          },
          {
            label: "Cumulative Revenue",
            value: ordersLoading ? null : formatKES(cumulativeRevenue),
          },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-2xl border border-border bg-card p-5"
          >
            {value === null ? (
              <>
                <Skel className="h-3 w-24 mb-3" />
                <Skel className="h-7 w-16" />
              </>
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  {label}
                </p>
                <p className="font-display text-2xl font-extrabold text-foreground">
                  {value}
                </p>
              </>
            )}
          </div>
        ))}
      </div>

      {/* ── Table card ────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {/* Loading skeleton */}
        {ordersLoading && (
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
        {!ordersLoading && orders.length === 0 && (
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
              <ShoppingBag className="h-8 w-8 text-muted-foreground/20" />
            </motion.div>
            <p className="text-sm font-semibold text-foreground">No Results</p>
            <p className="text-xs text-muted-foreground">
              Orders will appear here after customers complete payments.
            </p>
          </motion.div>
        )}

        {/* Data table */}
        {!ordersLoading && orders.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[680px]">
              <thead>
                <tr className="border-b border-border bg-muted/15">
                  {[
                    "Customer",
                    "Amount",
                    "Description",
                    "Status",
                    "Invoice #",
                    "Date",
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
                {orders.map((order) => (
                  <motion.tr
                    key={order._id}
                    variants={reduce ? undefined : staggerItem}
                    className="hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-4 py-3.5 font-medium text-foreground">
                      {order.customer ?? "—"}
                    </td>
                    <td className="px-4 py-3.5 font-bold tabular-nums">
                      {formatKES(order.amount ?? 0)}
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground">
                      {order.description ?? "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={order.status ?? "pending"} />
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground">
                      {order.invoiceNumber ?? "—"}
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground text-xs whitespace-nowrap">
                      {order.createdAt ? formatDate(order.createdAt) : "—"}
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

/**
 * CheckoutsPage.tsx — /sales/checkouts
 * Lists M-Pesa checkout sessions (initiated but not necessarily completed).
 *
 * Backend TODO: wire api.checkouts.getCheckouts when query exists.
 */
import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { motion, useReducedMotion } from "framer-motion";
import { ShoppingCart } from "lucide-react";
import { useState } from "react";
import { cn, formatDate, formatKES } from "@/lib/utils";
import { fadeUp, stagger, staggerItem } from "@/lib/variants";

function Skel({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded", className)} />;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed:
      "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
    open: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400",
    expired:
      "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400",
    failed: "bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-400",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize",
        map[status] ?? map.open
      )}
    >
      {status}
    </span>
  );
}

export default function CheckoutsPage() {
  const businesses = useQuery(api.businesses.getUserBusinesses);
  const businessId = businesses?.[0]?._id;

  // TODO: wire real query
  // const checkouts = useQuery(api.checkouts.getCheckouts, businessId ? { businessId } : "skip");
  const checkouts: any[] | undefined = businessId ? [] : undefined;

  const [emailFilter, setEmailFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [productFilter, setProductFilter] = useState("all");
  const reduce = useReducedMotion();

  const filtered = (checkouts ?? []).filter((c) => {
    const matchEmail =
      !emailFilter ||
      c.email?.toLowerCase().includes(emailFilter.toLowerCase());
    const matchStatus = !statusFilter || c.status === statusFilter;
    const matchProd = productFilter === "all" || c.productId === productFilter;
    return matchEmail && matchStatus && matchProd;
  });

  return (
    <div className="space-y-5">
      <motion.div
        variants={reduce ? undefined : fadeUp}
        initial="hidden"
        animate="visible"
        className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
      >
        <div>
          <h1 className="font-display text-fluid-xl font-bold tracking-tight text-foreground">
            Checkouts
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            M-Pesa checkout sessions initiated by customers
          </p>
        </div>
      </motion.div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input
          value={emailFilter}
          onChange={(e) => setEmailFilter(e.target.value)}
          placeholder="Filter by email"
          className="rounded-xl border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none"
        >
          <option value="">Select a status</option>
          <option value="open">Open</option>
          <option value="completed">Completed</option>
          <option value="expired">Expired</option>
          <option value="failed">Failed</option>
        </select>
        <select
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
          className="rounded-xl border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none"
        >
          <option value="all">All products</option>
        </select>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {checkouts === undefined ? (
          <div className="px-5 py-4 space-y-3.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skel className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skel className="h-3.5 w-28" />
                  <Skel className="h-3 w-20" />
                </div>
                <Skel className="h-4 w-14" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            variants={fadeUp}
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
              <ShoppingCart className="h-8 w-8 text-muted-foreground/20" />
            </motion.div>
            <p className="text-sm font-semibold text-foreground">No Results</p>
            <p className="text-xs text-muted-foreground">
              Checkout sessions will appear once customers start payments.
            </p>
          </motion.div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[680px]">
              <thead>
                <tr className="border-b border-border bg-muted/15">
                  {["Date", "Status", "Customer", "Product", "Amount"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <motion.tbody
                variants={reduce ? undefined : stagger}
                initial="hidden"
                animate="visible"
                className="divide-y divide-border"
              >
                {filtered.map((c) => (
                  <motion.tr
                    key={c._id}
                    variants={reduce ? undefined : staggerItem}
                    className="hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-4 py-3.5 text-muted-foreground text-xs">
                      {c.createdAt ? formatDate(c.createdAt) : "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={c.status ?? "open"} />
                    </td>
                    <td className="px-4 py-3.5 font-medium text-foreground">
                      {c.email ?? c.phone ?? "—"}
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground">
                      {c.product ?? "—"}
                    </td>
                    <td className="px-4 py-3.5 font-bold tabular-nums">
                      {formatKES(c.amount ?? 0)}
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

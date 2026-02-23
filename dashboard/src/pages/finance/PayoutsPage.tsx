/**
 * PayoutsPage.tsx — /finance/payouts
 * Shows M-Pesa B2C payout records.
 *
 * Backend TODO: wire api.finance.getPayouts when query exists.
 */
import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { motion, useReducedMotion } from "framer-motion";
import { AlertCircle, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { cn, formatDate, formatKES } from "@/lib/utils";
import { fadeUp, stagger, staggerItem } from "@/lib/variants";

function Skel({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded", className)} />;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    paid: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
    pending:
      "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400",
    failed: "bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-400",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize",
        map[status] ?? map.pending
      )}
    >
      {status}
    </span>
  );
}

export default function PayoutsPage() {
  const businesses = useQuery(api.businesses.getUserBusinesses);
  const businessId = businesses?.[0]?._id;
  const credentials = useQuery(
    api.credentials.getCredentials,
    businessId ? { businessId } : "skip"
  );

  // TODO: wire real query
  // const payouts = useQuery(api.finance.getPayouts, businessId ? { businessId } : "skip");
  const payouts: any[] | undefined = businessId ? [] : undefined;

  const hasCredentials = !!credentials;
  const reduce = useReducedMotion();

  return (
    <div className="space-y-5">
      <motion.div
        variants={reduce ? undefined : fadeUp}
        initial="hidden"
        animate="visible"
      >
        <h1 className="font-display text-fluid-xl font-bold tracking-tight text-foreground">
          Payouts
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          B2C M-Pesa payouts sent to customers or recipients
        </p>
      </motion.div>

      {!hasCredentials && credentials !== undefined && (
        <motion.div
          variants={reduce ? undefined : fadeUp}
          initial="hidden"
          animate="visible"
          className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/8 px-4 py-3"
        >
          <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-sm text-foreground flex-1">
            You need to set up a{" "}
            <span className="font-semibold">payout account</span> to receive
            payouts.
          </p>
          <Link to="/settings?tab=mpesa">
            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="shrink-0 rounded-xl bg-primary px-4 py-1.5 text-xs font-semibold text-white shadow-md shadow-primary/15"
            >
              Setup
            </motion.button>
          </Link>
        </motion.div>
      )}

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {payouts === undefined ? (
          <div className="px-5 py-4 space-y-3.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4">
                <Skel className="h-4 w-24" />
                <Skel className="h-4 w-24" />
                <Skel className="h-4 w-20" />
                <Skel className="h-4 flex-1" />
                <Skel className="h-4 w-16" />
                <Skel className="h-4 w-16" />
              </div>
            ))}
          </div>
        ) : payouts.length === 0 ? (
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
              <Wallet className="h-8 w-8 text-muted-foreground/20" />
            </motion.div>
            <p className="text-sm font-semibold text-foreground">No Results</p>
            <p className="text-xs text-muted-foreground">
              Payout records will appear here after B2C transactions.
            </p>
          </motion.div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[680px]">
              <thead>
                <tr className="border-b border-border bg-muted/15">
                  {["Date ↓", "Paid At", "Status", "Gross", "Fees", "Net"].map(
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
                {payouts.map((p) => (
                  <motion.tr
                    key={p._id}
                    variants={reduce ? undefined : staggerItem}
                    className="hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-4 py-3.5 text-muted-foreground text-xs">
                      {formatDate(p.createdAt)}
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground text-xs">
                      {p.paidAt ? formatDate(p.paidAt) : "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={p.status ?? "pending"} />
                    </td>
                    <td className="px-4 py-3.5 font-semibold tabular-nums text-muted-foreground">
                      {formatKES(p.gross ?? 0)}
                    </td>
                    <td className="px-4 py-3.5 tabular-nums text-muted-foreground/60">
                      {formatKES(p.fees ?? 0)}
                    </td>
                    <td className="px-4 py-3.5 font-bold tabular-nums text-foreground">
                      {formatKES(p.net ?? 0)}
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

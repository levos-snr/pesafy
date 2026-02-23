/**
 * IncomePage.tsx — /finance/income
 * Shows income records from M-Pesa transactions (gross, fees, net).
 * Mirrors Polar's Income UI adapted for Pesafy/M-Pesa.
 *
 * Backend TODO: wire api.finance.getIncome when query exists.
 */
import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { motion, useReducedMotion } from "framer-motion";
import { AlertCircle, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { cn, formatDate, formatKES } from "@/lib/utils";
import { fadeUp, stagger, staggerItem } from "@/lib/variants";

function Skel({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded", className)} />;
}

export default function IncomePage() {
  const businesses = useQuery(api.businesses.getUserBusinesses);
  const businessId = businesses?.[0]?._id;
  const credentials = useQuery(
    api.credentials.getCredentials,
    businessId ? { businessId } : "skip"
  );

  // TODO: wire real query
  // const income = useQuery(api.finance.getIncome, businessId ? { businessId } : "skip");
  const income: any[] | undefined = businessId ? [] : undefined;

  const hasPayoutAccount = !!credentials; // treat having M-Pesa credentials as "payout configured"
  const reduce = useReducedMotion();

  return (
    <div className="space-y-5">
      <motion.div
        variants={reduce ? undefined : fadeUp}
        initial="hidden"
        animate="visible"
      >
        <h1 className="font-display text-fluid-xl font-bold tracking-tight text-foreground">
          Income
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gross earnings, M-Pesa fees, and net income
        </p>
      </motion.div>

      {/* Warning if no M-Pesa credentials */}
      {!hasPayoutAccount && credentials !== undefined && (
        <motion.div
          variants={reduce ? undefined : fadeUp}
          initial="hidden"
          animate="visible"
          className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/8 px-4 py-3"
        >
          <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-sm text-foreground flex-1">
            You need to set up{" "}
            <span className="font-semibold">M-Pesa credentials</span> to process
            payments.
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

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {income === undefined ? (
          <div className="px-5 py-4 space-y-3.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4">
                <Skel className="h-4 w-24" />
                <Skel className="h-4 flex-1" />
                <Skel className="h-4 w-20" />
                <Skel className="h-4 w-16" />
                <Skel className="h-4 w-16" />
              </div>
            ))}
          </div>
        ) : income.length === 0 ? (
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
              <TrendingUp className="h-8 w-8 text-muted-foreground/20" />
            </motion.div>
            <p className="text-sm font-semibold text-foreground">No Results</p>
            <p className="text-xs text-muted-foreground">
              Income records will appear after completed transactions.
            </p>
          </motion.div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-border bg-muted/15">
                  {["Date ↓", "Description", "Gross", "Fees", "Net"].map(
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
                {income.map((row) => (
                  <motion.tr
                    key={row._id}
                    variants={reduce ? undefined : staggerItem}
                    className="hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-4 py-3.5 text-muted-foreground text-xs whitespace-nowrap">
                      {formatDate(row.date)}
                    </td>
                    <td className="px-4 py-3.5 text-foreground">
                      {row.description ?? "—"}
                    </td>
                    <td className="px-4 py-3.5 font-semibold tabular-nums text-muted-foreground">
                      {formatKES(row.gross ?? 0)}
                    </td>
                    <td className="px-4 py-3.5 tabular-nums text-muted-foreground/60">
                      {formatKES(row.fees ?? 0)}
                    </td>
                    <td className="px-4 py-3.5 font-bold tabular-nums text-foreground">
                      {formatKES(row.net ?? 0)}
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

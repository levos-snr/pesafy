import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CreditCard, Plus, Search, Smartphone, X } from "lucide-react";
import { PaymentForm, PaymentStatus } from "pesafy/components/react";
import { useState } from "react";
import "pesafy/components/react/styles.css";
import { cn, formatDate, formatKES } from "@/lib/utils";
import {
  fadeUp,
  stagger,
  staggerItem,
  tapSpring,
  viewport,
} from "@/lib/variants";

function StatusBadge({ status }: { status: string }) {
  const m: Record<string, string> = {
    success:
      "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
    pending:
      "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400",
    failed: "bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-400",
    cancelled:
      "bg-zinc-500/10 text-zinc-600 border-zinc-500/20 dark:text-zinc-400",
  };
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 28 }}
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize",
        m[status] ?? m.cancelled
      )}
    >
      {status}
    </motion.span>
  );
}

const _inp =
  "w-full rounded-xl border border-border bg-input px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-all focus:outline-none";
const SKELETON_ROWS = ["sk-1", "sk-2", "sk-3", "sk-4", "sk-5"];

export default function PaymentsPage() {
  const businesses = useQuery(api.businesses.getUserBusinesses);
  const businessId = businesses?.[0]?._id;
  const transactions = useQuery(
    api.transactions.getTransactions,
    businessId ? { businessId, limit: 50 } : "skip"
  );

  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");
  const [status, setStatus] = useState<
    "idle" | "pending" | "success" | "error"
  >("idle");
  const [search, setSearch] = useState("");
  const shouldReduceMotion = useReducedMotion();

  const handleSubmit = async (data: {
    amount: number;
    phoneNumber: string;
    accountReference: string;
    transactionDesc: string;
  }) => {
    if (!businessId) return;
    setLoading(true);
    setErr("");
    setSuccess("");
    setStatus("pending");
    try {
      const res = await fetch("/api/mpesa/express/stk-push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
          message?: string;
        } | null;
        const message =
          body?.message || body?.error || "Failed to initiate payment";
        throw new Error(message);
      }
      const json = (await res.json().catch(() => null)) as {
        CustomerMessage?: string;
      } | null;
      setSuccess(
        json?.CustomerMessage ??
          "STK Push sent. Ask the customer to check their phone."
      );
      setStatus("success");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to initiate payment");
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  const filtered = (transactions ?? []).filter(
    (tx) =>
      !search ||
      tx.phoneNumber?.includes(search) ||
      tx.transactionId?.includes(search) ||
      tx.accountReference?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div
        variants={shouldReduceMotion ? undefined : fadeUp}
        initial="hidden"
        animate="visible"
        className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
      >
        <div>
          <h1 className="font-display text-fluid-xl font-bold tracking-tight text-foreground">
            Payments
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Initiate and monitor M-Pesa transactions
          </p>
        </div>
        <motion.button
          type="button"
          onClick={() => {
            setShowForm(!showForm);
            setErr("");
            setSuccess("");
          }}
          {...tapSpring}
          className={cn(
            "inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors",
            showForm
              ? "border border-border text-muted-foreground hover:bg-muted"
              : "bg-primary text-white hover:bg-primary/85 shadow-lg shadow-primary/20"
          )}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={showForm ? "x" : "plus"}
              initial={{ rotate: -90, scale: 0.6, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: 90, scale: 0.6, opacity: 0 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            >
              {showForm ? (
                <X className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </motion.span>
          </AnimatePresence>
          {showForm ? "Cancel" : "STK Push"}
        </motion.button>
      </motion.div>

      {/* STK Push form — height-animated expand/collapse */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0, scale: 0.98 }}
            animate={{ opacity: 1, height: "auto", scale: 1 }}
            exit={{ opacity: 0, height: 0, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
              <div className="flex items-center gap-2.5 mb-6">
                <motion.div
                  animate={{ rotate: [0, -10, 10, 0] }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10"
                >
                  <Smartphone className="h-4 w-4 text-primary" />
                </motion.div>
                <div>
                  <h3 className="font-display font-semibold text-foreground">
                    STK Push
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Send a payment request to a phone number
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <PaymentForm
                    onSubmit={handleSubmit}
                    loading={loading}
                    className="w-full"
                  />
                </div>

                <AnimatePresence>
                  {err && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="sm:col-span-2 rounded-xl border border-destructive/25 bg-destructive/8 px-4 py-3 text-sm text-destructive"
                    >
                      {err}
                    </motion.div>
                  )}
                  {success && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="sm:col-span-2 rounded-xl border border-emerald-500/25 bg-emerald-500/8 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400"
                    >
                      {success}
                    </motion.div>
                  )}
                  {status !== "idle" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="sm:col-span-2"
                    >
                      <PaymentStatus status={status} />
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="sm:col-span-2 flex flex-wrap gap-3">
                  <motion.button
                    type="button"
                    onClick={() => setShowForm(false)}
                    {...tapSpring}
                    className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    Cancel
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transactions */}
      <motion.div
        variants={shouldReduceMotion ? undefined : fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={viewport}
        className="rounded-2xl border border-border bg-card overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3.5 border-b border-border">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search phone, reference…"
              className="w-full rounded-lg border border-border bg-input pl-8 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
          <p className="text-xs text-muted-foreground whitespace-nowrap sm:ml-auto">
            {filtered.length} transaction{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>

        {transactions === undefined ? (
          <div className="px-5 py-4 space-y-3.5">
            {SKELETON_ROWS.map((id) => (
              <div key={id} className="flex items-center gap-4">
                <div className="skeleton h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton h-3.5 w-28 rounded" />
                  <div className="skeleton h-3 w-20 rounded" />
                </div>
                <div className="skeleton h-4 w-14 rounded" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="flex flex-col items-center justify-center py-16 gap-2.5"
          >
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <CreditCard className="h-8 w-8 text-muted-foreground/20" />
            </motion.div>
            <p className="text-sm text-muted-foreground">
              No transactions found
            </p>
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-xs text-primary hover:underline"
              >
                Clear search
              </button>
            )}
          </motion.div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-border bg-muted/15">
                  {[
                    "Type",
                    "Amount",
                    "Phone",
                    "Reference",
                    "Status",
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
                variants={shouldReduceMotion ? undefined : stagger}
                initial="hidden"
                animate="visible"
                className="divide-y divide-border"
              >
                {filtered.map((tx) => (
                  <motion.tr
                    key={tx._id}
                    variants={shouldReduceMotion ? undefined : staggerItem}
                    whileHover={{ backgroundColor: "rgba(var(--muted), 0.15)" }}
                    transition={{ duration: 0.15 }}
                    className="transition-colors"
                  >
                    <td className="px-4 py-3.5">
                      <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold uppercase text-muted-foreground">
                        {tx.type.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-bold text-foreground tabular-nums">
                      {formatKES(tx.amount)}
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground">
                      {tx.phoneNumber ?? "—"}
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground">
                      {tx.accountReference ?? "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={tx.status} />
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap text-xs">
                      {formatDate(tx.createdAt)}
                    </td>
                  </motion.tr>
                ))}
              </motion.tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}

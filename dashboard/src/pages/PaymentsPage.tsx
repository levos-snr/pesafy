import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { CreditCard, Plus, Search, Smartphone, X } from "lucide-react";
import { useState } from "react";
import { cn, formatDate, formatKES } from "@/lib/utils";

function StatusBadge({ status }: { status: string }) {
  const m: Record<string, string> = {
    success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    failed: "bg-red-500/10 text-red-400 border-red-500/20",
    cancelled: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize",
        m[status] ?? m.cancelled
      )}
    >
      {status}
    </span>
  );
}

const inp =
  "w-full rounded-xl border border-border bg-input px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-all focus:outline-none focus:border-primary/55 focus:ring-2 focus:ring-primary/10";

const SKELETON_ROWS = ["sk-1", "sk-2", "sk-3", "sk-4", "sk-5"];

export default function PaymentsPage() {
  const businesses = useQuery(api.businesses.getUserBusinesses);
  const businessId = businesses?.[0]?._id;
  const transactions = useQuery(
    api.transactions.getTransactions,
    businessId ? { businessId, limit: 50 } : "skip"
  );

  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [ref, setRef] = useState("");
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) return;
    setLoading(true);
    setErr("");
    setSuccess("");
    try {
      throw new Error(
        "mpesaActions not yet configured — add your STK Push action"
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to initiate payment";
      setErr(msg);
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
      <div className="flex items-start justify-between gap-4 animate-fade-up">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Payments
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Initiate and monitor M-Pesa transactions
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowForm(!showForm);
            setErr("");
            setSuccess("");
          }}
          className={cn(
            "inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all active:scale-[0.97]",
            showForm
              ? "border border-border text-muted-foreground hover:bg-muted"
              : "bg-primary text-white hover:bg-primary/88 shadow-lg shadow-primary/20"
          )}
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Cancel" : "STK Push"}
        </button>
      </div>

      {/* STK Push form */}
      {showForm && (
        <div className="rounded-2xl border border-border bg-card p-6 animate-fade-up">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Smartphone className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-foreground">
                STK Push
              </h3>
              <p className="text-xs text-muted-foreground">
                Send a payment request to a phone number
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="amount"
                className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5"
              >
                Amount (KES)
              </label>
              <input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="100"
                required
                min="1"
                className={inp}
              />
            </div>
            <div>
              <label
                htmlFor="phone"
                className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5"
              >
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="254712345678"
                required
                className={inp}
              />
            </div>
            <div>
              <label
                htmlFor="ref"
                className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5"
              >
                Account Reference
              </label>
              <input
                id="ref"
                type="text"
                value={ref}
                onChange={(e) => setRef(e.target.value)}
                placeholder="INV-001"
                required
                className={inp}
              />
            </div>
            <div>
              <label
                htmlFor="desc"
                className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5"
              >
                Description
              </label>
              <input
                id="desc"
                type="text"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Payment for services"
                required
                className={inp}
              />
            </div>

            {!businessId && (
              <div className="sm:col-span-2 rounded-xl border border-amber-500/20 bg-amber-500/8 px-4 py-3 text-sm text-amber-400">
                ⚠ No business configured. Complete onboarding first.
              </div>
            )}
            {err && (
              <div className="sm:col-span-2 rounded-xl border border-destructive/25 bg-destructive/8 px-4 py-3 text-sm text-red-400">
                {err}
              </div>
            )}
            {success && (
              <div className="sm:col-span-2 rounded-xl border border-emerald-500/25 bg-emerald-500/8 px-4 py-3 text-sm text-emerald-400">
                {success}
              </div>
            )}

            <div className="sm:col-span-2 flex gap-3">
              <button
                type="submit"
                disabled={loading || !businessId}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-primary/88 active:scale-[0.97] disabled:opacity-45 disabled:cursor-not-allowed shadow-md shadow-primary/15"
              >
                {loading ? (
                  <span className="spinner" />
                ) : (
                  <>
                    <Smartphone className="h-4 w-4" /> Send STK Push
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Transactions table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden animate-fade-up delay-150">
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search phone, reference…"
              className="w-full rounded-lg border border-border bg-input pl-8 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/55"
            />
          </div>
          <p className="ml-auto text-xs text-muted-foreground whitespace-nowrap">
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
          <div className="flex flex-col items-center justify-center py-16 gap-2.5">
            <CreditCard className="h-8 w-8 text-muted-foreground/20" />
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
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
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
                      className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((tx) => (
                  <tr
                    key={tx._id}
                    className="hover:bg-muted/15 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold uppercase text-muted-foreground">
                        {tx.type.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-bold text-foreground tabular-nums">
                      {formatKES(tx.amount)}
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">
                      {tx.phoneNumber ?? "—"}
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">
                      {tx.accountReference ?? "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={tx.status} />
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground whitespace-nowrap text-xs">
                      {formatDate(tx.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

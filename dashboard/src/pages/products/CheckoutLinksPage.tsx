/**
 * pages/products/CheckoutLinksPage.tsx — /products/checkout-links
 */
import { Link2, Plus, Search } from "lucide-react";
import { EmptyState } from "./shared";

export default function CheckoutLinksPage() {
  return (
    <div className="grid lg:grid-cols-2 gap-6">
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
            label: "Customer pays",
            desc: "They receive an M-Pesa STK push and complete the payment",
          },
        ].map(({ step, label, desc }) => (
          <div key={step} className="flex gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
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

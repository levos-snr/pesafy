/**
 * pages/products/MetersPage.tsx — /products/meters
 */
import {
  BarChart3,
  Code2,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react";

export default function MetersPage() {
  return (
    <div className="grid lg:grid-cols-2 gap-5">
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

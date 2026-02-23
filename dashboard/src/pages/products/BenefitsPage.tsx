/**
 * pages/products/BenefitsPage.tsx — /products/benefits
 */
import {
  ArrowUpRight,
  Gift,
  Link2,
  Plus,
  Search,
  Sparkles,
  Tag,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function BenefitsPage() {
  return (
    <div className="grid lg:grid-cols-2 gap-5">
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

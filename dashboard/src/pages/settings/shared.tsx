/**
 * settings/shared.tsx
 * Shared components and constants used across all Settings sub-pages.
 */
import { AnimatePresence, motion } from "framer-motion";
import { Check, Save } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { tapSpring } from "@/lib/variants";

export const inp =
  "w-full rounded-xl border border-border bg-input px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all";

export const sel =
  "rounded-xl border border-border bg-input px-3 py-2 pr-8 text-sm text-foreground appearance-none focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer";

// ── Section card ──────────────────────────────────────────────────────────────

export function SectionCard({
  title,
  desc,
  icon: Icon,
  children,
}: {
  title: string;
  desc?: string;
  icon?: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {(title || Icon) && (
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          {Icon && (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          <div>
            <h3 className="font-display font-semibold text-foreground">
              {title}
            </h3>
            {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
          </div>
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

// ── Toggle switch ─────────────────────────────────────────────────────────────

export function ToggleSwitch({
  checked,
  onChange,
  label,
  desc,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  desc?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 border-b border-border last:border-0">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
      </div>
      <motion.button
        type="button"
        onClick={() => onChange(!checked)}
        whileTap={{ scale: 0.93 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={cn(
          "relative flex h-6 w-11 shrink-0 items-center rounded-full border-2 transition-colors duration-200",
          checked ? "bg-primary border-primary" : "bg-muted border-border"
        )}
        role="switch"
        aria-checked={checked}
      >
        <motion.span
          layout
          animate={{ x: checked ? 20 : 2 }}
          transition={{ type: "spring", stiffness: 600, damping: 30 }}
          className={cn(
            "h-4 w-4 rounded-full shadow-sm",
            checked ? "bg-white" : "bg-muted-foreground/40"
          )}
        />
      </motion.button>
    </div>
  );
}

// ── Select row ────────────────────────────────────────────────────────────────

import { ChevronDown } from "lucide-react";

export function SelectRow({
  label,
  desc,
  value,
  onChange,
  options,
}: {
  label: string;
  desc?: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 border-b border-border last:border-0">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
      </div>
      <div className="relative shrink-0">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={sel}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
      </div>
    </div>
  );
}

// ── Copy row ──────────────────────────────────────────────────────────────────

export function CopyRow({
  label,
  desc,
  value,
}: {
  label: string;
  desc?: string;
  value: string;
}) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };
  return (
    <div className="flex items-start justify-between gap-4 py-3.5 border-b border-border last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-sm text-muted-foreground font-mono max-w-[180px] truncate">
          {value}
        </span>
        <motion.button
          type="button"
          onClick={copy}
          {...tapSpring}
          className="rounded-lg border border-border bg-muted/30 px-3 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          {copied ? <Check className="h-3 w-3 text-emerald-500" /> : "Copy"}
        </motion.button>
      </div>
    </div>
  );
}

// ── Save button ───────────────────────────────────────────────────────────────

export function SaveBtn({
  saving,
  saved,
  disabled,
  onClick,
  type = "button",
}: {
  saving: boolean;
  saved: boolean;
  disabled?: boolean;
  onClick?: () => void;
  type?: "submit" | "button";
}) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={saving || disabled}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/85 disabled:opacity-40 shadow-md shadow-primary/15"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={saved ? "ok" : "s"}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 26 }}
        >
          {saving ? (
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
              className="block h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
            />
          ) : saved ? (
            <Check className="h-4 w-4" />
          ) : (
            <Save className="h-4 w-4" />
          )}
        </motion.span>
      </AnimatePresence>
      {saved ? "Saved!" : "Save"}
    </motion.button>
  );
}

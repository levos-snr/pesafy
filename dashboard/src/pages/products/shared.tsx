/**
 * pages/products/shared.tsx
 * Shared EmptyState component used across product sub-pages.
 */
import { motion } from "framer-motion";
import { CheckCircle2, Code2, Copy, Plus } from "lucide-react";
import { useState } from "react";

export function EmptyState({
  icon: Icon,
  title,
  desc,
  actionLabel,
  onAction,
  codeSnippet,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
  actionLabel: string;
  onAction: () => void;
  codeSnippet?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    if (codeSnippet) {
      navigator.clipboard.writeText(codeSnippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto"
    >
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-muted/30">
        <Icon className="h-6 w-6 text-muted-foreground/60" strokeWidth={1.5} />
      </div>
      <h3 className="font-display text-lg font-semibold text-foreground mb-2">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground leading-relaxed mb-6">
        {desc}
      </p>

      {codeSnippet && (
        <div className="w-full mb-5 rounded-xl border border-border bg-muted/20 overflow-hidden text-left">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Code2 className="h-3.5 w-3.5" />
              <span className="font-mono">example.ts</span>
            </div>
            <button
              type="button"
              onClick={copyCode}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {copied ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <pre className="px-4 py-3 text-xs text-muted-foreground overflow-x-auto font-mono leading-relaxed">
            <code>{codeSnippet}</code>
          </pre>
        </div>
      )}

      <motion.button
        type="button"
        onClick={onAction}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/20 hover:bg-primary/85 transition-colors"
      >
        <Plus className="h-4 w-4" />
        {actionLabel}
      </motion.button>
    </motion.div>
  );
}

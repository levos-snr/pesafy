import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Copy, Globe, Plus, Trash2, Webhook, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  fadeUp,
  stagger,
  staggerItem,
  tapSpring,
  viewport,
} from "@/lib/variants";

const inp =
  "w-full rounded-xl border border-border bg-input px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-all focus:outline-none";
const ALL_EVENTS = [
  "stk_push",
  "b2c",
  "b2b",
  "c2b",
  "reversal",
  "transaction_status",
] as const;
const SKELETON_ROWS = ["sk-1", "sk-2"];

export default function WebhooksPage() {
  const businesses = useQuery(api.businesses.getUserBusinesses);
  const businessId = businesses?.[0]?._id;
  const webhooks = useQuery(
    api.webhooks.getWebhooks,
    businessId ? { businessId } : "skip"
  );
  const createWebhook = useMutation(api.webhooks.createWebhook);
  const deleteWebhook = useMutation(api.webhooks.deleteWebhook);
  const updateWebhook = useMutation(api.webhooks.updateWebhook);

  const [showForm, setShowForm] = useState(false);
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [events, setEvents] = useState<(typeof ALL_EVENTS)[number][]>([
    "stk_push",
    "b2c",
    "b2b",
  ]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const shouldReduceMotion = useReducedMotion();

  const webhookEndpoint = businessId
    ? `${import.meta.env.VITE_CONVEX_SITE_URL}/webhook/mpesa`
    : "";

  const copyEndpoint = () => {
    if (!webhookEndpoint) return;
    navigator.clipboard.writeText(webhookEndpoint);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleEvent = (ev: (typeof ALL_EVENTS)[number]) => {
    setEvents((prev) =>
      prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev]
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId || events.length === 0) return;
    setLoading(true);
    setErr("");
    try {
      await createWebhook({ businessId, url, secret, events });
      setShowForm(false);
      setUrl("");
      setSecret("");
      setEvents(["stk_push", "b2c", "b2b"]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to create webhook");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (webhookId: string) => {
    setDeletingId(webhookId);
    try {
      await deleteWebhook({ webhookId: webhookId as Id<"webhooks"> });
    } catch {
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleActive = async (webhookId: string, current: boolean) => {
    try {
      await updateWebhook({
        webhookId: webhookId as Id<"webhooks">,
        isActive: !current,
      });
    } catch {}
  };

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
            Webhooks
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Receive M-Pesa payment notifications
          </p>
        </div>
        <motion.button
          type="button"
          onClick={() => {
            setShowForm(!showForm);
            setErr("");
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
          {showForm ? "Cancel" : "Add Webhook"}
        </motion.button>
      </motion.div>

      {/* Endpoint card */}
      <motion.div
        variants={shouldReduceMotion ? undefined : fadeUp}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.08 }}
        className="rounded-2xl border border-border bg-card p-5"
      >
        <div className="flex items-center gap-2.5 mb-4">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-display font-semibold text-[15px] text-foreground">
            M-Pesa Callback URL
          </h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Use as callback URL in the Safaricom Developer Portal.
        </p>
        <div className="flex items-stretch gap-2">
          <div className="flex-1 flex items-center rounded-xl border border-border bg-muted/30 px-4 py-2.5 font-mono text-xs text-muted-foreground overflow-hidden">
            <span className="truncate">
              {webhookEndpoint || "Configure a business first"}
            </span>
          </div>
          {webhookEndpoint && (
            <motion.button
              type="button"
              onClick={copyEndpoint}
              {...tapSpring}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition-colors shrink-0",
                copied
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "border-border bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={copied ? "check" : "copy"}
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.6, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 26 }}
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </motion.span>
              </AnimatePresence>
              {copied ? "Copied" : "Copy"}
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* Create form */}
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
                <Webhook className="h-4 w-4 text-primary" />
                <h3 className="font-display font-semibold text-foreground">
                  New Webhook
                </h3>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label
                    htmlFor="webhook-url"
                    className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5"
                  >
                    Destination URL
                  </label>
                  <input
                    id="webhook-url"
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://yourapp.com/webhooks/mpesa"
                    required
                    className={inp}
                  />
                </div>
                <div>
                  <label
                    htmlFor="webhook-secret"
                    className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5"
                  >
                    Signing Secret
                  </label>
                  <input
                    id="webhook-secret"
                    type="text"
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    placeholder="whsec_…"
                    required
                    className={inp}
                  />
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Used to verify webhook signatures
                  </p>
                </div>
                <div>
                  <p className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Events to Subscribe
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {ALL_EVENTS.map((ev) => (
                      <motion.button
                        key={ev}
                        type="button"
                        onClick={() => toggleEvent(ev)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 30,
                        }}
                        className={cn(
                          "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                          events.includes(ev)
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "border-border bg-muted/30 text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {ev}
                      </motion.button>
                    ))}
                  </div>
                  {events.length === 0 && (
                    <p className="mt-1.5 text-xs text-destructive">
                      Select at least one event
                    </p>
                  )}
                </div>

                <AnimatePresence>
                  {err && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="rounded-xl border border-destructive/25 bg-destructive/8 px-4 py-3 text-sm text-destructive"
                    >
                      {err}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex flex-wrap gap-3 pt-1">
                  <motion.button
                    type="submit"
                    disabled={loading || !businessId || events.length === 0}
                    {...tapSpring}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/85 disabled:opacity-45 shadow-md shadow-primary/15"
                  >
                    {loading ? (
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 0.7,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="block h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
                      />
                    ) : (
                      <>Create Webhook</>
                    )}
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={() => setShowForm(false)}
                    {...tapSpring}
                    className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    Cancel
                  </motion.button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Webhooks list */}
      <motion.div
        variants={shouldReduceMotion ? undefined : fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={viewport}
        className="rounded-2xl border border-border bg-card overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-display font-semibold text-[15px] text-foreground">
            Configured Webhooks
          </h3>
        </div>

        {webhooks === undefined ? (
          <div className="px-5 py-4 space-y-4">
            {SKELETON_ROWS.map((id) => (
              <div key={id} className="flex items-center gap-4">
                <div className="skeleton h-9 w-9 rounded-xl" />
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton h-3.5 w-48 rounded" />
                  <div className="skeleton h-3 w-32 rounded" />
                </div>
                <div className="skeleton h-7 w-16 rounded-lg" />
              </div>
            ))}
          </div>
        ) : webhooks.length === 0 ? (
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="flex flex-col items-center justify-center py-16 gap-2.5"
          >
            <motion.div
              animate={{ rotate: [0, -8, 8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <Webhook className="h-8 w-8 text-muted-foreground/20" />
            </motion.div>
            <p className="text-sm text-muted-foreground">
              No webhooks configured
            </p>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="text-xs text-primary hover:underline"
            >
              Add your first webhook
            </button>
          </motion.div>
        ) : (
          <motion.div
            variants={shouldReduceMotion ? undefined : stagger}
            initial="hidden"
            animate="visible"
            className="divide-y divide-border"
          >
            <AnimatePresence>
              {webhooks.map((wh) => (
                <motion.div
                  key={wh._id}
                  variants={shouldReduceMotion ? undefined : staggerItem}
                  exit={{
                    opacity: 0,
                    height: 0,
                    transition: { duration: 0.22, ease: [0.4, 0, 1, 1] },
                  }}
                  layout
                  className="flex items-start gap-4 px-5 py-4 hover:bg-muted/10 transition-colors"
                >
                  <motion.div
                    whileHover={{ rotate: 15, scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 22 }}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted"
                  >
                    <Webhook className="h-4 w-4 text-muted-foreground" />
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {wh.url}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {wh.events.map((ev) => (
                        <span
                          key={ev}
                          className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                        >
                          {ev}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <motion.button
                      type="button"
                      onClick={() => handleToggleActive(wh._id, wh.isActive)}
                      {...tapSpring}
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[11px] font-semibold border transition-colors",
                        wh.isActive
                          ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "border-border bg-muted text-muted-foreground"
                      )}
                    >
                      {wh.isActive ? "Active" : "Inactive"}
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={() => handleDelete(wh._id)}
                      disabled={deletingId === wh._id}
                      whileHover={{ scale: 1.1, color: "rgb(239 68 68)" }}
                      whileTap={{ scale: 0.9 }}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 28,
                      }}
                      className="rounded-lg p-2 text-muted-foreground disabled:opacity-40"
                    >
                      {deletingId === wh._id ? (
                        <motion.span
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 0.7,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                          className="block h-4 w-4 rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground"
                        />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

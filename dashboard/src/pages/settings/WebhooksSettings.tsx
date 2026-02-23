/**
 * pages/settings/WebhooksSettings.tsx — /settings/webhooks
 *
 * KEY FIX: Was using local useState for the webhooks list which always started
 * empty on client navigation. Now reads from api.webhooks.getWebhooks so real
 * data persists across navigation.
 */
import { api } from "@convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { fadeUp, tapSpring } from "@/lib/variants";
import { inp } from "./shared";

// All available event types matching the schema
const ALL_EVENTS = [
  "stk_push",
  "b2c",
  "b2b",
  "c2b",
  "reversal",
  "transaction_status",
] as const;

type WebhookEvent = (typeof ALL_EVENTS)[number];

/** Generate a random webhook secret */
function generateSecret(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: 32 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join("");
}

export default function WebhooksSettings() {
  const businesses = useQuery(api.businesses.getUserBusinesses);
  const businessId = businesses?.[0]?._id;
  const business = useQuery(
    api.businesses.getBusiness,
    businessId ? { businessId } : "skip"
  );

  // Real data from Convex — persists across client navigation
  const webhooks = useQuery(
    api.webhooks.getWebhooks,
    businessId ? { businessId } : "skip"
  );
  const createWebhook = useMutation(api.webhooks.createWebhook);
  const deleteWebhook = useMutation(api.webhooks.deleteWebhook);
  const updateWebhook = useMutation(api.webhooks.updateWebhook);

  const reduce = useReducedMotion();
  const [showAddWebhook, setShowAddWebhook] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<WebhookEvent[]>([
    ...ALL_EVENTS,
  ]);
  const [adding, setAdding] = useState(false);
  const [addErr, setAddErr] = useState("");

  const toggleEvent = (ev: WebhookEvent) => {
    setSelectedEvents((prev) =>
      prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev]
    );
  };

  const handleAdd = async () => {
    if (!webhookUrl.trim() || !businessId) return;
    if (selectedEvents.length === 0) {
      setAddErr("Select at least one event type");
      return;
    }
    setAdding(true);
    setAddErr("");
    try {
      await createWebhook({
        businessId,
        url: webhookUrl.trim(),
        secret: generateSecret(),
        events: selectedEvents,
      });
      setWebhookUrl("");
      setSelectedEvents([...ALL_EVENTS]);
      setShowAddWebhook(false);
    } catch (e: any) {
      setAddErr(e?.message ?? "Failed to add endpoint");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (webhookId: string) => {
    try {
      await deleteWebhook({ webhookId: webhookId as any });
    } catch {
      // silent fail — list will re-sync from Convex
    }
  };

  const handleToggleActive = async (webhookId: string, current: boolean) => {
    try {
      await updateWebhook({ webhookId: webhookId as any, isActive: !current });
    } catch {
      // silent fail
    }
  };

  // Skeleton while loading
  if (businesses === undefined || webhooks === undefined) {
    return (
      <div className="space-y-5">
        <div className="h-8 w-32 rounded-xl skeleton" />
        <div className="h-40 rounded-2xl skeleton" />
      </div>
    );
  }

  const hasWebhooks = webhooks.length > 0;

  return (
    <div className="space-y-5">
      <motion.div
        variants={reduce ? undefined : fadeUp}
        initial="hidden"
        animate="visible"
        className="flex items-center justify-between gap-4"
      >
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">
            Webhooks
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Receive real-time event notifications at your endpoints
          </p>
        </div>
        {hasWebhooks && !showAddWebhook && (
          <motion.button
            type="button"
            onClick={() => setShowAddWebhook(true)}
            {...tapSpring}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-md shadow-primary/15 shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Endpoint
          </motion.button>
        )}
      </motion.div>

      {/* Add endpoint form */}
      <AnimatePresence>
        {showAddWebhook && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-4"
          >
            <p className="text-sm font-semibold text-foreground">
              New Endpoint
            </p>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                URL
              </label>
              <input
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://yoursite.com/webhooks/pesafy"
                className={inp}
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Events
              </label>
              <div className="flex flex-wrap gap-2">
                {ALL_EVENTS.map((ev) => (
                  <button
                    key={ev}
                    type="button"
                    onClick={() => toggleEvent(ev)}
                    className={cn(
                      "rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
                      selectedEvents.includes(ev)
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border bg-muted/30 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {ev.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            {addErr && <p className="text-xs text-destructive">{addErr}</p>}

            <p className="text-xs text-muted-foreground">
              A signing secret will be auto-generated — use it to verify
              payloads.
            </p>

            <div className="flex gap-2">
              <motion.button
                type="button"
                onClick={handleAdd}
                disabled={adding || !webhookUrl.trim()}
                {...tapSpring}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                {adding ? "Adding…" : "Add Endpoint"}
              </motion.button>
              <motion.button
                type="button"
                onClick={() => {
                  setShowAddWebhook(false);
                  setWebhookUrl("");
                  setAddErr("");
                  setSelectedEvents([...ALL_EVENTS]);
                }}
                {...tapSpring}
                className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        variants={reduce ? undefined : fadeUp}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.05 }}
        className="rounded-2xl border border-border bg-card overflow-hidden"
      >
        {!hasWebhooks && !showAddWebhook ? (
          <div className="p-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              {business?.name ?? "Your organization"} doesn't have any webhooks
              yet
            </p>
            <div className="flex gap-3">
              <motion.button
                type="button"
                onClick={() => setShowAddWebhook(true)}
                {...tapSpring}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-md shadow-primary/15"
              >
                Add Endpoint
              </motion.button>
              <a
                href="https://docs.pesafy.com/webhooks"
                target="_blank"
                rel="noopener noreferrer"
              >
                <motion.button
                  type="button"
                  {...tapSpring}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  Documentation <ExternalLink className="h-3.5 w-3.5" />
                </motion.button>
              </a>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {webhooks.map((wh) => (
              <div
                key={wh._id}
                className="flex items-center justify-between px-5 py-3.5 gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(wh._id, wh.isActive)}
                    title={wh.isActive ? "Click to disable" : "Click to enable"}
                    className={cn(
                      "h-2 w-2 rounded-full shrink-0 transition-colors",
                      wh.isActive ? "bg-emerald-500" : "bg-zinc-400"
                    )}
                  />
                  <div className="min-w-0">
                    <span className="text-sm font-mono text-foreground truncate block max-w-xs">
                      {wh.url}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {wh.events.length === ALL_EVENTS.length
                        ? "All events"
                        : wh.events.map((e) => e.replace("_", " ")).join(", ")}
                    </span>
                  </div>
                </div>
                <motion.button
                  type="button"
                  onClick={() => handleDelete(wh._id)}
                  {...tapSpring}
                  className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </motion.button>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

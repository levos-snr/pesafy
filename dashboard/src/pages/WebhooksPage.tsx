import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Check, Copy, Globe, Plus, Trash2, Webhook, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const inp =
  "w-full rounded-xl border border-border bg-input px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-all focus:outline-none focus:border-primary/55 focus:ring-2 focus:ring-primary/10";

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
      const msg = e instanceof Error ? e.message : "Failed to create webhook";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (webhookId: string) => {
    setDeletingId(webhookId);
    try {
      await deleteWebhook({ webhookId: webhookId as Id<"webhooks"> });
    } catch {
      // silently ignore delete errors
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
    } catch {
      // silently ignore toggle errors
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 animate-fade-up">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Webhooks
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Receive M-Pesa payment notifications
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowForm(!showForm);
            setErr("");
          }}
          className={cn(
            "inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all active:scale-[0.97]",
            showForm
              ? "border border-border text-muted-foreground hover:bg-muted"
              : "bg-primary text-white hover:bg-primary/88 shadow-lg shadow-primary/20"
          )}
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Cancel" : "Add Webhook"}
        </button>
      </div>

      {/* Endpoint card */}
      <div className="rounded-2xl border border-border bg-card p-5 animate-fade-up delay-75">
        <div className="flex items-center gap-2.5 mb-4">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-display font-semibold text-[15px] text-foreground">
            M-Pesa Callback URL
          </h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Use this URL as your callback URL in the Safaricom Developer Portal.
        </p>
        <div className="flex items-stretch gap-2">
          <div className="flex-1 flex items-center rounded-xl border border-border bg-input px-4 py-2.5 font-mono text-xs text-muted-foreground overflow-hidden">
            <span className="truncate">
              {webhookEndpoint || "Configure a business first"}
            </span>
          </div>
          {webhookEndpoint && (
            <button
              type="button"
              onClick={copyEndpoint}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition-all",
                copied
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border-border bg-muted text-muted-foreground hover:text-foreground hover:border-border/80"
              )}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied ? "Copied" : "Copy"}
            </button>
          )}
        </div>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="rounded-2xl border border-border bg-card p-6 animate-fade-up">
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
                Used to verify webhook signatures in your endpoint
              </p>
            </div>
            <div>
              <p className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Events to Subscribe
              </p>
              <div className="flex flex-wrap gap-2">
                {ALL_EVENTS.map((ev) => (
                  <button
                    key={ev}
                    type="button"
                    onClick={() => toggleEvent(ev)}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                      events.includes(ev)
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border bg-muted/30 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {ev}
                  </button>
                ))}
              </div>
              {events.length === 0 && (
                <p className="mt-1.5 text-xs text-red-400">
                  Select at least one event
                </p>
              )}
            </div>

            {err && (
              <div className="rounded-xl border border-destructive/25 bg-destructive/8 px-4 py-3 text-sm text-red-400">
                {err}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={loading || !businessId || events.length === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-primary/88 active:scale-[0.97] disabled:opacity-45 shadow-md shadow-primary/15"
              >
                {loading ? <span className="spinner" /> : <>Create Webhook</>}
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

      {/* Webhooks list */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden animate-fade-up delay-150">
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
          <div className="flex flex-col items-center justify-center py-16 gap-2.5">
            <Webhook className="h-8 w-8 text-muted-foreground/20" />
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
          </div>
        ) : (
          <div className="divide-y divide-border">
            {webhooks.map((wh) => (
              <div
                key={wh._id}
                className="flex items-start gap-4 px-5 py-4 hover:bg-muted/10 transition-colors"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted">
                  <Webhook className="h-4 w-4 text-muted-foreground" />
                </div>
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
                  <button
                    type="button"
                    onClick={() => handleToggleActive(wh._id, wh.isActive)}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-semibold border transition-all",
                      wh.isActive
                        ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-400"
                        : "border-border bg-muted text-muted-foreground"
                    )}
                  >
                    {wh.isActive ? "Active" : "Inactive"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(wh._id)}
                    disabled={deletingId === wh._id}
                    className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-red-400 transition-colors disabled:opacity-40"
                  >
                    {deletingId === wh._id ? (
                      <span
                        className="spinner"
                        style={{ width: 14, height: 14 }}
                      />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

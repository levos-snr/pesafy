/**
 * EventsPage.tsx — /analytics/events
 *
 * Split-panel layout:
 *  Left  — Filters: search, timeline (Today picker), sorting, customer search, metadata
 *  Right — Events list / empty state
 *
 * Backend TODO: wire api.analytics.getEvents when query exists.
 */

import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  CalendarDays,
  ChevronDown,
  Plus,
  RefreshCcw,
  Search,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { cn, formatDate } from "@/lib/utils";
import { fadeUp, tapSpring } from "@/lib/variants";

// ── Types ─────────────────────────────────────────────────────────────────────

type SortOrder = "newest" | "oldest";

interface AnalyticsEvent {
  _id: string;
  name: string;
  customerId?: string;
  customerName?: string;
  amount?: number;
  metadata?: Record<string, string>;
  createdAt: number;
}

// ── Left panel: Filters ───────────────────────────────────────────────────────

function FiltersPanel({
  search,
  setSearch,
  sort,
  setSort,
  customerSearch,
  setCustomerSearch,
  metadataFilters,
  addMetadata,
  removeMetadata,
  onRefresh,
  loading,
}: {
  search: string;
  setSearch: (v: string) => void;
  sort: SortOrder;
  setSort: (v: SortOrder) => void;
  customerSearch: string;
  setCustomerSearch: (v: string) => void;
  metadataFilters: { key: string; value: string }[];
  addMetadata: () => void;
  removeMetadata: (i: number) => void;
  onRefresh: () => void;
  loading: boolean;
}) {
  const inp =
    "w-full rounded-xl border border-border bg-muted/20 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all";

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-border shrink-0">
        <h2 className="text-base font-bold text-foreground">Events</h2>
        <div className="flex items-center gap-2">
          <motion.button
            type="button"
            onClick={onRefresh}
            {...tapSpring}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Refresh"
          >
            <motion.div
              animate={loading ? { rotate: 360 } : { rotate: 0 }}
              transition={
                loading
                  ? { duration: 0.8, repeat: Infinity, ease: "linear" }
                  : {}
              }
            >
              <RefreshCcw className="h-3.5 w-3.5" />
            </motion.div>
          </motion.button>
          <motion.button
            type="button"
            {...tapSpring}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white shadow-md shadow-primary/25"
            title="New event"
          >
            <Plus className="h-4 w-4" />
          </motion.button>
        </div>
      </div>

      {/* Scrollable filter body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Events"
            className={cn(inp, "pl-8")}
          />
        </div>

        {/* Timeline */}
        <div>
          <p className="text-sm font-semibold text-foreground mb-2">Timeline</p>
          <button
            type="button"
            className="w-full flex items-center gap-2 rounded-xl border border-border bg-muted/20 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
          >
            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="flex-1 text-left">Today</span>
          </button>
        </div>

        {/* Sorting */}
        <div>
          <p className="text-sm font-semibold text-foreground mb-2">Sorting</p>
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOrder)}
              className={cn(inp, "appearance-none pr-8")}
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </div>

        {/* Customers */}
        <div>
          <p className="text-sm font-semibold text-foreground mb-2">
            Customers
          </p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              placeholder="Search"
              className={cn(inp, "pl-8")}
            />
          </div>
        </div>

        {/* Metadata */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-foreground">Metadata</p>
            <motion.button
              type="button"
              onClick={addMetadata}
              {...tapSpring}
              className="flex h-5 w-5 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Plus className="h-3 w-3" />
            </motion.button>
          </div>
          <AnimatePresence>
            {metadataFilters.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex gap-1.5 mb-1.5 overflow-hidden"
              >
                <input
                  placeholder="key"
                  className={cn(inp, "text-xs py-1.5")}
                />
                <input
                  placeholder="value"
                  className={cn(inp, "text-xs py-1.5")}
                />
                <motion.button
                  type="button"
                  onClick={() => removeMetadata(i)}
                  {...tapSpring}
                  className="shrink-0 rounded-lg p-1 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </motion.button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ── Event row ─────────────────────────────────────────────────────────────────

function EventRow({ event }: { event: AnalyticsEvent }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <motion.div
      layout
      className="border-b border-border last:border-0 hover:bg-muted/10 transition-colors"
    >
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-start gap-3 px-5 py-3.5 text-left"
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
          <Zap className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {event.name}
          </p>
          {event.customerName && (
            <p className="text-xs text-muted-foreground">
              {event.customerName}
            </p>
          )}
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
          {formatDate(event.createdAt)}
        </span>
      </button>
      <AnimatePresence>
        {expanded && event.metadata && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden px-5 pb-3"
          >
            <div className="rounded-xl border border-border bg-muted/20 p-3 text-xs font-mono space-y-1">
              {Object.entries(event.metadata).map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <span className="text-muted-foreground shrink-0">{k}:</span>
                  <span className="text-foreground">{v}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EventsPage() {
  const businesses = useQuery(api.businesses.getUserBusinesses);
  const _businessId = businesses?.[0]?._id;

  /**
   * TODO: replace with real query when api.analytics.getEvents exists:
   *   const events = useQuery(api.analytics.getEvents, businessId ? { businessId } : "skip");
   */
  const loading = businesses === undefined;
  const events: AnalyticsEvent[] = []; // swap for real query result

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOrder>("newest");
  const [customerSearch, setCustomerSearch] = useState("");
  const [metadataFilters, setMetadataFilters] = useState<
    { key: string; value: string }[]
  >([]);
  const [_refreshKey, setRefreshKey] = useState(0);
  const reduce = useReducedMotion();

  const addMetadata = () =>
    setMetadataFilters((f) => [...f, { key: "", value: "" }]);
  const removeMetadata = (i: number) =>
    setMetadataFilters((f) => f.filter((_, idx) => idx !== i));
  const handleRefresh = () => setRefreshKey((k) => k + 1);

  const filtered = events
    .filter(
      (e) =>
        (!search || e.name.toLowerCase().includes(search.toLowerCase())) &&
        (!customerSearch ||
          e.customerName?.toLowerCase().includes(customerSearch.toLowerCase()))
    )
    .sort((a, b) =>
      sort === "newest" ? b.createdAt - a.createdAt : a.createdAt - b.createdAt
    );

  return (
    <div className="-m-4 sm:-m-5 lg:-m-6 xl:-m-8 flex h-[calc(100vh-56px)] overflow-hidden">
      {/* ── Left: Filter panel ─────────────────────────────── */}
      <motion.div
        variants={reduce ? undefined : fadeUp}
        initial="hidden"
        animate="visible"
        className="w-[300px] shrink-0 border-r border-border bg-card flex flex-col h-full hidden md:flex"
      >
        <FiltersPanel
          search={search}
          setSearch={setSearch}
          sort={sort}
          setSort={setSort}
          customerSearch={customerSearch}
          setCustomerSearch={setCustomerSearch}
          metadataFilters={metadataFilters}
          addMetadata={addMetadata}
          removeMetadata={removeMetadata}
          onRefresh={handleRefresh}
          loading={loading}
        />
      </motion.div>

      {/* ── Right: Events content ──────────────────────────── */}
      <motion.div
        variants={reduce ? undefined : fadeUp}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.05 }}
        className="flex-1 min-w-0 flex flex-col"
      >
        {/* Right panel header */}
        <div className="px-6 py-5 border-b border-border shrink-0">
          <h2 className="text-base font-bold text-foreground">Events</h2>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            /* Skeleton */
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-7 w-7 rounded-full skeleton shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="skeleton h-3.5 w-32 rounded" />
                    <div className="skeleton h-3 w-20 rounded" />
                  </div>
                  <div className="skeleton h-3 w-16 rounded" />
                </div>
              ))}
            </div>
          ) : filtered.length > 0 ? (
            /* Events list */
            <div className="divide-y divide-border">
              {filtered.map((event) => (
                <EventRow key={event._id} event={event} />
              ))}
            </div>
          ) : (
            /* Empty state */
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-3 px-6">
              <div className="rounded-2xl border border-border bg-muted/10 px-12 py-12 text-center max-w-sm w-full">
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/30 border border-border mx-auto mb-4"
                >
                  <Zap className="h-4.5 w-4.5 text-muted-foreground/40" />
                </motion.div>
                <p className="text-base font-bold text-foreground mb-1">
                  No Events Found
                </p>
                <p className="text-sm text-muted-foreground">
                  There are no events matching your current filters
                </p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

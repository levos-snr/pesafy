/**
 * MetricsPage.tsx — /analytics/metrics
 *
 * Displays M-Pesa payment KPI charts:
 *   Revenue · Orders · Average Order Value · Cumulative Revenue
 *
 * Each card shows a sparkline chart with a date range.
 * Uses recharts for the line charts.
 *
 * Backend TODO: wire api.analytics.getMetrics when query exists.
 */

import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { cn, formatKES } from "@/lib/utils";
import { fadeUp } from "@/lib/variants";

// ── Types ─────────────────────────────────────────────────────────────────────

type Range = "7d" | "30d" | "90d" | "12m";

interface MetricPoint {
  date: string;
  value: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildEmptyRange(range: Range): MetricPoint[] {
  const now = new Date();
  const points: MetricPoint[] = [];
  const count =
    range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 365;
  const step = range === "12m" ? 30 : 1;
  for (let i = count; i >= 0; i -= step) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    points.push({
      date: d.toLocaleDateString("en-KE", { month: "short", day: "numeric" }),
      value: 0,
    });
  }
  return points;
}

function rangeLabel(range: Range): string {
  const now = new Date();
  const from = new Date(now);
  if (range === "7d") from.setDate(now.getDate() - 7);
  if (range === "30d") from.setDate(now.getDate() - 30);
  if (range === "90d") from.setDate(now.getDate() - 90);
  if (range === "12m") from.setFullYear(now.getFullYear() - 1);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-KE", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  return `${fmt(from)} – ${fmt(now)}`;
}

function Skel({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded", className)} />;
}

// ── Metric card ───────────────────────────────────────────────────────────────

function MetricCard({
  title,
  value,
  data,
  isCurrency = false,
  loading = false,
  range,
}: {
  title: string;
  value: number;
  data: MetricPoint[];
  isCurrency?: boolean;
  loading?: boolean;
  range: Range;
}) {
  const displayValue = isCurrency ? formatKES(value) : value.toLocaleString();

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col">
      <div className="px-5 pt-5 pb-3">
        {loading ? (
          <>
            <Skel className="h-3.5 w-32 mb-3" />
            <Skel className="h-8 w-20" />
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-muted-foreground mb-1">
              {title}
            </p>
            <p className="font-display text-3xl font-extrabold text-foreground">
              {displayValue}
            </p>
          </>
        )}
      </div>

      {/* Date range pill */}
      <div className="px-5 pb-2">
        <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="h-2.5 w-2.5 rounded-full border-2 border-primary bg-transparent" />
          {rangeLabel(range)}
        </div>
      </div>

      {/* Sparkline chart */}
      <div className="flex-1 min-h-[140px] px-0 pb-0 pt-2">
        <ResponsiveContainer width="100%" height={160}>
          <LineChart
            data={data}
            margin={{ top: 4, right: 16, left: 16, bottom: 0 }}
          >
            <CartesianGrid
              vertical={true}
              horizontal={false}
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              strokeOpacity={0.5}
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "12px",
                fontSize: "12px",
                color: "hsl(var(--foreground))",
              }}
              formatter={(val: number) =>
                isCurrency ? [formatKES(val), title] : [val, title]
              }
              cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "hsl(var(--primary))" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const RANGES: { id: Range; label: string }[] = [
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "90d", label: "90 days" },
  { id: "12m", label: "12 months" },
];

export default function MetricsPage() {
  const businesses = useQuery(api.businesses.getUserBusinesses);
  const _businessId = businesses?.[0]?._id;

  /**
   * TODO: replace with real query when api.analytics.getMetrics exists:
   *   const metrics = useQuery(api.analytics.getMetrics, businessId ? { businessId, range } : "skip");
   */
  const loading = businesses === undefined;

  const [range, setRange] = useState<Range>("30d");
  const reduce = useReducedMotion();

  // Empty data for each chart — replace with real query results
  const emptyData = buildEmptyRange(range);

  const METRIC_CARDS = [
    { title: "Revenue", value: 0, data: emptyData, isCurrency: true },
    { title: "Orders", value: 0, data: emptyData, isCurrency: false },
    {
      title: "Average Order Value",
      value: 0,
      data: emptyData,
      isCurrency: true,
    },
    {
      title: "Cumulative Revenue",
      value: 0,
      data: emptyData,
      isCurrency: true,
    },
  ];

  return (
    <div className="space-y-5">
      {/* ── Header ───────────────────────────────────────── */}
      <motion.div
        variants={reduce ? undefined : fadeUp}
        initial="hidden"
        animate="visible"
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="font-display text-fluid-xl font-bold tracking-tight text-foreground">
            Metrics
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            M-Pesa payment performance over time
          </p>
        </div>

        {/* Range selector */}
        <div className="flex gap-1 rounded-xl border border-border bg-muted/30 p-1 shrink-0">
          {RANGES.map((r) => (
            <motion.button
              key={r.id}
              type="button"
              onClick={() => setRange(r.id)}
              whileTap={{ scale: 0.97 }}
              className={cn(
                "relative rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                range === r.id
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {range === r.id && (
                <motion.div
                  layoutId="metrics-range"
                  className="absolute inset-0 rounded-lg bg-card shadow-sm border border-border"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <span className="relative">{r.label}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* ── 2×2 metric grid ───────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {METRIC_CARDS.map((card, i) => (
          <motion.div
            key={card.title}
            variants={reduce ? undefined : fadeUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: i * 0.06 }}
          >
            <MetricCard {...card} loading={loading} range={range} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

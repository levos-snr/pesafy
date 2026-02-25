import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Code2,
  CreditCard,
  Link2,
  Package,
  Plus,
  Shield,
  Smartphone,
  TrendingDown,
  TrendingUp,
  Webhook,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────
// useLiveClock
// Replaces the old useState + setInterval in HomePage.
// Runs inside the hook so it is always properly cleaned up.
// Returns a new Date object every `intervalMs` ms, which gives
// React a guaranteed new reference → guaranteed re-render.
// Default: 1 000 ms (every second) so the minute flips the
// instant it happens instead of up to 60 s late.
// ─────────────────────────────────────────────────────────────
function useLiveClock(intervalMs = 1000): Date {
  const [time, setTime] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return time;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function AnimatedNumber({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) {
  const _reduce = useReducedMotion();
  const spring = useSpring(0, { stiffness: 80, damping: 24 });
  const display = useTransform(
    spring,
    (v) =>
      `${prefix}${v.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}${suffix}`
  );
  const [val, setVal] = useState(`${prefix}0${suffix}`);
  useEffect(() => {
    spring.set(value);
  }, [value, spring]);
  useEffect(() => display.on("change", setVal), [display]);
  return <span>{val}</span>;
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 shadow-xl text-xs">
      <p className="text-muted-foreground mb-1">{label}</p>
      <p className="font-bold text-foreground">
        KES {payload[0]?.value?.toLocaleString()}
      </p>
    </div>
  );
}

function Skel({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded", className)} />;
}

function buildChartData(transactions: any[]) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  if (!transactions.length) {
    return days.map((d, i) => ({
      time: d,
      volume: Math.floor(
        Math.sin(i * 0.9 + 1) * 18000 + 32000 + Math.random() * 8000
      ),
    }));
  }
  const now = Date.now();
  return Array.from({ length: 7 }, (_, i) => {
    const dayMs = 86400000;
    const dayStart = now - (6 - i) * dayMs;
    const dayTxs = transactions.filter(
      (tx) =>
        tx.createdAt >= dayStart &&
        tx.createdAt < dayStart + dayMs &&
        tx.status === "success"
    );
    return {
      time: days[i],
      volume: dayTxs.reduce((s: number, tx: any) => s + tx.amount, 0),
    };
  });
}

const STATUS_CFG: Record<string, { cls: string; dot: string }> = {
  success: {
    cls: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-400",
  },
  pending: {
    cls: "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400",
    dot: "bg-amber-400",
  },
  failed: {
    cls: "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400",
    dot: "bg-red-400",
  },
  cancelled: {
    cls: "bg-zinc-500/10 border-zinc-500/20 text-zinc-500",
    dot: "bg-zinc-400",
  },
};

function relTime(ts: number) {
  const d = Date.now() - ts;
  if (d < 60000) return "just now";
  if (d < 3600000) return `${Math.floor(d / 60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`;
  return `${Math.floor(d / 86400000)}d ago`;
}

function txTypeLabel(t: string) {
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─────────────────────────────────────────────────────────────
// SetupCard
// ─────────────────────────────────────────────────────────────
function SetupCard({
  icon: Icon,
  title,
  desc,
  actionLabel,
  to,
  done,
  children,
  delay = 0,
}: {
  icon: any;
  title: string;
  desc: string;
  actionLabel: string;
  to: string;
  done: boolean;
  children?: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "relative rounded-2xl border bg-card p-5 flex flex-col gap-4",
        done ? "border-emerald-500/20" : "border-border"
      )}
    >
      {done && (
        <div className="absolute top-4 right-4 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500">
          <CheckCircle2 className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
        </div>
      )}
      <div
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-xl",
          done ? "bg-emerald-500/10" : "bg-muted/40 border border-border"
        )}
      >
        <Icon
          className={cn(
            "h-5 w-5",
            done ? "text-emerald-500" : "text-muted-foreground"
          )}
          strokeWidth={1.5}
        />
      </div>
      <div className="flex-1">
        <h3
          className={cn(
            "font-display text-base font-semibold mb-1",
            done ? "text-muted-foreground line-through" : "text-foreground"
          )}
        >
          {title}
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
      </div>
      {children && !done && <div className="space-y-2">{children}</div>}
      {!done && (
        <Link to={to}>
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary/10 border border-primary/20 hover:bg-primary hover:text-white px-4 py-2.5 text-sm font-semibold text-primary transition-all"
          >
            {actionLabel}
            <ArrowRight className="h-3.5 w-3.5" />
          </motion.button>
        </Link>
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// ① Greeting header
// Receives `time` from useLiveClock — updates every second
// ─────────────────────────────────────────────────────────────
function GreetingHeader({
  greeting,
  firstName,
  businessName,
  environment,
  time,
  hasCredentials,
}: {
  greeting: string;
  firstName: string;
  businessName: string;
  environment: string;
  time: Date;
  hasCredentials: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-3"
    >
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <motion.span
            animate={{ scale: [1, 1.4, 1] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            className="h-2 w-2 rounded-full bg-emerald-400 inline-block"
          />
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Live ·{" "}
            {time.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          {greeting}, {firstName} 👋
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {businessName} ·{" "}
          <span
            className={cn(
              "font-semibold",
              environment === "production"
                ? "text-emerald-500"
                : "text-amber-500"
            )}
          >
            {environment}
          </span>
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {!hasCredentials && (
          <Link to="/settings?tab=mpesa">
            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors"
            >
              <AlertCircle className="h-3.5 w-3.5" />
              Add API credentials
            </motion.button>
          </Link>
        )}
        <Link to="/payments">
          <motion.button
            type="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-primary/20 hover:bg-primary/85 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            New Payment
          </motion.button>
        </Link>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// ② SetupBanner — standalone status strip after greeting
// ─────────────────────────────────────────────────────────────
function SetupBanner({
  hasProduct,
  hasCredentials,
  hasWebhook,
}: {
  hasProduct: boolean;
  hasCredentials: boolean;
  hasWebhook: boolean;
}) {
  const doneCount = [hasProduct, hasCredentials, hasWebhook].filter(
    Boolean
  ).length;
  if (doneCount >= 3) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="setup-banner"
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-center gap-3 rounded-2xl border border-border bg-muted/20 px-5 py-3.5"
      >
        <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0" />
        <p className="text-sm text-muted-foreground flex-1">
          <span className="font-semibold text-foreground">
            Payment processing is not yet active.
          </span>{" "}
          Complete all steps below to start accepting payments from customers.
        </p>
        <span className="text-xs font-semibold text-primary shrink-0">
          {doneCount}/3 done
        </span>
      </motion.div>
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────
// ③ KPI stat cards
// ─────────────────────────────────────────────────────────────
function StatCards({ stats }: { stats: any }) {
  const totalVolume = stats?.totalVolume ?? 0;
  const successCount = stats?.successCount ?? 0;
  const pendingCount = stats?.pendingCount ?? 0;
  const failedCount = stats?.failedCount ?? 0;
  const totalCount = stats?.totalCount ?? 0;
  const successRate =
    totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 0;

  if (stats === undefined) {
    return (
      <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-5">
            <Skel className="h-3 w-20 mb-3" />
            <Skel className="h-8 w-28 mb-2" />
            <Skel className="h-3 w-16" />
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: "Total Volume",
      value: totalVolume,
      prefix: "KES ",
      suffix: undefined as string | undefined,
      sub: `${totalCount} transactions`,
      icon: CreditCard,
      color: "bg-primary/10 text-primary",
      trend: null as "up" | "down" | null,
    },
    {
      label: "Success Rate",
      value: successRate,
      prefix: undefined as string | undefined,
      suffix: "%",
      sub: `${successCount} successful`,
      icon: TrendingUp,
      color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      trend: (successRate >= 90 ? "up" : successRate < 70 ? "down" : null) as
        | "up"
        | "down"
        | null,
    },
    {
      label: "Pending",
      value: pendingCount,
      prefix: undefined as string | undefined,
      suffix: undefined as string | undefined,
      sub: "awaiting confirmation",
      icon: Clock,
      color: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      trend: null as "up" | "down" | null,
    },
    {
      label: "Failed",
      value: failedCount,
      prefix: undefined as string | undefined,
      suffix: undefined as string | undefined,
      sub: failedCount > 0 ? "need attention" : "all clear",
      icon: Activity,
      color:
        failedCount > 0
          ? "bg-red-500/10 text-red-600 dark:text-red-400"
          : "bg-muted text-muted-foreground",
      trend: null as "up" | "down" | null,
    },
  ];

  return (
    <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(
        (
          { label, value, prefix, suffix, sub, icon: Icon, color, trend },
          i
        ) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              delay: i * 0.06,
              duration: 0.36,
              ease: [0.16, 1, 0.3, 1],
            }}
            whileHover={{ y: -2 }}
            className="rounded-2xl border border-border bg-card p-5"
          >
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {label}
              </p>
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-lg",
                  color
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </div>
            </div>
            <p className="font-display text-2xl font-extrabold text-foreground">
              <AnimatedNumber
                value={value}
                prefix={prefix ?? ""}
                suffix={suffix ?? ""}
              />
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              {trend === "up" && (
                <TrendingUp className="h-3 w-3 text-emerald-500" />
              )}
              {trend === "down" && (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <p className="text-xs text-muted-foreground">{sub}</p>
            </div>
          </motion.div>
        )
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ④ SetupSection — 3 action cards only (banner is above)
// ─────────────────────────────────────────────────────────────
function SetupSection({
  hasProduct,
  hasCredentials,
  hasWebhook,
}: {
  hasProduct: boolean;
  hasCredentials: boolean;
  hasWebhook: boolean;
}) {
  const doneCount = [hasProduct, hasCredentials, hasWebhook].filter(
    Boolean
  ).length;

  return (
    <AnimatePresence>
      {doneCount < 3 && (
        <motion.section
          key="setup-section"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, height: 0 }}
          className="grid md:grid-cols-3 gap-4"
        >
          <SetupCard
            icon={Package}
            title="Create a product"
            desc="Create your first product to start accepting M-Pesa payments from customers."
            actionLabel="Create Product"
            to="/products/catalogue"
            done={hasProduct}
            delay={0.04}
          />

          <SetupCard
            icon={Code2}
            title="Integrate Checkout"
            desc="Set up your integration to start accepting payments via the Pesafy API or Checkout Links."
            actionLabel="View Integration"
            to="/settings"
            done={hasCredentials}
            delay={0.1}
          >
            <div className="space-y-2">
              <Link to="/settings?tab=mpesa">
                <div className="flex items-center gap-2.5 rounded-xl border border-border bg-muted/20 hover:border-primary/20 hover:bg-primary/5 px-3.5 py-3 transition-colors cursor-pointer group">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                    <Code2 className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                      API Integration
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Full control via Daraja API
                    </p>
                  </div>
                  <ArrowUpRight className="h-3 w-3 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                </div>
              </Link>
              <Link to="/products/checkout-links">
                <div className="flex items-center gap-2.5 rounded-xl border border-border bg-muted/20 hover:border-primary/20 hover:bg-primary/5 px-3.5 py-3 transition-colors cursor-pointer group">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10">
                    <Link2 className="h-3.5 w-3.5 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                      Checkout Links
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Share a payment page
                    </p>
                  </div>
                  <ArrowUpRight className="h-3 w-3 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                </div>
              </Link>
            </div>
          </SetupCard>

          <SetupCard
            icon={Shield}
            title="Finish account setup"
            desc="Complete your Daraja API credentials and configure webhooks to receive payment events."
            actionLabel="Complete Setup"
            to="/settings"
            done={hasCredentials && hasWebhook}
            delay={0.16}
          />
        </motion.section>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────
// ⑤a Volume chart
// ─────────────────────────────────────────────────────────────
function VolumeChart({ chartData }: { chartData: any[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
      className="relative lg:col-span-2 rounded-2xl border border-border bg-card p-5"
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-display font-semibold text-foreground">
            Payment Volume
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Last 7 days · KES
          </p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-emerald-500 font-semibold">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
          Live
        </span>
      </div>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
          >
            <defs>
              <linearGradient id="gVol" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#d81b0d" stopOpacity={0.22} />
                <stop offset="95%" stopColor="#d81b0d" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(128,128,128,0.08)"
            />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) =>
                v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
              }
            />
            <Tooltip content={<ChartTooltip />} />
            <Area
              type="monotone"
              dataKey="volume"
              stroke="#d81b0d"
              strokeWidth={2}
              fill="url(#gVol)"
              dot={false}
              activeDot={{ r: 4, fill: "#d81b0d", strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// ⑤b Recent transactions
// ─────────────────────────────────────────────────────────────
function RecentTransactions({ stats }: { stats: any }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.26, duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
      className="relative rounded-2xl border border-border bg-card overflow-hidden"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h3 className="font-display font-semibold text-foreground">Recent</h3>
        <Link to="/payments">
          <motion.span
            whileHover={{ x: 2 }}
            className="text-xs text-primary font-semibold inline-flex items-center gap-1 cursor-pointer"
          >
            View all <ArrowUpRight className="h-3 w-3" />
          </motion.span>
        </Link>
      </div>

      <div className="divide-y divide-border overflow-y-auto max-h-[230px]">
        {stats === undefined ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <Skel className="h-8 w-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skel className="h-3 w-20" />
                <Skel className="h-2.5 w-14" />
              </div>
              <Skel className="h-3 w-14" />
            </div>
          ))
        ) : stats.recentTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Smartphone className="h-7 w-7 text-muted-foreground/20" />
            </motion.div>
            <p className="text-xs text-muted-foreground">No transactions yet</p>
            <Link
              to="/payments"
              className="text-xs text-primary hover:underline"
            >
              Initiate first payment
            </Link>
          </div>
        ) : (
          <AnimatePresence>
            {stats.recentTransactions.slice(0, 8).map((tx: any, i: number) => {
              const cfg = STATUS_CFG[tx.status] ?? STATUS_CFG.cancelled;
              return (
                <motion.div
                  key={tx._id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors"
                >
                  <div
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border",
                      cfg.cls
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {txTypeLabel(tx.type)}
                    </p>
                    <p className="text-[11px] text-muted-foreground/60 font-mono truncate">
                      {tx.phoneNumber ?? tx.accountReference ?? "—"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-foreground tabular-nums">
                      {tx.amount.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-muted-foreground/50">
                      {relTime(tx.createdAt)}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// ⑥ Quick actions
// ─────────────────────────────────────────────────────────────
function QuickActions() {
  const actions = [
    {
      label: "New Product",
      desc: "Create a payment product",
      icon: Package,
      path: "/products/catalogue",
      color: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    },
    {
      label: "STK Push",
      desc: "Prompt customer payment",
      icon: Smartphone,
      path: "/payments",
      color: "bg-primary/10 text-primary",
    },
    {
      label: "Checkout Link",
      desc: "Share a payment page",
      icon: Link2,
      path: "/products/checkout-links",
      color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    },
    {
      label: "Webhooks",
      desc: "Configure notifications",
      icon: Webhook,
      path: "/webhooks",
      color: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.32, duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
      className="relative rounded-2xl border border-border bg-card p-5"
    >
      <h3 className="font-display font-semibold text-foreground mb-4">
        Quick Actions
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {actions.map(({ label, desc, icon: Icon, path, color }) => (
          <Link key={label} to={path}>
            <motion.div
              whileHover={{
                y: -3,
                boxShadow: "0 8px 24px -6px rgba(0,0,0,0.1)",
              }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className="flex flex-col gap-3 rounded-xl border border-border p-4 cursor-pointer hover:border-primary/20 transition-colors"
            >
              <motion.div
                whileHover={{ scale: 1.1, rotate: 6 }}
                transition={{ type: "spring", stiffness: 500, damping: 26 }}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-xl",
                  color
                )}
              >
                <Icon className="h-4 w-4" />
              </motion.div>
              <div>
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {desc}
                </p>
              </div>
            </motion.div>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────
export default function HomePage() {
  const user = useQuery(api.auth.getCurrentUser);
  const businesses = useQuery(api.businesses.getUserBusinesses);
  const businessId = businesses?.[0]?._id;

  const stats = useQuery(
    api.transactions.getDashboardStats,
    businessId ? { businessId } : "skip"
  );
  const credentials = useQuery(
    api.credentials.getCredentials,
    businessId ? { businessId } : "skip"
  );
  const webhooks = useQuery(
    api.webhooks.getWebhooks,
    businessId ? { businessId } : "skip"
  );

  // ── Live clock — replaces the old useState + setInterval block ──
  // useLiveClock returns a new Date every second, guaranteed to
  // trigger a re-render so the greeting time never stalls.
  const time = useLiveClock(1000);

  const hour = time.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user?.name?.split(" ")[0] ?? "there";

  const hasCredentials = !!credentials;
  const hasWebhook = (webhooks?.length ?? 0) > 0;
  const hasProduct = false; // replace with real query when Products land in DB

  const chartData = buildChartData(stats?.recentTransactions ?? []);

  // No business guard
  if (businesses !== undefined && businesses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <Zap className="h-10 w-10 text-primary/30 mb-4" />
        </motion.div>
        <h2 className="font-display text-xl font-bold text-foreground">
          No business configured
        </h2>
        <p className="text-sm text-muted-foreground mt-1.5 mb-6">
          Create a business to start accepting M-Pesa payments.
        </p>
        <Link to="/onboarding">
          <motion.button
            type="button"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/20"
          >
            Set up business <ArrowUpRight className="h-4 w-4" />
          </motion.button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ① Greeting — time prop comes from useLiveClock, ticks every second */}
      <GreetingHeader
        greeting={greeting}
        firstName={firstName}
        businessName={businesses?.[0]?.name ?? "Your business"}
        environment={businesses?.[0]?.mpesaEnvironment ?? "sandbox"}
        time={time}
        hasCredentials={hasCredentials}
      />

      {/* ② Setup banner — right after greeting, disappears when complete */}
      <SetupBanner
        hasProduct={hasProduct}
        hasCredentials={hasCredentials}
        hasWebhook={hasWebhook}
      />

      {/* ③ KPI stat cards */}
      <StatCards stats={stats} />

      {/* ④ Setup action cards — shown below stats until all steps done */}
      <SetupSection
        hasProduct={hasProduct}
        hasCredentials={hasCredentials}
        hasWebhook={hasWebhook}
      />

      {/* ⑤ Volume chart + Recent transactions */}
      <div className="relative grid gap-5 lg:grid-cols-3">
        <VolumeChart chartData={chartData} />
        <RecentTransactions stats={stats} />
      </div>

      {/* ⑥ Quick actions */}
      <QuickActions />
    </div>
  );
}

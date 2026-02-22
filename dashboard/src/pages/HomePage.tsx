import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import { CheckCircle, DollarSign, TrendingUp, XCircle } from "lucide-react";
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { fadeUp, stagger, staggerItem, viewport } from "@/lib/variants";

/* Animated number counter */
function AnimatedNumber({
  value,
  prefix = "",
}: {
  value: number;
  prefix?: string;
}) {
  const shouldReduceMotion = useReducedMotion();
  const spring = useSpring(shouldReduceMotion ? value : 0, {
    stiffness: 90,
    damping: 26,
  });
  const display = useTransform(
    spring,
    (v) => `${prefix}${Math.round(v).toLocaleString()}`
  );
  useEffect(() => {
    spring.set(value);
  }, [spring, value]);
  return <motion.span>{display}</motion.span>;
}

const STATUS_CLS: Record<string, string> = {
  success:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  pending:
    "bg-amber-100  text-amber-800  dark:bg-amber-900/40  dark:text-amber-300",
  default:
    "bg-red-100    text-red-800    dark:bg-red-900/40    dark:text-red-300",
};

function StatCard({
  title,
  value,
  prefix,
  suffix,
  sub,
  icon: Icon,
  delay = 0,
}: {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  sub?: string;
  icon: React.ElementType;
  delay?: number;
}) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <motion.div
      variants={shouldReduceMotion ? undefined : staggerItem}
      whileHover={{ y: -3, boxShadow: "0 8px 30px -6px rgba(216,27,13,0.15)" }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
    >
      <Card className="transition-colors duration-300">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <motion.div
            whileHover={{ scale: 1.15, rotate: 8 }}
            transition={{ type: "spring", stiffness: 500, damping: 28 }}
            className="rounded-lg bg-primary/10 p-2"
          >
            <Icon className="h-4 w-4 text-primary" />
          </motion.div>
        </CardHeader>
        <CardContent>
          <div className="font-display text-2xl font-bold text-foreground">
            <AnimatedNumber value={value} prefix={prefix ?? ""} />
            {suffix}
          </div>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function HomePage() {
  const businesses = useQuery(api.businesses.getUserBusinesses);
  const businessId = businesses?.[0]?._id;
  const stats = useQuery(
    api.transactions.getDashboardStats,
    businessId ? { businessId } : "skip"
  );
  const shouldReduceMotion = useReducedMotion();

  if (!businessId) {
    return (
      <motion.div
        variants={shouldReduceMotion ? undefined : fadeUp}
        initial="hidden"
        animate="visible"
      >
        <h1 className="font-display text-fluid-xl font-bold mb-6 text-foreground">
          Welcome to Pesafy
        </h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              Create a business to get started.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        variants={shouldReduceMotion ? undefined : fadeUp}
        initial="hidden"
        animate="visible"
      >
        <h1 className="font-display text-fluid-xl font-bold tracking-tight text-foreground">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your M-Pesa activity at a glance
        </p>
      </motion.div>

      {/* Stat cards — stagger container (≤50ms) */}
      <motion.div
        variants={shouldReduceMotion ? undefined : stagger}
        initial="hidden"
        animate="visible"
        className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
      >
        <StatCard
          title="Total Volume"
          value={stats?.totalVolume ?? 0}
          prefix="KES "
          sub="Today"
          icon={DollarSign}
        />
        <StatCard
          title="Transactions"
          value={stats?.transactionCount ?? 0}
          sub="Today"
          icon={TrendingUp}
        />
        <StatCard
          title="Success Rate"
          value={stats?.successRate ?? 0}
          suffix="%"
          sub="Today"
          icon={CheckCircle}
        />
        <StatCard
          title="Successful"
          value={stats?.successCount ?? 0}
          sub="Today"
          icon={XCircle}
        />
      </motion.div>

      {/* Recent transactions — whileInView */}
      <motion.div
        variants={shouldReduceMotion ? undefined : fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={viewport}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">
              Recent Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.recentTransactions?.length ? (
              <motion.div
                variants={shouldReduceMotion ? undefined : stagger}
                initial="hidden"
                animate="visible"
                className="divide-y divide-border"
              >
                <AnimatePresence>
                  {stats.recentTransactions.map((tx, i) => (
                    <motion.div
                      key={tx._id}
                      variants={shouldReduceMotion ? undefined : staggerItem}
                      layout
                      className="flex items-center justify-between py-3.5 gap-4"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-foreground text-sm">
                          {tx.type}
                        </p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {tx.phoneNumber || tx.accountReference || "N/A"}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold text-foreground text-sm">
                          KES {tx.amount.toLocaleString()}
                        </p>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold mt-0.5",
                            STATUS_CLS[tx.status] ?? STATUS_CLS.default
                          )}
                        >
                          {tx.status}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            ) : (
              <motion.p
                variants={shouldReduceMotion ? undefined : fadeUp}
                initial="hidden"
                animate="visible"
                className="text-muted-foreground text-sm py-4 text-center"
              >
                No transactions yet
              </motion.p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

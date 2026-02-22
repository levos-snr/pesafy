import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Bell,
  CheckCircle,
  Code2,
  Globe,
  Lock,
  RefreshCw,
  Shield,
  Smartphone,
  Webhook,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import LandingHeader from "@/components/LandingHeader";
import { cn } from "@/lib/utils";
import { fadeUp, stagger, staggerItem, viewport } from "@/lib/variants";

// ── Animated counter ─────────────────────────────────────────
function Counter({
  to,
  prefix = "",
  suffix = "",
}: {
  to: number;
  prefix?: string;
  suffix?: string;
}) {
  const shouldReduceMotion = useReducedMotion();
  const spring = useSpring(0, { stiffness: 60, damping: 20 });
  const [display, setDisplay] = useState("0");
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!inView) return;
    spring.set(shouldReduceMotion ? to : to);
    const unsub = spring.on("change", (v) =>
      setDisplay(Math.round(v).toLocaleString())
    );
    return unsub;
  }, [inView, to, spring, shouldReduceMotion]);

  return (
    <motion.span
      onViewportEnter={() => setInView(true)}
      viewport={{ once: true }}
    >
      {prefix}
      {display}
      {suffix}
    </motion.span>
  );
}

// ── Dashboard Mockup SVG ─────────────────────────────────────
function DashboardMockup() {
  const bars = [65, 82, 45, 91, 73, 88, 56, 94, 68, 79, 85, 62];
  return (
    <div className="relative w-full rounded-2xl border border-border bg-card shadow-2xl shadow-black/20 dark:shadow-black/60 overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex gap-1.5">
          <div className="h-3 w-3 rounded-full bg-red-400/70" />
          <div className="h-3 w-3 rounded-full bg-amber-400/70" />
          <div className="h-3 w-3 rounded-full bg-emerald-400/70" />
        </div>
        <div className="flex-1 mx-4 h-5 rounded-md bg-muted/60 flex items-center px-2">
          <span className="text-[10px] text-muted-foreground/50 font-mono">
            dashboard.pesafy.io
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Stat cards row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Volume", value: "KES 248K", trend: "+12%" },
            { label: "Transactions", value: "1,847", trend: "+8%" },
            { label: "Success Rate", value: "99.2%", trend: "+0.3%" },
          ].map(({ label, value, trend }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.6 + i * 0.08,
                duration: 0.35,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="rounded-xl border border-border bg-background p-3"
            >
              <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                {label}
              </p>
              <p className="text-sm font-bold text-foreground mt-0.5">
                {value}
              </p>
              <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                {trend}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Chart */}
        <div className="rounded-xl border border-border bg-background p-3">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Payment Volume
            </p>
            <span className="text-[9px] text-muted-foreground">
              Last 12 months
            </span>
          </div>
          <div className="flex items-end gap-1 h-20">
            {bars.map((h, i) => (
              <motion.div
                key={i}
                className="flex-1 rounded-sm bg-primary/20"
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{
                  delay: 0.8 + i * 0.04,
                  duration: 0.4,
                  ease: [0.16, 1, 0.3, 1],
                }}
                style={{ height: `${h}%`, transformOrigin: "bottom" }}
              >
                <motion.div
                  className="w-full rounded-sm bg-primary"
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{
                    delay: 0.9 + i * 0.04,
                    duration: 0.35,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  style={{ height: "100%", transformOrigin: "bottom" }}
                />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Recent transactions */}
        <div className="rounded-xl border border-border bg-background p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Recent
          </p>
          <div className="space-y-2">
            {[
              {
                phone: "254 712 ••• 123",
                amount: "KES 5,000",
                status: "success",
              },
              {
                phone: "254 701 ••• 456",
                amount: "KES 1,200",
                status: "pending",
              },
              {
                phone: "254 722 ••• 789",
                amount: "KES 3,500",
                status: "success",
              },
            ].map((tx, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  delay: 1.1 + i * 0.07,
                  duration: 0.28,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center">
                    <Smartphone className="h-2.5 w-2.5 text-muted-foreground" />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {tx.phone}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-foreground">
                    {tx.amount}
                  </span>
                  <span
                    className={cn(
                      "text-[9px] font-semibold rounded-full px-1.5 py-0.5",
                      tx.status === "success"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                    )}
                  >
                    {tx.status}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Feature card ──────────────────────────────────────────────
function FeatureCard({
  icon: Icon,
  title,
  desc,
  accent,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
  accent: string;
}) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <motion.div
      variants={shouldReduceMotion ? undefined : staggerItem}
      whileHover={
        shouldReduceMotion
          ? undefined
          : { y: -4, boxShadow: "0 12px 40px -8px rgba(216,27,13,0.12)" }
      }
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className="group rounded-2xl border border-border bg-card p-6 transition-colors duration-300"
    >
      <motion.div
        whileHover={{ scale: 1.12, rotate: 6 }}
        transition={{ type: "spring", stiffness: 500, damping: 26 }}
        className={cn(
          "inline-flex h-11 w-11 items-center justify-center rounded-xl mb-4",
          accent
        )}
      >
        <Icon className="h-5 w-5 text-primary" />
      </motion.div>
      <h3 className="font-display text-base font-bold text-foreground mb-2">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </motion.div>
  );
}

const FEATURES = [
  {
    icon: Smartphone,
    title: "STK Push",
    desc: "Trigger mobile money prompts directly on your customer's phone. No redirects, no friction.",
    accent: "bg-primary/10",
  },
  {
    icon: Webhook,
    title: "Real-time Webhooks",
    desc: "Instant callbacks for every payment event. Build reactive workflows without polling.",
    accent: "bg-primary/10",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    desc: "Monitor volume, success rates, and trends in one unified, real-time dashboard.",
    accent: "bg-primary/10",
  },
  {
    icon: Code2,
    title: "Developer-first API",
    desc: "Clean REST API with TypeScript SDK, comprehensive docs, and sandbox environment.",
    accent: "bg-primary/10",
  },
  {
    icon: Shield,
    title: "Bank-grade Security",
    desc: "Encrypted credentials, signed webhooks, and audit logs. Built for compliance.",
    accent: "bg-primary/10",
  },
  {
    icon: RefreshCw,
    title: "Smart Retries",
    desc: "Automatic retry logic with exponential backoff keeps your payment success rate high.",
    accent: "bg-primary/10",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Create your account",
    desc: "Sign up free, create a business, and choose sandbox or production mode.",
  },
  {
    step: "02",
    title: "Add your credentials",
    desc: "Paste your Safaricom M-Pesa API keys — we encrypt and store them securely.",
  },
  {
    step: "03",
    title: "Integrate in minutes",
    desc: "Use our REST API or TypeScript SDK to trigger STK Pushes from your app.",
  },
  {
    step: "04",
    title: "Monitor everything",
    desc: "Watch transactions flow in real-time. Configure webhooks for instant notifications.",
  },
];

export default function LandingPage() {
  const shouldReduceMotion = useReducedMotion();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(
    scrollYProgress,
    [0, 1],
    [0, shouldReduceMotion ? 0 : 80]
  );
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 overflow-x-hidden">
      <LandingHeader />

      {/* ── Hero ──────────────────────────────────────────── */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex items-center pt-16 overflow-hidden"
      >
        {/* Grid bg */}
        <div className="absolute inset-0 grid-bg opacity-60 dark:opacity-40" />

        {/* Ambient glows */}
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.06, 0.12, 0.06] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-1/3 h-[500px] w-[500px] rounded-full bg-primary blur-[120px] pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.04, 0.08, 0.04] }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 3,
          }}
          className="absolute bottom-1/4 right-1/4 h-[400px] w-[400px] rounded-full bg-orange-400 blur-[100px] pointer-events-none"
        />

        <motion.div
          style={
            shouldReduceMotion ? undefined : { y: heroY, opacity: heroOpacity }
          }
          className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-20 lg:py-28"
        >
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: copy */}
            <div>
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.85, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-4 py-1.5 text-xs font-semibold text-primary mb-6"
              >
                <motion.span
                  animate={{ scale: [1, 1.4, 1] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="h-1.5 w-1.5 rounded-full bg-primary"
                />
                Now in public beta — free for developers
              </motion.div>

              {/* Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.1,
                  duration: 0.55,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="font-display text-fluid-3xl font-extrabold leading-[1.1] tracking-tight text-foreground"
              >
                M-Pesa Payments
                <br />
                <span className="text-primary">Built for Builders</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.18,
                  duration: 0.45,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="mt-5 text-lg text-muted-foreground leading-relaxed max-w-md"
              >
                The fastest way to integrate M-Pesa into your product. STK Push,
                webhooks, analytics, and a full dashboard — all in one API.
              </motion.p>

              {/* CTA buttons */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.26,
                  duration: 0.4,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="mt-8 flex flex-wrap gap-3"
              >
                <Link to="/login?mode=signup">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="inline-flex items-center gap-2.5 rounded-xl bg-primary px-6 py-3.5 text-base font-bold text-white shadow-xl shadow-primary/25 hover:bg-primary/85"
                  >
                    Start for free
                    <motion.span
                      animate={{ x: [0, 4, 0] }}
                      transition={{
                        duration: 1.4,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    >
                      <ArrowRight className="h-4 w-4" />
                    </motion.span>
                  </motion.button>
                </Link>

                <motion.button
                  type="button"
                  onClick={() =>
                    document
                      .querySelector("#how-it-works")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-6 py-3.5 text-base font-semibold text-foreground hover:bg-muted transition-colors"
                >
                  See how it works
                </motion.button>
              </motion.div>

              {/* Trust line */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45, duration: 0.35 }}
                className="mt-8 flex flex-wrap items-center gap-4 text-xs text-muted-foreground"
              >
                {[
                  { icon: CheckCircle, text: "No card required" },
                  { icon: Lock, text: "Bank-grade security" },
                  { icon: Globe, text: "Sandbox included" },
                ].map(({ icon: Icon, text }) => (
                  <span key={text} className="flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5 text-primary" />
                    {text}
                  </span>
                ))}
              </motion.div>
            </div>

            {/* Right: dashboard mockup */}
            <motion.div
              initial={{ opacity: 0, x: 40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{
                delay: 0.2,
                duration: 0.6,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="relative"
            >
              {/* Glow behind mockup */}
              <div className="absolute -inset-4 rounded-3xl bg-primary/6 blur-xl" />
              <DashboardMockup />

              {/* Floating notification card */}
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  delay: 1.4,
                  type: "spring",
                  stiffness: 300,
                  damping: 24,
                }}
                animate-y={shouldReduceMotion ? undefined : undefined}
                className="absolute -bottom-4 -left-4 flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-xl shadow-black/10 dark:shadow-black/40"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10">
                  <Bell className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-foreground">
                    Payment received
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    KES 5,000 · just now
                  </p>
                </div>
                <motion.span
                  animate={{ scale: [1, 1.4, 1] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="h-2 w-2 rounded-full bg-emerald-400"
                />
              </motion.div>

              {/* Floating API badge */}
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  delay: 1.6,
                  type: "spring",
                  stiffness: 300,
                  damping: 24,
                }}
                className="absolute -top-4 -right-4 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-xl shadow-black/10 dark:shadow-black/40"
              >
                <Code2 className="h-3.5 w-3.5 text-primary" />
                <span className="font-mono text-[11px] font-bold text-foreground">
                  200 OK · 87ms
                </span>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            className="h-6 w-0.5 rounded-full bg-primary/30"
          />
        </motion.div>
      </section>

      {/* ── Stats bar ─────────────────────────────────────── */}
      <section className="border-y border-border bg-muted/20 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={shouldReduceMotion ? undefined : stagger}
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            className="grid grid-cols-2 gap-8 lg:grid-cols-4"
          >
            {[
              { value: 99.9, suffix: "%", label: "API Uptime", prefix: "" },
              {
                value: 87,
                suffix: "ms",
                label: "Avg Response Time",
                prefix: "<",
              },
              {
                value: 1000,
                suffix: "+",
                label: "API Calls / sec",
                prefix: "",
              },
              {
                value: 24,
                suffix: "/7",
                label: "Support Available",
                prefix: "",
              },
            ].map(({ value, suffix, label, prefix }) => (
              <motion.div
                key={label}
                variants={shouldReduceMotion ? undefined : staggerItem}
                className="text-center"
              >
                <p className="font-display text-3xl sm:text-4xl font-extrabold text-primary">
                  <Counter to={value} prefix={prefix} suffix={suffix} />
                </p>
                <p className="mt-1.5 text-sm text-muted-foreground font-medium">
                  {label}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────── */}
      <section id="features" className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={shouldReduceMotion ? undefined : fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            className="text-center mb-16"
          >
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-primary mb-4">
              Features
            </span>
            <h2 className="font-display text-fluid-2xl font-extrabold text-foreground">
              Everything you need to accept M-Pesa
            </h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
              Stop gluing together multiple services. Pesafy gives you payments,
              webhooks, analytics and security in one unified platform.
            </p>
          </motion.div>

          <motion.div
            variants={shouldReduceMotion ? undefined : stagger}
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {FEATURES.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────── */}
      <section
        id="how-it-works"
        className="py-20 lg:py-28 bg-muted/20 border-y border-border"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={shouldReduceMotion ? undefined : fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            className="text-center mb-16"
          >
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-primary mb-4">
              How It Works
            </span>
            <h2 className="font-display text-fluid-2xl font-extrabold text-foreground">
              Go live in under 10 minutes
            </h2>
          </motion.div>

          <motion.div
            variants={shouldReduceMotion ? undefined : stagger}
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 relative"
          >
            {/* Connecting line (desktop) */}
            <div className="absolute top-8 left-[12.5%] right-[12.5%] h-px bg-border hidden lg:block" />

            {HOW_IT_WORKS.map(({ step, title, desc }, i) => (
              <motion.div
                key={step}
                variants={shouldReduceMotion ? undefined : staggerItem}
                className="relative text-center lg:text-left"
              >
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 26 }}
                  className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white font-display font-bold text-lg shadow-lg shadow-primary/25 mb-5 relative z-10"
                >
                  {step}
                </motion.div>
                <h3 className="font-display text-base font-bold text-foreground mb-2">
                  {title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Pricing teaser ────────────────────────────────── */}
      <section id="pricing" className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={shouldReduceMotion ? undefined : fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            className="text-center mb-14"
          >
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-primary mb-4">
              Pricing
            </span>
            <h2 className="font-display text-fluid-2xl font-extrabold text-foreground">
              Simple, usage-based pricing
            </h2>
            <p className="mt-4 text-muted-foreground">
              Start free. Pay only when you go live.
            </p>
          </motion.div>

          <motion.div
            variants={shouldReduceMotion ? undefined : stagger}
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            className="grid gap-6 sm:grid-cols-3 max-w-4xl mx-auto"
          >
            {[
              {
                name: "Sandbox",
                price: "Free",
                period: "forever",
                features: [
                  "Unlimited test transactions",
                  "Full API access",
                  "Webhook testing",
                  "Dashboard & analytics",
                ],
                cta: "Start free",
                primary: false,
              },
              {
                name: "Production",
                price: "1.2%",
                period: "per transaction",
                features: [
                  "All sandbox features",
                  "Live M-Pesa transactions",
                  "Priority support",
                  "SLA guarantee",
                ],
                cta: "Go live",
                primary: true,
              },
              {
                name: "Enterprise",
                price: "Custom",
                period: "contact us",
                features: [
                  "Volume discounts",
                  "Dedicated support",
                  "Custom integrations",
                  "On-prem option",
                ],
                cta: "Contact us",
                primary: false,
              },
            ].map(({ name, price, period, features, cta, primary }, i) => (
              <motion.div
                key={name}
                variants={shouldReduceMotion ? undefined : staggerItem}
                whileHover={
                  shouldReduceMotion
                    ? undefined
                    : {
                        y: -6,
                        boxShadow: primary
                          ? "0 20px 60px -12px rgba(216,27,13,0.25)"
                          : "0 12px 40px -8px rgba(0,0,0,0.1)",
                      }
                }
                transition={{ type: "spring", stiffness: 400, damping: 28 }}
                className={cn(
                  "relative rounded-2xl border p-6 transition-colors duration-300",
                  primary
                    ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                    : "border-border bg-card"
                )}
              >
                {primary && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-primary px-3 py-1 text-[10px] font-bold text-white shadow-md shadow-primary/30">
                      Most Popular
                    </span>
                  </div>
                )}
                <p className="font-display text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">
                  {name}
                </p>
                <p className="font-display text-3xl font-extrabold text-foreground">
                  {price}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 mb-5">
                  {period}
                </p>
                <ul className="space-y-2.5 mb-6">
                  {features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to="/login?mode=signup">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className={cn(
                      "w-full rounded-xl py-2.5 text-sm font-bold transition-colors",
                      primary
                        ? "bg-primary text-white hover:bg-primary/85 shadow-lg shadow-primary/20"
                        : "border border-border bg-background hover:bg-muted text-foreground"
                    )}
                  >
                    {cta}
                  </motion.button>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CTA banner ────────────────────────────────────── */}
      <section className="py-20 relative overflow-hidden border-t border-border">
        <div className="absolute inset-0 grid-bg opacity-40 dark:opacity-25" />
        <motion.div
          animate={{ scale: [1, 1.12, 1] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <div className="h-[500px] w-[500px] rounded-full bg-primary/6 blur-[100px]" />
        </motion.div>

        <motion.div
          variants={shouldReduceMotion ? undefined : fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          className="relative mx-auto max-w-3xl px-4 text-center"
        >
          <h2 className="font-display text-fluid-2xl font-extrabold text-foreground">
            Ready to accept M-Pesa?
          </h2>
          <p className="mt-4 text-muted-foreground text-lg max-w-lg mx-auto">
            Join developers building on Pesafy. Sandbox is free forever — no
            credit card required.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/login?mode=signup">
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 500, damping: 28 }}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-4 text-base font-bold text-white shadow-xl shadow-primary/25 hover:bg-primary/85"
              >
                Create free account <ArrowRight className="h-4 w-4" />
              </motion.button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ────────────────────────────────────────── */}
      <footer className="border-t border-border py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary shadow-sm">
              <Zap className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-display text-sm font-bold text-foreground">
              Pesafy
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Pesafy. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Terms
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Docs
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

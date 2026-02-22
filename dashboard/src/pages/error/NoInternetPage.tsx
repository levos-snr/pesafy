import { motion, useReducedMotion } from "framer-motion";
import { RefreshCw, WifiOff, Zap } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { stagger, staggerItem } from "@/lib/variants";

const RETRY_INTERVAL = 5000;

export default function NoInternetPage() {
  const shouldReduceMotion = useReducedMotion();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [retrying, setRetrying] = useState(false);
  const [countdown, setCountdown] = useState(RETRY_INTERVAL / 1000);

  const retry = useCallback(async () => {
    setRetrying(true);
    try {
      // Lightweight ping to check connectivity
      await fetch("/favicon.ico", { method: "HEAD", cache: "no-store" });
      setIsOnline(true);
      window.location.reload();
    } catch {
      setRetrying(false);
      setCountdown(RETRY_INTERVAL / 1000);
    }
  }, []);

  // Listen to browser online/offline events
  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      window.location.reload();
    };
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // Auto-retry countdown
  useEffect(() => {
    if (isOnline) return;
    const tick = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          retry();
          return RETRY_INTERVAL / 1000;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [isOnline, retry]);

  // Signal bar heights
  const bars = [4, 8, 12, 16];

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-16 transition-colors duration-300">
      {/* Ambient */}
      <motion.div
        animate={
          shouldReduceMotion
            ? {}
            : { scale: [1, 1.08, 1], opacity: [0.04, 0.08, 0.04] }
        }
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 h-[400px] w-[500px] rounded-full bg-amber-400/30 blur-[120px]"
      />

      <motion.div
        variants={shouldReduceMotion ? undefined : stagger}
        initial="hidden"
        animate="visible"
        className="relative z-10 flex flex-col items-center text-center max-w-md"
      >
        {/* Logo */}
        <motion.div variants={staggerItem} className="mb-10">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/30">
              <Zap className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-display text-lg font-bold text-foreground">
              Pesafy
            </span>
          </Link>
        </motion.div>

        {/* Animated wifi / signal icon */}
        <motion.div variants={staggerItem} className="relative mb-8">
          <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-amber-500/8 border border-amber-500/20">
            {/* Animated signal bars that drop */}
            <div className="flex items-end gap-1 h-10">
              {bars.map((h, i) => (
                <motion.div
                  key={i}
                  className="w-2.5 rounded-sm"
                  initial={{ height: h * 4, opacity: 1 }}
                  animate={
                    shouldReduceMotion
                      ? {}
                      : {
                          opacity: i >= 2 ? [1, 0.15, 1] : 1,
                          backgroundColor:
                            i >= 2
                              ? [
                                  "rgb(245 158 11)",
                                  "rgb(113 113 122)",
                                  "rgb(245 158 11)",
                                ]
                              : "rgb(245 158 11)",
                        }
                  }
                  transition={{
                    duration: 1.8,
                    repeat: Infinity,
                    delay: i * 0.18,
                    ease: "easeInOut",
                  }}
                  style={{ height: h * 4 }}
                />
              ))}
            </div>

            {/* Slash through */}
            <motion.div
              animate={shouldReduceMotion ? {} : { rotate: [0, 5, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute bottom-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive/90"
            >
              <WifiOff className="h-3 w-3 text-white" />
            </motion.div>
          </div>
        </motion.div>

        <motion.h1
          variants={staggerItem}
          className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-3"
        >
          No internet connection
        </motion.h1>

        <motion.p
          variants={staggerItem}
          className="text-muted-foreground leading-relaxed mb-8"
        >
          Check your Wi-Fi or mobile data, then try again. We'll auto-retry in a
          moment.
        </motion.p>

        {/* Countdown ring */}
        <motion.div
          variants={staggerItem}
          className="relative mb-8 flex flex-col items-center gap-2"
        >
          <div className="relative h-16 w-16">
            {/* Track */}
            <svg
              className="absolute inset-0 h-full w-full -rotate-90"
              viewBox="0 0 64 64"
            >
              <circle
                cx="32"
                cy="32"
                r="28"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                className="text-border"
              />
              {/* Progress arc */}
              <motion.circle
                cx="32"
                cy="32"
                r="28"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                className="text-primary"
                strokeDasharray={2 * Math.PI * 28}
                strokeDashoffset={
                  2 * Math.PI * 28 * (1 - countdown / (RETRY_INTERVAL / 1000))
                }
                style={{ transition: "stroke-dashoffset 0.9s linear" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-display text-sm font-bold text-foreground">
                {countdown}s
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Auto-retrying</p>
        </motion.div>

        {/* Tips */}
        <motion.div
          variants={staggerItem}
          className="w-full rounded-2xl border border-border bg-card p-4 mb-8 text-left"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Troubleshooting
          </p>
          <div className="space-y-2.5">
            {[
              "Check your Wi-Fi is turned on",
              "Try switching to mobile data",
              "Move closer to your router",
              "Restart your router or device",
            ].map((tip) => (
              <div
                key={tip}
                className="flex items-start gap-2 text-sm text-muted-foreground"
              >
                <span className="text-amber-500 mt-0.5">•</span>
                {tip}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Retry button */}
        <motion.div variants={staggerItem}>
          <motion.button
            type="button"
            onClick={retry}
            disabled={retrying}
            whileHover={retrying ? undefined : { scale: 1.04 }}
            whileTap={retrying ? undefined : { scale: 0.96 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary/85 disabled:opacity-55 shadow-lg shadow-primary/20"
          >
            <motion.span
              animate={
                retrying && !shouldReduceMotion
                  ? { rotate: 360 }
                  : { rotate: 0 }
              }
              transition={
                retrying
                  ? { duration: 0.7, repeat: Infinity, ease: "linear" }
                  : {}
              }
            >
              <RefreshCw className="h-4 w-4" />
            </motion.span>
            {retrying ? "Checking…" : "Retry now"}
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
}

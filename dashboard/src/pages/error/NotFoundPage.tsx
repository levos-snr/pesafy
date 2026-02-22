import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Compass, Home, Zap } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { stagger, staggerItem } from "@/lib/variants";

export default function NotFoundPage() {
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-16 transition-colors duration-300">
      {/* Grid bg */}
      <div className="absolute inset-0 grid-bg opacity-50 dark:opacity-30 pointer-events-none" />

      {/* Ambient glow */}
      <motion.div
        animate={
          shouldReduceMotion
            ? {}
            : { scale: [1, 1.08, 1], opacity: [0.04, 0.09, 0.04] }
        }
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 h-[500px] w-[500px] rounded-full bg-primary blur-[120px]"
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

        {/* Big 404 with floating compass */}
        <motion.div
          variants={staggerItem}
          className="relative mb-6 select-none"
        >
          <span className="font-display text-[9rem] sm:text-[11rem] font-extrabold leading-none text-foreground/8">
            404
          </span>
          {/* Compass floating over */}
          <motion.div
            animate={
              shouldReduceMotion
                ? {}
                : {
                    y: [0, -12, 0],
                    rotate: [0, 10, -5, 0],
                  }
            }
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 border border-primary/20 backdrop-blur-sm">
              <Compass className="h-9 w-9 text-primary" strokeWidth={1.5} />
            </div>
          </motion.div>
        </motion.div>

        <motion.h1
          variants={staggerItem}
          className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-3"
        >
          Lost in space
        </motion.h1>

        <motion.p
          variants={staggerItem}
          className="text-muted-foreground leading-relaxed mb-8"
        >
          The page you're looking for doesn't exist or has been moved to a
          different URL.
        </motion.p>

        {/* Suggestions */}
        <motion.div
          variants={staggerItem}
          className="w-full rounded-2xl border border-border bg-card p-4 mb-8 text-left"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Try one of these instead
          </p>
          <div className="space-y-1">
            {[
              { label: "Dashboard", path: "/" },
              { label: "Payments", path: "/payments" },
              { label: "Settings", path: "/settings" },
            ].map(({ label, path }) => (
              <Link key={path} to={path}>
                <motion.div
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  <span className="text-primary/50">→</span> {label}
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div
          variants={staggerItem}
          className="flex flex-wrap gap-3 justify-center"
        >
          <motion.button
            type="button"
            onClick={() => navigate(-1)}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-5 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Go back
          </motion.button>
          <Link to="/">
            <motion.button
              type="button"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/85 shadow-lg shadow-primary/20"
            >
              <Home className="h-4 w-4" /> Dashboard
            </motion.button>
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}

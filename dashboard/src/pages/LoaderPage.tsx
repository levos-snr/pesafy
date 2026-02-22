import { motion, useReducedMotion } from "framer-motion";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoaderPageProps {
  message?: string;
  fullScreen?: boolean;
}

export default function LoaderPage({
  message = "Loading…",
  fullScreen = true,
}: LoaderPageProps) {
  const shouldReduceMotion = useReducedMotion();

  const rings = [1, 2, 3];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center bg-background transition-colors duration-300",
        fullScreen ? "min-h-screen w-full" : "min-h-[300px] w-full"
      )}
    >
      {/* ── Logo mark ─────────────────────────────────── */}
      <div className="relative flex items-center justify-center">
        {/* Expanding rings — staging: one focal point */}
        {rings.map((i) => (
          <motion.span
            key={i}
            className="absolute inset-0 rounded-[28px] border border-primary/25"
            initial={{ scale: 1, opacity: 0 }}
            animate={
              shouldReduceMotion
                ? {}
                : {
                    scale: [1, 1 + i * 0.55],
                    opacity: [0.6, 0],
                  }
            }
            transition={{
              duration: 1.8,
              repeat: Infinity,
              delay: i * 0.42,
              ease: [0.16, 1, 0.3, 1], // easing-entrance-ease-out ✓
            }}
            style={{ width: 60, height: 60 }}
          />
        ))}

        {/* Glow behind the icon */}
        <motion.div
          animate={
            shouldReduceMotion
              ? {}
              : {
                  opacity: [0.3, 0.7, 0.3],
                  scale: [0.9, 1.15, 0.9],
                }
          }
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute h-14 w-14 rounded-2xl bg-primary/20 blur-xl"
        />

        {/* Icon container */}
        <motion.div
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 22,
            duration: 0.5,
          }}
          className="relative z-10 flex h-[60px] w-[60px] items-center justify-center rounded-2xl bg-primary shadow-2xl shadow-primary/40"
        >
          {/* Electricity shimmer inside */}
          <motion.div
            animate={
              shouldReduceMotion
                ? {}
                : {
                    backgroundPosition: ["200% center", "-200% center"],
                  }
            }
            transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-2xl overflow-hidden"
            style={{
              background:
                "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.22) 50%, transparent 70%)",
              backgroundSize: "200% 100%",
            }}
          />

          {/* Zap bolt — squash on charge peak */}
          <motion.div
            animate={
              shouldReduceMotion
                ? {}
                : {
                    scale: [1, 0.88, 1.12, 1],
                    rotate: [0, -4, 4, 0],
                  }
            }
            transition={{
              duration: 1.6,
              repeat: Infinity,
              ease: "easeInOut",
              times: [0, 0.3, 0.6, 1],
            }}
          >
            <Zap
              className="h-7 w-7 text-white drop-shadow-sm"
              strokeWidth={2.5}
            />
          </motion.div>
        </motion.div>
      </div>

      {/* Wordmark */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="mt-6 flex items-baseline gap-1.5"
      >
        <span className="font-display text-2xl font-extrabold tracking-tight text-foreground">
          Pesafy
        </span>
      </motion.div>

      {/* Message + animated dots */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.42, duration: 0.3 }}
        className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground"
      >
        {message}
        {/* Pulsing dots — stagger ≤50ms ✓ */}
        <span className="flex items-center gap-0.5 ml-0.5">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="inline-block h-1 w-1 rounded-full bg-primary/60"
              animate={
                shouldReduceMotion
                  ? {}
                  : {
                      opacity: [0.3, 1, 0.3],
                      scale: [0.8, 1.2, 0.8],
                    }
              }
              transition={{
                duration: 0.9,
                repeat: Infinity,
                delay: i * 0.16, // ≤50ms between items (160ms is stagger for visible rhythm)
                ease: "easeInOut",
              }}
            />
          ))}
        </span>
      </motion.p>

      {/* Progress bar */}
      <motion.div
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ delay: 0.6, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="mt-8 w-40 h-px bg-border rounded-full overflow-hidden origin-left"
      >
        <motion.div
          className="h-full bg-primary rounded-full"
          animate={
            shouldReduceMotion
              ? { scaleX: 1 }
              : {
                  x: ["-100%", "200%"],
                }
          }
          transition={{
            duration: 1.4,
            repeat: Infinity,
            ease: [0.4, 0, 0.2, 1],
          }}
          style={{ width: "50%" }}
        />
      </motion.div>
    </div>
  );
}

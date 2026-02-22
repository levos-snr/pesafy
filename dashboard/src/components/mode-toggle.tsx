import { AnimatePresence, motion } from "framer-motion";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "./theme-provider";

const ORDER: Array<"light" | "dark" | "system"> = ["light", "dark", "system"];

const iconVariants = {
  enter: { opacity: 0, rotate: -45, scale: 0.5 },
  center: {
    opacity: 1,
    rotate: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 520, damping: 26 }, // physics-spring-for-overshoot
  },
  exit: {
    opacity: 0,
    rotate: 45,
    scale: 0.5,
    transition: { duration: 0.15, ease: [0.4, 0, 1, 1] }, // easing-exit-ease-in
  },
};

const Icon = ({ theme }: { theme: "light" | "dark" | "system" }) => {
  if (theme === "dark") return <Moon className="h-[1.1rem] w-[1.1rem]" />;
  if (theme === "system") return <Monitor className="h-[1.1rem] w-[1.1rem]" />;
  return <Sun className="h-[1.1rem] w-[1.1rem]" />;
};

const label: Record<string, string> = {
  light: "Switch to dark mode",
  dark: "Switch to system mode",
  system: "Switch to light mode",
};

export function ModeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  const cycle = () => {
    const idx = ORDER.indexOf(theme as (typeof ORDER)[number]);
    setTheme(ORDER[(idx + 1) % ORDER.length]);
  };

  return (
    <motion.button
      type="button"
      aria-label={label[theme] ?? "Toggle theme"}
      onClick={cycle}
      /* physics-active-state + physics-subtle-deformation */
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.93 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }} // timing-under-300ms ✓
      className={cn(
        "relative flex h-9 w-9 items-center justify-center overflow-hidden",
        "rounded-xl border border-border bg-background",
        "text-muted-foreground hover:text-foreground hover:bg-muted",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
    >
      {/* Ripple highlight on hover */}
      <motion.span
        className="absolute inset-0 rounded-xl bg-primary/8"
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.18 }}
      />

      {/* Icon swap with AnimatePresence — staging-one-focal-point */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          variants={iconVariants}
          initial="enter"
          animate="center"
          exit="exit"
          className="relative flex items-center justify-center"
        >
          <Icon theme={(theme as (typeof ORDER)[number]) ?? "system"} />
        </motion.span>
      </AnimatePresence>

      <span className="sr-only">{label[theme]}</span>
    </motion.button>
  );
}

/**
 * pages/settings/AppearanceSettings.tsx — /settings/appearance
 */
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import { fadeUp } from "@/lib/variants";
import { SectionCard } from "./shared";

export default function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  const reduce = useReducedMotion();

  return (
    <div className="space-y-5">
      <motion.div
        variants={reduce ? undefined : fadeUp}
        initial="hidden"
        animate="visible"
      >
        <h2 className="font-display text-xl font-bold text-foreground">
          Appearance
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Customize how the dashboard looks
        </p>
      </motion.div>

      <motion.div
        variants={reduce ? undefined : fadeUp}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.05 }}
      >
        <SectionCard title="Theme" icon={Sun} desc="Choose your color theme">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Color Theme
          </p>
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                id: "light",
                label: "Light",
                icon: Sun,
                desc: "Clean and bright",
              },
              {
                id: "dark",
                label: "Dark",
                icon: Moon,
                desc: "Easy on the eyes",
              },
              {
                id: "system",
                label: "System",
                icon: Monitor,
                desc: "Follow OS setting",
              },
            ].map(({ id, label, icon: Icon, desc }) => (
              <motion.button
                key={id}
                type="button"
                onClick={() => setTheme(id as "light" | "dark" | "system")}
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: "spring", stiffness: 500, damping: 28 }}
                className={cn(
                  "relative flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all",
                  theme === id
                    ? "border-primary/40 bg-primary/6 ring-1 ring-primary/20"
                    : "border-border bg-muted/20 hover:border-primary/20"
                )}
              >
                <AnimatePresence>
                  {theme === id && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 26,
                      }}
                      className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary"
                    >
                      <Check
                        className="h-2.5 w-2.5 text-white"
                        strokeWidth={3}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl",
                    theme === id
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {label}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {desc}
                  </p>
                </div>
              </motion.button>
            ))}
          </div>

          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Language
            </p>
            <select className="rounded-xl border border-border bg-input px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="en">English</option>
              <option value="sw">Swahili</option>
            </select>
          </div>
        </SectionCard>
      </motion.div>
    </div>
  );
}

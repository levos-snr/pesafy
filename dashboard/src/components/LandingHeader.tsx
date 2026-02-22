import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { Menu, X, Zap } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ModeToggle } from "@/components/mode-toggle";
import { tapSpring } from "@/lib/variants";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "Docs", href: "#docs" },
];

export default function LandingHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const _shouldReduceMotion = useReducedMotion();
  const { scrollY } = useScroll();

  const bgOpacity = useTransform(scrollY, [0, 60], [0, 1]);
  const borderOpacity = useTransform(scrollY, [0, 60], [0, 1]);

  const scrollTo = (href: string) => {
    setMenuOpen(false);
    const el = document.querySelector(href);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 left-0 right-0 z-50"
    >
      {/* Animated glass background */}
      <motion.div
        style={{ opacity: bgOpacity }}
        className="absolute inset-0 bg-background/80 backdrop-blur-xl"
      />
      <motion.div
        style={{ opacity: borderOpacity }}
        className="absolute bottom-0 left-0 right-0 h-px bg-border"
      />

      <div className="relative mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <motion.div
            whileHover={{ rotate: [0, -15, 10, -5, 0], scale: 1.1 }}
            transition={{ duration: 0.5 }}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/30"
          >
            <Zap className="h-4 w-4 text-white" strokeWidth={2.5} />
          </motion.div>
          <span className="font-display text-lg font-bold tracking-tight text-foreground">
            Pesafy
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1 ml-6">
          {NAV_LINKS.map(({ label, href }, i) => (
            <motion.button
              key={label}
              type="button"
              onClick={() => scrollTo(href)}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.05 + i * 0.04,
                ease: [0.16, 1, 0.3, 1],
                duration: 0.3,
              }}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
              className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/60"
            >
              {label}
            </motion.button>
          ))}
        </nav>

        {/* Right actions */}
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <ModeToggle />

          <Link to="/login">
            <motion.button
              type="button"
              {...tapSpring}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              Sign in
            </motion.button>
          </Link>

          <Link to="/login?mode=signup">
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-primary/85 shadow-lg shadow-primary/20"
            >
              Get started <span className="hidden sm:inline">free</span>
            </motion.button>
          </Link>

          {/* Mobile menu button */}
          <motion.button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            {...tapSpring}
            className="flex lg:hidden h-9 w-9 items-center justify-center rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Toggle menu"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={menuOpen ? "x" : "menu"}
                initial={{ rotate: -90, scale: 0.6, opacity: 0 }}
                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                exit={{ rotate: 90, scale: 0.6, opacity: 0 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              >
                {menuOpen ? (
                  <X className="h-4 w-4" />
                ) : (
                  <Menu className="h-4 w-4" />
                )}
              </motion.span>
            </AnimatePresence>
          </motion.button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative overflow-hidden border-b border-border bg-background/95 backdrop-blur-xl lg:hidden"
          >
            <nav className="mx-auto max-w-7xl px-4 py-3 flex flex-col gap-1">
              {NAV_LINKS.map(({ label, href }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => scrollTo(href)}
                  className="w-full text-left px-3 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-xl transition-colors"
                >
                  {label}
                </button>
              ))}
              <div className="border-t border-border mt-1 pt-3 flex gap-2">
                <Link
                  to="/login"
                  className="flex-1"
                  onClick={() => setMenuOpen(false)}
                >
                  <button
                    type="button"
                    className="w-full px-4 py-2.5 text-sm font-semibold rounded-xl border border-border text-muted-foreground hover:bg-muted transition-colors"
                  >
                    Sign in
                  </button>
                </Link>
                <Link
                  to="/login?mode=signup"
                  className="flex-1"
                  onClick={() => setMenuOpen(false)}
                >
                  <button
                    type="button"
                    className="w-full px-4 py-2.5 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-primary/85 shadow-md shadow-primary/20"
                  >
                    Get started
                  </button>
                </Link>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

import type { Variants } from "framer-motion";

// ── Easing curves ─────────────────────────────────────────────
export const ease = {
  out: [0.16, 1, 0.3, 1] as const, // snappy settle — entrances
  in: [0.4, 0, 1, 1] as const, // builds momentum — exits
  inOut: [0.4, 0, 0.2, 1] as const, // balanced — state changes
  spring: { type: "spring", stiffness: 500, damping: 30 } as const,
  springBouncy: { type: "spring", stiffness: 600, damping: 22 } as const,
};

// ── Single element fade-up ─────────────────────────────────────
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.42, ease: ease.out },
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.98,
    transition: { duration: 0.22, ease: ease.in },
  },
};

// ── Fade only (no transform) ───────────────────────────────────
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3, ease: ease.inOut } },
  exit: { opacity: 0, transition: { duration: 0.2, ease: ease.in } },
};

// ── Stagger container (50ms max per child) ─────────────────────
export const stagger: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.05, delayChildren: 0.05 },
  },
};

// ── Stagger item ───────────────────────────────────────────────
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.36, ease: ease.out },
  },
};

// ── Hero entrance (more dramatic) ─────────────────────────────
export const heroEntrance: Variants = {
  hidden: { opacity: 0, y: 28, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.6, ease: ease.out },
  },
};

// ── Slide-in from left (sidebar) ──────────────────────────────
export const slideInLeft: Variants = {
  hidden: { x: "-100%", opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.28, ease: ease.out },
  },
  exit: {
    x: "-100%",
    opacity: 0,
    transition: { duration: 0.22, ease: ease.in },
  },
};

// ── Slide-in from right ────────────────────────────────────────
export const slideInRight: Variants = {
  hidden: { x: 24, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.3, ease: ease.out },
  },
  exit: {
    x: -16,
    opacity: 0,
    transition: { duration: 0.2, ease: ease.in },
  },
};

// ── Page-level transition ──────────────────────────────────────
export const pageTransition: Variants = {
  hidden: { opacity: 0, x: 16 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease: ease.out },
  },
  exit: {
    opacity: 0,
    x: -16,
    transition: { duration: 0.2, ease: ease.in },
  },
};

// ── Scale-pop (modal / card) ───────────────────────────────────
export const scalePop: Variants = {
  hidden: { opacity: 0, scale: 0.92, y: 12 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 400, damping: 28 },
  },
  exit: {
    opacity: 0,
    scale: 0.94,
    y: 8,
    transition: { duration: 0.2, ease: ease.in },
  },
};

// ── Backdrop (dim for focus — staging principle) ───────────────
export const backdrop: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.18, ease: ease.in } },
};

// ── Button spring tap props (inline — not variants) ────────────
export const tapSpring = {
  whileHover: { scale: 1.03 },
  whileTap: { scale: 0.97 }, // physics-subtle-deformation: 0.95-1.05
  transition: { type: "spring", stiffness: 500, damping: 30 },
} as const;

// ── Number counter spring ──────────────────────────────────────
// Used by Counter components — matches LandingPage's spring config
export const numberSpring = { stiffness: 60, damping: 20 };

// ── Step indicator variants ────────────────────────────────────
export const stepDot: Variants = {
  inactive: { scale: 1, opacity: 0.5 },
  active: { scale: 1.12, opacity: 1, transition: ease.spring },
  done: { scale: 1, opacity: 1 },
};

// ── Viewport options (used with whileInView) ───────────────────
export const viewport = { once: true, amount: 0.18 } as const;

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    tailwindcss(),
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler"]],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@convex": path.resolve(__dirname, "./convex"),
    },
    conditions: [
      "@convex-dev/component-source",
      "browser",
      "module",
      "import",
      "default",
    ],
    // dedupe is the correct way to prevent duplicate React — keep this
    dedupe: ["react", "react-dom"],
  },
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        /**
         * manualChunks — safe chunking strategy
         *
         * ROOT CAUSE OF THE WHITE SCREEN:
         * Isolating React into its own named chunk (react-vendor) causes a
         * race condition — packages in the generic `vendor` catch-all that
         * call React.createContext() execute before the react-vendor chunk
         * has finished initialising, so React is undefined at that point.
         *
         * FIX:
         * Do NOT put React/ReactDOM/ReactRouter in a manual chunk.
         * Let Vite's internal module graph keep React co-located with the
         * packages that depend on it. Only split truly independent,
         * heavy libraries that have no React initialisation dependency.
         */
        manualChunks(id) {
          // ── 1. Convex + auth ──────────────────────────────────────────────
          // These are always needed on first load and update together with
          // your backend schema. They don't call createContext on module init
          // so they are safe to isolate.
          if (
            id.includes("node_modules/convex/") ||
            id.includes("node_modules/better-auth/") ||
            id.includes("node_modules/@convex-dev/")
          ) {
            return "convex-auth";
          }

          // ── 2. Charting ───────────────────────────────────────────────────
          // recharts + d3 are large and only used on analytics/finance pages.
          // They have no React.createContext() calls at module init level
          // so isolating them is safe.
          if (
            id.includes("node_modules/recharts/") ||
            id.includes("node_modules/d3") ||
            id.includes("node_modules/victory-vendor/")
          ) {
            return "charting";
          }

          // ── 3. Framer Motion ──────────────────────────────────────────────
          // Large (~120 kB) and self-contained. Safe to isolate because it
          // does not call createContext synchronously at module evaluation.
          if (id.includes("node_modules/framer-motion/")) {
            return "animation";
          }

          // ── Everything else (React, ReactDOM, ReactRouter, Radix, Lucide,
          //    phone-input, etc.) ───────────────────────────────────────────
          // Let Rollup/Vite decide. This keeps React and all React-dependent
          // packages in the same dependency graph so createContext is always
          // called after React has initialised.
          return undefined;
        },
      },
    },
  },
});

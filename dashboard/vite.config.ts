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
    dedupe: ["react", "react-dom"],
  },
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        /**
         * manualChunks — Pesafy Dashboard chunking strategy
         *
         * Goals:
         *  1. Isolate stable vendor code so browsers cache it across deployments.
         *  2. Group large / infrequently-changing libs into dedicated chunks.
         *  3. Keep the main app bundle lean so only changed code busts the cache.
         *
         * Rule of thumb: favour fewer, well-named chunks over many tiny ones —
         * each extra HTTP round-trip on a cold load costs more than a slightly
         * larger file.
         */
        manualChunks(id) {
          // ── 1. React core ─────────────────────────────────────────────────
          // Isolated because it almost never changes between deployments.
          // Any update to your app code will NOT invalidate this chunk.
          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/") ||
            id.includes("node_modules/react-router-dom/") ||
            id.includes("node_modules/scheduler/")
          ) {
            return "react-vendor";
          }

          // ── 2. Convex + auth ──────────────────────────────────────────────
          // Grouped together: they update in lockstep with your backend schema
          // and are always needed on first load.
          if (
            id.includes("node_modules/convex/") ||
            id.includes("node_modules/better-auth/") ||
            id.includes("node_modules/@convex-dev/")
          ) {
            return "convex-auth";
          }

          // ── 3. Animation ──────────────────────────────────────────────────
          // framer-motion is large (~120 kB min+gz). Splitting it out means
          // pages that don't animate don't pay the cost on first paint.
          if (id.includes("node_modules/framer-motion/")) {
            return "animation";
          }

          // ── 4. Charting ───────────────────────────────────────────────────
          // recharts + its d3 sub-dependencies are only needed on analytics
          // and finance pages — lazy-load friendly.
          if (
            id.includes("node_modules/recharts/") ||
            id.includes("node_modules/d3") ||
            id.includes("node_modules/victory-vendor/")
          ) {
            return "charting";
          }

          // ── 5. UI primitives ──────────────────────────────────────────────
          // radix-ui, lucide-react, class-variance-authority, clsx, and
          // tailwind-merge are stable and used across every page.
          if (
            id.includes("node_modules/radix-ui/") ||
            id.includes("node_modules/@radix-ui/") ||
            id.includes("node_modules/lucide-react/") ||
            id.includes("node_modules/class-variance-authority/") ||
            id.includes("node_modules/clsx/") ||
            id.includes("node_modules/tailwind-merge/")
          ) {
            return "ui-primitives";
          }

          // ── 6. Phone input ────────────────────────────────────────────────
          // Used only on the onboarding / account pages; keep it out of the
          // initial bundle so login and dashboard load faster.
          if (id.includes("node_modules/react-phone-number-input/")) {
            return "phone-input";
          }

          // ── 7. Everything else in node_modules → generic vendor chunk ─────
          // Catches any transitive deps not matched above so they don't bloat
          // the app chunk. Remove this fallback if you prefer Rollup's default
          // automatic splitting behaviour.
          if (id.includes("node_modules/")) {
            return "vendor";
          }

          // App source: let Rollup decide based on the module graph.
          // Dynamic imports in App.tsx (route-level) already create natural
          // split points — no manual intervention needed here.
          return undefined;
        },
      },
    },
  },
});

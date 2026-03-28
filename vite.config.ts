// 📁 PATH: vite.config.ts

// vite.config.ts
import { defineConfig } from "vite-plus";

/**
 * Node built-ins used across the library.
 * Declaring them explicitly stops the tsdown:external plugin from
 * having to scan + auto-detect them on every build entry, which
 * eliminates the PLUGIN_TIMINGS "spent significant time in tsdown:external" warnings.
 */
const NODE_BUILTINS = [
  "node:fs",
  "node:fs/promises",
  "node:path",
  "node:crypto",
  "node:readline",
  "node:child_process",
  "node:buffer",
  "node:url",
  "node:os",
  "node:util",
  // bare versions — some bundlers resolve bare "fs" → "node:fs"
  "fs",
  "fs/promises",
  "path",
  "crypto",
  "readline",
  "child_process",
  "buffer",
  "url",
  "os",
  "util",
] as const;

/**
 * Suppress PLUGIN_TIMINGS warnings for internal tsdown/rolldown-plugin-dts
 * plugins (tsdown:report, tsdown:shebang, rolldown-plugin-dts:generate, etc.).
 * These are inherently slow during DTS generation and cannot be optimised further.
 */
const SHARED_CHECKS = { pluginTimings: false } as const;

export default defineConfig({
  pack: [
    // 1. Main library entry
    {
      entry: ["src/index.ts"],
      format: ["esm", "cjs"],
      dts: true,
      sourcemap: true,
      clean: true,
      minify: false,
      treeshake: true,
      outDir: "dist",
      target: "es2020",
      checks: SHARED_CHECKS,
      banner: {
        js: "// pesafy — M-PESA Daraja SDK\n// https://github.com/levos-snr/pesafy",
      },
      deps: {
        neverBundle: [...NODE_BUILTINS],
      },
    },

    // 2. CLI entry
    // ⚠️  No banner here — src/cli/index.ts already has #!/usr/bin/env node
    //     on line 1.  Adding a banner too causes [DUPLICATE_SHEBANG].
    {
      entry: ["src/cli/index.ts"],
      format: ["esm", "cjs"],
      dts: false,
      sourcemap: false,
      outDir: "dist/cli",
      target: "node18",
      checks: SHARED_CHECKS,
      deps: {
        neverBundle: [...NODE_BUILTINS],
      },
    },

    // 3. Express adapter
    {
      entry: ["src/express/index.ts"],
      format: ["esm", "cjs"],
      dts: true,
      sourcemap: true,
      outDir: "dist/express",
      target: "es2020",
      checks: SHARED_CHECKS,
      deps: {
        neverBundle: ["express", ...NODE_BUILTINS],
      },
    },

    // 4. Hono adapter
    {
      entry: ["src/adapters/hono.ts"],
      format: ["esm", "cjs"],
      dts: true,
      sourcemap: true,
      outDir: "dist/adapters",
      target: "es2020",
      checks: SHARED_CHECKS,
      deps: {
        neverBundle: ["hono", ...NODE_BUILTINS],
      },
    },

    // 5. Next.js adapter
    {
      entry: ["src/adapters/nextjs.ts"],
      format: ["esm", "cjs"],
      dts: true,
      sourcemap: true,
      outDir: "dist/adapters",
      target: "es2020",
      checks: SHARED_CHECKS,
      deps: {
        neverBundle: ["next", "next/server", ...NODE_BUILTINS],
      },
    },

    // 6. Fastify adapter
    {
      entry: ["src/adapters/fastify.ts"],
      format: ["esm", "cjs"],
      dts: true,
      sourcemap: true,
      outDir: "dist/adapters",
      target: "es2020",
      checks: SHARED_CHECKS,
      deps: {
        neverBundle: ["fastify", ...NODE_BUILTINS],
      },
    },

    // 7. React components
    {
      entry: { index: "src/components/react/index.tsx" },
      format: ["esm", "cjs"],
      dts: true,
      sourcemap: true,
      outDir: "dist/components/react",
      target: "es2020",
      checks: SHARED_CHECKS,
      deps: {
        neverBundle: ["react", "react-dom", ...NODE_BUILTINS],
      },
    },
  ],

  test: {
    include: ["src/**/*.test.ts", "src/**/*.spec.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/**/*.spec.ts", "src/**/*.d.ts", "src/cli/**"],
    },
  },

  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },

  staged: {
    "*.{ts,tsx}": "vp check --fix",
    "*.{js,mjs,cjs}": "vp check --fix",
  },
});

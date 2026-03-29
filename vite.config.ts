// 📁 PATH: vite.config.ts
import { defineConfig } from "vite-plus";

/**
 * Node built-ins used across the library.
 * Declaring them explicitly stops the tsdown:external plugin from
 * having to scan + auto-detect them on every build entry, which
 * eliminates the PLUGIN_TIMINGS "spent significant time in tsdown:external" warnings.
 */
const NODE_BUILTINS = [
  // node: protocol versions
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
  // ─── Pack (build entries) ─────────────────────────────────────────────────
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
    // ⚠️  No banner — src/cli/index.ts already carries #!/usr/bin/env node
    //     on line 1. Adding a banner too causes [DUPLICATE_SHEBANG].
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

  // ─── Tests ────────────────────────────────────────────────────────────────
  // vp test  → single run (CI-friendly, no watch)
  // vp test watch → interactive watch mode
  test: {
    // ── Discovery ──────────────────────────────────────────────────────────
    // Pick up both *.test.ts and *.spec.ts anywhere under src/
    include: ["src/**/*.{test,spec}.ts", "src/**/*.{test,spec}.tsx"],

    // Keep dist, CLI, and generated declaration files out of test runs
    exclude: ["**/node_modules/**", "**/dist/**", "src/cli/**", "src/**/*.d.ts"],

    // ── Runtime ────────────────────────────────────────────────────────────
    // All library code targets Node.js — no browser globals needed
    environment: "node",

    // ── Globals ────────────────────────────────────────────────────────────
    // Keep globals: false (the default) so every test file must import
    // { describe, it, expect, vi } explicitly. This keeps test files
    // portable and avoids accidental global pollution.
    globals: false,

    // ── Concurrency ────────────────────────────────────────────────────────
    // forks pool is the safest choice for code that touches Node crypto /
    // fs (like encryptSecurityCredential). It gives each worker its own
    // process so native-module state never bleeds between test files.
    pool: "forks",

    // ── Timeouts ───────────────────────────────────────────────────────────
    testTimeout: 10_000, // 10 s per test  (network mocks are instant, but keep headroom)
    hookTimeout: 10_000, // 10 s per before/after hook

    // ── Coverage ───────────────────────────────────────────────────────────
    // Run with:  vp test run --coverage
    coverage: {
      // v8 is built into Node — zero extra dependencies
      provider: "v8",

      // What to measure
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: [
        // test files themselves
        "src/**/*.{test,spec}.ts",
        "src/**/*.{test,spec}.tsx",
        // type-only declarations
        "src/**/*.d.ts",
        // CLI is excluded from coverage (mostly imperative glue code)
        "src/cli/**",
        // stub / empty component files
        "src/components/react/index.tsx",
        "src/components/react/styles.css",
      ],

      // Reporters
      // "text"   → printed to terminal after every run
      // "html"   → browsable report in ./coverage/
      // "lcov"   → consumed by GitHub Actions / Codecov / SonarQube
      reporter: ["text", "html", "lcov"],

      // Where to write the report
      reportsDirectory: "./coverage",

      // Always produce a coverage report, even when tests fail
      reportOnFailure: true,

      // Soft coverage thresholds — the build will warn (not fail) below these.
      // Raise these gradually as you add more tests.
      thresholds: {
        statements: 60,
        branches: 55,
        functions: 60,
        lines: 60,
      },
    },

    // ── Mock auto-reset ────────────────────────────────────────────────────
    // Clear spy call history between tests but keep implementations intact.
    // This matches the `beforeEach(() => vi.clearAllMocks())` pattern already
    // used in the test files, making it the consistent default everywhere.
    clearMocks: true,

    // Don't reset mock implementations between tests — each test that needs
    // a fresh implementation should use mockResolvedValueOnce / mockReturnValueOnce.
    mockReset: false,

    // Restore any vi.spyOn stubs to originals after each test suite
    restoreMocks: true,
  },

  // ─── Lint (Oxlint + tsgolint) ─────────────────────────────────────────────
  lint: {
    ignorePatterns: ["dist/**", "node_modules/**"],
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },

  // ─── Format (Oxfmt) ───────────────────────────────────────────────────────
  fmt: {
    singleQuote: false,
    trailingComma: "all",
    printWidth: 100,
    tabWidth: 2,
    semi: true,
  },

  // ─── Staged (lint-staged via vp staged) ───────────────────────────────────
  staged: {
    "*.{ts,tsx}": "vp check --fix",
    "*.{js,mjs,cjs}": "vp check --fix",
  },
});

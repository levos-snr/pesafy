import { defineConfig } from 'tsdown'

// Node built-ins are always external — never bundle them.
// Listed with both the "node:" protocol prefix and bare names for
// tools that still strip the prefix before resolving.
const NODE_BUILTINS = [
  'node:fs',
  'node:fs/promises',
  'node:path',
  'node:crypto',
  'node:readline',
  'node:child_process',
  'node:buffer',
  'node:url',
  'node:os',
  'node:util',
  'fs',
  'fs/promises',
  'path',
  'crypto',
  'readline',
  'child_process',
  'buffer',
  'url',
  'os',
  'util',
] as const

export default defineConfig([
  // ── 1. CORE ────────────────────────────────────────────────────────────────
  // ESM-only. CJS dropped: Node ≥18, Bun, Deno, and edge runtimes all support
  // native ESM. Shipping CJS alongside ESM doubled the dist size for no gain
  // in 2026.
  {
    entry: { index: 'src/index.ts' },
    format: ['esm'],
    outDir: 'dist',
    dts: true,
    sourcemap: false,
    clean: true,
    hash: false,
    treeshake: true,
    minify: true,
    target: 'es2020',
    // "neutral" instead of "node" keeps the bundle usable in edge runtimes
    // (Cloudflare Workers, Vercel Edge, Deno Deploy) which all support ESM
    // but not Node-specific globals. Node builtins are kept external via deps.
    platform: 'neutral',
    outputExtension: () => ({ js: '.js' }),
    deps: { neverBundle: [...NODE_BUILTINS] },
    publint: true,
  },

  // ── 2. CLI ─────────────────────────────────────────────────────────────────
  // CLI targets Node specifically and is never imported as a module, so:
  //   • platform: "node" (resolves process, __dirname shims, etc.)
  //   • minify: false (readable stack traces for developers)
  //   • dts: false (no type declarations needed for a binary)
  {
    entry: { cli: 'src/cli/index.ts' },
    format: ['esm'],
    outDir: 'dist',
    dts: false,
    sourcemap: false,
    clean: false,
    hash: false,
    minify: false,
    target: 'node18',
    platform: 'node',
    // Force .js extension so package.json bin/exports ("./dist/cli.js") matches.
    // Without this, tsdown emits .mjs when platform is "node" + format is "esm".
    outputExtension: () => ({ js: '.js' }),
    deps: { neverBundle: [...NODE_BUILTINS] },
  },

  // ── 3. ADAPTERS ────────────────────────────────────────────────────────────
  // Framework adapters are peer-dep'd against express/fastify/hono/next.
  // They must NEVER bundle those frameworks — only reference them as imports.
  {
    entry: {
      'adapters/express': 'src/express/index.ts',
      'adapters/hono': 'src/adapters/hono.ts',
      'adapters/nextjs': 'src/adapters/nextjs.ts',
      'adapters/fastify': 'src/adapters/fastify.ts',
    },
    format: ['esm'],
    outDir: 'dist',
    dts: true,
    sourcemap: false,
    clean: false,
    hash: false,
    treeshake: true,
    minify: true,
    target: 'es2020',
    platform: 'neutral',
    outputExtension: () => ({ js: '.js' }),
    deps: {
      neverBundle: [...NODE_BUILTINS, 'express', 'fastify', 'hono', 'next', 'next/server'],
    },
  },

  // ── 4. REACT ───────────────────────────────────────────────────────────────
  // Browser/React components. platform: "browser" ensures no Node shims bleed
  // in. react and react-dom stay external (peer deps).
  {
    entry: { 'react/index': 'src/components/react/index.tsx' },
    format: ['esm'],
    outDir: 'dist',
    dts: true,
    sourcemap: false,
    clean: false,
    hash: false,
    treeshake: true,
    minify: true,
    target: 'es2020',
    platform: 'browser',
    outputExtension: () => ({ js: '.js' }),
    deps: { neverBundle: ['react', 'react-dom', ...NODE_BUILTINS] },
  },
])

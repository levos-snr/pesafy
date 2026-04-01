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
  // ESM-only. "neutral" platform keeps the bundle usable in edge runtimes
  // (Cloudflare Workers, Vercel Edge, Deno Deploy). outputExtension forces
  // .js which is correct because package.json has "type":"module" — Node
  // treats .js as ESM in that context.
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
    target: 'esnext',
    platform: 'neutral',
    outputExtension: () => ({ js: '.js' }),
    deps: { neverBundle: [...NODE_BUILTINS] },
    publint: true,
  },

  // ── 2. CLI ─────────────────────────────────────────────────────────────────
  // tsdown with platform:"node" + format:"esm" always emits .mjs regardless
  // of outputExtension — this is intentional rolldown behaviour. We accept
  // .mjs here and align package.json bin + exports["./cli"] to match.
  // Switching to platform:"neutral" would suppress the .mjs emission but
  // would also lose Node-specific shims (process, __dirname, etc.) that the
  // CLI relies on, so we keep "node" and live with .mjs.
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
    // No outputExtension override — let tsdown emit its natural .mjs so
    // the filename matches what package.json bin/exports declare.
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
    target: 'esnext',
    platform: 'neutral',
    outputExtension: () => ({ js: '.js' }),
    deps: {
      neverBundle: [...NODE_BUILTINS, 'express', 'fastify', 'hono', 'next', 'next/server'],
    },
  },

  // ── 4. REACT ───────────────────────────────────────────────────────────────
  // Browser/React components. platform:"browser" ensures no Node shims bleed
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
    target: 'esnext',
    platform: 'browser',
    outputExtension: () => ({ js: '.js' }),
    deps: { neverBundle: ['react', 'react-dom', ...NODE_BUILTINS] },
  },
])

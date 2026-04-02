import { defineConfig } from 'tsdown'

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
    deps: { neverBundle: [...NODE_BUILTINS] },
  },

  // ── 3. ADAPTERS ────────────────────────────────────────────────────────────
  // All four adapter sources now live consistently under src/adapters/.
  {
    entry: {
      'adapters/express': 'src/adapters/express.ts',
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

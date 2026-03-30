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

const outExtensions = ({ format }: { format: string }) => ({
  js: format === 'cjs' ? '.cjs' : '.js',
  dts: format === 'cjs' ? '.d.cts' : '.d.ts',
})

export default defineConfig([
  // ── 1. CORE ────────────────────────────────────────────────────────────────
  {
    entry: { index: 'src/index.ts' },
    format: ['esm', 'cjs'],
    outDir: 'dist',
    outExtensions,
    dts: true,
    sourcemap: false,
    clean: true,
    hash: false,
    treeshake: true,
    minify: true,
    target: 'es2020',
    platform: 'neutral',
    deps: { neverBundle: [...NODE_BUILTINS] },
    publint: true,
  },

  // ── 2. CLI ─────────────────────────────────────────────────────────────────
  {
    entry: { cli: 'src/cli/index.ts' },
    format: ['esm'],
    outDir: 'dist',
    outExtensions,
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
  {
    entry: {
      'adapters/express': 'src/express/index.ts',
      'adapters/hono': 'src/adapters/hono.ts',
      'adapters/nextjs': 'src/adapters/nextjs.ts',
      'adapters/fastify': 'src/adapters/fastify.ts',
    },
    format: ['esm', 'cjs'],
    outDir: 'dist',
    outExtensions,
    dts: true,
    sourcemap: false,
    clean: false,
    hash: false,
    treeshake: true,
    minify: true,
    target: 'es2020',
    platform: 'neutral',
    deps: {
      neverBundle: [
        ...NODE_BUILTINS,
        'express',
        'fastify',
        'hono',
        'next',
        'next/server',
      ],
    },
  },

  // ── 4. REACT ───────────────────────────────────────────────────────────────
  {
    entry: { 'react/index': 'src/components/react/index.tsx' },
    format: ['esm'],
    outDir: 'dist',
    outExtensions,
    dts: true,
    sourcemap: false,
    clean: false,
    hash: false,
    treeshake: true,
    minify: true,
    target: 'es2020',
    platform: 'browser',
    deps: { neverBundle: ['react', 'react-dom', ...NODE_BUILTINS] },
  },
])

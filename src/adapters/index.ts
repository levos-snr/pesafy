/**
 * src/adapters/index.ts — Lazy adapter loaders
 *
 * Instead of barrel-exporting every adapter (which forces bundlers to include
 * all adapter code even when only one is used), this module exports async
 * factory functions that dynamically import the adapter only when called.
 *
 * Result:
 *   ✅  Adapter code is NOT present in the core bundle.
 *   ✅  Bundlers (webpack, rollup, esbuild, rolldown) can split it into a
 *       separate async chunk — zero cost unless the adapter is actually used.
 *   ✅  Works in edge runtimes (Cloudflare Workers, Deno, Bun).
 *
 * Usage (recommended — use the direct subpath imports for static bundling):
 *
 *   import { createMpesaExpressRouter } from "pesafy/adapters/express";
 *   import { createMpesaHonoRouter }    from "pesafy/adapters/hono";
 *
 * Usage (lazy / dynamic — when the adapter is conditionally needed):
 *
 *   import { loadExpressAdapter } from "pesafy/adapters";  // tiny wrapper only
 *
 *   const { createMpesaExpressRouter } = await loadExpressAdapter();
 *   createMpesaExpressRouter(router, config);
 */

/**
 * Lazily loads the Express adapter.
 * @returns All exports from `pesafy/adapters/express`
 */
export async function loadExpressAdapter() {
  return import('../express/index.js')
}

/**
 * Lazily loads the Hono adapter.
 * Works on Cloudflare Workers, Bun, Deno, and Node.js.
 * @returns All exports from `pesafy/adapters/hono`
 */
export async function loadHonoAdapter() {
  return import('./hono.js')
}

/**
 * Lazily loads the Next.js adapter.
 * Provides Route Handler factories for the App Router.
 * @returns All exports from `pesafy/adapters/nextjs`
 */
export async function loadNextjsAdapter() {
  return import('./nextjs.js')
}

/**
 * Lazily loads the Fastify adapter.
 * @returns All exports from `pesafy/adapters/fastify`
 */
export async function loadFastifyAdapter() {
  return import('./fastify.js')
}

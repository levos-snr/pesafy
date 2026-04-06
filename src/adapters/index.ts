/**
 * @file src/adapters/index.ts
 * Lazy adapter loaders — import only what you need.
 *
 * All adapters are tree-shakeable and peer-dependency safe:
 * a Hono project won't bundle Express code and vice versa.
 */

/** Lazily loads the Express adapter. Requires `express` peer dependency. */
export async function loadExpressAdapter() {
  return import('./express.js')
}

/** Lazily loads the Hono adapter. Works on Node.js, Bun, Deno, and Cloudflare Workers. */
export async function loadHonoAdapter() {
  return import('./hono.js')
}

/** Lazily loads the Next.js adapter. Provides Route Handler factories for the App Router. */
export async function loadNextjsAdapter() {
  return import('./nextjs.js')
}

/** Lazily loads the Fastify adapter. Requires `fastify` and `fastify-plugin` peer dependencies. */
export async function loadFastifyAdapter() {
  return import('./fastify.js')
}

// ── Re-export config types so consumers don't need framework-specific imports ──

export type { MpesaExpressConfig, StkSuccessPayload, StkFailurePayload } from './express.js'
export type { MpesaFastifyConfig } from './fastify.js'
export type { MpesaHonoConfig } from './hono.js'
export type { MpesaNextConfig, MpesaHandlers } from './nextjs.js'

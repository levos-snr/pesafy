/**
 * src/adapters/index.ts — Lazy adapter loaders

/** Lazily loads the Express adapter. */
export async function loadExpressAdapter() {
  return import('./express.js') // ← was '../express/index.js'
}

/** Lazily loads the Hono adapter. Works on Cloudflare Workers, Bun, Deno, and Node.js. */
export async function loadHonoAdapter() {
  return import('./hono.js')
}

/** Lazily loads the Next.js adapter. Provides Route Handler factories for the App Router. */
export async function loadNextjsAdapter() {
  return import('./nextjs.js')
}

/** Lazily loads the Fastify adapter. */
export async function loadFastifyAdapter() {
  return import('./fastify.js')
}

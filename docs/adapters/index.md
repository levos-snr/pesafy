# Adapters

**pesafy** ships with first-class adapters for the most popular Node.js and edge frameworks. Each adapter mounts all M-PESA routes with a single function call — no boilerplate required.

## Available Adapters

| Adapter                      | Import                    | Runtimes                               |
| ---------------------------- | ------------------------- | -------------------------------------- |
| [Express](/adapters/express) | `pesafy/adapters/express` | Node.js                                |
| [Fastify](/adapters/fastify) | `pesafy/adapters/fastify` | Node.js                                |
| [Hono](/adapters/hono)       | `pesafy/adapters/hono`    | Node.js, Bun, Deno, Cloudflare Workers |
| [Next.js](/adapters/nextjs)  | `pesafy/adapters/nextjs`  | Node.js, Vercel Edge                   |

## Installation

Install `pesafy` alongside your framework of choice:

::: code-group

```bash [Express]
npm install pesafy express
npm install -D @types/express
```

```bash [Fastify]
npm install pesafy fastify
```

```bash [Hono]
npm install pesafy hono
```

```bash [Next.js]
npm install pesafy
```

:::

## Quick Comparison

### Express

Attach all routes to an existing `Router`:

```ts
import express from 'express'
import { createMpesaExpressRouter } from 'pesafy/adapters/express'

const router = express.Router()
createMpesaExpressRouter(router, {
  /* config */
})
app.use('/api', router)
```

→ [Express docs](/adapters/express)

### Fastify

Register routes directly on a Fastify instance:

```ts
import Fastify from 'fastify'
import { registerMpesaRoutes } from 'pesafy/adapters/fastify'

const app = Fastify()
await registerMpesaRoutes(app, {
  /* config */
})
```

→ [Fastify docs](/adapters/fastify)

### Hono

Mount routes on a Hono app — works on any runtime including Cloudflare Workers:

```ts
import { Hono } from 'hono'
import { createMpesaHonoRouter } from 'pesafy/adapters/hono'

const app = new Hono()
createMpesaHonoRouter(app, {
  /* config */
})
export default app
```

→ [Hono docs](/adapters/hono)

### Next.js App Router

Individual typed Route Handlers for the App Router:

```ts
// app/api/mpesa/stk-push/route.ts
import { createStkPushHandler } from 'pesafy/adapters/nextjs'

export const POST = createStkPushHandler({
  /* config */
})
```

→ [Next.js docs](/adapters/nextjs)

## Common Configuration

All adapters share the base `MpesaConfig` options:

```ts
{
  // Required
  consumerKey:    string
  consumerSecret: string
  environment:    'sandbox' | 'production'

  // STK Push
  lipaNaMpesaShortCode?: string
  lipaNaMpesaPassKey?:   string

  // Initiator APIs (B2C, Reversal, Balance, Tax)
  initiatorName?:     string
  initiatorPassword?: string
  certificatePath?:   string   // path to .cer file

  // Dev
  skipIPCheck?: boolean  // NEVER true in production
}
```

## Choosing an Adapter

- **Express** — broadest ecosystem; use if you're already on Express 4/5.
- **Fastify** — best performance for high-throughput Node.js servers.
- **Hono** — best choice for edge runtimes, Cloudflare Workers, Bun, or Deno.
- **Next.js** — purpose-built for the App Router; no extra server needed.

If you're not using a framework, use the core [`Mpesa` class](/api) directly.

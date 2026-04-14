# Framework Adapters

pesafy ships drop-in adapters for the most popular Node.js frameworks. Mount all
M-PESA webhook routes with a single function call — no manual route wiring
needed.

## Available adapters

| Adapter            | Import path               | Mount function             |
| ------------------ | ------------------------- | -------------------------- |
| Express            | `pesafy/adapters/express` | `createMpesaExpressRouter` |
| Hono               | `pesafy/adapters/hono`    | `createMpesaHonoRouter`    |
| Next.js App Router | `pesafy/adapters/nextjs`  | `createMpesaNextHandlers`  |
| Fastify            | `pesafy/adapters/fastify` | `registerMpesaRoutes`      |

## Quick example

```ts
import express from 'express'
import { createMpesaExpressRouter } from 'pesafy/adapters/express'

const app = express()
app.use(express.json())

const router = express.Router()

createMpesaExpressRouter(router, {
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: 'sandbox',
  lipaNaMpesaShortCode: process.env.MPESA_SHORTCODE!,
  lipaNaMpesaPassKey: process.env.MPESA_PASSKEY!,
  callbackUrl: 'https://yourdomain.com/api/mpesa/express/callback',
})

app.use('/api', router)
app.listen(3000)
```

## Feature coverage by adapter

| Feature              | Express | Hono | Fastify | Next.js |
| -------------------- | :-----: | :--: | :-----: | :-----: |
| STK Push             |   ✅    |  ✅  |   ✅    |   ✅    |
| STK Query            |   ✅    |  ✅  |   ✅    |   ✅    |
| STK Callback hooks   |   ✅    |  ✅  |   ✅    |   ✅    |
| C2B (register / sim) |   ✅    |  ❌  |   ❌    |   ❌    |
| C2B Validation hook  |   ✅    |  ❌  |   ❌    |   ❌    |
| B2C Payments         |   ✅    |  ❌  |   ❌    |   ❌    |
| B2B Express Checkout |   ✅    |  ❌  |   ❌    |   ❌    |
| Tax Remittance (KRA) |   ✅    |  ❌  |   ❌    |   ❌    |
| Account Balance      |   ❌    |  ✅  |   ✅    |   ✅    |
| Transaction Reversal |   ❌    |  ✅  |   ✅    |   ❌    |
| Transaction Status   |   ✅    |  ❌  |   ❌    |   ❌    |
| IP Verification      |   ✅    |  ✅  |   ✅    |   ✅    |

> Use Express for full Daraja coverage. Use Hono for edge runtimes (Cloudflare
> Workers, Bun, Deno). Use Fastify for high-throughput server workloads. Use
> Next.js for App Router projects.

## Guides

- [Express](./express)
- [Hono](./hono)
- [Next.js App Router](./nextjs)
- [Fastify](./fastify)

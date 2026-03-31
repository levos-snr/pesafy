# Introduction

**pesafy** is a type-safe, framework-agnostic SDK for Safaricom's Daraja 2.0 API. It works with Node.js, Bun, Deno, Cloudflare Workers, Next.js, Fastify, Hono, and Express.

## Why pesafy?

- **Fully typed** — every request, response, and webhook payload has TypeScript types
- **Framework adapters** — mount all M-PESA routes with one function call
- **Result type** — `stkPushSafe()` returns `Ok/Err` unions instead of throwing
- **Auto retry** — exponential backoff with jitter on transient Daraja 5xx errors
- **Powerful CLI** — scaffold config, test STK Pushes, and run health checks from your terminal

## Quick start

```bash
pnpm add pesafy
```

```ts
import { createPesafy } from 'pesafy'

const pesafy = createPesafy({
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: 'sandbox',
})

const result = await pesafy.stkPush({
  phoneNumber: '254712345678',
  amount: 1,
  accountReference: 'Order-001',
  transactionDesc: 'Payment for order 001',
  callbackUrl: 'https://yourapp.com/mpesa/callback',
})
```

## Next steps

- [Installation](./installation)
- [Quick Start](./quick-start)
- [Configuration](./configuration)
- [CLI](./cli)

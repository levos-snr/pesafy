# Framework Adapters

pesafy ships drop-in adapters for the most popular Node.js frameworks. Mount all M-PESA webhook routes with a single function call — no manual route wiring needed.

## Available adapters

| Adapter            | Import path               |
| ------------------ | ------------------------- |
| Express            | `pesafy/adapters/express` |
| Hono               | `pesafy/adapters/hono`    |
| Next.js App Router | `pesafy/adapters/nextjs`  |
| Fastify            | `pesafy/adapters/fastify` |

## Quick example

```ts
import { createPesafy } from 'pesafy'
import { pesafyExpress } from 'pesafy/adapters/express'
import express from 'express'

const app = express()
const pesafy = createPesafy({ consumerKey: '...', consumerSecret: '...' })

app.use('/mpesa', pesafyExpress(pesafy))
app.listen(3000)
```

## Guides

- [Express](./express)
- [Hono](./hono)
- [Next.js App Router](./nextjs)
- [Fastify](./fastify)

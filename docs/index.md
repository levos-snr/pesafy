---
layout: home

hero:
  name: pesafy
  text: M-PESA Daraja SDK
  tagline:
    Type-safe, framework-agnostic SDK for Safaricom Daraja 2.0 — built for
    Node.js, Bun, Deno, Cloudflare Workers, Next.js, Fastify, Hono, and Express.
  image:
    src: /logo.svg
    alt: pesafy
  actions:
    - theme: brand
      text: Get Started →
      link: /guide/
    - theme: alt
      text: API Reference
      link: /api/
    - theme: alt
      text: GitHub
      link: https://github.com/levos-snr/pesafy

features:
  - icon: 🔒
    title: Fully Type-Safe
    details:
      Complete TypeScript types for every Daraja API — requests, responses,
      webhook payloads, and result codes. Catch mistakes at compile time with
      branded primitives like KesAmount and MsisdnKE.
    link: /guide/branded-types
    linkText: Branded Types →

  - icon: ⚡
    title: Every Daraja API
    details:
      STK Push, C2B, B2C, B2B Express Checkout, B2B Buy Goods, B2B Pay Bill, B2C
      Disbursement, Account Balance, Transaction Status, Reversal, Tax
      Remittance, Dynamic QR, Bill Manager.
    link: /api/
    linkText: API Reference →

  - icon: 🔌
    title: Framework Adapters
    details:
      Drop-in adapters for Express, Hono, Next.js App Router, and Fastify. Mount
      all M-PESA routes with a single function call — webhook handlers, result
      callbacks, and health checks included.
    link: /adapters/
    linkText: Adapters →

  - icon: 🖥️
    title: Powerful CLI
    details:
      Scaffold .env interactively, test STK Pushes, query transactions, encrypt
      credentials, validate phone numbers, and run a health check — all from npx
      pesafy.
    link: /guide/cli
    linkText: CLI Reference →

  - icon: 🔄
    title: Auto Retry & Resilience
    details:
      Exponential backoff with ±25% jitter on transient Daraja 5xx errors. Up to
      4 retries by default, configurable per client. 4xx errors are never
      retried.
    link: /guide/error-handling
    linkText: Error Handling →

  - icon: 🧩
    title: Result<T> — No Exceptions
    details:
      Use stkPushSafe() and accountBalanceSafe() for Result<T, PesafyError>
      discriminated unions. Composable, pipeable, and zero try/catch required.
    link: /guide/error-handling
    linkText: Result Type →
---

<div class="home-content">

## Zero boilerplate. Production-ready.

```ts
import { Mpesa } from 'pesafy'

const mpesa = new Mpesa({
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: 'sandbox',
  lipaNaMpesaShortCode: process.env.MPESA_SHORTCODE!,
  lipaNaMpesaPassKey: process.env.MPESA_PASSKEY!,
})

// STK Push — prompt customer on their phone
const response = await mpesa.stkPush({
  amount: 100,
  phoneNumber: '0712345678',
  callbackUrl: 'https://yourapp.com/api/mpesa/callback',
  accountReference: 'INV-001',
  transactionDesc: 'Payment',
})

console.log(response.CheckoutRequestID)
```

</div>

<style>
:root {
  --vp-c-brand-1: #d97706;
  --vp-c-brand-2: #b45309;
  --vp-c-brand-3: #f59e0b;
  --vp-c-brand-soft: rgba(245, 158, 11, 0.12);
  --vp-button-brand-border: transparent;
  --vp-button-brand-text: #fff;
  --vp-button-brand-bg: #d97706;
  --vp-button-brand-hover-border: transparent;
  --vp-button-brand-hover-text: #fff;
  --vp-button-brand-hover-bg: #b45309;
  --vp-button-brand-active-border: transparent;
  --vp-button-brand-active-text: #fff;
  --vp-button-brand-active-bg: #92400e;
  --vp-home-hero-name-color: transparent;
  --vp-home-hero-name-background: linear-gradient(135deg, #d97706 20%, #fbbf24 80%);
}

.VPHero .image-container {
  filter: drop-shadow(0 0 56px rgba(245, 158, 11, 0.25));
}

.VPFeature {
  border: 1px solid var(--vp-c-divider) !important;
  border-radius: 12px !important;
  transition: border-color 0.25s, box-shadow 0.25s, transform 0.2s !important;
}
.VPFeature:hover {
  border-color: rgba(217, 119, 6, 0.45) !important;
  box-shadow: 0 4px 28px rgba(217, 119, 6, 0.1) !important;
  transform: translateY(-2px) !important;
}
.VPFeature .icon {
  font-size: 26px;
  background: linear-gradient(135deg, rgba(245,158,11,0.12), rgba(217,119,6,0.05)) !important;
  border-radius: 10px !important;
  border: 1px solid rgba(245, 158, 11, 0.18) !important;
}
.VPFeature .link-text {
  color: var(--vp-c-brand-1) !important;
  font-weight: 500;
}

.home-content {
  max-width: 900px;
  margin: 0 auto;
  padding: 48px 24px 0;
}

.home-content h2 {
  font-size: 1.6rem;
  font-weight: 700;
  margin-bottom: 20px;
  background: linear-gradient(135deg, #d97706 20%, #f59e0b 80%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
</style>

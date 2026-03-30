---
layout: home

hero:
  name: pesafy
  text: M-PESA Daraja SDK
  tagline: Type-safe, framework-agnostic SDK for Safaricom's Daraja API. Works with Node.js, Bun, Deno, Cloudflare Workers, Next.js, Fastify, Hono & Express.
  image:
    src: /logo.svg
    alt: pesafy
  actions:
    - theme: brand
      text: Get Started
      link: /guide/
    - theme: alt
      text: API Reference
      link: /api/
    - theme: alt
      text: View on GitHub
      link: https://github.com/levos-snr/pesafy

features:
  - icon: 🔒
    title: Fully Type-Safe
    details: Complete TypeScript types for every Daraja API — requests, responses, and webhook payloads. Catch bugs at compile time, not in production.
    link: /guide/branded-types
    linkText: Branded Types →
  - icon: ⚡
    title: All Daraja APIs
    details: STK Push, C2B, B2C, B2B Express Checkout, Account Balance, Reversal, Tax Remittance, Dynamic QR, Bill Manager — all covered.
    link: /api/
    linkText: API Reference →
  - icon: 🔌
    title: Framework Adapters
    details: Drop-in adapters for Express, Hono, Next.js App Router, and Fastify. Mount all M-PESA routes with a single function call.
    link: /adapters/
    linkText: Adapters →
  - icon: 🖥️
    title: Powerful CLI
    details: Scaffold config, test STK Pushes, query transactions, encrypt credentials, and run a health check — all from your terminal.
    link: /guide/cli
    linkText: CLI Docs →
  - icon: 🔄
    title: Auto Retry & Resilience
    details: Exponential backoff with jitter on transient Daraja 5xx errors. Never manually retry a 503 again.
    link: /guide/error-handling
    linkText: Error Handling →
  - icon: 🧩
    title: Result Type
    details: Prefer Result&lt;T&gt; over try/catch. stkPushSafe() returns Ok/Err unions — no more unhandled promise rejections.
    link: /guide/error-handling
    linkText: Result Type →
---

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
  filter: drop-shadow(0 0 56px rgba(245, 158, 11, 0.3));
}

.VPFeature {
  border: 1px solid var(--vp-c-divider) !important;
  border-radius: 12px !important;
  transition: border-color 0.25s, box-shadow 0.25s, transform 0.25s !important;
}
.VPFeature:hover {
  border-color: rgba(217, 119, 6, 0.5) !important;
  box-shadow: 0 4px 24px rgba(217, 119, 6, 0.1) !important;
  transform: translateY(-2px) !important;
}
.VPFeature .icon {
  font-size: 24px;
  background: linear-gradient(135deg, rgba(245,158,11,0.15), rgba(217,119,6,0.06)) !important;
  border-radius: 8px !important;
  border: 1px solid rgba(245, 158, 11, 0.2) !important;
}
.VPFeature .link-text {
  color: var(--vp-c-brand-1) !important;
}
</style>

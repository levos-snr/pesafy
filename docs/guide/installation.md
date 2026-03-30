# Installation

## Prerequisites

- **Node.js** ≥ 18 (or Bun / Deno)
- A [Safaricom Daraja](https://developer.safaricom.co.ke) account (sandbox is free)

## Install the Package

::: code-group

```sh [pnpm]
pnpm add pesafy
```

```sh [npm]
npm install pesafy
```

```sh [yarn]
yarn add pesafy
```

```sh [bun]
bun add pesafy
```

:::

> **Note:** `pesafy` is ESM-only. Make sure your `package.json` has `"type": "module"` or use `.mjs` / `.mts` extensions.

## Environment Variables

Create a `.env` file in your project root. You can scaffold one interactively with:

```sh
npx pesafy init
```

Or create it manually:

```sh
# .env

# ── Required for all APIs ────────────────────────────────
MPESA_ENVIRONMENT=sandbox          # sandbox | production
MPESA_CONSUMER_KEY=your_key
MPESA_CONSUMER_SECRET=your_secret

# ── STK Push (M-PESA Express) ───────────────────────────
MPESA_SHORTCODE=174379
MPESA_PASSKEY=bfb279f9aa9bdbcf...
MPESA_CALLBACK_URL=https://yourdomain.com/api/mpesa/callback

# ── Initiator (B2C / Reversal / Balance / Tax) ──────────
MPESA_INITIATOR_NAME=testapi
MPESA_INITIATOR_PASSWORD=Safaricom999!
MPESA_CERTIFICATE_PATH=./SandboxCertificate.cer

# ── Async result URLs ───────────────────────────────────
MPESA_RESULT_URL=https://yourdomain.com/api/mpesa/result
MPESA_QUEUE_TIMEOUT_URL=https://yourdomain.com/api/mpesa/timeout
```

## Validate Your Config

```sh
npx pesafy doctor
```

This checks for missing keys, invalid URL formats, and certificate file existence.

## Download the Sandbox Certificate

Download the Daraja sandbox certificate from the [Daraja Portal](https://developer.safaricom.co.ke) → **Tools** → **Credentials** → Download `SandboxCertificate.cer`.

Place it in your project root (or wherever `MPESA_CERTIFICATE_PATH` points).

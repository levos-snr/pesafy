# Installation

## Prerequisites

- **Node.js ≥ 18**, Bun, or Deno — the SDK uses the native `fetch` and `crypto`
  APIs
- A [Safaricom Daraja](https://developer.safaricom.co.ke) account (the sandbox
  is free and instant to register)

::: info ESM only `pesafy` is a pure ESM package. Your project must either set
`"type": "module"` in `package.json`, or use `.mjs` / `.mts` file extensions.
CommonJS (`require()`) is not supported. :::

## Install

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

## Scaffold your .env

The fastest way to get a correct `.env` is the interactive CLI wizard:

```sh
npx pesafy init
```

It walks you through every required variable and writes the file. Then validate
the result:

```sh
npx pesafy doctor
```

## Environment Variables Reference

Here is the full `.env` template with every variable explained:

```sh
# .env

# ── Required for ALL APIs ────────────────────────────────────────────────────
MPESA_ENVIRONMENT=sandbox          # sandbox | production
MPESA_CONSUMER_KEY=your_key        # Daraja app consumer key
MPESA_CONSUMER_SECRET=your_secret  # Daraja app consumer secret

# ── STK Push / M-PESA Express ───────────────────────────────────────────────
# Required for: mpesa.stkPush() and mpesa.stkQuery()
MPESA_SHORTCODE=174379
MPESA_PASSKEY=bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919
MPESA_CALLBACK_URL=https://yourdomain.com/api/mpesa/callback

# ── Initiator credentials ────────────────────────────────────────────────────
# Required for: Account Balance, B2C, B2B Pay Bill/Buy Goods, Reversal,
#               Transaction Status, Tax Remittance
MPESA_INITIATOR_NAME=testapi
MPESA_INITIATOR_PASSWORD=Safaricom999!
MPESA_CERTIFICATE_PATH=./SandboxCertificate.cer

# ── Async result endpoints ───────────────────────────────────────────────────
# Required for: Account Balance, Reversal, Transaction Status, B2C, Tax
MPESA_RESULT_URL=https://yourdomain.com/api/mpesa/result
MPESA_QUEUE_TIMEOUT_URL=https://yourdomain.com/api/mpesa/timeout
```

## Download the Daraja Certificate

Initiator-based APIs (Account Balance, B2C, B2B, Reversal, Tax Remittance,
Transaction Status) require a certificate to encrypt the initiator password.
Download it from the Daraja portal:

1. Log in to [developer.safaricom.co.ke](https://developer.safaricom.co.ke)
2. Go to **Tools → Download Sandbox Certificate**
3. Save as `SandboxCertificate.cer` in your project root

::: warning Production certificate In production, download the **Production
Certificate** instead — the sandbox certificate will not work in a production
environment. :::

## Verify your setup

```sh
npx pesafy doctor
```

Expected output:

```
✔  MPESA_CONSUMER_KEY
✔  MPESA_CONSUMER_SECRET
✔  MPESA_ENVIRONMENT
✔  MPESA_SHORTCODE
✔  MPESA_PASSKEY
✔  MPESA_CALLBACK_URL
✔  MPESA_INITIATOR_NAME
✔  MPESA_INITIATOR_PASSWORD
✔  MPESA_CERTIFICATE_PATH  (/absolute/path/SandboxCertificate.cer)
✔  MPESA_RESULT_URL
✔  MPESA_QUEUE_TIMEOUT_URL

✔  All checks passed! Your config looks good.
```

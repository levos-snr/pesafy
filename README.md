<!-- 📁 PATH: README.md -->

# pesafy 💳

> **Type-safe M-PESA Daraja SDK** for Node.js, Bun, Deno, Cloudflare Workers,
> Next.js, Fastify, Hono, and Express.

[![npm version](https://img.shields.io/npm/v/pesafy.svg)](https://www.npmjs.com/package/pesafy)
[![npm downloads](https://img.shields.io/npm/dm/pesafy.svg)](https://www.npmjs.com/package/pesafy)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![CI](https://github.com/levos-snr/pesafy/actions/workflows/ci.yml/badge.svg)](https://github.com/levos-snr/pesafy/actions/workflows/ci.yml)
[![codecov](https://codecov.io/github/levos-snr/pesafy/graph/badge.svg?token=JYK2BS1ZZF)](https://codecov.io/github/levos-snr/pesafy)

---

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [CLI](#cli)
- [API Reference](#api-reference)
  - [STK Push (M-PESA Express)](#stk-push-m-pesa-express)
  - [C2B (Customer to Business)](#c2b-customer-to-business)
  - [B2C (Business to Customer)](#b2c-business-to-customer)
  - [B2B Express Checkout](#b2b-express-checkout)
  - [Account Balance](#account-balance)
  - [Transaction Status](#transaction-status)
  - [Transaction Reversal](#transaction-reversal)
  - [Tax Remittance (KRA)](#tax-remittance-kra)
  - [Dynamic QR Code](#dynamic-qr-code)
  - [Bill Manager](#bill-manager)
  - [Webhooks](#webhooks)
- [Framework Adapters](#framework-adapters)
  - [Express](#express-adapter)
  - [Hono (Bun / Cloudflare Workers)](#hono-adapter)
  - [Next.js App Router](#nextjs-adapter)
  - [Fastify](#fastify-adapter)
- [Branded Types](#branded-types)
- [Error Handling](#error-handling)
- [Utilities](#utilities)
- [Configuration Reference](#configuration-reference)
- [Roadmap](#roadmap)

---

## Installation

```bash
npm install pesafy        # npm
yarn add pesafy           # yarn
pnpm add pesafy           # pnpm
bun add pesafy            # bun
```

---

## Quick Start

```typescript
import { Mpesa } from 'pesafy'

const mpesa = new Mpesa({
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: 'sandbox', // "sandbox" | "production"
  lipaNaMpesaShortCode: '174379',
  lipaNaMpesaPassKey: process.env.MPESA_PASSKEY!,
})

// Send an STK Push
const response = await mpesa.stkPush({
  amount: 100,
  phoneNumber: '0712345678',
  callbackUrl: 'https://yourdomain.com/api/mpesa/callback',
  accountReference: 'INV-001',
  transactionDesc: 'Payment',
})

console.log(response.CheckoutRequestID)
```

---

## CLI

The pesafy CLI lets you interact with Daraja directly from your terminal — great
for testing, debugging, and scripting.

### Setup

```bash
# Interactive setup — creates .env in your project
npx pesafy init

# Validate your .env config
npx pesafy doctor
```

### Commands

```
npx pesafy init                       — Scaffold .env interactively
npx pesafy doctor                     — Validate .env for common mistakes
npx pesafy token                      — Print a fresh OAuth token
npx pesafy encrypt                    — Encrypt initiator password → SecurityCredential
npx pesafy validate-phone <phone>     — Validate / normalise a Kenyan phone number
npx pesafy stk-push                   — Initiate an STK Push (interactive prompts)
npx pesafy stk-push --amount 100 --phone 0712345678 --ref INV-001
npx pesafy stk-query <checkoutId>     — Check STK Push status
npx pesafy balance                    — Query M-PESA account balance
npx pesafy reversal <txId>            — Initiate a transaction reversal
npx pesafy register-c2b-urls          — Register C2B Confirmation + Validation URLs
npx pesafy simulate-c2b               — Simulate a C2B payment (sandbox only)
npx pesafy version                    — Print library version
npx pesafy help                       — Show help
```

### Environment variables read by the CLI

```bash
MPESA_CONSUMER_KEY
MPESA_CONSUMER_SECRET
MPESA_ENVIRONMENT          # sandbox | production
MPESA_SHORTCODE
MPESA_PASSKEY
MPESA_CALLBACK_URL
MPESA_INITIATOR_NAME
MPESA_INITIATOR_PASSWORD
MPESA_CERTIFICATE_PATH     # path to .cer file
MPESA_RESULT_URL
MPESA_QUEUE_TIMEOUT_URL
```

---

## API Reference

### Instantiating the client

```typescript
import { Mpesa } from 'pesafy'

const mpesa = new Mpesa({
  consumerKey: '...',
  consumerSecret: '...',
  environment: 'sandbox',

  // STK Push
  lipaNaMpesaShortCode: '174379',
  lipaNaMpesaPassKey: 'bfb279...',

  // Initiator-based APIs (B2C, Reversal, Balance, Tax)
  initiatorName: 'testapi',
  initiatorPassword: 'Safaricom123!',
  certificatePath: './SandboxCertificate.cer',

  // HTTP tuning (optional)
  retries: 4, // default: 4
  retryDelay: 2000, // default: 2000 ms
  timeout: 30000, // default: 30 000 ms (per attempt)
})
```

---

### STK Push (M-PESA Express)

Prompts the customer to enter their M-PESA PIN on their phone.

```typescript
// Initiate
const push = await mpesa.stkPush({
  amount:           100,               // KES — whole numbers only
  phoneNumber:      "0712345678",      // any Kenyan format
  callbackUrl:      "https://yourdomain.com/api/mpesa/callback",
  accountReference: "INV-001",         // max 12 chars
  transactionDesc:  "Subscription",    // max 13 chars
  transactionType:  "CustomerPayBillOnline",  // default — or "CustomerBuyGoodsOnline"
  partyB:           "174379",          // defaults to shortCode; set till number for Buy Goods
});

console.log(push.CheckoutRequestID);   // save this to query later

// Query status
const status = await mpesa.stkQuery({
  checkoutRequestId: push.CheckoutRequestID,
});

if (status.ResultCode === 0) {
  console.log("Payment confirmed!");
}

// Safe variant — returns Result<T> instead of throwing
const result = await mpesa.stkPushSafe({ amount: 100, phoneNumber: "0712345678", ... });
if (result.ok) {
  console.log(result.data.CheckoutRequestID);
} else {
  console.error(result.error.code, result.error.message);
}
```

**Callback payload helpers:**

```typescript
import {
  isStkCallbackSuccess,
  getCallbackValue,
  type StkPushCallback,
} from 'pesafy'

function handleCallback(body: StkPushCallback) {
  if (isStkCallbackSuccess(body.Body.stkCallback)) {
    const receipt = getCallbackValue(body, 'MpesaReceiptNumber') // string
    const amount = getCallbackValue(body, 'Amount') // number
    const phone = getCallbackValue(body, 'PhoneNumber') // number
  }
}
```

**STK Push ResultCodes:**

| Code | Meaning                  |
| ---- | ------------------------ |
| 0    | Success                  |
| 1    | Insufficient balance     |
| 1032 | Cancelled by user        |
| 1037 | DS timeout / unreachable |
| 2001 | Wrong PIN                |

---

### C2B (Customer to Business)

Register your Paybill or Till to receive M-PESA payments.

```typescript
// 1. Register Confirmation + Validation URLs (do this once per shortcode)
await mpesa.registerC2BUrls({
  shortCode: '600984',
  responseType: 'Completed', // "Completed" | "Cancelled"
  confirmationUrl: 'https://yourdomain.com/api/mpesa/c2b/confirmation',
  validationUrl: 'https://yourdomain.com/api/mpesa/c2b/validation',
  apiVersion: 'v2', // default — v2 masks MSISDN in callbacks
})

// 2. Simulate (SANDBOX ONLY)
await mpesa.simulateC2B({
  shortCode: '600984',
  commandId: 'CustomerPayBillOnline', // or "CustomerBuyGoodsOnline"
  amount: 10,
  msisdn: 254708374149,
  billRefNumber: 'INV-001', // Paybill only — OMIT for Buy Goods
  apiVersion: 'v2',
})
```

**Validation webhook handlers:**

```typescript
import {
  acceptC2BValidation,
  rejectC2BValidation,
  isC2BPayload,
  getC2BAmount,
  getC2BTransactionId,
  getC2BCustomerName,
  type C2BValidationPayload,
  type C2BConfirmationPayload,
} from 'pesafy'

// Validation URL — must respond in ≤8 seconds
app.post('/api/mpesa/c2b/validation', (req, res) => {
  const payload = req.body as C2BValidationPayload
  const amount = getC2BAmount(payload)

  if (amount > 100_000) {
    // Reject with specific error code
    return res.json(rejectC2BValidation('C2B00013')) // Invalid Amount
  }

  res.json(acceptC2BValidation()) // Accept
  // or: res.json(acceptC2BValidation("MY-TX-ID")); // with correlation ID
})

// Confirmation URL — always respond 200 immediately
app.post('/api/mpesa/c2b/confirmation', (req, res) => {
  const payload = req.body as C2BConfirmationPayload
  const txId = getC2BTransactionId(payload)
  const amount = getC2BAmount(payload)
  const name = getC2BCustomerName(payload)

  // Process async
  processPayment({ txId, amount, name }).catch(console.error)

  res.json({ ResultCode: 0, ResultDesc: 'Success' })
})
```

**C2B Validation ResultCodes:**

| Code     | Meaning                |
| -------- | ---------------------- |
| 0        | Accept                 |
| C2B00011 | Invalid MSISDN         |
| C2B00012 | Invalid Account Number |
| C2B00013 | Invalid Amount         |
| C2B00014 | Invalid KYC Details    |
| C2B00015 | Invalid ShortCode      |
| C2B00016 | Other Error            |

---

### B2C (Business to Customer)

Send money to customers or load funds to a B2C shortcode.

```typescript
// BusinessPayToBulk — load funds to a B2C shortcode
const ack = await mpesa.b2cPayment({
  commandId: 'BusinessPayToBulk',
  amount: 50_000,
  partyA: '600979', // your MMF shortcode
  partyB: '600000', // target B2C shortcode
  accountReference: 'BATCH-2024-01',
  resultUrl: 'https://yourdomain.com/api/mpesa/b2c/result',
  queueTimeOutUrl: 'https://yourdomain.com/api/mpesa/b2c/timeout',
})

// BusinessPayment — direct payment to customer wallet
await mpesa.b2cPayment({
  commandId: 'BusinessPayment', // or "SalaryPayment" / "PromotionPayment"
  amount: 2500,
  partyA: '600979',
  partyB: '254712345678', // customer MSISDN
  accountReference: 'SALARY-JAN',
  resultUrl: 'https://yourdomain.com/api/mpesa/b2c/result',
  queueTimeOutUrl: 'https://yourdomain.com/api/mpesa/b2c/timeout',
  remarks: 'January salary',
  requester: '254712345678', // optional — consumer MSISDN
})
```

**B2C Result webhook handler:**

```typescript
import {
  isB2CResult,
  isB2CSuccess,
  isB2CFailure,
  getB2CTransactionId,
  getB2CAmount,
  getB2CConversationId,
  getB2COriginatorConversationId,
  getB2CReceiverPublicName,
  getB2CDebitAccountBalance,
} from 'pesafy'

app.post('/api/mpesa/b2c/result', (req, res) => {
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' }) // always respond 200 first

  if (!isB2CResult(req.body)) return

  if (isB2CSuccess(req.body)) {
    const txId = getB2CTransactionId(req.body)
    const amount = getB2CAmount(req.body)
    const balance = getB2CDebitAccountBalance(req.body)
    console.log('B2C success:', { txId, amount, balance })
  } else if (isB2CFailure(req.body)) {
    console.error('B2C failed:', req.body.Result.ResultDesc)
  }
})
```

**B2C CommandIDs:**

| CommandID           | Use Case                      |
| ------------------- | ----------------------------- |
| `BusinessPayToBulk` | Load funds to a B2C shortcode |
| `BusinessPayment`   | Unsecured payment to customer |
| `SalaryPayment`     | Salary disbursement           |
| `PromotionPayment`  | Promotions / bonus            |

---

### B2B Express Checkout

Send a USSD Push to a merchant's till for B2B payments.

```typescript
const ack = await mpesa.b2bExpressCheckout({
  primaryShortCode: '000001', // merchant till (debit party)
  receiverShortCode: '000002', // your Paybill (credit party)
  amount: 5000,
  paymentRef: 'INV-001',
  callbackUrl: 'https://yourdomain.com/api/mpesa/b2b/callback',
  partnerName: 'Acme Supplies',
  requestRefId: 'unique-uuid-per-request', // auto-generated if omitted
})

// ack.code === "0" means USSD was initiated
```

**B2B Callback handler:**

```typescript
import {
  isB2BCheckoutCallback,
  isB2BCheckoutSuccess,
  isB2BCheckoutCancelled,
  getB2BTransactionId,
  getB2BAmount,
  getB2BConversationId,
} from 'pesafy'

app.post('/api/mpesa/b2b/callback', (req, res) => {
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' })

  if (!isB2BCheckoutCallback(req.body)) return

  if (isB2BCheckoutSuccess(req.body)) {
    const txId = getB2BTransactionId(req.body)
    const amount = getB2BAmount(req.body)
    console.log('B2B paid:', { txId, amount })
  } else if (isB2BCheckoutCancelled(req.body)) {
    console.log('B2B cancelled by merchant')
  }
})
```

**B2B Error codes:**

| Code | Meaning                  |
| ---- | ------------------------ |
| 0    | Success                  |
| 4001 | User cancelled           |
| 4102 | Merchant KYC fail        |
| 4104 | Missing Nominated Number |
| 4201 | USSD network error       |
| 4203 | USSD exception error     |

---

### Account Balance

Query the balance of your M-PESA shortcode. **Asynchronous** — result is POSTed
to your `resultUrl`.

```typescript
await mpesa.accountBalance({
  partyA: '174379',
  identifierType: '4', // "1"=MSISDN, "2"=Till, "4"=ShortCode
  resultUrl: 'https://yourdomain.com/api/mpesa/balance/result',
  queueTimeOutUrl: 'https://yourdomain.com/api/mpesa/balance/timeout',
  remarks: 'Balance check',
})
```

**Parsing the result:**

```typescript
import {
  isAccountBalanceSuccess,
  parseAccountBalance,
  getAccountBalanceParam,
  type AccountBalanceResult,
} from 'pesafy'

app.post('/api/mpesa/balance/result', (req, res) => {
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' })

  const body = req.body as AccountBalanceResult
  if (!isAccountBalanceSuccess(body)) return

  const raw = getAccountBalanceParam(body, 'AccountBalance') as string
  const accounts = parseAccountBalance(raw ?? '')

  for (const account of accounts) {
    console.log(`${account.name}: ${account.currency} ${account.amount}`)
    // e.g. "Working Account: KES 45000.00"
  }
})
```

---

### Transaction Status

Query the result of any completed M-PESA transaction. **Asynchronous**.

```typescript
await mpesa.transactionStatus({
  transactionId: 'OEI2AK4XXXX',
  partyA: '174379',
  identifierType: '4',
  resultUrl: 'https://yourdomain.com/api/mpesa/tx/result',
  queueTimeOutUrl: 'https://yourdomain.com/api/mpesa/tx/timeout',
  remarks: 'Check payment status',
})
```

---

### Transaction Reversal

Reverse a completed M-PESA transaction. **Asynchronous**.

```typescript
await mpesa.reverseTransaction({
  transactionId: 'OEI2AK4XXXX',
  receiverParty: '174379',
  receiverIdentifierType: '4', // "1"=MSISDN, "2"=Till, "4"=ShortCode
  amount: 500,
  resultUrl: 'https://yourdomain.com/api/mpesa/reversal/result',
  queueTimeOutUrl: 'https://yourdomain.com/api/mpesa/reversal/timeout',
  remarks: 'Erroneous charge',
})
```

**Reversal result handler:**

```typescript
import { isReversalSuccess, getReversalTransactionId } from 'pesafy'

app.post('/api/mpesa/reversal/result', (req, res) => {
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' })

  if (isReversalSuccess(req.body)) {
    console.log('Reversed:', getReversalTransactionId(req.body))
  }
})
```

---

### Tax Remittance (KRA)

Remit tax to Kenya Revenue Authority via M-PESA. **Asynchronous**.

```typescript
await mpesa.remitTax({
  amount: 5_000,
  partyA: '888880', // your business shortcode
  accountReference: 'PRN1234XN', // KRA Payment Registration Number
  resultUrl: 'https://yourdomain.com/api/mpesa/tax/result',
  queueTimeOutUrl: 'https://yourdomain.com/api/mpesa/tax/timeout',
  remarks: 'Monthly PAYE',
})
// PartyB is always KRA_SHORTCODE ("572572") — auto-set
```

---

### Dynamic QR Code

Generate an M-PESA QR code customers can scan to pay.

```typescript
const qr = await mpesa.generateDynamicQR({
  merchantName: 'My Shop',
  refNo: 'INV-001',
  amount: 500,
  trxCode: 'BG', // "BG"=Buy Goods, "PB"=Paybill, "WA"=Withdraw, "SM"=Send Money
  cpi: '373132', // till / paybill / MSISDN
  size: 300, // pixels (square)
})

// Render in HTML:
// <img src={`data:image/png;base64,${qr.QRCode}`} />
```

**QR Transaction codes:**

| Code | Use Case                    |
| ---- | --------------------------- |
| `BG` | Pay Merchant (Buy Goods)    |
| `WA` | Withdraw Cash at Agent Till |
| `PB` | Paybill / Business number   |
| `SM` | Send Money (mobile number)  |
| `SB` | Send to Business            |

---

### Bill Manager

Create and send invoices customers pay via M-PESA.

```typescript
// 1. Opt-in your shortcode (once)
await mpesa.billManagerOptIn({
  shortcode:        "600984",
  email:            "billing@company.com",
  officialContact:  "0700000000",
  sendReminders:    "1",
  logo:             "https://cdn.company.com/logo.png",
  callbackUrl:      "https://yourdomain.com/api/mpesa/bills/callback",
});

// 2. Send a single invoice
await mpesa.sendInvoice({
  externalReference: "INV-001",
  billingPeriod:     "2024-01",
  invoiceName:       "January Subscription",
  dueDate:           "2024-01-31 23:59:00",
  accountReference:  "ACC-12345",
  amount:            2500,
  partyA:            "254712345678",
  invoiceItems: [
    { itemName: "Base subscription", amount: 2000 },
    { itemName: "SMS bundle",        amount: 500 },
  ],
});

// 3. Bulk invoices (up to 1 000 per call)
await mpesa.sendBulkInvoices({
  invoices: [
    { externalReference: "INV-002", billingPeriod: "2024-01", ... },
    { externalReference: "INV-003", billingPeriod: "2024-01", ... },
  ],
});

// 4. Cancel an invoice
await mpesa.cancelInvoice({ externalReference: "INV-001" });
```

---

### Webhooks

**IP verification** (Safaricom always calls from whitelisted IPs):

```typescript
import { verifyWebhookIP, SAFARICOM_IPS } from 'pesafy'

app.post('/api/mpesa/callback', (req, res) => {
  const ip = req.ip ?? req.headers['x-forwarded-for']
  if (!verifyWebhookIP(ip)) {
    console.warn('Callback from unknown IP:', ip)
    // Still return 200 — Safaricom will retry if you reject
  }
  // ... process
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' })
})
```

**Generic webhook handler:**

```typescript
import {
  handleWebhook,
  isSuccessfulCallback,
  extractTransactionId,
  extractAmount,
} from 'pesafy'

app.post('/api/mpesa/callback', (req, res) => {
  const result = handleWebhook(req.body, {
    requestIP: req.ip,
    skipIPCheck: false, // set true in local dev
  })

  if (result.success && isSuccessfulCallback(result.data)) {
    const receipt = extractTransactionId(result.data)
    const amount = extractAmount(result.data)
  }

  res.json({ ResultCode: 0, ResultDesc: 'Accepted' })
})
```

**Retry with backoff** (for your own internal processing):

```typescript
import { retryWithBackoff } from 'pesafy'

const outcome = await retryWithBackoff(() => saveToDatabase(webhookData), {
  maxRetries: 5,
  initialDelay: 500,
  maxDelay: 30_000,
})

if (!outcome.success) {
  console.error('Failed after', outcome.attempts, 'attempts')
}
```

---

## Framework Adapters

### Express Adapter

```typescript
import express from 'express'
import {
  createMpesaExpressRouter,
  acceptC2BValidation,
  isB2CSuccess,
  getB2CTransactionId,
} from 'pesafy/express'

const app = express()
app.use(express.json())

const router = express.Router()

createMpesaExpressRouter(router, {
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: 'sandbox',
  lipaNaMpesaShortCode: '174379',
  lipaNaMpesaPassKey: process.env.MPESA_PASSKEY!,
  callbackUrl: 'https://yourdomain.com/api/mpesa/express/callback',

  // Initiator (for B2C, Reversal, Balance)
  initiatorName: 'testapi',
  initiatorPassword: 'Safaricom123!',
  certificatePath: './SandboxCertificate.cer',

  // Result endpoints
  resultUrl: 'https://yourdomain.com/api/mpesa/transaction-status/result',
  queueTimeOutUrl: 'https://yourdomain.com/api/mpesa/timeout',

  // C2B
  c2bShortCode: '600984',
  c2bConfirmationUrl: 'https://yourdomain.com/api/mpesa/c2b/confirmation',
  c2bValidationUrl: 'https://yourdomain.com/api/mpesa/c2b/validation',
  onC2BValidation: async (payload) => {
    const amount = Number(payload.TransAmount)
    if (amount > 100_000)
      return { ResultCode: 'C2B00013', ResultDesc: 'Rejected' }
    return acceptC2BValidation()
  },
  onC2BConfirmation: async (payload) => {
    await db.payments.create({
      txId: payload.TransID,
      amount: Number(payload.TransAmount),
    })
  },

  // B2C
  b2cPartyA: '600979',
  b2cResultUrl: 'https://yourdomain.com/api/mpesa/b2c/result',
  b2cQueueTimeOutUrl: 'https://yourdomain.com/api/mpesa/b2c/timeout',
  onB2CResult: async (result) => {
    if (isB2CSuccess(result)) {
      await db.disbursements.markCompleted({
        txId: getB2CTransactionId(result)!,
      })
    }
  },

  skipIPCheck: true, // local dev only
})

app.use('/api', router)
app.listen(3000)
```

**Routes mounted by `createMpesaExpressRouter`:**

| Method | Path                               | Description                      |
| ------ | ---------------------------------- | -------------------------------- |
| POST   | `/mpesa/express/stk-push`          | Initiate STK Push                |
| POST   | `/mpesa/express/stk-query`         | Query STK Push status            |
| POST   | `/mpesa/express/callback`          | STK Push callback from Safaricom |
| POST   | `/mpesa/transaction-status/query`  | Query transaction                |
| POST   | `/mpesa/transaction-status/result` | Transaction result callback      |
| POST   | `/mpesa/c2b/register-url`          | Register C2B URLs                |
| POST   | `/mpesa/c2b/simulate`              | Simulate C2B (sandbox)           |
| POST   | `/mpesa/c2b/validation`            | C2B validation callback          |
| POST   | `/mpesa/c2b/confirmation`          | C2B confirmation callback        |
| POST   | `/mpesa/tax/remit`                 | Initiate tax remittance          |
| POST   | `/mpesa/tax/result`                | Tax remittance result            |
| POST   | `/mpesa/b2b/checkout`              | B2B Express Checkout             |
| POST   | `/mpesa/b2b/callback`              | B2B callback                     |
| POST   | `/mpesa/b2c/payment`               | B2C payment                      |
| POST   | `/mpesa/b2c/result`                | B2C result callback              |

---

### Hono Adapter

Works on Bun, Cloudflare Workers, Deno, and Node.js via Hono.

```typescript
import { Hono } from 'hono'
import { createMpesaHonoRouter } from 'pesafy/adapters/hono'

const app = new Hono()

createMpesaHonoRouter(app, {
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: 'sandbox',
  lipaNaMpesaShortCode: '174379',
  lipaNaMpesaPassKey: process.env.MPESA_PASSKEY!,
  callbackUrl: 'https://yourdomain.com/mpesa/express/callback',
  resultUrl: 'https://yourdomain.com/mpesa/result',
  queueTimeOutUrl: 'https://yourdomain.com/mpesa/timeout',

  onStkSuccess: async ({ receiptNumber, amount, phone }) => {
    await db.payments.create({ receiptNumber, amount, phone })
  },
  onStkFailure: ({ resultCode, resultDesc }) => {
    console.warn('STK failed:', resultCode, resultDesc)
  },
  skipIPCheck: true,
})

// Bun
export default app

// Cloudflare Workers
export default { fetch: app.fetch }
```

---

### Next.js Adapter

```typescript
// app/api/mpesa/stk-push/route.ts
import { createStkPushHandler } from 'pesafy/adapters/nextjs'

export const POST = createStkPushHandler({
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: 'sandbox',
  lipaNaMpesaShortCode: process.env.MPESA_SHORTCODE!,
  lipaNaMpesaPassKey: process.env.MPESA_PASSKEY!,
  callbackUrl: process.env.MPESA_CALLBACK_URL!,
})
```

```typescript
// app/api/mpesa/callback/route.ts
import { createStkCallbackHandler } from 'pesafy/adapters/nextjs'

export const POST = createStkCallbackHandler({
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: 'sandbox',
  callbackUrl: process.env.MPESA_CALLBACK_URL!,
  onSuccess: async ({ receiptNumber, amount, phone }) => {
    await db.payments.create({
      receiptNumber,
      amount: amount ?? 0,
      phone: phone ?? '',
    })
  },
  onFailure: ({ resultCode, resultDesc }) => {
    console.warn('Payment failed:', resultCode, resultDesc)
  },
})
```

```typescript
// app/api/mpesa/stk-query/route.ts
import { createStkQueryHandler } from 'pesafy/adapters/nextjs'

export const POST = createStkQueryHandler({
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: 'sandbox',
  lipaNaMpesaShortCode: process.env.MPESA_SHORTCODE!,
  lipaNaMpesaPassKey: process.env.MPESA_PASSKEY!,
  callbackUrl: process.env.MPESA_CALLBACK_URL!,
})
```

---

### Fastify Adapter

```typescript
import Fastify from 'fastify'
import { registerMpesaRoutes } from 'pesafy/adapters/fastify'

const app = Fastify({ logger: true })

await registerMpesaRoutes(app, {
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: 'sandbox',
  lipaNaMpesaShortCode: '174379',
  lipaNaMpesaPassKey: process.env.MPESA_PASSKEY!,
  callbackUrl: 'https://yourdomain.com/mpesa/callback',
  resultUrl: 'https://yourdomain.com/mpesa/result',
  queueTimeOutUrl: 'https://yourdomain.com/mpesa/timeout',
  skipIPCheck: true,
  onStkSuccess: async ({ receiptNumber, amount, phone }) => {
    app.log.info({ receiptNumber, amount, phone }, 'Payment received')
  },
})

await app.listen({ port: 3000 })
```

---

## Branded Types

pesafy ships opt-in branded primitives that catch type bugs at compile time —
not at runtime.

```typescript
import {
  toKesAmount,
  toMsisdn,
  toPaybill,
  type KesAmount,
  type MsisdnKE,
  type PaybillCode,
} from 'pesafy'

const amount: KesAmount = toKesAmount(100) // throws if < 1 or fractional
const phone: MsisdnKE = toMsisdn('0712345678') // throws if unparseable
const code: PaybillCode = toPaybill('174379')

// ✅ Safe — editor shows exact types
// ❌ Compile error — can't pass plain number where KesAmount is expected
```

**Result type** — prefer this over try/catch in application code:

```typescript
import { ok, err, type Result } from "pesafy";

const result: Result<string> = await mpesa.stkPushSafe({ ... });

if (result.ok) {
  console.log(result.data.CheckoutRequestID);
} else {
  // result.error is PesafyError with .code, .statusCode, .retryable
  if (result.error.retryable) {
    // schedule retry
  }
}
```

---

## Error Handling

All errors are `PesafyError` instances:

```typescript
import { PesafyError, isPesafyError } from "pesafy";

try {
  await mpesa.stkPush({ ... });
} catch (error) {
  if (isPesafyError(error)) {
    console.log(error.code);        // "AUTH_FAILED" | "VALIDATION_ERROR" | "API_ERROR" | ...
    console.log(error.message);
    console.log(error.statusCode);  // HTTP status (if applicable)
    console.log(error.retryable);   // boolean — safe to retry?
    console.log(error.requestId);   // Daraja requestId (if returned)

    // Convenience properties
    error.isValidation; // true if VALIDATION_ERROR
    error.isAuth;       // true if AUTH_FAILED / INVALID_CREDENTIALS
  }
}
```

**Error codes:**

| Code                  | Meaning                                     |
| --------------------- | ------------------------------------------- |
| `AUTH_FAILED`         | OAuth token fetch failed                    |
| `INVALID_CREDENTIALS` | Missing or wrong consumerKey/Secret         |
| `INVALID_PHONE`       | Phone number cannot be normalised           |
| `ENCRYPTION_FAILED`   | RSA encryption of initiator password failed |
| `VALIDATION_ERROR`    | Invalid request parameters (do not retry)   |
| `API_ERROR`           | Daraja returned a 4xx error                 |
| `REQUEST_FAILED`      | Daraja returned 5xx (retryable)             |
| `NETWORK_ERROR`       | DNS / connection failure (retryable)        |
| `TIMEOUT`             | Request exceeded timeout (retryable)        |
| `RATE_LIMITED`        | 429 Too Many Requests                       |

---

## Utilities

### Phone number formatting

```typescript
import { formatSafaricomPhone } from 'pesafy'

formatSafaricomPhone('0712345678') // → "254712345678"
formatSafaricomPhone('+254712345678') // → "254712345678"
formatSafaricomPhone('712345678') // → "254712345678"
formatSafaricomPhone('254712345678') // → "254712345678"
```

### Security credential encryption

```typescript
import { encryptSecurityCredential } from 'pesafy'
import { readFileSync } from 'fs'

const pem = readFileSync('./SandboxCertificate.cer', 'utf-8')
const credential = encryptSecurityCredential('Safaricom123!', pem)
// Pass as config.securityCredential to skip per-call encryption
```

---

## Configuration Reference

| Option                 | Type                        | Required                 | Default | Description                          |
| ---------------------- | --------------------------- | ------------------------ | ------- | ------------------------------------ |
| `consumerKey`          | `string`                    | ✅                       | —       | Daraja consumer key                  |
| `consumerSecret`       | `string`                    | ✅                       | —       | Daraja consumer secret               |
| `environment`          | `"sandbox" \| "production"` | ✅                       | —       | Target environment                   |
| `lipaNaMpesaShortCode` | `string`                    | STK Push                 | —       | Paybill / HO shortcode               |
| `lipaNaMpesaPassKey`   | `string`                    | STK Push                 | —       | LNM passkey                          |
| `initiatorName`        | `string`                    | B2C / Reversal / Balance | —       | API operator username                |
| `initiatorPassword`    | `string`                    | B2C / Reversal / Balance | —       | API operator password                |
| `certificatePath`      | `string`                    | B2C / Reversal / Balance | —       | Path to `.cer` file                  |
| `certificatePem`       | `string`                    | —                        | —       | PEM string (alternative to path)     |
| `securityCredential`   | `string`                    | —                        | —       | Pre-encrypted credential (skips RSA) |
| `retries`              | `number`                    | —                        | `4`     | Retry count on transient errors      |
| `retryDelay`           | `number`                    | —                        | `2000`  | Base retry delay (ms)                |
| `timeout`              | `number`                    | —                        | `30000` | Per-attempt timeout (ms)             |

---

## Roadmap

### Planned (Safaricom APIs)

- [ ] **Standing Orders** — create recurring M-PESA payment instructions
- [ ] **M-PESA Global (Send Money)** — international transfers
- [ ] **Ratiba (M-PESA Ratiba)** — recurring bill payments
- [ ] **M-PESA for Business** — bulk payments improvements
- [ ] **Merchant QR** — static QR code generation

### Planned (Library)

- [ ] **Idempotency keys** — automatic deduplication headers
- [ ] **Webhook signature verification** — once Safaricom ships HMAC support
- [ ] **React hooks** — `useStkPush()`, `usePaymentStatus()` with polling
- [ ] **Vue composables** — `useStkPush()` for Vue 3
- [ ] **OpenAPI spec** — auto-generated from types
- [ ] **Mock server** — offline Daraja sandbox for unit testing
- [ ] **Zod schemas** — runtime validation of all request / response shapes
- [ ] **SvelteKit adapter** — `createMpesaSvelteHandler()`
- [ ] **Astro adapter** — API route helpers

---

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feat/my-feature`
3. Commit: `git commit -m '✨ Add my feature'`
4. Push: `git push origin feat/my-feature`
5. Open a Pull Request

---

## License

MIT © [Lewis Odero](https://github.com/levos-snr)

---

## Support

- 🐛 [GitHub Issues](https://github.com/levos-snr/pesafy/issues)
- 📧 [lewisodero27@gmail.com](mailto:lewisodero27@gmail.com)
- 📖 [Daraja Docs](https://developer.safaricom.co.ke)

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
  - [B2C Account Top Up](#b2c-account-top-up)
  - [B2C Disbursement](#b2c-disbursement)
  - [B2B Express Checkout](#b2b-express-checkout)
  - [B2B Pay Bill](#b2b-pay-bill)
  - [B2B Buy Goods](#b2b-buy-goods)
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
npx pesafy init                                   Scaffold .env interactively
npx pesafy doctor                                 Validate .env for common mistakes
npx pesafy token                                  Print a fresh OAuth token
npx pesafy encrypt                                Encrypt initiator password → SecurityCredential
npx pesafy validate-phone <phone>                 Validate / normalise a Kenyan phone number
npx pesafy stk-push                               Initiate an STK Push (interactive prompts)
npx pesafy stk-push --amount 100 --phone 0712345678 --ref INV-001
npx pesafy stk-query <checkoutId>                 Check STK Push status
npx pesafy balance                                Query M-PESA account balance (async)
npx pesafy balance --shortcode 600000 --identifier-type 4
npx pesafy reversal <txId>                        Initiate a transaction reversal
npx pesafy register-c2b-urls                      Register C2B Confirmation + Validation URLs
npx pesafy simulate-c2b                           Simulate a C2B payment (sandbox only)
npx pesafy version                                Print library version
npx pesafy help                                   Show help
```

### Environment variables read by the CLI

```bash
MPESA_CONSUMER_KEY
MPESA_CONSUMER_SECRET
MPESA_ENVIRONMENT           # sandbox | production
MPESA_SHORTCODE
MPESA_PASSKEY
MPESA_CALLBACK_URL
MPESA_INITIATOR_NAME
MPESA_INITIATOR_PASSWORD
MPESA_CERTIFICATE_PATH      # path to .cer file
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

  // Initiator-based APIs (B2C, B2B Pay Bill/Buy Goods, Reversal, Balance, Tax)
  initiatorName: 'testapi',
  initiatorPassword: 'Safaricom123!',
  certificatePath: './SandboxCertificate.cer',

  // HTTP tuning (optional)
  retries: 4, // default: 4
  retryDelay: 2000, // default: 2 000 ms
  timeout: 30000, // default: 30 000 ms (per attempt)
})
```

---

### STK Push (M-PESA Express)

Prompts the customer to enter their M-PESA PIN on their phone.

```typescript
// Initiate
const push = await mpesa.stkPush({
  amount: 100, // KES — whole numbers only (1–250 000)
  phoneNumber: '0712345678', // any common Kenyan format
  callbackUrl: 'https://yourdomain.com/api/mpesa/callback',
  accountReference: 'INV-001', // max 12 chars
  transactionDesc: 'Subscription', // max 13 chars
  transactionType: 'CustomerPayBillOnline', // default; or "CustomerBuyGoodsOnline"
  partyB: '174379', // defaults to shortCode; set till for Buy Goods
})

console.log(push.CheckoutRequestID) // save this to query later

// Query status
const status = await mpesa.stkQuery({
  checkoutRequestId: push.CheckoutRequestID,
})

if (status.ResultCode === 0) {
  console.log('Payment confirmed!')
}

// Safe variant — returns Result<T> instead of throwing
const result = await mpesa.stkPushSafe({
  amount: 100,
  phoneNumber: '0712345678',
  callbackUrl: 'https://yourdomain.com/api/mpesa/callback',
  accountReference: 'INV-001',
  transactionDesc: 'Payment',
})

if (result.ok) {
  console.log(result.data.CheckoutRequestID)
} else {
  console.error(result.error.code, result.error.message)
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
    const date = getCallbackValue(body, 'TransactionDate') // number (YYYYMMDDHHmmss)
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
  responseType: 'Completed', // "Completed" | "Cancelled" (sentence-case required)
  confirmationUrl: 'https://yourdomain.com/api/mpesa/c2b/confirmation',
  validationUrl: 'https://yourdomain.com/api/mpesa/c2b/validation',
  apiVersion: 'v2', // default
})

// 2. Simulate (SANDBOX ONLY)
await mpesa.simulateC2B({
  shortCode: '600984',
  commandId: 'CustomerPayBillOnline', // or "CustomerBuyGoodsOnline"
  amount: 10,
  msisdn: 254708374149,
  billRefNumber: 'INV-001', // Paybill only — omit entirely for Buy Goods
  apiVersion: 'v2',
})
```

**Validation webhook handler:**

```typescript
import {
  acceptC2BValidation,
  rejectC2BValidation,
  isC2BPayload,
  getC2BAmount,
  getC2BTransactionId,
  getC2BCustomerName,
  isPaybillPayment,
  isBuyGoodsPayment,
  type C2BValidationPayload,
  type C2BConfirmationPayload,
} from 'pesafy'

// Validation URL — must respond in ≤8 seconds
app.post('/api/mpesa/c2b/validation', (req, res) => {
  const payload = req.body as C2BValidationPayload
  const amount = getC2BAmount(payload) // number

  if (amount > 100_000) {
    return res.json(rejectC2BValidation('C2B00013')) // Invalid Amount
  }

  // Optionally echo back ThirdPartyTransID for correlation
  res.json(acceptC2BValidation(payload.ThirdPartyTransID))
})

// Confirmation URL — always respond 200 immediately
app.post('/api/mpesa/c2b/confirmation', (req, res) => {
  const payload = req.body as C2BConfirmationPayload

  processPayment({
    txId: getC2BTransactionId(payload),
    amount: getC2BAmount(payload),
    name: getC2BCustomerName(payload),
    type: isPaybillPayment(payload) ? 'paybill' : 'till',
  }).catch(console.error)

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

### B2C Account Top Up

Moves funds from your MMF/Working account into a B2C disbursement shortcode.
Only `BusinessPayToBulk` is supported by this API.

```typescript
const ack = await mpesa.b2cPayment({
  commandId: 'BusinessPayToBulk', // only valid CommandID for this API
  amount: 50_000,
  partyA: '600979', // sender MMF shortcode (or set b2cPartyA in config)
  partyB: '600000', // target B2C shortcode
  accountReference: 'BATCH-2024-01',
  resultUrl: 'https://yourdomain.com/api/mpesa/b2c/result',
  queueTimeOutUrl: 'https://yourdomain.com/api/mpesa/b2c/timeout',
  remarks: 'Monthly top-up',
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
  getB2CDebitPartyCharges,
  getB2CCurrency,
  getB2CTransactionCompletedTime,
} from 'pesafy'

app.post('/api/mpesa/b2c/result', (req, res) => {
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' }) // always respond 200 first

  if (!isB2CResult(req.body)) return

  if (isB2CSuccess(req.body)) {
    console.log('B2C success:', {
      txId: getB2CTransactionId(req.body),
      amount: getB2CAmount(req.body),
      balance: getB2CDebitAccountBalance(req.body),
    })
  } else {
    console.error('B2C failed:', req.body.Result.ResultDesc)
  }
})
```

---

### B2C Disbursement

Directly disburses funds to individual customer M-PESA wallets. Supports
`BusinessPayment`, `SalaryPayment`, and `PromotionPayment`.

```typescript
const ack = await mpesa.b2cDisbursement({
  originatorConversationId: 'unique-uuid-per-request', // required for idempotency
  commandId: 'SalaryPayment', // "BusinessPayment" | "SalaryPayment" | "PromotionPayment"
  amount: 2500,
  partyA: '600979', // sender shortcode
  partyB: '254712345678', // recipient MSISDN (2547XXXXXXXX)
  remarks: 'January salary', // required, 2–100 chars
  resultUrl: 'https://yourdomain.com/api/mpesa/b2c/disburse/result',
  queueTimeOutUrl: 'https://yourdomain.com/api/mpesa/b2c/disburse/timeout',
  occasion: 'Payroll Jan 2024', // optional
})
```

**B2C Disbursement result handler:**

```typescript
import {
  isB2CDisbursementResult,
  isB2CDisbursementSuccess,
  isB2CDisbursementRecipientRegistered,
  getB2CDisbursementReceiptNumber,
  getB2CDisbursementAmount,
  getB2CDisbursementReceiverName,
  getB2CDisbursementUtilityBalance,
  getB2CDisbursementWorkingBalance,
  getB2CDisbursementCompletedTime,
} from 'pesafy'

app.post('/api/mpesa/b2c/disburse/result', (req, res) => {
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' })

  if (!isB2CDisbursementResult(req.body)) return

  if (isB2CDisbursementSuccess(req.body)) {
    console.log({
      receipt: getB2CDisbursementReceiptNumber(req.body),
      amount: getB2CDisbursementAmount(req.body),
      receiver: getB2CDisbursementReceiverName(req.body),
      registered: isB2CDisbursementRecipientRegistered(req.body), // boolean
      utility: getB2CDisbursementUtilityBalance(req.body),
      working: getB2CDisbursementWorkingBalance(req.body),
      completedAt: getB2CDisbursementCompletedTime(req.body),
    })
  }
})
```

**B2C Disbursement CommandIDs:**

| CommandID          | Use Case                      |
| ------------------ | ----------------------------- |
| `BusinessPayment`  | Unsecured payment to customer |
| `SalaryPayment`    | Salary disbursement           |
| `PromotionPayment` | Promotions / bonus            |

---

### B2B Express Checkout

Sends a USSD Push to a merchant's till — merchant approves by entering their
M-PESA PIN.

```typescript
const ack = await mpesa.b2bExpressCheckout({
  primaryShortCode: '000001', // merchant till (debit party)
  receiverShortCode: '000002', // vendor Paybill (credit party)
  amount: 5000,
  paymentRef: 'INV-001',
  callbackUrl: 'https://yourdomain.com/api/mpesa/b2b/callback',
  partnerName: 'Acme Supplies', // shown in merchant's USSD prompt
  requestRefId: 'unique-uuid', // auto-generated UUID if omitted
})

// ack.code === "0" → USSD push initiated successfully
```

**B2B Callback handler:**

```typescript
import {
  isB2BCheckoutCallback,
  isB2BCheckoutSuccess,
  isB2BCheckoutCancelled,
  isB2BCheckoutFailed,
  getB2BTransactionId,
  getB2BAmount,
  getB2BConversationId,
  getB2BPaymentReference,
  getB2BResultCode,
  getB2BRequestId,
} from 'pesafy'

app.post('/api/mpesa/b2b/callback', (req, res) => {
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' })

  if (!isB2BCheckoutCallback(req.body)) return

  if (isB2BCheckoutSuccess(req.body)) {
    console.log('B2B paid:', {
      txId: getB2BTransactionId(req.body),
      amount: getB2BAmount(req.body),
      convId: getB2BConversationId(req.body),
    })
  } else if (isB2BCheckoutCancelled(req.body)) {
    console.log('Cancelled, ref:', getB2BPaymentReference(req.body))
  } else {
    console.warn('B2B failed, code:', getB2BResultCode(req.body))
  }
})
```

**B2B Express result codes:**

| Code | Meaning                  |
| ---- | ------------------------ |
| 0    | Success                  |
| 4001 | User cancelled           |
| 4102 | Merchant KYC fail        |
| 4104 | Missing Nominated Number |
| 4201 | USSD network error       |
| 4203 | USSD exception error     |

---

### B2B Pay Bill

Moves money from your MMF/Working account to another organisation's utility
account.

```typescript
const ack = await mpesa.b2bPayBill({
  commandId: 'BusinessPayBill', // only valid CommandID
  amount: 10_000,
  partyA: '600979', // your shortcode (debit)
  partyB: '000000', // destination Paybill (credit)
  accountReference: 'ACC-353353', // max 13 chars
  resultUrl: 'https://yourdomain.com/api/mpesa/b2b/paybill/result',
  queueTimeOutUrl: 'https://yourdomain.com/api/mpesa/b2b/paybill/timeout',
  remarks: 'Supplier payment',
  requester: '254712345678', // optional — consumer MSISDN on whose behalf
  occasion: 'Q1 Invoice', // optional
})
```

**B2B Pay Bill result handler:**

```typescript
import {
  isB2BPayBillResult,
  isB2BPayBillSuccess,
  getB2BPayBillTransactionId,
  getB2BPayBillAmount,
  getB2BPayBillReceiverName,
  getB2BPayBillDebitPartyAffectedBalance,
  getB2BPayBillBillReferenceNumber,
  getB2BPayBillCompletedTime,
} from 'pesafy'

app.post('/api/mpesa/b2b/paybill/result', (req, res) => {
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  if (!isB2BPayBillResult(req.body)) return

  if (isB2BPayBillSuccess(req.body)) {
    console.log({
      txId: getB2BPayBillTransactionId(req.body),
      amount: getB2BPayBillAmount(req.body),
      to: getB2BPayBillReceiverName(req.body),
      balance: getB2BPayBillDebitPartyAffectedBalance(req.body),
      billRef: getB2BPayBillBillReferenceNumber(req.body),
      time: getB2BPayBillCompletedTime(req.body),
    })
  }
})
```

---

### B2B Buy Goods

Moves money from your MMF/Working account to a merchant's till/store account.

```typescript
const ack = await mpesa.b2bBuyGoods({
  commandId: 'BusinessBuyGoods', // only valid CommandID
  amount: 5_000,
  partyA: '600979', // your shortcode (debit)
  partyB: '000000', // destination till / merchant store
  accountReference: 'PO-19008', // max 13 chars
  resultUrl: 'https://yourdomain.com/api/mpesa/b2b/buygoods/result',
  queueTimeOutUrl: 'https://yourdomain.com/api/mpesa/b2b/buygoods/timeout',
  remarks: 'Stock purchase',
  requester: '254712345678', // optional
})
```

**B2B Buy Goods result handler:**

```typescript
import {
  isB2BBuyGoodsResult,
  isB2BBuyGoodsSuccess,
  getB2BBuyGoodsTransactionId,
  getB2BBuyGoodsAmount,
  getB2BBuyGoodsReceiverName,
  getB2BBuyGoodsDebitPartyAffectedBalance,
  getB2BBuyGoodsBillReferenceNumber,
  getB2BBuyGoodsCompletedTime,
  getB2BBuyGoodsCurrency,
} from 'pesafy'

app.post('/api/mpesa/b2b/buygoods/result', (req, res) => {
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  if (!isB2BBuyGoodsResult(req.body)) return

  if (isB2BBuyGoodsSuccess(req.body)) {
    console.log({
      txId: getB2BBuyGoodsTransactionId(req.body),
      amount: getB2BBuyGoodsAmount(req.body),
      currency: getB2BBuyGoodsCurrency(req.body),
      to: getB2BBuyGoodsReceiverName(req.body),
      balance: getB2BBuyGoodsDebitPartyAffectedBalance(req.body),
      billRef: getB2BBuyGoodsBillReferenceNumber(req.body),
      time: getB2BBuyGoodsCompletedTime(req.body),
    })
  }
})
```

**B2B result codes (Pay Bill & Buy Goods share the same set):**

| Code | Meaning                  |
| ---- | ------------------------ |
| 0    | Success                  |
| 1    | Insufficient balance     |
| 2    | Amount below minimum     |
| 3    | Amount above maximum     |
| 4    | Daily limit exceeded     |
| 8    | Maximum balance exceeded |
| 2001 | Invalid initiator info   |
| 2006 | Account inactive         |
| 2028 | Product not permitted    |
| 2040 | Customer not registered  |

---

### Account Balance

Queries the balance of your M-PESA shortcode. **Asynchronous** — result is
POSTed to your `resultUrl`.

```typescript
await mpesa.accountBalance({
  partyA:         '174379',
  identifierType: '4', // "1"=MSISDN, "2"=Till, "4"=ShortCode (most common)
  resultUrl:      'https://yourdomain.com/api/mpesa/balance/result',
  queueTimeOutUrl:'https://yourdomain.com/api/mpesa/balance/timeout',
  remarks:        'Balance check',
})

// Safe variant
const result = await mpesa.accountBalanceSafe({ ... })
```

> **Required org portal role:** "Balance Query ORG API"

**Parsing the result callback:**

```typescript
import {
  isAccountBalanceSuccess,
  parseAccountBalance,
  getAccountBalanceParam,
  getAccountBalanceRawBalance,
  getAccountBalanceTransactionId,
  getAccountBalanceCompletedTime,
  type AccountBalanceResult,
} from 'pesafy'

app.post('/api/mpesa/balance/result', (req, res) => {
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' })

  const body = req.body as AccountBalanceResult
  if (!isAccountBalanceSuccess(body)) return

  const raw = getAccountBalanceRawBalance(body)
  const accounts = parseAccountBalance(raw ?? '')

  for (const account of accounts) {
    // e.g. { name: "Working Account", currency: "KES", amount: "45000.00" }
    console.log(`${account.name}: ${account.currency} ${account.amount}`)
  }

  console.log('Completed at:', getAccountBalanceCompletedTime(body))
})
```

---

### Transaction Status

Queries the result of any completed M-PESA transaction. **Asynchronous**.

```typescript
await mpesa.transactionStatus({
  transactionId: 'OEI2AK4XXXX', // M-Pesa receipt number
  // OR: originalConversationId: '7071-4170-...'  ← when no receipt is available
  partyA: '174379',
  identifierType: '4', // "1"=MSISDN, "2"=Till, "4"=ShortCode
  resultUrl: 'https://yourdomain.com/api/mpesa/tx/result',
  queueTimeOutUrl: 'https://yourdomain.com/api/mpesa/tx/timeout',
  remarks: 'Check payment status',
})
```

**Transaction status result handler:**

```typescript
import {
  isTransactionStatusResult,
  isTransactionStatusSuccess,
  getTransactionStatusReceiptNo,
  getTransactionStatusAmount,
  getTransactionStatusStatus,
  getTransactionStatusDebitPartyName,
  getTransactionStatusCreditPartyName,
  getTransactionStatusTransactionDate,
} from 'pesafy'

app.post('/api/mpesa/tx/result', (req, res) => {
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  if (!isTransactionStatusResult(req.body)) return

  if (isTransactionStatusSuccess(req.body)) {
    console.log({
      receipt: getTransactionStatusReceiptNo(req.body),
      amount: getTransactionStatusAmount(req.body),
      status: getTransactionStatusStatus(req.body), // e.g. "Completed"
      from: getTransactionStatusDebitPartyName(req.body),
      to: getTransactionStatusCreditPartyName(req.body),
      date: getTransactionStatusTransactionDate(req.body),
    })
  }
})
```

---

### Transaction Reversal

Reverses a completed M-PESA C2B transaction. **Asynchronous**.

> **Note:** `RecieverIdentifierType` is always `"11"` for reversals (per Daraja
> docs). B2C reversals must be done manually on the M-PESA organisation portal.
>
> **Required org portal role:** "Org Reversals Initiator"

```typescript
await mpesa.reverseTransaction({
  transactionId: 'OEI2AK4XXXX', // M-PESA receipt of the transaction to reverse
  receiverParty: '174379', // your shortcode
  amount: 500, // must equal the original amount
  resultUrl: 'https://yourdomain.com/api/mpesa/reversal/result',
  queueTimeOutUrl: 'https://yourdomain.com/api/mpesa/reversal/timeout',
  remarks: 'Erroneous charge', // 2–100 chars
})
```

**Reversal result handler:**

```typescript
import {
  isReversalResult,
  isReversalSuccess,
  getReversalTransactionId,
  getReversalOriginalTransactionId,
  getReversalAmount,
  getReversalCreditPartyPublicName,
  getReversalDebitPartyPublicName,
  getReversalCompletedTime,
  getReversalCharge,
  REVERSAL_RESULT_CODES,
} from 'pesafy'

app.post('/api/mpesa/reversal/result', (req, res) => {
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  if (!isReversalResult(req.body)) return

  if (isReversalSuccess(req.body)) {
    console.log('Reversed:', {
      newTxId: getReversalTransactionId(req.body),
      origTxId: getReversalOriginalTransactionId(req.body),
      amount: getReversalAmount(req.body),
      to: getReversalCreditPartyPublicName(req.body),
      from: getReversalDebitPartyPublicName(req.body),
      time: getReversalCompletedTime(req.body),
      charge: getReversalCharge(req.body),
    })
  } else {
    const code = req.body.Result.ResultCode
    // REVERSAL_RESULT_CODES.ALREADY_REVERSED = "R000001"
    // REVERSAL_RESULT_CODES.INVALID_TRANSACTION_ID = "R000002"
    console.warn('Reversal failed, code:', code)
  }
})
```

**Reversal result codes:**

| Code    | Meaning                                   |
| ------- | ----------------------------------------- |
| 0       | Success                                   |
| 1       | Insufficient balance                      |
| 11      | DebitParty in invalid state               |
| 21      | Initiator not allowed                     |
| 2001    | Initiator information invalid             |
| 2006    | Account inactive                          |
| 2028    | Not permitted                             |
| 8006    | Security credential locked                |
| R000001 | Transaction already reversed              |
| R000002 | OriginalTransactionID invalid / not found |

---

### Tax Remittance (KRA)

Remits tax to Kenya Revenue Authority via M-PESA. **Asynchronous**. `PartyB` is
always KRA's shortcode `"572572"` — set automatically.

```typescript
await mpesa.remitTax({
  amount: 5_000,
  partyA: '888880', // your business shortcode
  accountReference: 'PRN1234XN', // KRA Payment Registration Number (PRN)
  resultUrl: 'https://yourdomain.com/api/mpesa/tax/result',
  queueTimeOutUrl: 'https://yourdomain.com/api/mpesa/tax/timeout',
  remarks: 'Monthly PAYE',
})
```

**Tax result handler:**

```typescript
import {
  isTaxRemittanceResult,
  isTaxRemittanceSuccess,
  getTaxTransactionId,
  getTaxAmount,
  getTaxReceiverName,
  getTaxCompletedTime,
} from 'pesafy'

app.post('/api/mpesa/tax/result', (req, res) => {
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  if (!isTaxRemittanceResult(req.body)) return

  if (isTaxRemittanceSuccess(req.body)) {
    console.log({
      txId: getTaxTransactionId(req.body),
      amount: getTaxAmount(req.body),
      to: getTaxReceiverName(req.body),
      time: getTaxCompletedTime(req.body),
    })
  }
})
```

---

### Dynamic QR Code

Generates an M-PESA QR code customers scan to pay.

```typescript
const qr = await mpesa.generateDynamicQR({
  merchantName: 'My Shop',
  refNo: 'INV-001',
  amount: 500,
  trxCode: 'BG', // see table below
  cpi: '373132', // till / paybill / MSISDN depending on trxCode
  size: 300, // pixels (1–1000, default 300)
})

// Render in HTML:
// <img src={`data:image/png;base64,${qr.QRCode}`} />

// Write to disk:
// import { writeFileSync } from 'node:fs'
// writeFileSync('qr.png', Buffer.from(qr.QRCode, 'base64'))
```

**QR Transaction codes:**

| Code | Use Case                    | CPI format      |
| ---- | --------------------------- | --------------- |
| `BG` | Pay Merchant (Buy Goods)    | Till number     |
| `WA` | Withdraw Cash at Agent Till | Agent till      |
| `PB` | Paybill / Business number   | Paybill number  |
| `SM` | Send Money (mobile number)  | Customer MSISDN |
| `SB` | Send to Business            | MSISDN-format   |

---

### Bill Manager

Create and send invoices that customers pay directly via M-PESA.

```typescript
// 1. Opt-in your shortcode (one-time setup)
await mpesa.billManagerOptIn({
  shortcode: '600984',
  email: 'billing@company.com',
  officialContact: '0700000000',
  sendReminders: '1', // "1" enable | "0" disable (7-, 3-day, due-date reminders)
  logo: 'https://cdn.company.com/logo.jpg', // optional JPEG/JPG
  callbackUrl: 'https://yourdomain.com/api/mpesa/bills/callback',
})

// 2. Update opt-in details
await mpesa.updateOptIn({
  shortcode: '600984',
  email: 'new@company.com',
  officialContact: '0700000001',
  sendReminders: '1',
  callbackUrl: 'https://yourdomain.com/api/mpesa/bills/callback',
})

// 3. Send a single invoice
await mpesa.sendInvoice({
  externalReference: 'INV-001', // your unique invoice ID
  billedFullName: 'John Doe', // shown in customer SMS
  billedPhoneNumber: '254712345678', // Safaricom number to receive SMS
  billedPeriod: 'January 2024', // e.g. "August 2021"
  invoiceName: 'Monthly Subscription',
  dueDate: '2024-01-31', // YYYY-MM-DD or YYYY-MM-DD HH:MM:SS
  accountReference: 'ACC-12345',
  amount: 2500,
  invoiceItems: [
    { itemName: 'Base subscription', amount: 2000 },
    { itemName: 'SMS bundle', amount: 500 },
  ],
})

// 4. Bulk invoices (up to 1 000 per call)
await mpesa.sendBulkInvoices({
  invoices: [
    {
      externalReference: 'INV-002',
      billedFullName: 'Jane Smith',
      billedPhoneNumber: '254700000000',
      billedPeriod: 'January 2024',
      invoiceName: 'Monthly Subscription',
      dueDate: '2024-01-31',
      accountReference: 'ACC-67890',
      amount: 2500,
    },
  ],
})

// 5. Cancel a single invoice (cannot cancel partially/fully paid invoices)
await mpesa.cancelInvoice({ externalReference: 'INV-001' })

// 6. Cancel multiple invoices
await mpesa.cancelBulkInvoices({ externalReferences: ['INV-002', 'INV-003'] })

// 7. Reconcile after processing a payment notification
await mpesa.reconcilePayment({
  transactionId: 'RJB53MYR1N',
  externalReference: 'INV-001',
  accountReference: 'ACC-12345',
  paidAmount: '2500',
  paymentDate: '2024-01-15',
  phoneNumber: '0712345678',
  fullName: 'John Doe',
  invoiceName: 'Monthly Subscription',
})
```

**Payment notification callback (POSTed to your `callbackUrl`):**

```typescript
import { type BillManagerPaymentNotification } from 'pesafy'

app.post('/api/mpesa/bills/callback', (req, res) => {
  const notification = req.body as BillManagerPaymentNotification
  console.log({
    txId: notification.transactionId,
    amount: notification.paidAmount,
    phone: notification.msisdn,
    accountRef: notification.accountReference,
    shortCode: notification.shortCode,
    date: notification.dateCreated,
  })
  res.json({ rescode: '200', resmsg: 'Success' })
})
```

---

### Webhooks

**IP verification** — Safaricom always calls from a fixed whitelist:

```typescript
import { verifyWebhookIP, SAFARICOM_IPS } from 'pesafy'

app.post('/api/mpesa/callback', (req, res) => {
  const ip = (req.headers['x-forwarded-for'] as string) ?? req.ip ?? ''
  if (!verifyWebhookIP(ip)) {
    console.warn('Callback from unknown IP:', ip)
    // Still respond 200 — Safaricom retries on non-200
  }
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' })
})
```

**Generic STK Push webhook handler:**

```typescript
import {
  handleWebhook,
  isSuccessfulCallback,
  extractTransactionId,
  extractAmount,
  extractPhoneNumber,
} from 'pesafy'

app.post('/api/mpesa/callback', (req, res) => {
  const result = handleWebhook(req.body, {
    requestIP: req.ip,
    skipIPCheck: false, // set true in local dev
  })

  if (result.success && isSuccessfulCallback(result.data)) {
    const receipt = extractTransactionId(result.data)
    const amount = extractAmount(result.data)
    const phone = extractPhoneNumber(result.data)
  }

  res.json({ ResultCode: 0, ResultDesc: 'Accepted' })
})
```

**Retry with backoff** (for your own async processing):

```typescript
import { retryWithBackoff } from 'pesafy'

const outcome = await retryWithBackoff(() => saveToDatabase(webhookData), {
  maxRetries: 5,
  initialDelay: 500,
  maxDelay: 30_000,
  backoffMultiplier: 2,
})

if (!outcome.success) {
  console.error(
    `Failed after ${outcome.attempts} attempts:`,
    outcome.error?.message,
  )
}
```

---

## Framework Adapters

### Express Adapter

```typescript
import express from 'express'
import { createMpesaExpressRouter } from 'pesafy/adapters/express'
import { acceptC2BValidation } from 'pesafy'

const app = express()
const router = express.Router()
app.use(express.json())

createMpesaExpressRouter(router, {
  // Core
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: 'sandbox',

  // STK Push
  lipaNaMpesaShortCode: '174379',
  lipaNaMpesaPassKey: process.env.MPESA_PASSKEY!,
  callbackUrl: 'https://yourdomain.com/api/mpesa/express/callback',

  // Initiator (B2C, Tax, Reversal, Balance)
  initiatorName: 'testapi',
  initiatorPassword: 'Safaricom123!',
  certificatePath: './SandboxCertificate.cer',

  // Transaction Status
  resultUrl: 'https://yourdomain.com/api/mpesa/transaction-status/result',
  queueTimeOutUrl: 'https://yourdomain.com/api/mpesa/timeout',

  // C2B
  c2bShortCode: '600984',
  c2bConfirmationUrl: 'https://yourdomain.com/api/mpesa/c2b/confirmation',
  c2bValidationUrl: 'https://yourdomain.com/api/mpesa/c2b/validation',
  c2bResponseType: 'Completed',
  c2bApiVersion: 'v2',
  onC2BValidation: async (payload) => {
    if (Number(payload.TransAmount) > 100_000)
      return { ResultCode: 'C2B00013', ResultDesc: 'Rejected' }
    return acceptC2BValidation()
  },
  onC2BConfirmation: async (payload) => {
    await db.payments.create({
      txId: payload.TransID,
      amount: Number(payload.TransAmount),
    })
  },

  // Tax Remittance
  taxPartyA: '888880',
  taxResultUrl: 'https://yourdomain.com/api/mpesa/tax/result',
  taxQueueTimeOutUrl: 'https://yourdomain.com/api/mpesa/tax/timeout',
  onTaxRemittanceResult: async (result) => {
    console.log('Tax result:', result.Result.ResultCode)
  },

  // B2B Express Checkout
  b2bReceiverShortCode: '000002',
  b2bCallbackUrl: 'https://yourdomain.com/api/mpesa/b2b/callback',
  onB2BCheckoutCallback: async (callback) => {
    console.log('B2B callback:', callback.resultCode)
  },

  // B2C Account Top Up
  b2cPartyA: '600979',
  b2cResultUrl: 'https://yourdomain.com/api/mpesa/b2c/result',
  b2cQueueTimeOutUrl: 'https://yourdomain.com/api/mpesa/b2c/timeout',
  onB2CResult: async (result) => {
    console.log('B2C result:', result.Result.ResultCode)
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
| POST   | `/mpesa/transaction-status/query`  | Query transaction status         |
| POST   | `/mpesa/transaction-status/result` | Transaction status result        |
| POST   | `/mpesa/c2b/register-url`          | Register C2B URLs                |
| POST   | `/mpesa/c2b/simulate`              | Simulate C2B (sandbox only)      |
| POST   | `/mpesa/c2b/validation`            | C2B validation callback          |
| POST   | `/mpesa/c2b/confirmation`          | C2B confirmation callback        |
| POST   | `/mpesa/tax/remit`                 | Initiate tax remittance          |
| POST   | `/mpesa/tax/result`                | Tax remittance result            |
| POST   | `/mpesa/b2b/checkout`              | B2B Express Checkout             |
| POST   | `/mpesa/b2b/callback`              | B2B Express Checkout callback    |
| POST   | `/mpesa/b2c/payment`               | B2C Account Top Up               |
| POST   | `/mpesa/b2c/result`                | B2C result callback              |

---

### Hono Adapter

Works on Bun, Cloudflare Workers, Deno, and Node.js.

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

  onAccountBalanceResult: async (body) => {
    console.log('Balance result:', body)
  },
  onReversalResult: async (body) => {
    console.log('Reversal result:', body)
  },

  skipIPCheck: true, // local dev only
})

// Bun
export default app

// Cloudflare Workers
export default { fetch: app.fetch }
```

**Routes mounted by `createMpesaHonoRouter`:**

| Method | Path                       | Description                      |
| ------ | -------------------------- | -------------------------------- |
| POST   | `/mpesa/express/stk-push`  | Initiate STK Push                |
| POST   | `/mpesa/express/stk-query` | Query STK Push status            |
| POST   | `/mpesa/express/callback`  | STK Push callback from Safaricom |
| POST   | `/mpesa/balance/query`     | Account balance query            |
| POST   | `/mpesa/balance/result`    | Account balance result           |
| POST   | `/mpesa/reversal/request`  | Reversal request                 |
| POST   | `/mpesa/reversal/result`   | Reversal result callback         |

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
  skipIPCheck: true,
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

**Catch-all bundle** (single route file for all handlers):

```typescript
// app/api/mpesa/[[...route]]/route.ts
import { createMpesaNextHandlers } from 'pesafy/adapters/nextjs'

export const { POST } = createMpesaNextHandlers({
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: 'sandbox',
  lipaNaMpesaShortCode: process.env.MPESA_SHORTCODE!,
  lipaNaMpesaPassKey: process.env.MPESA_PASSKEY!,
  callbackUrl: process.env.MPESA_CALLBACK_URL!,
  resultUrl: process.env.MPESA_RESULT_URL,
  queueTimeOutUrl: process.env.MPESA_QUEUE_TIMEOUT_URL,
})
// Dispatches: /api/mpesa/stk-push, /api/mpesa/stk-query,
//             /api/mpesa/callback, /api/mpesa/balance
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

**Routes mounted by `registerMpesaRoutes`:**

| Method | Path                     | Description                      |
| ------ | ------------------------ | -------------------------------- |
| POST   | `/mpesa/stk-push`        | Initiate STK Push                |
| POST   | `/mpesa/stk-query`       | Query STK Push status            |
| POST   | `/mpesa/callback`        | STK Push callback from Safaricom |
| POST   | `/mpesa/balance`         | Account balance query            |
| POST   | `/mpesa/balance/result`  | Account balance result           |
| POST   | `/mpesa/reversal`        | Reversal request                 |
| POST   | `/mpesa/reversal/result` | Reversal result callback         |

---

## Branded Types

pesafy ships opt-in branded primitives that catch type bugs at compile time.

```typescript
import {
  toKesAmount,
  toMsisdn,
  toPaybill,
  toTill,
  toShortCode,
  toNonEmpty,
  type KesAmount,
  type MsisdnKE,
  type PaybillCode,
  type TillCode,
} from 'pesafy'

const amount: KesAmount = toKesAmount(100) // throws if < 1 or fractional
const phone: MsisdnKE = toMsisdn('0712345678') // throws if unparseable
const code: PaybillCode = toPaybill('174379')
const till: TillCode = toTill('5555')
```

**Result type** — prefer this over try/catch in application code:

```typescript
import { ok, err, type Result } from 'pesafy'

const result = await mpesa.stkPushSafe({ ... })

if (result.ok) {
  console.log(result.data.CheckoutRequestID)
} else {
  // result.error is PesafyError with .code, .statusCode, .retryable
  if (result.error.retryable) {
    // schedule retry
  }
}
```

---

## Error Handling

All errors are `PesafyError` instances with structured codes:

```typescript
import { PesafyError, isPesafyError } from 'pesafy'

try {
  await mpesa.stkPush({ ... })
} catch (error) {
  if (isPesafyError(error)) {
    console.log(error.code)        // structured error code (see table below)
    console.log(error.message)
    console.log(error.statusCode)  // HTTP status from Daraja (if applicable)
    console.log(error.retryable)   // boolean — safe to retry?
    console.log(error.requestId)   // Daraja requestId (if returned)
    console.log(error.response)    // raw Daraja response body

    // Convenience properties
    error.isValidation // true if VALIDATION_ERROR
    error.isAuth       // true if AUTH_FAILED / INVALID_CREDENTIALS
  }
}
```

**Error codes:**

| Code                  | Retryable | Meaning                                     |
| --------------------- | --------- | ------------------------------------------- |
| `AUTH_FAILED`         | ❌        | OAuth token fetch failed                    |
| `INVALID_CREDENTIALS` | ❌        | Missing or wrong consumerKey / Secret       |
| `INVALID_PHONE`       | ❌        | Phone number cannot be normalised           |
| `ENCRYPTION_FAILED`   | ❌        | RSA encryption of initiator password failed |
| `VALIDATION_ERROR`    | ❌        | Invalid request parameters                  |
| `API_ERROR`           | ❌        | Daraja returned a 4xx error                 |
| `REQUEST_FAILED`      | ✅        | Daraja returned 5xx                         |
| `NETWORK_ERROR`       | ✅        | DNS / connection failure                    |
| `TIMEOUT`             | ✅        | Request exceeded timeout                    |
| `RATE_LIMITED`        | ✅        | 429 Too Many Requests                       |

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

Encrypt once at startup and pass as `securityCredential` to skip per-call RSA:

```typescript
import { encryptSecurityCredential } from 'pesafy'
import { readFileSync } from 'node:fs'

const pem        = readFileSync('./SandboxCertificate.cer', 'utf-8')
const credential = encryptSecurityCredential('Safaricom123!', pem)

const mpesa = new Mpesa({
  ...
  securityCredential: credential, // skips RSA encryption on every API call
})
```

### Token management

```typescript
// Force token refresh on the next call (e.g. after an unexpected 401)
mpesa.clearTokenCache()

// Read the environment
console.log(mpesa.environment) // "sandbox" | "production"
```

---

## Configuration Reference

| Option                 | Type                        | Required for                   | Default | Description                          |
| ---------------------- | --------------------------- | ------------------------------ | ------- | ------------------------------------ |
| `consumerKey`          | `string`                    | All APIs ✅                    | —       | Daraja consumer key                  |
| `consumerSecret`       | `string`                    | All APIs ✅                    | —       | Daraja consumer secret               |
| `environment`          | `"sandbox" \| "production"` | All APIs ✅                    | —       | Target environment                   |
| `lipaNaMpesaShortCode` | `string`                    | STK Push                       | —       | Paybill / HO shortcode               |
| `lipaNaMpesaPassKey`   | `string`                    | STK Push                       | —       | LNM passkey                          |
| `initiatorName`        | `string`                    | B2C / B2B / Reversal / Balance | —       | API operator username                |
| `initiatorPassword`    | `string`                    | B2C / B2B / Reversal / Balance | —       | API operator password                |
| `certificatePath`      | `string`                    | B2C / B2B / Reversal / Balance | —       | Path to `.cer` file on disk          |
| `certificatePem`       | `string`                    | —                              | —       | PEM string (alternative to path)     |
| `securityCredential`   | `string`                    | —                              | —       | Pre-encrypted credential (skips RSA) |
| `retries`              | `number`                    | —                              | `4`     | Retry count on transient errors      |
| `retryDelay`           | `number`                    | —                              | `2000`  | Base retry delay in ms               |
| `timeout`              | `number`                    | —                              | `30000` | Per-attempt timeout in ms            |

---

## Roadmap

### Planned (Safaricom APIs)

- [ ] **Standing Orders** — create recurring M-PESA payment instructions
- [ ] **M-PESA Global** — international money transfers
- [ ] **Ratiba** — recurring bill payments
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
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Commit your changes: `git commit -m '✨ Add my feature'`
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

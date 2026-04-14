# Express

The Express adapter mounts all M-PESA routes onto an existing Express `Router`
with a single function call. It provides the broadest Daraja API coverage of all
pesafy adapters.

## Installation

```bash
npm install pesafy express
npm install -D @types/express
```

## Quick Start

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
  skipIPCheck: true, // local dev only — never true in production
})

app.use('/api', router)
app.listen(3000)
```

## Configuration

```ts
interface MpesaExpressConfig extends MpesaConfig {
  // ── STK Push ───────────────────────────────────────────────────────────────
  callbackUrl: string // STK Push callback URL (required)

  onStkSuccess?: (data: {
    receiptNumber: string | null
    amount: number | null
    phone: string | null
  }) => void | Promise<void>

  onStkFailure?: (data: {
    resultCode: number
    resultDesc: string
  }) => void | Promise<void>

  // ── Async APIs (Balance, Reversal, Transaction Status) ────────────────────
  resultUrl?: string
  queueTimeOutUrl?: string

  // ── C2B ───────────────────────────────────────────────────────────────────
  c2bShortCode?: string
  c2bConfirmationUrl?: string
  c2bValidationUrl?: string
  c2bResponseType?: 'Completed' | 'Cancelled'
  c2bApiVersion?: 'v1' | 'v2'

  onC2BValidation?: (
    payload: C2BValidationPayload,
  ) => C2BValidationResponse | Promise<C2BValidationResponse>
  onC2BConfirmation?: (payload: C2BConfirmationPayload) => void | Promise<void>

  // ── Tax Remittance (KRA) ──────────────────────────────────────────────────
  taxPartyA?: string
  taxResultUrl?: string
  taxQueueTimeOutUrl?: string
  onTaxRemittanceResult?: (result: unknown) => void | Promise<void>

  // ── B2B Express Checkout ──────────────────────────────────────────────────
  b2bReceiverShortCode?: string
  b2bCallbackUrl?: string
  onB2BCheckoutCallback?: (callback: unknown) => void | Promise<void>

  // ── B2C ───────────────────────────────────────────────────────────────────
  b2cPartyA?: string
  b2cResultUrl?: string
  b2cQueueTimeOutUrl?: string
  onB2CResult?: (result: unknown) => void | Promise<void>

  // ── Dev ───────────────────────────────────────────────────────────────────
  skipIPCheck?: boolean // NEVER true in production
}
```

## Mounted Routes

| Method | Path                               | Description                               |
| ------ | ---------------------------------- | ----------------------------------------- |
| `POST` | `/mpesa/express/stk-push`          | Initiate STK Push                         |
| `POST` | `/mpesa/express/stk-query`         | Query STK Push status                     |
| `POST` | `/mpesa/express/callback`          | Receive STK Push callback from Safaricom  |
| `POST` | `/mpesa/transaction-status/query`  | Query transaction status                  |
| `POST` | `/mpesa/transaction-status/result` | Receive transaction status result         |
| `POST` | `/mpesa/c2b/register-url`          | Register C2B Confirmation/Validation URLs |
| `POST` | `/mpesa/c2b/simulate`              | Simulate C2B payment (sandbox only)       |
| `POST` | `/mpesa/c2b/validation`            | Receive C2B validation request            |
| `POST` | `/mpesa/c2b/confirmation`          | Receive C2B confirmation                  |
| `POST` | `/mpesa/tax/remit`                 | Initiate tax remittance to KRA            |
| `POST` | `/mpesa/tax/result`                | Receive tax remittance result             |
| `POST` | `/mpesa/b2b/checkout`              | Initiate B2B Express Checkout             |
| `POST` | `/mpesa/b2b/callback`              | Receive B2B checkout callback             |
| `POST` | `/mpesa/b2c/payment`               | Initiate B2C payment                      |
| `POST` | `/mpesa/b2c/result`                | Receive B2C result                        |

## STK Push

Trigger a payment prompt on the customer's phone:

```bash
POST /api/mpesa/express/stk-push
Content-Type: application/json

{
  "amount":           100,
  "phoneNumber":      "254712345678",
  "accountReference": "ORDER-001",
  "transactionDesc":  "Checkout"
}
```

Handle the outcome with `onStkSuccess` and `onStkFailure`:

```ts
createMpesaExpressRouter(router, {
  // ...
  onStkSuccess: async ({ receiptNumber, amount, phone }) => {
    await db.orders.markPaid({ receiptNumber, amount, phone })
  },

  onStkFailure: async ({ resultCode, resultDesc }) => {
    console.warn(`Payment failed [${resultCode}]: ${resultDesc}`)
  },
})
```

The `200` response to Safaricom is sent immediately; your hook runs in the
background.

## C2B with Validation

```ts
createMpesaExpressRouter(router, {
  // ...
  c2bShortCode: '600977',
  c2bConfirmationUrl: 'https://yourdomain.com/api/mpesa/c2b/confirmation',
  c2bValidationUrl: 'https://yourdomain.com/api/mpesa/c2b/validation',
  c2bResponseType: 'Completed',

  onC2BValidation: async (payload) => {
    const isValid = await db.accounts.exists(payload.BillRefNumber)
    if (!isValid) return rejectC2BValidation('C2B00012')
    return acceptC2BValidation()
  },

  onC2BConfirmation: async (payload) => {
    await db.payments.record({
      ref: payload.BillRefNumber,
      amount: Number(payload.TransAmount),
      txId: payload.TransID,
    })
  },
})
```

Register confirmation and validation URLs with Safaricom:

```bash
POST /api/mpesa/c2b/register-url
Content-Type: application/json

{}
```

Simulate a C2B payment in sandbox:

```bash
POST /api/mpesa/c2b/simulate
Content-Type: application/json

{
  "shortCode":    "600977",
  "commandId":    "CustomerPayBillOnline",
  "amount":       200,
  "msisdn":       "254712345678",
  "billRefNumber": "ACCOUNT-001"
}
```

## B2C Payments

```ts
createMpesaExpressRouter(router, {
  // ...
  initiatorName: process.env.MPESA_INITIATOR_NAME!,
  initiatorPassword: process.env.MPESA_INITIATOR_PASSWORD!,
  certificatePath: './SandboxCertificate.cer',
  b2cPartyA: process.env.MPESA_SHORTCODE!,
  b2cResultUrl: 'https://yourdomain.com/api/mpesa/b2c/result',
  b2cQueueTimeOutUrl: 'https://yourdomain.com/api/mpesa/b2c/timeout',

  onB2CResult: async (result) => {
    if (isB2CSuccess(result)) {
      await db.disbursements.markCompleted({
        transactionId: getB2CTransactionId(result),
        amount: getB2CAmount(result),
      })
    }
  },
})
```

Initiate a B2C payment:

```bash
POST /api/mpesa/b2c/payment
Content-Type: application/json

{
  "commandId":        "BusinessPayment",
  "amount":           500,
  "partyB":           "254712345678",
  "accountReference": "PAYOUT-001"
}
```

## B2B Express Checkout

```ts
createMpesaExpressRouter(router, {
  // ...
  b2bReceiverShortCode: process.env.MPESA_B2B_RECEIVER!,
  b2bCallbackUrl: 'https://yourdomain.com/api/mpesa/b2b/callback',

  onB2BCheckoutCallback: async (callback) => {
    await db.b2b.record(callback)
  },
})
```

Initiate a B2B checkout:

```bash
POST /api/mpesa/b2b/checkout
Content-Type: application/json

{
  "amount":           1000,
  "accountReference": "VENDOR-INV-042",
  "remarks":          "Supplier payment"
}
```

## Tax Remittance (KRA)

```ts
createMpesaExpressRouter(router, {
  // ...
  initiatorName: process.env.MPESA_INITIATOR_NAME!,
  initiatorPassword: process.env.MPESA_INITIATOR_PASSWORD!,
  certificatePath: './SandboxCertificate.cer',
  taxPartyA: process.env.MPESA_SHORTCODE!,
  taxResultUrl: 'https://yourdomain.com/api/mpesa/tax/result',
  taxQueueTimeOutUrl: 'https://yourdomain.com/api/mpesa/tax/timeout',

  onTaxRemittanceResult: async (result) => {
    await db.tax.record(result)
  },
})
```

Remit tax to KRA:

```bash
POST /api/mpesa/tax/remit
Content-Type: application/json

{
  "amount":  5000,
  "remarks": "Monthly VAT remittance"
}
```

## Transaction Status

Query the status of any M-PESA transaction:

```bash
POST /api/mpesa/transaction-status/query
Content-Type: application/json

{
  "transactionId":  "OEI2AK4XXXX",
  "partyA":         "174379",
  "identifierType": "4",
  "remarks":        "Status check",
  "occasion":       ""
}
```

::: info `resultUrl` and `queueTimeOutUrl` must be set in config for this route
to work. :::

## Using a Route Prefix

Mount the router under any sub-path using `app.use`:

```ts
// Routes become /payments/mpesa/express/stk-push, etc.
app.use('/payments', router)
```

Or nest inside another router:

```ts
const apiRouter = express.Router()
apiRouter.use(router)
app.use('/api/v1', apiRouter)
// → /api/v1/mpesa/express/stk-push
```

## IP Verification

Safaricom callback IPs are verified automatically in production. Disable only
for local development:

```ts
skipIPCheck: process.env.NODE_ENV !== 'production'
```

::: warning Never set `skipIPCheck: true` in a production deployment. :::

## Environment Variables

```bash
MPESA_CONSUMER_KEY=...
MPESA_CONSUMER_SECRET=...
MPESA_ENVIRONMENT=sandbox
MPESA_SHORTCODE=174379
MPESA_PASSKEY=bfb279...
MPESA_CALLBACK_URL=https://yourdomain.com/api/mpesa/express/callback
MPESA_INITIATOR_NAME=testapi
MPESA_INITIATOR_PASSWORD=Safaricom123!
MPESA_CERTIFICATE_PATH=./SandboxCertificate.cer
MPESA_RESULT_URL=https://yourdomain.com/api/mpesa/result
MPESA_QUEUE_TIMEOUT_URL=https://yourdomain.com/api/mpesa/timeout
```

# Express

The Express adapter mounts all M-PESA routes onto an existing Express `Router` with a single function call.

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
  skipIPCheck: true, // local dev only
})

app.use('/api', router)
app.listen(3000)
```

## Configuration

```ts
interface MpesaExpressConfig extends MpesaConfig {
  // Required
  callbackUrl: string // STK Push callback URL

  // Async APIs (Balance, Reversal, Transaction Status)
  resultUrl?: string
  queueTimeOutUrl?: string

  // C2B
  c2bShortCode?: string
  c2bConfirmationUrl?: string
  c2bValidationUrl?: string
  c2bResponseType?: 'Completed' | 'Cancelled'
  c2bApiVersion?: 'v1' | 'v2'
  onC2BValidation?: (
    payload,
  ) => C2BValidationResponse | Promise<C2BValidationResponse>
  onC2BConfirmation?: (payload) => void | Promise<void>

  // Tax Remittance
  taxPartyA?: string
  taxResultUrl?: string
  taxQueueTimeOutUrl?: string
  onTaxRemittanceResult?: (result) => void | Promise<void>

  // B2B Express Checkout
  b2bReceiverShortCode?: string
  b2bCallbackUrl?: string
  onB2BCheckoutCallback?: (callback) => void | Promise<void>

  // B2C
  b2cPartyA?: string
  b2cResultUrl?: string
  b2cQueueTimeOutUrl?: string
  onB2CResult?: (result) => void | Promise<void>

  // Dev
  skipIPCheck?: boolean // NEVER true in production
}
```

## Mounted Routes

| Method | Path                               | Description                               |
| ------ | ---------------------------------- | ----------------------------------------- |
| `POST` | `/mpesa/express/stk-push`          | Initiate STK Push                         |
| `POST` | `/mpesa/express/stk-query`         | Query STK Push status                     |
| `POST` | `/mpesa/express/callback`          | Receive STK Push callback                 |
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

Then POST to `/api/mpesa/b2c/payment`:

```json
{
  "commandId": "BusinessPayment",
  "amount": 500,
  "partyB": "254712345678",
  "accountReference": "PAYOUT-001"
}
```

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

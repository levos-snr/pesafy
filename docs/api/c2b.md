# C2B — Customer to Business

Receive M-PESA payments from customers on your Paybill or Till number. C2B
requires registering webhook URLs with Safaricom once per shortcode, then
Safaricom calls your URLs for every incoming payment.

## Prerequisites

```ts
const mpesa = new Mpesa({
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: 'sandbox',
})
```

No initiator credentials are required for URL registration and simulation.

## `registerC2BUrls()`

Register your Confirmation and Validation webhook URLs with Safaricom.

```ts
const response = await mpesa.registerC2BUrls({
  shortCode: '600984',
  responseType: 'Completed', // 'Completed' | 'Cancelled'
  confirmationUrl: 'https://yourdomain.com/api/mpesa/c2b/confirmation',
  validationUrl: 'https://yourdomain.com/api/mpesa/c2b/validation',
  apiVersion: 'v2', // 'v1' | 'v2' — defaults to 'v2'
})
```

### Parameters

| Parameter         | Type                         | Required | Description                                                                                       |
| ----------------- | ---------------------------- | -------- | ------------------------------------------------------------------------------------------------- |
| `shortCode`       | `string`                     | ✅       | Your Paybill or Till shortcode (5–6 digits).                                                      |
| `responseType`    | `'Completed' \| 'Cancelled'` | ✅       | What M-PESA does when your Validation URL is unreachable. Must be sentence-case.                  |
| `confirmationUrl` | `string`                     | ✅       | URL Safaricom POSTs to after every completed payment.                                             |
| `validationUrl`   | `string`                     | ✅       | URL Safaricom POSTs to before processing each payment (only when external validation is enabled). |
| `apiVersion`      | `'v1' \| 'v2'`               | —        | Defaults to `'v2'`. `v2` masks the customer MSISDN in callbacks.                                  |

### `responseType` behaviour

| Value         | When Validation URL is unreachable                      |
| ------------- | ------------------------------------------------------- |
| `'Completed'` | M-PESA automatically completes and confirms the payment |
| `'Cancelled'` | M-PESA automatically rejects the payment                |

::: warning Production URLs are permanent In production, URLs can only be
registered once per shortcode. To change them after registration, go to the
Daraja portal → **Self Services → URL Management**, delete the existing
registration, then re-register.

Sandbox URLs can be overwritten freely. :::

::: danger URL keyword restrictions Daraja rejects callback URLs containing any
of these keywords (case-insensitive): `mpesa`, `safaricom`, `exe`, `exec`,
`cme`, `cmd`, `sql`, `query`. pesafy validates URLs before sending and throws
`VALIDATION_ERROR` if any keyword is found. :::

### v1 vs v2

| Version | MSISDN in callbacks                                        |
| ------- | ---------------------------------------------------------- |
| `v1`    | SHA-256 hashed                                             |
| `v2`    | Masked — `2547*****126` (recommended for new integrations) |

## `simulateC2B()`

Trigger a test payment in **sandbox only**. Daraja rejects this call in
production.

```ts
// Paybill payment (BillRefNumber required)
await mpesa.simulateC2B({
  shortCode: '600984',
  commandId: 'CustomerPayBillOnline',
  amount: 100,
  msisdn: 254708374149, // test MSISDN from Daraja simulator
  billRefNumber: 'ACC-001', // account reference
})

// Buy Goods / Till (NEVER pass billRefNumber)
await mpesa.simulateC2B({
  shortCode: '600000',
  commandId: 'CustomerBuyGoodsOnline',
  amount: 100,
  msisdn: 254708374149,
})
```

::: danger BillRefNumber and Buy Goods Never pass `billRefNumber` (even as
`null` or `""`) for `CustomerBuyGoodsOnline`. Daraja returns "The element
AccountReference is invalid". The field must be completely absent from the
payload for Buy Goods requests — pesafy handles this automatically. :::

### Parameters

| Parameter       | Type                                                  | Required | Description                                                                 |
| --------------- | ----------------------------------------------------- | -------- | --------------------------------------------------------------------------- |
| `shortCode`     | `string \| number`                                    | ✅       | The shortcode receiving the simulated payment.                              |
| `commandId`     | `'CustomerPayBillOnline' \| 'CustomerBuyGoodsOnline'` | ✅       | Transaction type.                                                           |
| `amount`        | `number`                                              | ✅       | Amount in KES. Whole numbers only, minimum 1.                               |
| `msisdn`        | `string \| number`                                    | ✅       | Sender's phone number. Use `254708374149` for sandbox tests.                |
| `billRefNumber` | `string`                                              | —        | Account reference. **Required for Paybill. Must be omitted for Buy Goods.** |
| `apiVersion`    | `'v1' \| 'v2'`                                        | —        | Defaults to `'v2'`.                                                         |

## Validation webhook

Safaricom POSTs to your `validationUrl` **before** processing each payment. You
must respond within approximately 8 seconds.

External validation must be explicitly enabled on your shortcode — email
`apisupport@safaricom.co.ke` to activate it. Without activation, the validation
URL is never called.

```ts
import {
  acceptC2BValidation,
  rejectC2BValidation,
  getC2BAmount,
  getC2BAccountRef,
  type C2BValidationPayload,
} from 'pesafy'

app.post('/api/mpesa/c2b/validation', async (req, res) => {
  const payload = req.body as C2BValidationPayload

  const amount = getC2BAmount(payload) // number
  const ref = getC2BAccountRef(payload) // BillRefNumber string

  // Reject unknown accounts
  const exists = await db.accounts.exists(ref)
  if (!exists) {
    return res.json(rejectC2BValidation('C2B00012')) // Invalid Account Number
  }

  // Reject suspicious amounts
  if (amount > 500_000) {
    return res.json(rejectC2BValidation('C2B00013')) // Invalid Amount
  }

  // Accept — optionally echo back the ThirdPartyTransID for correlation
  res.json(acceptC2BValidation(payload.ThirdPartyTransID))
})
```

### Validation payload

```ts
interface C2BValidationPayload {
  TransactionType: string // 'Pay Bill' or 'Buy Goods' (NOT the CommandID strings)
  TransID: string // unique M-PESA transaction ID
  TransTime: string // YYYYMMDDHHmmss
  TransAmount: string // amount as string
  BusinessShortCode: string
  BillRefNumber: string // account reference (Paybill only)
  InvoiceNumber: string // usually empty
  OrgAccountBalance: string // always empty on validation requests
  ThirdPartyTransID: string
  MSISDN: string // masked, e.g. '25470****149'
  FirstName: string
  MiddleName: string
  LastName: string
}
```

### Validation result codes

| Code         | Meaning                | Use when                                 |
| ------------ | ---------------------- | ---------------------------------------- |
| `'0'`        | Accept the payment     | Validation passed                        |
| `'C2B00011'` | Invalid MSISDN         | Customer phone number unrecognised       |
| `'C2B00012'` | Invalid Account Number | `BillRefNumber` not found in your system |
| `'C2B00013'` | Invalid Amount         | Amount is outside acceptable range       |
| `'C2B00014'` | Invalid KYC Details    | Customer's identity check failed         |
| `'C2B00015'` | Invalid Shortcode      | Shortcode not recognised                 |
| `'C2B00016'` | Other Error            | Catch-all rejection                      |

### Helper functions — validation

| Function                                  | Returns                 | Description                                            |
| ----------------------------------------- | ----------------------- | ------------------------------------------------------ |
| `acceptC2BValidation(thirdPartyTransID?)` | `C2BValidationResponse` | Builds `{ ResultCode: '0', ResultDesc: 'Accepted' }`   |
| `rejectC2BValidation(code?)`              | `C2BValidationResponse` | Builds a rejection response. Defaults to `'C2B00016'`. |

## Confirmation webhook

Safaricom POSTs to your `confirmationUrl` after every successfully completed
payment. Always respond `200` immediately — failure to respond causes retries.

```ts
import {
  getC2BTransactionId,
  getC2BAmount,
  getC2BAccountRef,
  getC2BCustomerName,
  isPaybillPayment,
  isBuyGoodsPayment,
  acknowledgeC2BConfirmation,
  type C2BConfirmationPayload,
} from 'pesafy'

app.post('/api/mpesa/c2b/confirmation', (req, res) => {
  // Respond immediately — process in background
  res.json(acknowledgeC2BConfirmation())

  const payload = req.body as C2BConfirmationPayload

  const txId = getC2BTransactionId(payload) // 'OEI2AK4XXXX'
  const amount = getC2BAmount(payload) // number
  const ref = getC2BAccountRef(payload) // BillRefNumber
  const name = getC2BCustomerName(payload) // 'Jane Doe' (joined from first/middle/last)

  if (isPaybillPayment(payload)) {
    db.payments.create({ txId, amount, ref, name }).catch(console.error)
  }

  if (isBuyGoodsPayment(payload)) {
    db.tillSales.create({ txId, amount }).catch(console.error)
  }
})
```

### Confirmation payload

```ts
interface C2BConfirmationPayload {
  TransactionType: string // 'Pay Bill' or 'Buy Goods'
  TransID: string
  TransTime: string // YYYYMMDDHHmmss
  TransAmount: string
  BusinessShortCode: string
  BillRefNumber: string
  InvoiceNumber: string
  OrgAccountBalance: string // new balance after this payment
  ThirdPartyTransID: string
  MSISDN: string // masked
  FirstName: string
  MiddleName: string
  LastName: string
}
```

### Helper functions — confirmation and both payloads

| Function                       | Returns              | Description                                                      |
| ------------------------------ | -------------------- | ---------------------------------------------------------------- |
| `acknowledgeC2BConfirmation()` | `C2BConfirmationAck` | Builds `{ ResultCode: 0, ResultDesc: 'Success' }`                |
| `getC2BTransactionId(payload)` | `string`             | `TransID` from the payload                                       |
| `getC2BAmount(payload)`        | `number`             | `TransAmount` parsed to number                                   |
| `getC2BAccountRef(payload)`    | `string`             | `BillRefNumber`                                                  |
| `getC2BCustomerName(payload)`  | `string`             | Joined `FirstName MiddleName LastName` (empty parts skipped)     |
| `isPaybillPayment(payload)`    | `boolean`            | `true` when `TransactionType === 'Pay Bill'`                     |
| `isBuyGoodsPayment(payload)`   | `boolean`            | `true` when `TransactionType === 'Buy Goods'`                    |
| `isC2BPayload(body)`           | `boolean`            | Runtime type guard for both validation and confirmation payloads |

::: tip TransactionType values in callbacks Callbacks use `'Pay Bill'` and
`'Buy Goods'` — **not** the request `commandId` strings
`'CustomerPayBillOnline'` / `'CustomerBuyGoodsOnline'`. :::

## Error codes

| Code             | Description                                                            |
| ---------------- | ---------------------------------------------------------------------- |
| `'500.003.1001'` | Internal server error — also returned when URLs are already registered |
| `'400.003.01'`   | Invalid or expired access token                                        |
| `'400.003.02'`   | Bad request — malformed payload                                        |
| `'500.003.03'`   | Quota violation — too many requests                                    |
| `'500.003.02'`   | Spike arrest — endpoint generating errors                              |
| `'404.003.01'`   | Resource not found — wrong endpoint URL                                |
| `'404.001.04'`   | Invalid authentication header — check you are using POST               |
| `'400.002.05'`   | Invalid request payload — schema mismatch                              |

## Types

```ts
type C2BApiVersion = 'v1' | 'v2'
type C2BResponseType = 'Completed' | 'Cancelled'
type C2BCommandID = 'CustomerPayBillOnline' | 'CustomerBuyGoodsOnline'
type C2BValidationResultCode =
  | '0' // Accept
  | 'C2B00011' // Invalid MSISDN
  | 'C2B00012' // Invalid Account Number
  | 'C2B00013' // Invalid Amount
  | 'C2B00014' // Invalid KYC Details
  | 'C2B00015' // Invalid Shortcode
  | 'C2B00016' // Other Error

interface C2BRegisterUrlRequest {
  shortCode: string
  responseType: C2BResponseType
  confirmationUrl: string
  validationUrl: string
  apiVersion?: C2BApiVersion
}

interface C2BRegisterUrlResponse {
  OriginatorCoversationID: string // note: Daraja's spelling
  ResponseCode: string
  ResponseDescription: string
}

interface C2BSimulateRequest {
  shortCode: string | number
  commandId: C2BCommandID
  amount: number
  msisdn: string | number
  billRefNumber?: string | null // omit entirely for Buy Goods
  apiVersion?: C2BApiVersion
}

interface C2BValidationResponse {
  ResultCode: C2BValidationResultCode
  ResultDesc: 'Accepted' | 'Rejected'
  ThirdPartyTransID?: string
}

interface C2BConfirmationAck {
  ResultCode: 0
  ResultDesc: string
}
```

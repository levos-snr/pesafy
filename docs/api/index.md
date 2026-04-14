# API Reference

Complete reference for every Safaricom Daraja API wrapped by pesafy. All methods
live on the `Mpesa` class and handle OAuth token management, RSA credential
encryption, retry logic, and full TypeScript types automatically.

## Creating the client

```ts
import { Mpesa } from 'pesafy'

const mpesa = new Mpesa({
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: 'sandbox', // 'sandbox' | 'production'

  // STK Push
  lipaNaMpesaShortCode: process.env.MPESA_SHORTCODE!,
  lipaNaMpesaPassKey: process.env.MPESA_PASSKEY!,

  // Initiator-based APIs (B2C, B2B, Reversal, Balance, Tax, TxStatus)
  initiatorName: process.env.MPESA_INITIATOR_NAME!,
  initiatorPassword: process.env.MPESA_INITIATOR_PASSWORD!,
  certificatePath: './SandboxCertificate.cer',
})
```

## Available APIs

### Payments

| Method                                     | API             | Description                                                 |
| ------------------------------------------ | --------------- | ----------------------------------------------------------- |
| [`stkPush()`](./stk-push)                  | STK Push        | Prompt a customer to pay via M-PESA Express (USSD PIN push) |
| [`stkQuery()`](./stk-push#stkquery)        | STK Query       | Check whether an STK Push was paid                          |
| [`stkPushSafe()`](./stk-push#safe-variant) | STK Push (safe) | Returns `Result<T>` — no exceptions                         |

### Customer to Business (C2B)

| Method                            | API          | Description                                     |
| --------------------------------- | ------------ | ----------------------------------------------- |
| [`registerC2BUrls()`](./c2b)      | C2B Register | Register Confirmation + Validation webhook URLs |
| [`simulateC2B()`](./c2b#simulate) | C2B Simulate | Trigger a test payment (sandbox only)           |

### Business to Customer (B2C)

| Method                                    | API                | Description                                                           |
| ----------------------------------------- | ------------------ | --------------------------------------------------------------------- |
| [`b2cPayment()`](./b2c)                   | B2C Account Top-Up | Move funds to a B2C shortcode (`BusinessPayToBulk`)                   |
| [`b2cDisbursement()`](./b2c-disbursement) | B2C Disbursement   | Send money directly to customer MSISDNs (Salary, Business, Promotion) |

### Business to Business (B2B)

| Method                                           | API                  | Description                                                |
| ------------------------------------------------ | -------------------- | ---------------------------------------------------------- |
| [`b2bExpressCheckout()`](./b2b-express-checkout) | B2B Express Checkout | USSD push to a merchant till                               |
| [`b2bBuyGoods()`](./b2b-buy-goods)               | B2B Buy Goods        | Move funds to a merchant till (shortcode to shortcode)     |
| [`b2bPayBill()`](./b2b-pay-bill)                 | B2B Pay Bill         | Move funds to a Paybill shortcode (shortcode to shortcode) |

### Account & Transaction Management

| Method                                                   | API                    | Description                                   |
| -------------------------------------------------------- | ---------------------- | --------------------------------------------- |
| [`accountBalance()`](./account-balance)                  | Account Balance        | Query your M-PESA shortcode balance (async)   |
| [`accountBalanceSafe()`](./account-balance#safe-variant) | Account Balance (safe) | Returns `Result<T>` — no exceptions           |
| [`transactionStatus()`](./transaction-status)            | Transaction Status     | Look up the status of any transaction (async) |
| [`reverseTransaction()`](./reversal)                     | Transaction Reversal   | Reverse a completed C2B transaction (async)   |
| [`remitTax()`](./tax-remittance)                         | Tax Remittance         | Remit tax directly to KRA via M-PESA (async)  |

### Utilities

| Method                                                        | API          | Description                                      |
| ------------------------------------------------------------- | ------------ | ------------------------------------------------ |
| [`generateDynamicQR()`](./dynamic-qr)                         | Dynamic QR   | Generate a scannable M-PESA QR code (base64 PNG) |
| [`billManagerOptIn()`](./bill-manager)                        | Bill Manager | Opt-in shortcode to Bill Manager                 |
| [`sendInvoice()`](./bill-manager#single-invoice)              | Bill Manager | Send a single e-invoice                          |
| [`sendBulkInvoices()`](./bill-manager#bulk-invoices)          | Bill Manager | Send up to 1,000 invoices                        |
| [`cancelInvoice()`](./bill-manager#cancel-an-invoice)         | Bill Manager | Cancel an invoice                                |
| [`cancelBulkInvoices()`](./bill-manager#cancel-bulk-invoices) | Bill Manager | Cancel multiple invoices                         |
| [`reconcilePayment()`](./bill-manager#payment-reconciliation) | Bill Manager | Acknowledge a payment                            |

## Authentication

Token management is fully automatic. pesafy caches the OAuth token in memory and
refreshes it 60 seconds before expiry. You never handle tokens manually.

Force a refresh if you receive a `401` from Daraja:

```ts
mpesa.clearTokenCache()
```

## Environments

| `environment`  | Base URL                          |
| -------------- | --------------------------------- |
| `'sandbox'`    | `https://sandbox.safaricom.co.ke` |
| `'production'` | `https://api.safaricom.co.ke`     |

## Initiator APIs

APIs that require an org-portal API operator (Balance, Reversal, B2C, B2B, Tax,
TxStatus) need:

```ts
{
  initiatorName:     'your-api-username',
  initiatorPassword: 'your-password',

  // Choose ONE of:
  certificatePath:   './SandboxCertificate.cer', // path to .cer file
  certificatePem:    '-----BEGIN CERTIFICATE-----\n...', // inline PEM
  securityCredential: 'base64=',                 // pre-encrypted (fastest)
}
```

pesafy encrypts `initiatorPassword` with RSA PKCS#1 using the certificate. To
avoid per-call encryption, pre-encrypt at startup:

```ts
import { encryptSecurityCredential } from 'pesafy'
import { readFileSync } from 'node:fs'

const pem  = readFileSync('./SandboxCertificate.cer', 'utf-8')
const cred = encryptSecurityCredential('your-password', pem)

const mpesa = new Mpesa({ ..., securityCredential: cred })
```

## Retry behaviour

All API calls retry automatically on transient failures:

| Status                            | Retried?            |
| --------------------------------- | ------------------- |
| `429`, `500`, `502`, `503`, `504` | Yes — up to 4 times |
| Network timeout                   | Yes                 |
| `4xx` client errors               | Never               |

Default settings: 4 retries, 2 000 ms base delay, doubles per attempt ± 25 %
jitter, 30 s per-attempt timeout. Override globally:

```ts
new Mpesa({ ..., retries: 6, retryDelay: 1000, timeout: 15000 })
```

## Error handling

All errors are `PesafyError` instances:

```ts
import { PesafyError } from 'pesafy'

try {
  await mpesa.stkPush({ ... })
} catch (e) {
  if (e instanceof PesafyError) {
    e.code        // 'VALIDATION_ERROR' | 'AUTH_FAILED' | 'API_ERROR' | ...
    e.message     // human-readable
    e.statusCode  // HTTP status (if applicable)
    e.retryable   // boolean — safe to schedule a retry?
    e.requestId   // Daraja requestId (if returned)
  }
}
```

See [Error Handling](/guide/error-handling) for the full `Result<T>` pattern.

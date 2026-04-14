# Configuration

All SDK configuration is passed once to the `Mpesa` constructor as a
`MpesaConfig` object. There is no global state — you can create multiple `Mpesa`
instances with different credentials (e.g. sandbox and production) side by side.

## Full Config Reference

```ts
import { Mpesa } from 'pesafy'

const mpesa = new Mpesa({
  // ── Required for ALL APIs ──────────────────────────────────────────────────
  consumerKey: 'your_consumer_key',
  consumerSecret: 'your_consumer_secret',
  environment: 'sandbox', // 'sandbox' | 'production'

  // ── STK Push (M-PESA Express) ──────────────────────────────────────────────
  // Required for: mpesa.stkPush() and mpesa.stkQuery()
  lipaNaMpesaShortCode: '174379',
  lipaNaMpesaPassKey:
    'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919',

  // ── Initiator credentials ──────────────────────────────────────────────────
  // Required for: accountBalance, reverseTransaction, transactionStatus,
  //               b2cPayment, b2cDisbursement, b2bBuyGoods, b2bPayBill, remitTax
  initiatorName: 'testapi',
  initiatorPassword: 'Safaricom999!',

  // ── Certificate — choose exactly ONE of the three options below ────────────
  certificatePath: './SandboxCertificate.cer', // path to .cer file on disk
  // OR
  certificatePem:
    '-----BEGIN CERTIFICATE-----\nMIIB...\n-----END CERTIFICATE-----',
  // OR — pre-encrypted; skips RSA encryption on every call (best for performance)
  securityCredential: 'base64EncodedEncryptedPassword==',

  // ── HTTP tuning (optional) ─────────────────────────────────────────────────
  retries: 4, // retry count on transient 5xx / network errors (default: 4)
  retryDelay: 2000, // base delay in ms before first retry (default: 2000)
  timeout: 30000, // per-attempt timeout in ms (default: 30000)
})
```

## Config Options

| Option                 | Type                        | Required       | Description                                  |
| ---------------------- | --------------------------- | -------------- | -------------------------------------------- |
| `consumerKey`          | `string`                    | ✅ Always      | Daraja consumer key                          |
| `consumerSecret`       | `string`                    | ✅ Always      | Daraja consumer secret                       |
| `environment`          | `'sandbox' \| 'production'` | ✅ Always      | Target Daraja environment                    |
| `lipaNaMpesaShortCode` | `string`                    | STK Push       | Paybill / HO shortcode                       |
| `lipaNaMpesaPassKey`   | `string`                    | STK Push       | Lipa Na M-PESA passkey                       |
| `initiatorName`        | `string`                    | Initiator APIs | API operator username                        |
| `initiatorPassword`    | `string`                    | Initiator APIs | API operator password                        |
| `certificatePath`      | `string`                    | Initiator APIs | Path to `.cer` certificate                   |
| `certificatePem`       | `string`                    | —              | PEM string (alternative to path)             |
| `securityCredential`   | `string`                    | —              | Pre-encrypted base64 credential              |
| `retries`              | `number`                    | —              | Retry count on 5xx (default: `4`)            |
| `retryDelay`           | `number`                    | —              | Base retry delay in ms (default: `2000`)     |
| `timeout`              | `number`                    | —              | Per-attempt timeout in ms (default: `30000`) |

## Which options are required per API?

| API                              | Requires                                     |
| -------------------------------- | -------------------------------------------- |
| `stkPush`, `stkQuery`            | `lipaNaMpesaShortCode`, `lipaNaMpesaPassKey` |
| `accountBalance`                 | `initiatorName` + credential (see below)     |
| `reverseTransaction`             | `initiatorName` + credential                 |
| `transactionStatus`              | `initiatorName` + credential                 |
| `b2cPayment`                     | `initiatorName` + credential                 |
| `b2cDisbursement`                | `initiatorName` + credential                 |
| `b2bBuyGoods`                    | `initiatorName` + credential                 |
| `b2bPayBill`                     | `initiatorName` + credential                 |
| `remitTax`                       | `initiatorName` + credential                 |
| `b2bExpressCheckout`             | Only `consumerKey` / `consumerSecret`        |
| `registerC2BUrls`, `simulateC2B` | Only `consumerKey` / `consumerSecret`        |
| `generateDynamicQR`              | Only `consumerKey` / `consumerSecret`        |
| `billManager*`                   | Only `consumerKey` / `consumerSecret`        |

"Credential" means one of: `securityCredential` (pre-encrypted), or
`initiatorPassword` + `certificatePath`/`certificatePem`.

## Daraja Base URLs

| Environment  | Base URL                          |
| ------------ | --------------------------------- |
| `sandbox`    | `https://sandbox.safaricom.co.ke` |
| `production` | `https://api.safaricom.co.ke`     |

These are set automatically based on `environment` — you never specify them
directly.

## Certificate handling

Initiator-based APIs encrypt the `initiatorPassword` with the Safaricom X.509
certificate using RSA PKCS#1 padding before every API call. There are three ways
to provide the credential:

### Option 1: Certificate path (simplest)

```ts
const mpesa = new Mpesa({
  // ...
  initiatorName: 'testapi',
  initiatorPassword: 'Safaricom999!',
  certificatePath: './SandboxCertificate.cer', // reads file on first encrypted call
})
```

### Option 2: Certificate PEM string

Useful when the certificate is stored in an environment variable or secret
manager:

```ts
const mpesa = new Mpesa({
  // ...
  initiatorName: 'testapi',
  initiatorPassword: 'Safaricom999!',
  certificatePem: process.env.MPESA_CERTIFICATE_PEM!,
})
```

### Option 3: Pre-encrypted SecurityCredential (best for performance)

Encrypt once at application startup and pass the result directly. This skips RSA
encryption on every API call — recommended for high-throughput services:

```ts
import { encryptSecurityCredential } from 'pesafy'
import { readFileSync } from 'node:fs'

const pem = readFileSync('./SandboxCertificate.cer', 'utf-8')
const securityCredential = encryptSecurityCredential('Safaricom999!', pem)

const mpesa = new Mpesa({
  consumerKey: '...',
  consumerSecret: '...',
  environment: 'sandbox',
  initiatorName: 'testapi',
  securityCredential, // ← pre-encrypted, no per-call RSA
})
```

You can also encrypt via CLI and store the result in an environment variable:

```sh
npx pesafy encrypt Safaricom999! ./SandboxCertificate.cer
# → prints the base64 SecurityCredential
```

## OAuth token caching

The SDK caches the Daraja OAuth token in memory and automatically refreshes it
60 seconds before expiry (tokens are valid for 3600 seconds). You never call the
Authorization API directly.

To force a token refresh (e.g. after receiving an unexpected `401` from Daraja):

```ts
mpesa.clearTokenCache()
// The next API call will fetch a fresh token
```

## Reading environment

```ts
console.log(mpesa.environment) // 'sandbox' | 'production'
```

## Multiple environments

Creating two clients side by side is safe — each has its own token cache and
configuration:

```ts
const sandbox = new Mpesa({ environment: 'sandbox', ... })
const prod    = new Mpesa({ environment: 'production', ... })
```

## HTTP retry behaviour

By default, the SDK retries up to 4 times on transient errors (HTTP 429, 500,
502, 503, 504, or network failures) with exponential backoff:

- Delay doubles each attempt: 2s → 4s → 8s → 16s
- ±25% random jitter is added to prevent thundering herds
- 4xx errors (bad request, auth failure, validation) are **never retried**

Override per client:

```ts
const mpesa = new Mpesa({
  // ...
  retries: 2, // fewer retries in time-sensitive flows
  retryDelay: 1000, // start at 1s instead of 2s
  timeout: 15000, // shorter per-attempt timeout
})
```

::: warning Never mark a transaction as "failed" based on a 503 from Daraja —
especially on sandbox. The USSD prompt may have been delivered even if the API
acknowledgement timed out. Always wait for the callback or query status before
concluding failure. :::

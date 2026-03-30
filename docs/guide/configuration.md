# Configuration

All configuration is passed to the `Mpesa` constructor as a `MpesaConfig` object.

## Full Config Reference

```ts
import { Mpesa } from 'pesafy'

const mpesa = new Mpesa({
  // ── Required ─────────────────────────────────────────────
  consumerKey: 'your_consumer_key',
  consumerSecret: 'your_consumer_secret',
  environment: 'sandbox', // 'sandbox' | 'production'

  // ── STK Push (M-PESA Express) ────────────────────────────
  lipaNaMpesaShortCode: '174379',
  lipaNaMpesaPassKey:
    'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919',

  // ── Initiator (B2C / Reversal / Balance / Tax / TxStatus)
  initiatorName: 'testapi',
  initiatorPassword: 'Safaricom999!',

  // ── Certificate — choose one ─────────────────────────────
  certificatePath: './SandboxCertificate.cer', // path to .cer file
  // OR
  certificatePem: '-----BEGIN CERTIFICATE-----\n...', // PEM string
  // OR — pre-encrypted (skips RSA on every call)
  securityCredential: 'base64EncodedCredential==',

  // ── HTTP tuning (optional) ───────────────────────────────
  retries: 4, // default: 4 retries on 5xx/network errors
  retryDelay: 2000, // default: 2000ms base delay (doubles + jitter)
  timeout: 30000, // default: 30s per-attempt timeout
})
```

## Config Options

| Option                 | Type                        | Required                       | Description                                  |
| ---------------------- | --------------------------- | ------------------------------ | -------------------------------------------- |
| `consumerKey`          | `string`                    | ✅ Always                      | Daraja consumer key                          |
| `consumerSecret`       | `string`                    | ✅ Always                      | Daraja consumer secret                       |
| `environment`          | `'sandbox' \| 'production'` | ✅ Always                      | Target environment                           |
| `lipaNaMpesaShortCode` | `string`                    | STK Push                       | Paybill / HO shortcode                       |
| `lipaNaMpesaPassKey`   | `string`                    | STK Push                       | LNM passkey from Daraja                      |
| `initiatorName`        | `string`                    | B2C / Reversal / Balance / Tax | API operator username                        |
| `initiatorPassword`    | `string`                    | B2C / Reversal / Balance / Tax | API operator password                        |
| `certificatePath`      | `string`                    | B2C / Reversal / Balance       | Path to `.cer` certificate                   |
| `certificatePem`       | `string`                    | —                              | PEM string (alternative to path)             |
| `securityCredential`   | `string`                    | —                              | Pre-encrypted base64 credential              |
| `retries`              | `number`                    | —                              | Retry count (default: `4`)                   |
| `retryDelay`           | `number`                    | —                              | Base retry delay in ms (default: `2000`)     |
| `timeout`              | `number`                    | —                              | Per-attempt timeout in ms (default: `30000`) |

## Environment URLs

| Environment  | Base URL                          |
| ------------ | --------------------------------- |
| `sandbox`    | `https://sandbox.safaricom.co.ke` |
| `production` | `https://api.safaricom.co.ke`     |

## Pre-encrypting SecurityCredential

If you use initiator-based APIs (B2C, Reversal, Balance, Tax), pesafy encrypts your `initiatorPassword` on every call. For performance-critical paths, encrypt once at startup:

```ts
import { encryptSecurityCredential } from 'pesafy'
import { readFileSync } from 'fs'

const pem = readFileSync('./SandboxCertificate.cer', 'utf-8')
const securityCredential = encryptSecurityCredential('Safaricom999!', pem)

const mpesa = new Mpesa({
  consumerKey: '...',
  consumerSecret: '...',
  environment: 'sandbox',
  initiatorName: 'testapi',
  securityCredential, // ← skip per-call RSA encryption
})
```

## Clearing the Token Cache

Force a token refresh (e.g. after a `401` response from Daraja):

```ts
mpesa.clearTokenCache()
```

## Checking the Environment

```ts
console.log(mpesa.environment) // 'sandbox' | 'production'
```

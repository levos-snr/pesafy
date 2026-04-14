# Error Handling

pesafy provides two complementary error-handling patterns: `try/catch` with
`PesafyError` for direct error inspection, and `Result<T>` discriminated unions
for applications that prefer explicit error propagation without exceptions.

## PesafyError

Every error thrown by the SDK is a `PesafyError` instance — a subclass of
`Error` with structured metadata. You can use the `isPesafyError` type guard to
narrow `unknown` caught values:

```ts
import { isPesafyError } from 'pesafy'

try {
  await mpesa.stkPush({ ... })
} catch (error) {
  if (isPesafyError(error)) {
    error.code        // 'AUTH_FAILED' | 'VALIDATION_ERROR' | 'API_ERROR' | ...
    error.message     // human-readable description
    error.statusCode  // HTTP status code (if applicable, e.g. 400, 401, 503)
    error.retryable   // boolean — true if the error is safe to retry
    error.requestId   // Daraja requestId, if returned in the response body
    error.response    // raw Daraja response body (useful for debugging)

    // Convenience flags
    error.isValidation // true when code === 'VALIDATION_ERROR'
    error.isAuth       // true when code === 'AUTH_FAILED' or 'INVALID_CREDENTIALS'
  }
}
```

### Error code reference

| Code                  | Retryable | Description                                                           |
| --------------------- | --------- | --------------------------------------------------------------------- |
| `AUTH_FAILED`         | ❌        | OAuth token fetch failed — check consumer key / secret                |
| `INVALID_CREDENTIALS` | ❌        | `consumerKey` or `consumerSecret` missing at construction             |
| `INVALID_PHONE`       | ❌        | Phone number cannot be normalised to 254XXXXXXXXX format              |
| `ENCRYPTION_FAILED`   | ❌        | RSA encryption of initiator password failed — check certificate       |
| `VALIDATION_ERROR`    | ❌        | Invalid request parameters — fix the request before retrying          |
| `API_ERROR`           | ❌        | Daraja returned a 4xx response (bad request, wrong credentials, etc.) |
| `REQUEST_FAILED`      | ✅        | Daraja returned 5xx (transient server error)                          |
| `NETWORK_ERROR`       | ✅        | DNS resolution or connection failure                                  |
| `TIMEOUT`             | ✅        | Request exceeded the per-attempt timeout                              |
| `RATE_LIMITED`        | ✅        | HTTP 429 — too many requests                                          |

### Serialising errors

`PesafyError` serialises cleanly with `toJSON()`:

```ts
console.log(error.toJSON())
// {
//   name:       'PesafyError',
//   code:       'API_ERROR',
//   message:    'Request failed: Invalid ShortCode',
//   statusCode: 400,
//   requestId:  'req_abc123',
//   retryable:  false
// }
```

## Result\<T\> — No Exceptions

For flows where you prefer not to use `try/catch`, the SDK provides `*Safe`
variants that return a discriminated union:

```ts
// Result<T, PesafyError> = { ok: true; data: T } | { ok: false; error: PesafyError }
const result = await mpesa.stkPushSafe({
  amount: 100,
  phoneNumber: '0712345678',
  callbackUrl: 'https://yourdomain.com/api/mpesa/callback',
  accountReference: 'INV-001',
  transactionDesc: 'Payment',
})

if (result.ok) {
  // result.data is fully typed as StkPushResponse
  console.log(result.data.CheckoutRequestID)
  console.log(result.data.ResponseCode) // '0' = accepted
} else {
  // result.error is PesafyError
  if (result.error.retryable) {
    // schedule retry via your queue (BullMQ, pg-boss, etc.)
  } else if (result.error.isValidation) {
    // bug in your code — log and alert
    Sentry.captureException(result.error)
  } else if (result.error.isAuth) {
    // credentials issue — alert ops
  }
}
```

Available safe variants:

| Method                              | Returns                          |
| ----------------------------------- | -------------------------------- |
| `mpesa.stkPushSafe(request)`        | `Result<StkPushResponse>`        |
| `mpesa.accountBalanceSafe(request)` | `Result<AccountBalanceResponse>` |

You can build your own `Result`-returning wrappers using the `ok` and `err`
helpers:

```ts
import { ok, err, type Result, PesafyError } from 'pesafy'

async function initiatePayment(
  amount: number,
  phone: string,
): Promise<Result<string>> {
  const result = await mpesa.stkPushSafe({
    amount,
    phoneNumber: phone,
    callbackUrl: 'https://yourdomain.com/api/mpesa/callback',
    accountReference: 'ORDER-001',
    transactionDesc: 'Payment',
  })

  if (!result.ok) return err(result.error)
  return ok(result.data.CheckoutRequestID)
}
```

## Automatic retry

The SDK automatically retries transient errors with exponential backoff +
jitter:

- **Up to 4 retries** (configurable via `config.retries`)
- **Base delay 2000ms**, doubling each attempt: 2s → 4s → 8s → 16s
- **±25% random jitter** applied to each delay to prevent thundering herds
- Retried on HTTP **429, 500, 502, 503, 504** and **network / timeout** failures
- **Never retried** on 4xx errors — these indicate a code or configuration
  problem

Override per client:

```ts
const mpesa = new Mpesa({
  // ...
  retries: 2,
  retryDelay: 1000,
})
```

::: warning Never mark a transaction "failed" on a transient error Daraja's
sandbox returns 503 frequently. On production, network hiccups can cause 5xx
responses even if M-PESA processed the transaction. Always wait for the callback
or use `stkQuery()` to confirm status before treating a payment as failed. :::

## Retrying webhook processing

Safaricom delivers callbacks at most once (with a limited number of retries on
non-200). Use `retryWithBackoff` to make your own database writes or downstream
calls resilient independently of the HTTP response:

```ts
import { retryWithBackoff } from 'pesafy'

app.post('/api/mpesa/callback', async (req, res) => {
  // Respond 200 immediately — never block on processing
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' })

  // Retry your processing logic independently
  const outcome = await retryWithBackoff(
    () =>
      db.payments.upsert({
        receipt: extractTransactionId(req.body),
        amount: extractAmount(req.body),
      }),
    {
      maxRetries: 5,
      initialDelay: 500,
      maxDelay: 30_000,
    },
  )

  if (!outcome.success) {
    console.error(
      'DB write failed after',
      outcome.attempts,
      'attempts:',
      outcome.error,
    )
  }
})
```

### RetryOptions

| Option              | Type     | Default                | Description                            |
| ------------------- | -------- | ---------------------- | -------------------------------------- |
| `maxRetries`        | `number` | `Infinity`             | Maximum retry attempts after the first |
| `initialDelay`      | `number` | `1000`                 | Starting delay in ms                   |
| `maxDelay`          | `number` | `3600000`              | Maximum delay cap in ms                |
| `backoffMultiplier` | `number` | `2`                    | Multiplier applied per retry           |
| `maxRetryDuration`  | `number` | `2592000000` (30 days) | Total duration cap in ms               |

## Common errors and fixes

### `VALIDATION_ERROR: lipaNaMpesaShortCode is required`

You called `stkPush()` but did not pass `lipaNaMpesaShortCode` in the
constructor config.

```ts
// ❌ Missing lipaNaMpesaShortCode
const mpesa = new Mpesa({
  consumerKey: '...',
  consumerSecret: '...',
  environment: 'sandbox',
})

// ✅ Correct
const mpesa = new Mpesa({
  consumerKey: '...',
  consumerSecret: '...',
  environment: 'sandbox',
  lipaNaMpesaShortCode: process.env.MPESA_SHORTCODE!,
  lipaNaMpesaPassKey: process.env.MPESA_PASSKEY!,
})
```

### `VALIDATION_ERROR: initiatorName is required`

You called an initiator-based API without `initiatorName` in config.

```ts
const mpesa = new Mpesa({
  // ...
  initiatorName: process.env.MPESA_INITIATOR_NAME!,
  initiatorPassword: process.env.MPESA_INITIATOR_PASSWORD!,
  certificatePath: process.env.MPESA_CERTIFICATE_PATH!,
})
```

### `ENCRYPTION_FAILED: Failed to encrypt security credential`

The certificate file is invalid, missing, or doesn't match the environment.
Verify `MPESA_CERTIFICATE_PATH` points to the correct `.cer` file for your
environment (sandbox vs production).

```sh
npx pesafy doctor  # checks certificate path and file existence
```

### `AUTH_FAILED: Daraja did not return an access token`

Usually wrong `consumerKey` or `consumerSecret`. Confirm they match the Daraja
app you created at
[developer.safaricom.co.ke](https://developer.safaricom.co.ke).

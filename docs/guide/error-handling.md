# Error Handling

pesafy provides two patterns for handling errors: traditional `try/catch` with `PesafyError`, and the `Result<T>` type for applications that prefer no exceptions.

## PesafyError

All errors thrown by pesafy are instances of `PesafyError`:

```ts
import { PesafyError, isPesafyError } from 'pesafy'

try {
  await mpesa.stkPush({ ... })
} catch (error) {
  if (isPesafyError(error)) {
    console.log(error.code)        // 'AUTH_FAILED' | 'VALIDATION_ERROR' | 'API_ERROR' | ...
    console.log(error.message)     // human-readable description
    console.log(error.statusCode)  // HTTP status if applicable
    console.log(error.retryable)   // boolean — safe to retry?
    console.log(error.requestId)   // Daraja requestId if returned

    // Convenience flags
    error.isValidation  // true if VALIDATION_ERROR
    error.isAuth        // true if AUTH_FAILED / INVALID_CREDENTIALS
  }
}
```

## Error Codes

| Code                  | Retryable | Description                                     |
| --------------------- | --------- | ----------------------------------------------- |
| `AUTH_FAILED`         | ❌        | OAuth token fetch failed                        |
| `INVALID_CREDENTIALS` | ❌        | Missing/wrong `consumerKey` or `consumerSecret` |
| `INVALID_PHONE`       | ❌        | Phone number cannot be normalised               |
| `ENCRYPTION_FAILED`   | ❌        | RSA encryption of initiator password failed     |
| `VALIDATION_ERROR`    | ❌        | Invalid request parameters — fix and retry      |
| `API_ERROR`           | ❌        | Daraja returned a 4xx error                     |
| `REQUEST_FAILED`      | ✅        | Daraja returned 5xx (transient)                 |
| `NETWORK_ERROR`       | ✅        | DNS / connection failure                        |
| `TIMEOUT`             | ✅        | Request exceeded timeout                        |
| `RATE_LIMITED`        | ✅        | 429 Too Many Requests                           |

## Result\<T\> — No Exceptions

The `stkPushSafe()` method (and similar `*Safe` variants) return a discriminated union instead of throwing:

```ts
import { type Result } from 'pesafy'

const result = await mpesa.stkPushSafe({
  amount: 100,
  phoneNumber: '0712345678',
  callbackUrl: 'https://yourdomain.com/api/mpesa/callback',
  accountReference: 'INV-001',
  transactionDesc: 'Payment',
})

if (result.ok) {
  // result.data is typed StkPushResponse
  console.log(result.data.CheckoutRequestID)
} else {
  // result.error is PesafyError
  if (result.error.retryable) {
    // schedule a retry with your own queue
  } else if (result.error.isValidation) {
    // log and alert — this is a code bug
  }
}
```

## Retryable Errors

pesafy automatically retries transient errors (503, 429, 502, 504, network) with exponential backoff:

- Up to **4 retries** by default (configurable via `config.retries`)
- Base delay of **2000ms**, doubling each attempt with ±25% jitter
- **4xx errors are never retried** — they indicate a code or config issue

::: warning Never mark a transaction "failed" on a 503
Daraja's sandbox is unstable and frequently returns 503. Always wait for the callback or query status before marking a payment as failed.
:::

## Webhook Retry

For your own webhook processing (e.g. saving to a database), use `retryWithBackoff`:

```ts
import { retryWithBackoff } from 'pesafy'

app.post('/api/mpesa/callback', async (req, res) => {
  // Always respond 200 to Safaricom immediately
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' })

  // Retry your processing logic independently
  const outcome = await retryWithBackoff(() => saveToDatabase(req.body), {
    maxRetries: 5,
    initialDelay: 500,
  })

  if (!outcome.success) {
    console.error('Failed after', outcome.attempts, 'attempts')
  }
})
```

## Error in JSON

`PesafyError` serialises cleanly:

```ts
console.log(error.toJSON())
// {
//   name: 'PesafyError',
//   code: 'API_ERROR',
//   message: 'Request failed with status 400 — Invalid Shortcode',
//   statusCode: 400,
//   requestId: 'req_...',
//   retryable: false
// }
```

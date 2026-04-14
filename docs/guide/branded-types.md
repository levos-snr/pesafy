# Branded Types

pesafy ships opt-in branded primitives — nominal types built on top of `string`
and `number` — that let the TypeScript compiler catch argument-order and unit
mistakes at compile time rather than at runtime in production.

## The problem without branding

TypeScript's structural type system means this code compiles without error, even
though `amount` and `phoneNumber` are swapped:

```ts
// ❌ Silently compiles — amount and phone are both numbers at runtime
await mpesa.stkPush({ amount: 712345678, phoneNumber: 100 })
```

## The solution: Branded Types

```ts
import { toKesAmount, toMsisdn, type KesAmount, type MsisdnKE } from 'pesafy'

const amount: KesAmount = toKesAmount(100) // ✅ KesAmount
const phone: MsisdnKE = toMsisdn('0712345678') // ✅ MsisdnKE

// Now the compiler catches the swap:
const bad1: KesAmount = 712345678 // ❌ Type error — plain number ≠ KesAmount
const bad2: MsisdnKE = 100 // ❌ Type error — plain number ≠ MsisdnKE
```

Branded types are **opt-in**. The core `mpesa.stkPush()` method accepts plain
`string` and `number` — you only need to use branded types when you want the
extra compile-time safety.

## Available types

### KesAmount

A whole-number KES amount. M-PESA only accepts whole shillings.

```ts
import { toKesAmount, type KesAmount } from 'pesafy'

const amount = toKesAmount(100) // ✅ → KesAmount(100)
toKesAmount(0.5) // ❌ throws TypeError — fractional shillings
toKesAmount(0) // ❌ throws TypeError — must be ≥ 1
toKesAmount(-50) // ❌ throws TypeError — must be ≥ 1
```

### MsisdnKE

A validated Kenyan MSISDN in `254XXXXXXXXX` (12-digit) format. Accepts any
common Kenyan phone format and normalises it:

```ts
import { toMsisdn, type MsisdnKE } from 'pesafy'

toMsisdn('0712345678') // → '254712345678'  (07xx format)
toMsisdn('+254712345678') // → '254712345678'  (+254 format)
toMsisdn('712345678') // → '254712345678'  (9-digit format)
toMsisdn('254712345678') // → '254712345678'  (already correct)
toMsisdn('1234') // ❌ throws PesafyError — unrecognised format
```

The same normalisation is used internally by `mpesa.stkPush()` for the
`phoneNumber` field. You can also use the standalone utility:

```ts
import { formatSafaricomPhone } from 'pesafy'

formatSafaricomPhone('0712345678') // → '254712345678'
```

### Shortcodes

Three shortcode brand variants, all derived from `string`:

```ts
import { toPaybill, toTill, toShortCode } from 'pesafy'
import type { PaybillCode, TillCode, ShortCode } from 'pesafy'

const paybill: PaybillCode = toPaybill('174379')
const till: TillCode = toTill('600000')
const any: ShortCode = toShortCode('123456') // generic — use for either
```

### Transaction IDs

Opaque string brands for correlation IDs — prevents accidentally passing a
`CheckoutRequestID` where an `OriginatorConversationID` is expected:

```ts
import type {
  MpesaReceiptNumber, // M-PESA receipt, e.g. 'OEI2AK4XXXX'
  ConversationID, // Daraja ConversationID
  OriginatorConversationID, // Daraja OriginatorConversationID
  CheckoutRequestID, // STK Push CheckoutRequestID
} from 'pesafy'
```

### NonEmptyString

A string guaranteed to be non-empty after trimming:

```ts
import { toNonEmpty, type NonEmptyString } from 'pesafy'

const ref = toNonEmpty('INV-001') // ✅ NonEmptyString
toNonEmpty('') // ❌ throws TypeError
toNonEmpty('   ') // ❌ throws TypeError — whitespace only
```

## Result\<T\> — Discriminated union

The `Result<T, E>` type is pesafy's answer to exception-heavy code. It is a
discriminated union that makes error handling explicit:

```ts
type Result<T, E = PesafyError> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly error: E }
```

### Usage with stkPushSafe

```ts
import { ok, err, type Result } from 'pesafy'

const result = await mpesa.stkPushSafe({
  amount: 100,
  phoneNumber: '0712345678',
  callbackUrl: 'https://yourdomain.com/api/mpesa/callback',
  accountReference: 'INV-001',
  transactionDesc: 'Payment',
})

if (result.ok) {
  // TypeScript narrows: result.data is StkPushResponse
  saveCheckoutId(result.data.CheckoutRequestID)
} else {
  // TypeScript narrows: result.error is PesafyError
  logger.error({ code: result.error.code }, result.error.message)
}
```

### Building your own Result-returning functions

```ts
import { ok, err, type Result, PesafyError } from 'pesafy'

async function initiatePayment(
  orderId: string,
  amount: number,
  phone: string,
): Promise<Result<{ checkoutId: string; orderId: string }>> {
  const result = await mpesa.stkPushSafe({
    amount,
    phoneNumber: phone,
    callbackUrl: 'https://yourapp.com/api/mpesa/callback',
    accountReference: orderId.slice(0, 12),
    transactionDesc: 'Order payment',
  })

  if (!result.ok) return err(result.error)

  return ok({
    checkoutId: result.data.CheckoutRequestID,
    orderId,
  })
}

// Caller
const payment = await initiatePayment('ORD-001', 500, '0712345678')
if (payment.ok) {
  await db.orders.update(payment.data.orderId, {
    checkoutId: payment.data.checkoutId,
    status: 'pending',
  })
}
```

## Utility types

| Type               | Description                                          |
| ------------------ | ---------------------------------------------------- |
| `DeepReadonly<T>`  | Makes all properties recursively `readonly`          |
| `StrictPick<T, K>` | `Pick<T, K>` that only allows keys that exist on `T` |
| `NonEmptyString`   | A string guaranteed non-empty after trimming         |

```ts
import type { DeepReadonly, StrictPick } from 'pesafy'

type ReadonlyConfig = DeepReadonly<MpesaConfig>
// All nested properties are now readonly

type MinimalRequest = StrictPick<StkPushRequest, 'amount' | 'phoneNumber'>
// Only allows the two named keys — typos are a compile error
```

# Branded Types

pesafy ships opt-in branded primitives that catch type bugs at compile time — not in production.

## Why Branded Types?

Without branding, this compiles silently:

```ts
// ❌ Wrong — amount and phone swapped, no compile error
await mpesa.stkPush({ amount: 712345678, phoneNumber: 100 })
```

With branded types, the compiler catches the swap:

```ts
import { toKesAmount, toMsisdn } from 'pesafy'

const amount: KesAmount = toKesAmount(100) // ✅
const phone: MsisdnKE = toMsisdn('0712345678') // ✅

const bad: KesAmount = 100 // ❌ Type error
```

## Available Types

### KesAmount

A whole-number KES amount. M-PESA only supports whole numbers.

```ts
import { toKesAmount, type KesAmount } from 'pesafy'

const amount = toKesAmount(100) // ✅ KesAmount
toKesAmount(0.5) // ❌ throws — fractional shillings rejected
toKesAmount(0) // ❌ throws — must be ≥ 1
```

### MsisdnKE

A validated Kenyan MSISDN in `254XXXXXXXXX` format.

```ts
import { toMsisdn, type MsisdnKE } from 'pesafy'

toMsisdn('0712345678') // → '254712345678'
toMsisdn('+254712345678') // → '254712345678'
toMsisdn('712345678') // → '254712345678'
toMsisdn('254712345678') // → '254712345678'
toMsisdn('1234') // ❌ throws
```

### Shortcodes

```ts
import { toPaybill, toTill, toShortCode } from 'pesafy'
import type { PaybillCode, TillCode, ShortCode } from 'pesafy'

const paybill: PaybillCode = toPaybill('174379')
const till: TillCode = toTill('600000')
```

### Transaction IDs

```ts
import type {
  MpesaReceiptNumber,
  ConversationID,
  OriginatorConversationID,
  CheckoutRequestID,
} from 'pesafy'
```

## Result\<T\>

The `Result<T>` discriminated union for error-handling without exceptions:

```ts
import { ok, err, type Result } from 'pesafy'

// Returns Result<T, PesafyError>
const result = await mpesa.stkPushSafe({ ... })

if (result.ok) {
  // result.data: StkPushResponse
  console.log(result.data.CheckoutRequestID)
} else {
  // result.error: PesafyError
  console.error(result.error.code)
}
```

Build your own `Result`-returning functions:

```ts
import { ok, err, type Result, PesafyError } from 'pesafy'

async function charge(amount: number): Promise<Result<string>> {
  const result = await mpesa.stkPushSafe({ amount, ... })
  if (!result.ok) return err(result.error)
  return ok(result.data.CheckoutRequestID)
}
```

## Utility Types

```ts
import type { DeepReadonly, StrictPick, NonEmptyString } from 'pesafy'
import { toNonEmpty } from 'pesafy'

const ref = toNonEmpty('INV-001') // ✅ NonEmptyString
toNonEmpty('') // ❌ throws — empty string
toNonEmpty('   ') // ❌ throws — whitespace only
```

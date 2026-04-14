# Account Balance

Query the current balance of your M-PESA shortcode across all account types
(Working, Utility, Charges Paid, etc.).

**Daraja endpoint:** `POST /mpesa/accountbalance/v1/query`  
**Type:** Asynchronous — result POSTed to `resultUrl`

::: info Required role Your initiator must have the **"Account Balance ORG API
initiator"** (also called "Balance Query ORG API") role on the M-PESA org
portal. Without this role, all requests return error 21. :::

## Prerequisites

```ts
const mpesa = new Mpesa({
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: 'sandbox',
  initiatorName: process.env.MPESA_INITIATOR_NAME!,
  initiatorPassword: process.env.MPESA_INITIATOR_PASSWORD!,
  certificatePath: './SandboxCertificate.cer',
})
```

## `accountBalance()`

```ts
const response = await mpesa.accountBalance({
  partyA: '174379', // shortcode to query
  identifierType: '4', // '4' = Organisation ShortCode
  resultUrl: 'https://yourdomain.com/api/mpesa/balance/result',
  queueTimeOutUrl: 'https://yourdomain.com/api/mpesa/balance/timeout',
  remarks: 'Monthly balance check',
})
```

### Parameters

| Parameter         | Type                | Required | Description                                                                     |
| ----------------- | ------------------- | -------- | ------------------------------------------------------------------------------- |
| `partyA`          | `string`            | ✅       | The shortcode whose balance is queried.                                         |
| `identifierType`  | `'1' \| '2' \| '4'` | ✅       | Type of `partyA`. See table below.                                              |
| `resultUrl`       | `string`            | ✅       | Public URL Safaricom POSTs the balance result to. HTTPS required in production. |
| `queueTimeOutUrl` | `string`            | ✅       | Public URL called on queue timeout.                                             |
| `remarks`         | `string`            | —        | Optional notes (up to 100 characters). Defaults to `'Account Balance Query'`.   |

### Identifier types

| Value | Meaning                | When to use                                       |
| ----- | ---------------------- | ------------------------------------------------- |
| `'1'` | MSISDN                 | Customer mobile number                            |
| `'2'` | Till Number            | Buy Goods shortcode                               |
| `'4'` | Organisation ShortCode | Paybill / B2C shortcode _(default — most common)_ |

### Sync response

```ts
interface AccountBalanceResponse {
  OriginatorConversationID: string // save this to correlate the async callback
  ConversationID: string
  ResponseCode: string // '0' = accepted
  ResponseDescription: string
}
```

`ResponseCode: '0'` confirms the request was accepted. **The balance has not
been returned yet** — it arrives at your `resultUrl`.

## Safe variant

`accountBalanceSafe()` returns `Result<T>` instead of throwing:

```ts
const result = await mpesa.accountBalanceSafe({
  partyA: '174379',
  identifierType: '4',
  resultUrl: 'https://yourdomain.com/api/mpesa/balance/result',
  queueTimeOutUrl: 'https://yourdomain.com/api/mpesa/balance/timeout',
})

if (result.ok) {
  console.log(result.data.OriginatorConversationID)
} else {
  console.error(result.error.code, result.error.message)
}
```

## Async result callback

Safaricom POSTs the balance data to your `resultUrl` after processing.

```json
{
  "Result": {
    "ResultType": "0",
    "ResultCode": 0,
    "ResultDesc": "The service request is processed successfully.",
    "OriginatorConversationID": "AG_20240101_...",
    "ConversationID": "AG_20240101_...",
    "TransactionID": "OEI2AK4XXXX",
    "ResultParameters": {
      "ResultParameter": [
        {
          "Key": "AccountBalance",
          "Value": "Working Account|KES|700000.00|KES|0.00|KES|0.00|Utility Account|KES|228037.00|KES|228037.00|KES|0.00"
        },
        {
          "Key": "BOCompletedTime",
          "Value": "20200109125710"
        }
      ]
    },
    "ReferenceData": {
      "ReferenceItem": {
        "Key": "QueueTimeoutURL",
        "Value": "https://yourdomain.com/api/mpesa/balance/timeout"
      }
    }
  }
}
```

### Handling the result

```ts
import {
  isAccountBalanceSuccess,
  getAccountBalanceRawBalance,
  getAccountBalanceParam,
  getAccountBalanceTransactionId,
  getAccountBalanceConversationId,
  getAccountBalanceOriginatorConversationId,
  getAccountBalanceCompletedTime,
  getAccountBalanceReferenceItem,
  parseAccountBalance,
  type AccountBalanceResult,
} from 'pesafy'

app.post('/api/mpesa/balance/result', (req, res) => {
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' })

  const body = req.body as AccountBalanceResult

  if (isAccountBalanceSuccess(body)) {
    const rawBalance = getAccountBalanceRawBalance(body) // pipe-delimited string | null
    const completedAt = getAccountBalanceCompletedTime(body) // 'YYYYMMDDHHmmss' | null
    const txId = getAccountBalanceTransactionId(body) // M-PESA receipt
    const origId = getAccountBalanceOriginatorConversationId(body)

    if (rawBalance) {
      const accounts = parseAccountBalance(rawBalance)
      // [
      //   { name: 'Working Account', currency: 'KES', amount: '700000.00' },
      //   { name: 'Utility Account', currency: 'KES', amount: '228037.00' },
      // ]

      for (const account of accounts) {
        console.log(`${account.name}: ${account.currency} ${account.amount}`)
      }
    }

    db.balanceChecks.record({ origId, txId, completedAt }).catch(console.error)
  } else {
    const desc = body.Result.ResultDesc
    const code = body.Result.ResultCode
    console.error(`Balance query failed [${code}]: ${desc}`)
  }
})
```

## Parsing the balance string

Daraja returns all account balances as a single pipe-delimited string. Use
`parseAccountBalance()` to break it into structured objects:

```ts
import { parseAccountBalance } from 'pesafy'

const raw =
  'Working Account|KES|700000.00|KES|0.00|KES|0.00|Utility Account|KES|228037.00|KES|228037.00|KES|0.00'

const accounts = parseAccountBalance(raw)
// [
//   { name: 'Working Account', currency: 'KES', amount: '700000.00' },
//   { name: 'Utility Account', currency: 'KES', amount: '228037.00' },
// ]
```

## Account types

Daraja returns balances for all account types registered to your shortcode:

| Account                 | Description                                          |
| ----------------------- | ---------------------------------------------------- |
| Working Account         | MMF/transition account for bank settlement           |
| Utility Account         | Receives customer payments (C2B/Buy Goods)           |
| Charges Paid Account    | Deducts transaction charges per your business tariff |
| Organisation Settlement | Funds available after charges, before settlement     |

## Helper functions

| Function                                            | Returns                               | Description                                |
| --------------------------------------------------- | ------------------------------------- | ------------------------------------------ |
| `isAccountBalanceSuccess(result)`                   | `boolean`                             | `true` when `ResultCode === 0` or `'0'`    |
| `getAccountBalanceRawBalance(result)`               | `string \| null`                      | Raw pipe-delimited `AccountBalance` string |
| `getAccountBalanceCompletedTime(result)`            | `string \| null`                      | `BOCompletedTime` (YYYYMMDDHHmmss)         |
| `getAccountBalanceTransactionId(result)`            | `string`                              | `TransactionID`                            |
| `getAccountBalanceConversationId(result)`           | `string`                              | `ConversationID`                           |
| `getAccountBalanceOriginatorConversationId(result)` | `string`                              | `OriginatorConversationID`                 |
| `getAccountBalanceReferenceItem(result)`            | `AccountBalanceReferenceItem \| null` | First `ReferenceItem` from `ReferenceData` |
| `getAccountBalanceParam(result, key)`               | `string \| number \| undefined`       | Extract any `ResultParameter` by key       |
| `parseAccountBalance(raw)`                          | `ParsedAccount[]`                     | Parse the pipe-delimited balance string    |

## Error codes (async ResultCode)

| Code        | Meaning                                                                              |
| ----------- | ------------------------------------------------------------------------------------ |
| `15`        | Duplicate detected — same `OriginatorConversationID` already submitted               |
| `17`        | Internal failure                                                                     |
| `18`        | Initiator credential check failure — wrong password or certificate                   |
| `19`        | Message sequencing failure                                                           |
| `20`        | Unresolved initiator — username not found                                            |
| `21`        | Initiator to primary party permission failure — missing "Balance Query ORG API" role |
| `22`        | Initiator to receiver party permission failure — initiator not active                |
| `24`        | Missing mandatory fields                                                             |
| `100000001` | System overload                                                                      |
| `100000002` | Throttling error                                                                     |
| `100000004` | Internal server error                                                                |
| `100000005` | Invalid input value                                                                  |
| `100000007` | Service status abnormal                                                              |
| `100000010` | Insufficient permissions                                                             |
| `100000011` | Request rate exceeded                                                                |

## Types

```ts
interface AccountBalanceRequest {
  partyA: string
  identifierType: '1' | '2' | '4'
  resultUrl: string
  queueTimeOutUrl: string
  remarks?: string
}

interface AccountBalanceResponse {
  OriginatorConversationID: string
  ConversationID: string
  ResponseCode: string
  ResponseDescription: string
}

interface ParsedAccount {
  name: string // 'Working Account', 'Utility Account', etc.
  currency: string // 'KES'
  amount: string // '700000.00' — preserves Daraja's format
}

interface AccountBalanceData {
  rawBalance: string
  accounts: ParsedAccount[]
}
```

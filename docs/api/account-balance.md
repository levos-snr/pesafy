# Account Balance

Query the current balance of your M-PESA shortcode. This is an **asynchronous** API — the sync response only acknowledges receipt. The actual balance data is POSTed to your `resultUrl`.

::: info Required Role
Your initiator must have the **"Account Balance ORG API initiator"** role on the M-PESA org portal.
:::

## Usage

```ts
const response = await mpesa.accountBalance({
  partyA: '174379',
  identifierType: '4',
  resultUrl: 'https://yourdomain.com/mpesa/balance/result',
  queueTimeOutUrl: 'https://yourdomain.com/mpesa/balance/timeout',
  remarks: 'Monthly balance check',
})
```

## Parameters

| Parameter         | Type                | Required | Description                                              |
| ----------------- | ------------------- | -------- | -------------------------------------------------------- |
| `partyA`          | `string`            | ✅       | Your business shortcode being queried                    |
| `identifierType`  | `"1" \| "2" \| "4"` | ✅       | `"1"` MSISDN · `"2"` Till · `"4"` Organisation ShortCode |
| `resultUrl`       | `string`            | ✅       | Public URL Safaricom POSTs the balance result to         |
| `queueTimeOutUrl` | `string`            | ✅       | Public URL Safaricom calls on queue timeout              |
| `remarks`         | `string`            | —        | Short remarks (up to 100 characters)                     |

## Sync Response

```json
{
  "OriginatorConversationID": "AG_20240101_...",
  "ConversationID": "AG_20240101_...",
  "ResponseCode": "0",
  "ResponseDescription": "Accept the service request successfully."
}
```

`ResponseCode: "0"` means the request was accepted. **The balance has not yet been returned** — it arrives at your `resultUrl`.

## Async Result (POSTed to `resultUrl`)

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
          "Value": "Working Account|KES|45000.00|Utility Account|KES|0.00"
        },
        { "Key": "BOCompletedTime", "Value": 20240101123000 }
      ]
    }
  }
}
```

### Parsing the balance string

Daraja returns balances as a pipe-delimited string. Use the built-in `parseAccountBalance` helper:

```ts
import { parseAccountBalance } from 'pesafy'

const raw = 'Working Account|KES|45000.00|Utility Account|KES|0.00'
const accounts = parseAccountBalance(raw)
// [
//   { name: 'Working Account', currency: 'KES', amount: '45000.00' },
//   { name: 'Utility Account', currency: 'KES', amount: '0.00'    },
// ]
```

### Helper functions

```ts
import {
  isAccountBalanceSuccess,
  getAccountBalanceParam,
  parseAccountBalance,
} from 'pesafy'

// In your result webhook handler:
if (isAccountBalanceSuccess(result)) {
  const raw = getAccountBalanceParam(result, 'AccountBalance') as string
  const accounts = parseAccountBalance(raw)
  console.log(accounts)
}
```

| Helper                    | Returns            | Description                             |
| ------------------------- | ------------------ | --------------------------------------- |
| `isAccountBalanceSuccess` | `boolean`          | `true` when `ResultCode === 0`          |
| `getAccountBalanceParam`  | `string \| number` | Extract any `ResultParameter` by key    |
| `parseAccountBalance`     | `ParsedAccount[]`  | Parse the pipe-delimited balance string |

## Identifier Types

| Value | Meaning                | When to use                         |
| ----- | ---------------------- | ----------------------------------- |
| `"1"` | MSISDN                 | Customer phone number               |
| `"2"` | Till Number            | Buy Goods shortcode                 |
| `"4"` | Organisation ShortCode | Paybill / B2C shortcode _(default)_ |

## Error Handling

```ts
import { PesafyError } from 'pesafy'

try {
  await mpesa.accountBalance({ ... })
} catch (e) {
  if (e instanceof PesafyError) {
    console.error(e.code, e.message)
  }
}
```

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
  name: string
  currency: string
  amount: string
}
```

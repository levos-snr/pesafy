# Dynamic QR Code

Generate a dynamic M-PESA QR code that customers can scan with the **My Safaricom App** or **M-PESA app** to pay at your merchant outlet.

## Usage

```ts
const response = await mpesa.generateDynamicQR({
  merchantName: 'Test Supermarket',
  refNo: 'Invoice #1234',
  amount: 500,
  trxCode: 'BG',
  cpi: '373132',
  size: 300,
})
```

## Parameters

| Parameter      | Type                | Required | Description                                                |
| -------------- | ------------------- | -------- | ---------------------------------------------------------- |
| `merchantName` | `string`            | ✅       | Your company / M-PESA merchant name shown in the QR prompt |
| `refNo`        | `string`            | ✅       | Transaction reference shown to the customer                |
| `amount`       | `number`            | ✅       | Total amount for the transaction. Must be ≥ 1              |
| `trxCode`      | `QRTransactionCode` | ✅       | Transaction type — see table below                         |
| `cpi`          | `string`            | ✅       | Credit Party Identifier (till number, paybill, or MSISDN)  |
| `size`         | `number`            | —        | QR image size in pixels (square). Defaults to `300`        |

## Transaction Codes (`trxCode`)

| Code | Transaction Type            | CPI Value                        |
| ---- | --------------------------- | -------------------------------- |
| `BG` | Pay Merchant (Buy Goods)    | Till number                      |
| `WA` | Withdraw Cash at Agent Till | Agent till number                |
| `PB` | Paybill / Business number   | Paybill shortcode                |
| `SM` | Send Money                  | Mobile number (254XXXXXXXXX)     |
| `SB` | Sent to Business            | Business number in MSISDN format |

## Response

```json
{
  "ResponseCode": "00",
  "RequestID": "QR_20240101_...",
  "ResponseDescription": "The service request is processed successfully.",
  "QRCode": "iVBORw0KGgoAAAANSUhEUgAA..."
}
```

### Rendering the QR code

`QRCode` is a **base64-encoded PNG**. Render it directly in an `<img>` tag:

```ts
const { QRCode } = await mpesa.generateDynamicQR({ ... })

// In a browser / React:
const src = `data:image/png;base64,${QRCode}`
// <img src={src} alt="M-PESA QR Code" />
```

Or write it to disk in Node.js:

```ts
import { writeFileSync } from 'node:fs'

const { QRCode } = await mpesa.generateDynamicQR({ ... })
const buffer = Buffer.from(QRCode, 'base64')
writeFileSync('mpesa-qr.png', buffer)
```

## Examples

### Buy Goods (Till)

```ts
const { QRCode } = await mpesa.generateDynamicQR({
  merchantName: 'My Shop',
  refNo: 'POS-001',
  amount: 200,
  trxCode: 'BG',
  cpi: '373132', // your till number
})
```

### Paybill

```ts
const { QRCode } = await mpesa.generateDynamicQR({
  merchantName: 'My Business',
  refNo: 'INV-2024-001',
  amount: 1500,
  trxCode: 'PB',
  cpi: '174379', // your paybill number
})
```

## Error Handling

```ts
import { PesafyError } from 'pesafy'

try {
  await mpesa.generateDynamicQR({ ... })
} catch (e) {
  if (e instanceof PesafyError) {
    // Common errors:
    // 404.001.04 — Invalid Authentication Header
    // 400.002.05 — Invalid Request Payload
    // 400.003.01 — Invalid Access Token
    console.error(e.code, e.message)
  }
}
```

## Types

```ts
type QRTransactionCode = 'BG' | 'WA' | 'PB' | 'SM' | 'SB'

interface DynamicQRRequest {
  merchantName: string
  refNo: string
  amount: number
  trxCode: QRTransactionCode
  cpi: string
  size?: number
}

interface DynamicQRResponse {
  ResponseCode: string
  RequestID: string
  ResponseDescription: string
  QRCode: string // base64-encoded PNG
}
```

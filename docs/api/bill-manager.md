# Bill Manager

Send branded M-PESA invoices directly to customers' phones. Customers receive a
push notification with payment details and can pay from their phone using the
Paybill number, USSD, STK, or M-PESA App. Payment notifications are POSTed to
your callback URL.

## Overview of all methods

| Method                 | Description                                                |
| ---------------------- | ---------------------------------------------------------- |
| `billManagerOptIn()`   | Register your shortcode with Bill Manager (required first) |
| `updateOptIn()`        | Update registration details                                |
| `sendInvoice()`        | Send a single invoice to one customer                      |
| `sendBulkInvoices()`   | Send up to 1,000 invoices in one call                      |
| `cancelInvoice()`      | Cancel a single unpaid invoice                             |
| `cancelBulkInvoices()` | Cancel multiple unpaid invoices                            |
| `reconcilePayment()`   | Acknowledge a payment to Bill Manager                      |

## Prerequisites

```ts
const mpesa = new Mpesa({
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: 'sandbox',
  // No initiator credentials required
})
```

## Opt-in

Before using any other Bill Manager API, opt your shortcode in. This registers
you on the Bill Manager platform and whitelists your `callbackUrl`.

```ts
const response = await mpesa.billManagerOptIn({
  shortcode: '600984',
  email: 'billing@company.com',
  officialContact: '0700000000', // phone number for notifications
  sendReminders: '1', // '1' = enable, '0' = disable
  callbackUrl: 'https://yourdomain.com/api/mpesa/bills/callback',
  logo: 'https://yourdomain.com/logo.jpeg', // optional JPEG URL
})
```

### Opt-in parameters

| Parameter         | Type         | Required | Description                                                                    |
| ----------------- | ------------ | -------- | ------------------------------------------------------------------------------ |
| `shortcode`       | `string`     | ✅       | Your M-PESA Paybill shortcode (5–6 digits).                                    |
| `email`           | `string`     | ✅       | Email for Bill Manager notifications and invoice copies.                       |
| `officialContact` | `string`     | ✅       | Phone number shown on invoices and payment receipts.                           |
| `sendReminders`   | `'1' \| '0'` | ✅       | `'1'` enables automatic SMS reminders at 7, 3, and 0 days before the due date. |
| `callbackUrl`     | `string`     | ✅       | Public URL Safaricom POSTs payment confirmations to.                           |
| `logo`            | `string`     | —        | JPEG image URL. Displayed in invoices and receipts.                            |

### Opt-in response

```ts
interface BillManagerOptInResponse {
  app_key?: string // assigned API key — save this
  resmsg: string // human-readable status
  rescode: string // '200' = success
}
```

## Update opt-in

Update any registration field using the same parameters as opt-in:

```ts
await mpesa.updateOptIn({
  shortcode: '600984',
  email: 'new-billing@company.com',
  officialContact: '0711111111',
  sendReminders: '0',
  callbackUrl: 'https://yourdomain.com/api/mpesa/bills/callback',
})
```

`BillManagerUpdateOptInRequest` has the same fields as
`BillManagerOptInRequest`.

## Single invoice

Send a personalised invoice to a single customer:

```ts
await mpesa.sendInvoice({
  externalReference: 'INV-2024-001',
  billedFullName: 'Jane Doe',
  billedPhoneNumber: '254712345678', // Safaricom number — receives the SMS
  billedPeriod: 'January 2024', // billing period label
  invoiceName: 'Monthly Subscription',
  dueDate: '2024-01-31 23:59:00',
  accountReference: 'ACC-12345', // customer account number
  amount: 2_500,
  invoiceItems: [
    { itemName: 'Base subscription', amount: 2_000 },
    { itemName: 'VAT (16%)', amount: 500 },
  ],
})
```

### Single invoice parameters

| Parameter           | Type                       | Required | Description                                                             |
| ------------------- | -------------------------- | -------- | ----------------------------------------------------------------------- |
| `externalReference` | `string`                   | ✅       | Your unique invoice ID. Used to reference, pay, and cancel the invoice. |
| `billedFullName`    | `string`                   | ✅       | Customer's full name. Shown in the invoice SMS.                         |
| `billedPhoneNumber` | `string`                   | ✅       | Safaricom number to receive the invoice push notification.              |
| `billedPeriod`      | `string`                   | ✅       | Billing period label (e.g. `'January 2024'`).                           |
| `invoiceName`       | `string`                   | ✅       | Invoice description shown in the SMS.                                   |
| `dueDate`           | `string`                   | ✅       | Due date in `YYYY-MM-DD HH:MM:SS` format.                               |
| `accountReference`  | `string`                   | ✅       | Customer account number (meter number, student ID, etc.).               |
| `amount`            | `number`                   | ✅       | Total invoice amount in KES. Minimum 1.                                 |
| `invoiceItems`      | `BillManagerInvoiceItem[]` | —        | Line items shown in the detailed invoice view.                          |

## Bulk invoices

Send up to 1,000 invoices in a single request. The `invoices` array accepts the
same fields as a single invoice:

```ts
await mpesa.sendBulkInvoices({
  invoices: [
    {
      externalReference: 'INV-001',
      billedFullName: 'John Smith',
      billedPhoneNumber: '254712345678',
      billedPeriod: 'January 2024',
      invoiceName: 'Water Bill',
      dueDate: '2024-01-31 23:59:00',
      accountReference: 'METER-001',
      amount: 350,
    },
    {
      externalReference: 'INV-002',
      billedFullName: 'Jane Doe',
      billedPhoneNumber: '254798765432',
      billedPeriod: 'January 2024',
      invoiceName: 'Water Bill',
      dueDate: '2024-01-31 23:59:00',
      accountReference: 'METER-002',
      amount: 420,
    },
    // ... up to 1000 invoices
  ],
})
```

::: warning 1,000 invoice limit Maximum 1,000 invoices per bulk request. For
larger volumes, split into batches. :::

## Cancel an invoice

Cancel a single unpaid invoice by its external reference:

```ts
await mpesa.cancelInvoice({
  externalReference: 'INV-2024-001',
})
```

::: warning Cannot cancel paid invoices Partially or fully paid invoices cannot
be cancelled. pesafy does not validate this — Daraja returns an error if you
attempt it. :::

## Cancel bulk invoices

Cancel multiple invoices at once:

```ts
await mpesa.cancelBulkInvoices({
  externalReferences: ['INV-001', 'INV-002', 'INV-003'],
})
```

## Payment notification (your callback)

When a customer pays, Safaricom POSTs to your `callbackUrl`:

```json
{
  "transactionId": "OEI2AK4XXXX",
  "paidAmount": "2500",
  "msisdn": "254712345678",
  "dateCreated": "2024-01-15",
  "accountReference": "ACC-12345",
  "shortCode": "600984"
}
```

Handling the notification:

```ts
import type { BillManagerPaymentNotification } from 'pesafy'

app.post('/api/mpesa/bills/callback', (req, res) => {
  // Respond 200 immediately — Safaricom retries up to 5 times on non-200
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' })

  const payment = req.body as BillManagerPaymentNotification

  console.log({
    txId: payment.transactionId, // M-PESA receipt
    amount: payment.paidAmount, // string, e.g. '2500'
    msisdn: payment.msisdn, // customer phone
    ref: payment.accountReference, // account reference used
    shortcode: payment.shortCode, // your shortcode
    date: payment.dateCreated, // 'YYYY-MM-DD'
  })

  db.invoices
    .markPaid({
      externalRef: payment.accountReference,
      txId: payment.transactionId,
      amount: Number(payment.paidAmount),
    })
    .catch(console.error)
})
```

## Payment reconciliation

After processing a payment notification, send an acknowledgement to Bill
Manager. This closes the payment loop and triggers any final customer-facing
receipts:

```ts
await mpesa.reconcilePayment({
  transactionId: 'OEI2AK4XXXX',
  externalReference: 'INV-2024-001',
  accountReference: 'ACC-12345',
  paidAmount: '2500',
  paymentDate: '2024-01-15',
  phoneNumber: '254712345678',
  fullName: 'Jane Doe',
  invoiceName: 'Monthly Subscription',
})
```

### Reconciliation parameters

| Parameter           | Type     | Required | Description                                      |
| ------------------- | -------- | -------- | ------------------------------------------------ |
| `transactionId`     | `string` | ✅       | M-PESA receipt number from the notification.     |
| `externalReference` | `string` | ✅       | Your invoice reference.                          |
| `accountReference`  | `string` | ✅       | Customer account number.                         |
| `paidAmount`        | `string` | ✅       | Amount paid (as string).                         |
| `paymentDate`       | `string` | ✅       | Date payment was received (e.g. `'2024-01-15'`). |
| `phoneNumber`       | `string` | ✅       | Customer phone number.                           |
| `fullName`          | `string` | ✅       | Customer full name.                              |
| `invoiceName`       | `string` | ✅       | Invoice name or description.                     |

## Error handling

All Bill Manager methods throw `PesafyError` on failure. Response codes follow
the same `'200'` = success convention as the rest of the Daraja API.

```ts
import { PesafyError } from 'pesafy'

try {
  await mpesa.sendInvoice({ ... })
} catch (e) {
  if (e instanceof PesafyError) {
    console.error(e.code, e.message)
  }
}
```

## Types

```ts
interface BillManagerOptInRequest {
  shortcode: string
  email: string
  officialContact: string
  sendReminders: '1' | '0'
  callbackUrl: string
  logo?: string
}

type BillManagerUpdateOptInRequest = BillManagerOptInRequest

interface BillManagerInvoiceItem {
  itemName: string
  amount: number
}

interface BillManagerSingleInvoiceRequest {
  externalReference: string
  billedFullName: string
  billedPhoneNumber: string
  billedPeriod: string
  invoiceName: string
  dueDate: string
  accountReference: string
  amount: number
  invoiceItems?: BillManagerInvoiceItem[]
}

interface BillManagerBulkInvoiceRequest {
  invoices: BillManagerSingleInvoiceRequest[] // max 1000
}

interface BillManagerCancelInvoiceRequest {
  externalReference: string
}

interface BillManagerCancelBulkInvoiceRequest {
  externalReferences: string[]
}

interface BillManagerPaymentNotification {
  transactionId: string // M-PESA receipt
  paidAmount: string
  msisdn: string // customer phone
  dateCreated: string // 'YYYY-MM-DD'
  accountReference: string
  shortCode: string
}

interface BillManagerReconciliationRequest {
  paymentDate: string
  paidAmount: string
  accountReference: string
  transactionId: string
  phoneNumber: string
  fullName: string
  invoiceName: string
  externalReference: string
}
```

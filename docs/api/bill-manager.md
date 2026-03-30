# Bill Manager

Create and send M-PESA invoices directly to customers. Customers receive a push notification and can pay with their Paybill number. Payment confirmations are POSTed back to your `callbackUrl`.

## Opt-in

Before sending invoices you must opt your shortcode into Bill Manager:

```ts
await mpesa.billManagerOptIn({
  shortcode: '600984',
  email: 'billing@company.com',
  officialContact: '0700000000',
  sendReminders: '1',
  callbackUrl: 'https://yourdomain.com/mpesa/bills/callback',
  logo: 'https://yourdomain.com/logo.png',
})
```

### Opt-in Parameters

| Parameter         | Type         | Required | Description                                  |
| ----------------- | ------------ | -------- | -------------------------------------------- |
| `shortcode`       | `string`     | ✅       | Your M-PESA Paybill shortcode                |
| `email`           | `string`     | ✅       | Email to receive Bill Manager notifications  |
| `officialContact` | `string`     | ✅       | Sender name shown on push notifications      |
| `sendReminders`   | `"1" \| "0"` | ✅       | `"1"` to enable payment reminders            |
| `callbackUrl`     | `string`     | ✅       | URL Safaricom POSTs payment confirmations to |
| `logo`            | `string`     | —        | Public HTTPS URL of your logo                |

---

## Send a Single Invoice

```ts
await mpesa.sendInvoice({
  externalReference: 'INV-2024-001',
  billingPeriod: '2024-01',
  invoiceName: 'January Subscription',
  dueDate: '2024-01-31 23:59:00',
  accountReference: 'ACC-12345',
  amount: 2500,
  partyA: '254712345678',
  invoiceItems: [
    { itemName: 'Subscription fee', amount: 2000 },
    { itemName: 'VAT (16%)', amount: 500 },
  ],
})
```

### Parameters

| Parameter           | Type                       | Required | Description                                      |
| ------------------- | -------------------------- | -------- | ------------------------------------------------ |
| `externalReference` | `string`                   | ✅       | Your invoice number / unique reference           |
| `billingPeriod`     | `string`                   | ✅       | Billing period, e.g. `"2024-01"`                 |
| `invoiceName`       | `string`                   | ✅       | Invoice name / description                       |
| `dueDate`           | `string`                   | ✅       | Due date in `YYYY-MM-DD HH:MM:SS` format         |
| `accountReference`  | `string`                   | ✅       | Customer account number                          |
| `amount`            | `number`                   | ✅       | Total invoice amount. Must be ≥ 1                |
| `partyA`            | `string`                   | ✅       | Customer MSISDN — receives the push notification |
| `invoiceItems`      | `BillManagerInvoiceItem[]` | —        | Line items that make up the invoice              |

---

## Send Bulk Invoices

Send up to **1,000 invoices** in a single request:

```ts
await mpesa.sendBulkInvoices({
  invoices: [
    {
      externalReference: 'INV-001',
      billingPeriod: '2024-01',
      invoiceName: 'Water Bill',
      dueDate: '2024-01-31 23:59:00',
      accountReference: 'METER-001',
      amount: 350,
      partyA: '254712345678',
    },
    {
      externalReference: 'INV-002',
      billingPeriod: '2024-01',
      invoiceName: 'Water Bill',
      dueDate: '2024-01-31 23:59:00',
      accountReference: 'METER-002',
      amount: 420,
      partyA: '254798765432',
    },
  ],
})
```

::: warning Limit
Maximum **1,000 invoices** per bulk request. Split larger batches accordingly.
:::

---

## Cancel an Invoice

Cancel a previously issued invoice by its external reference:

```ts
await mpesa.cancelInvoice({
  externalReference: 'INV-2024-001',
})
```

---

## Payment Notification Callback

When a customer pays, Safaricom POSTs to your `callbackUrl`:

```json
{
  "paymentDate": "2024-01-15 10:30:00",
  "paidAmount": "2500",
  "accountReference": "ACC-12345",
  "transactionId": "OEI2AK4XXXX",
  "phoneNumber": "254712345678",
  "billRefNumber": "INV-2024-001",
  "externalReference": "INV-2024-001",
  "billerId": "600984",
  "currency": "KES"
}
```

### Handling payments

```ts
import type { BillManagerPaymentNotification } from 'pesafy'

app.post('/mpesa/bills/callback', (req, res) => {
  const payment = req.body as BillManagerPaymentNotification

  console.log('Paid:', payment.paidAmount, 'KES')
  console.log('Invoice:', payment.externalReference)
  console.log('Transaction ID:', payment.transactionId)

  // Mark invoice as paid in your database
  // await db.invoices.markPaid(payment.externalReference, payment.transactionId)

  res.json({ ResultCode: 0, ResultDesc: 'Accepted' })
})
```

---

## Error Handling

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
interface BillManagerInvoiceItem {
  itemName: string
  amount: number
}

interface BillManagerSingleInvoiceRequest {
  externalReference: string
  billingPeriod: string
  invoiceName: string
  dueDate: string
  accountReference: string
  amount: number
  partyA: string
  invoiceItems?: BillManagerInvoiceItem[]
}

interface BillManagerPaymentNotification {
  paymentDate: string
  paidAmount: string
  accountReference: string
  transactionId: string
  phoneNumber: string
  billRefNumber: string
  externalReference: string
  billerId: string
  currency: string
}
```

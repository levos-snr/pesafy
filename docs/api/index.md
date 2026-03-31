# API Reference

Welcome to the pesafy API reference. Select a topic from the sidebar.

## Overview

pesafy wraps every endpoint of Safaricom's Daraja 2.0 API with full TypeScript types.

| API                                        | Description                                 |
| ------------------------------------------ | ------------------------------------------- |
| [STK Push](./stk-push)                     | Prompt a customer to pay via M-PESA Express |
| [C2B](./c2b)                               | Register URLs and receive customer payments |
| [B2C](./b2c)                               | Send money from your business to customers  |
| [B2B](./b2b)                               | Business-to-business express checkout       |
| [Account Balance](./account-balance)       | Query your M-PESA account balance           |
| [Transaction Status](./transaction-status) | Check the status of any transaction         |
| [Reversal](./reversal)                     | Reverse a transaction                       |
| [Tax Remittance](./tax-remittance)         | Remit taxes directly to KRA                 |
| [Dynamic QR](./dynamic-qr)                 | Generate payment QR codes                   |
| [Bill Manager](./bill-manager)             | Send invoices and reconcile payments        |

## Authentication

All API calls are authenticated automatically. Pass your credentials once at initialisation:

```ts
import { createPesafy } from 'pesafy'

const pesafy = createPesafy({
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: 'sandbox', // or 'production'
})
```

// src/mpesa/bill-manager/index.ts

/**
 * src/mpesa/bill-manager/index.ts
 *
 * Bill Manager module exports.
 *
 * Covers:
 *   - billManagerOptIn()          — Opt-in shortcode to Bill Manager
 *   - updateOptIn()               — Update opt-in details
 *   - sendSingleInvoice()         — Send a single e-invoice
 *   - sendBulkInvoices()          — Send up to 1000 e-invoices
 *   - cancelInvoice()             — Cancel a single invoice
 *   - cancelBulkInvoices()        — Cancel multiple invoices
 *   - reconcilePayment()          — Acknowledge a payment (reconciliation)
 */

export {
  billManagerOptIn,
  cancelBulkInvoices,
  cancelInvoice,
  reconcilePayment,
  sendBulkInvoices,
  sendSingleInvoice,
  updateOptIn,
} from './invoice'

export type {
  BillManagerBulkInvoiceRequest,
  BillManagerBulkInvoiceResponse,
  BillManagerCancelBulkInvoiceRequest,
  BillManagerCancelBulkInvoiceResponse,
  BillManagerCancelInvoiceRequest,
  BillManagerCancelInvoiceResponse,
  BillManagerInvoiceItem,
  BillManagerOptInRequest,
  BillManagerOptInResponse,
  BillManagerPaymentCallbackResponse,
  BillManagerPaymentNotification,
  BillManagerReconciliationRequest,
  BillManagerReconciliationResponse,
  BillManagerSingleInvoiceRequest,
  BillManagerSingleInvoiceResponse,
  BillManagerUpdateOptInRequest,
  BillManagerUpdateOptInResponse,
} from './types'

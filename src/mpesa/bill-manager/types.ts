// 📁 PATH: src/mpesa/bill-manager/types.ts

/**
 * Bill Manager types
 *
 * Safaricom Bill Manager lets you create invoices that customers pay via
 * M-PESA with your Paybill. Bills are sent as push notifications.
 *
 * APIs:
 *   POST /v1/billmanager-invoice/optin          — opt-in shortcode
 *   POST /v1/billmanager-invoice/change-optin   — update opt-in
 *   POST /v1/billmanager-invoice/single-invoicing  — single invoice
 *   POST /v1/billmanager-invoice/bulk-invoicing    — bulk invoices (up to 1000)
 *   POST /v1/billmanager-invoice/cancel-single-invoice — cancel invoice
 *
 * Ref: Bill Manager — Daraja Developer Portal
 */

// ── Opt-in ────────────────────────────────────────────────────────────────────

export interface BillManagerOptInRequest {
  /** Your M-PESA Paybill shortcode */
  shortcode: string
  /** Email address to receive bill manager notifications */
  email: string
  /** Your logo URL (public HTTPS link) */
  officialContact: string
  /** Sender name shown on push notifications */
  sendReminders: '1' | '0'
  /** Logo URL */
  logo?: string
  /** Callback URL for payment confirmations */
  callbackUrl: string
}

export interface BillManagerOptInResponse {
  rescode: string
  resmsg: string
}

// ── Single Invoice ────────────────────────────────────────────────────────────

export interface BillManagerInvoiceItem {
  /** Item description */
  itemName: string
  /** Item amount */
  amount: number
}

export interface BillManagerSingleInvoiceRequest {
  /** External reference/invoice number from your system */
  externalReference: string
  /** Billing period (e.g. "2024-01") */
  billingPeriod: string
  /** Invoice name/description */
  invoiceName: string
  /** Due date: YYYY-MM-DD HH:MM:SS */
  dueDate: string
  /** Account reference (customer account number) */
  accountReference: string
  /** Total amount */
  amount: number
  /** Customer MSISDN (will receive push notification) */
  partyA: string
  /** Line items making up the invoice */
  invoiceItems?: BillManagerInvoiceItem[]
}

export interface BillManagerSingleInvoiceResponse {
  rescode: string
  resmsg: string
}

// ── Bulk Invoicing ────────────────────────────────────────────────────────────

export interface BillManagerBulkInvoiceRequest {
  /** Array of invoices (max 1000 per request) */
  invoices: BillManagerSingleInvoiceRequest[]
}

export interface BillManagerBulkInvoiceResponse {
  rescode: string
  resmsg: string
}

// ── Cancel Invoice ────────────────────────────────────────────────────────────

export interface BillManagerCancelInvoiceRequest {
  /** External reference to cancel */
  externalReference: string
}

export interface BillManagerCancelInvoiceResponse {
  rescode: string
  resmsg: string
}

// ── Reconciliation callback ───────────────────────────────────────────────────

/**
 * Payload POSTed to your callbackUrl when a Bill Manager invoice is paid.
 */
export interface BillManagerPaymentNotification {
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

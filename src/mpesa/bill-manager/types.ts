// src/mpesa/bill-manager/types.ts

/**
 * Bill Manager types.
 *
 * Strictly aligned with Safaricom Daraja Bill Manager API documentation.
 *
 * APIs:
 *   POST /v1/billmanager-invoice/optin                 — Opt-in shortcode
 *   POST /v1/billmanager-invoice/change-optin-details  — Update opt-in details
 *   POST /v1/billmanager-invoice/single-invoicing      — Send a single invoice
 *   POST /v1/billmanager-invoice/bulk-invoicing        — Send bulk invoices (up to 1000)
 *   POST /v1/billmanager-invoice/cancel-single-invoice — Cancel a single invoice
 *   POST /v1/billmanager-invoice/cancel-bulk-invoices  — Cancel multiple invoices
 *   POST /v1/billmanager-invoice/reconciliation        — Acknowledge a payment
 *
 * Ref: Bill Manager — Daraja Developer Portal
 */

// ── Opt-in ────────────────────────────────────────────────────────────────────

export interface BillManagerOptInRequest {
  /**
   * Organisation shortcode (Paybill or Buy Goods — 5 to 6 digits).
   * Daraja field: shortcode
   */
  shortcode: string
  /**
   * Official contact email for the organisation.
   * Appears in invoices and receipts.
   * Daraja field: email
   */
  email: string
  /**
   * Official contact phone number (e.g. 0710XXXXXX).
   * Appears in invoices and receipts.
   * Daraja field: officialContact
   */
  officialContact: string
  /**
   * Enable or disable SMS payment reminders.
   * "1" = Enable (reminders sent 7 days, 3 days, and on the due date)
   * "0" = Disable
   * Daraja field: sendReminders
   */
  sendReminders: '1' | '0'
  /**
   * Logo image to embed in invoices and receipts.
   * Accepts JPEG / JPG.
   * Daraja field: logo
   */
  logo?: string
  /**
   * Callback URL where Bill Manager POSTs payment notifications.
   * Daraja field: callbackurl (lowercase — mapped internally)
   */
  callbackUrl: string
}

export interface BillManagerOptInResponse {
  /**
   * App key assigned upon successful onboarding.
   * Example: "AG_2376487236_126732989KJ"
   */
  app_key?: string
  /** Human-readable result message */
  resmsg: string
  /** Numeric status code — "200" = success */
  rescode: string
}

// ── Update Opt-in ─────────────────────────────────────────────────────────────

/**
 * Same fields as opt-in.
 * Sent to /v1/billmanager-invoice/change-optin-details.
 */
export type BillManagerUpdateOptInRequest = BillManagerOptInRequest

export interface BillManagerUpdateOptInResponse {
  resmsg: string
  rescode: string
}

// ── Invoice Items ─────────────────────────────────────────────────────────────

export interface BillManagerInvoiceItem {
  /** Name / description of the billable item */
  itemName: string
  /** Amount for this item in KES (whole number ≥ 1) */
  amount: number
}

// ── Single Invoice ────────────────────────────────────────────────────────────

export interface BillManagerSingleInvoiceRequest {
  /**
   * Unique invoice reference on your system.
   * Used to reference the invoice from both Bill Manager and your system.
   * Daraja field: externalReference
   */
  externalReference: string
  /**
   * Full name of the billed recipient — appears in the invoice SMS.
   * Daraja field: billedFullName
   */
  billedFullName: string
  /**
   * Safaricom phone number to receive the invoice SMS.
   * Formats: 07XXXXXXXX or 254XXXXXXXXX
   * Daraja field: billedPhoneNumber
   */
  billedPhoneNumber: string
  /**
   * Month and year of the billing period, e.g. "August 2021".
   * Daraja field: billedPeriod
   */
  billedPeriod: string
  /**
   * Descriptive invoice name — appears in the SMS sent to the customer.
   * Daraja field: invoiceName
   */
  invoiceName: string
  /**
   * Payment due date.
   * Format: YYYY-MM-DD or YYYY-MM-DD HH:MM:SS
   * Daraja field: dueDate
   */
  dueDate: string
  /**
   * Account number that uniquely identifies the customer.
   * Could be a customer name, property unit, student name, etc.
   * Daraja field: accountReference
   */
  accountReference: string
  /**
   * Total invoice amount in KES. Must be a whole number ≥ 1.
   * Sent as a string per Daraja docs.
   * Daraja field: amount
   */
  amount: number
  /**
   * Additional billable line items shown on the invoice (optional).
   * Daraja field: invoiceItems
   */
  invoiceItems?: BillManagerInvoiceItem[]
}

export interface BillManagerSingleInvoiceResponse {
  /** Descriptive status message, e.g. "Invoice sent successfully" */
  Status_Message?: string
  resmsg: string
  /** Numeric status code — "200" = success */
  rescode: string
}

// ── Bulk Invoicing ────────────────────────────────────────────────────────────

export interface BillManagerBulkInvoiceRequest {
  /**
   * Array of invoices to send.
   * Maximum 1000 invoices per request.
   * Daraja receives these as a JSON array (unwrapped internally).
   */
  invoices: BillManagerSingleInvoiceRequest[]
}

export interface BillManagerBulkInvoiceResponse {
  Status_Message?: string
  resmsg: string
  rescode: string
}

// ── Cancel Single Invoice ─────────────────────────────────────────────────────

export interface BillManagerCancelInvoiceRequest {
  /**
   * External reference of the invoice to cancel.
   * Partially or fully paid invoices cannot be cancelled.
   */
  externalReference: string
}

export interface BillManagerCancelInvoiceResponse {
  Status_Message?: string
  resmsg: string
  rescode: string
  errors?: unknown[]
}

// ── Cancel Bulk Invoices ──────────────────────────────────────────────────────

export interface BillManagerCancelBulkInvoiceRequest {
  /**
   * External references of the invoices to cancel.
   * Partially or fully paid invoices cannot be cancelled.
   */
  externalReferences: string[]
}

export interface BillManagerCancelBulkInvoiceResponse {
  Status_Message?: string
  resmsg: string
  rescode: string
  errors?: unknown[]
}

// ── Payment Notification (POSTed to your callbackUrl) ─────────────────────────

/**
 * Payload POSTed by Bill Manager to your callbackUrl when a customer pays.
 *
 * Bill Manager retries delivery up to 5 times if your endpoint is unreachable.
 *
 * Per Daraja docs:
 * ```json
 * {
 *   "transactionId": "RJB53MYR1N",
 *   "paidAmount": "5000",
 *   "msisdn": "254710119383",
 *   "dateCreated": "2021-09-15",
 *   "accountReference": "LGHJIO789",
 *   "shortCode": "349350555"
 * }
 * ```
 */
export interface BillManagerPaymentNotification {
  /** M-PESA receipt number */
  transactionId: string
  /** Amount paid */
  paidAmount: string
  /** Customer phone number (MSISDN) */
  msisdn: string
  /** Date the payment was made */
  dateCreated: string
  /** Account reference the customer used */
  accountReference: string
  /** Your shortcode that received the payment */
  shortCode: string
}

/**
 * Expected response from your callback endpoint after receiving a payment notification.
 */
export interface BillManagerPaymentCallbackResponse {
  resmsg: string
  rescode: string
}

// ── Reconciliation / Acknowledgment ──────────────────────────────────────────

/**
 * Acknowledgment body sent to Daraja after your system has processed a payment.
 *
 * Endpoint: POST /v1/billmanager-invoice/reconciliation
 *
 * Per Daraja docs:
 * ```json
 * {
 *   "paymentDate": "2021-10-01",
 *   "paidAmount": "800",
 *   "accountReference": "Balboa95",
 *   "transactionId": "PJB53MYR1N",
 *   "phoneNumber": "0710XXXXXX",
 *   "fullName": "John Doe",
 *   "invoiceName": "School Fees",
 *   "externalReference": "955"
 * }
 * ```
 */
export interface BillManagerReconciliationRequest {
  /** Date payment was received, e.g. "2021-10-01" */
  paymentDate: string
  /** Amount paid */
  paidAmount: string
  /** Account reference */
  accountReference: string
  /** M-PESA receipt / transaction ID */
  transactionId: string
  /** Customer phone number */
  phoneNumber: string
  /** Customer full name */
  fullName: string
  /** Invoice name */
  invoiceName: string
  /** Your external invoice reference */
  externalReference: string
}

export interface BillManagerReconciliationResponse {
  resmsg: string
  rescode: string
}

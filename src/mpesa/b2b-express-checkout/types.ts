/**
 * B2B Express Checkout (USSD Push to Till) types
 *
 * API: POST /v1/ussdpush/get-msisdn
 *
 * Daraja request body (from official B2B Express Checkout docs):
 * {
 *   "primaryShortCode":  "000001",
 *   "receiverShortCode": "000002",
 *   "amount":            "100",
 *   "paymentRef":        "paymentRef",
 *   "callbackUrl":       "http://..../result",
 *   "partnerName":       "Vendor",
 *   "RequestRefID":      "{{random Unique Identifier For Each Request}}"
 * }
 *
 * Flow:
 *   1. Vendor (you) initiates a USSD Push via Daraja.
 *   2. Daraja sends a USSD prompt to the merchant's till.
 *   3. Merchant enters Operator ID and M-PESA PIN.
 *   4. M-PESA credits the vendor (receiverShortCode) and debits the merchant (primaryShortCode).
 *   5. Daraja POSTs a callback to the vendor's callbackUrl.
 *
 * Authentication:
 *   Standard OAuth bearer token only.
 *   No SecurityCredential / initiatorName required.
 *
 * Ref: B2B Express CheckOut — Daraja Developer Portal
 */

// ── Request ───────────────────────────────────────────────────────────────────

export interface B2BExpressCheckoutRequest {
  /**
   * Debit party — the merchant's till shortCode/tillNumber sending money.
   * Daraja field: primaryShortCode
   */
  primaryShortCode: string;

  /**
   * Credit party — the vendor's Paybill account receiving the money.
   * Daraja field: receiverShortCode
   */
  receiverShortCode: string;

  /**
   * Amount to send to the vendor. Must be a whole number ≥ 1.
   * Daraja field: amount (sent as string per spec)
   */
  amount: number;

  /**
   * Payment reference shown in the merchant's USSD prompt.
   * Daraja field: paymentRef
   */
  paymentRef: string;

  /**
   * Your publicly accessible URL where Safaricom POSTs the transaction result.
   * Daraja field: callbackUrl
   */
  callbackUrl: string;

  /**
   * Vendor's friendly name as known by the merchant.
   * Shown in the USSD prompt: "You are about to send Ksh X to {partnerName}..."
   * Daraja field: partnerName
   */
  partnerName: string;

  /**
   * Random unique identifier for this request.
   * Used to track the process across all components.
   * Auto-generated (UUID v4) if omitted.
   * Daraja field: RequestRefID
   */
  requestRefId?: string;
}

// ── Synchronous acknowledgement (returned immediately) ────────────────────────

export interface B2BExpressCheckoutResponse {
  /** "0" = USSD initiated successfully */
  code: string;
  /** Human-readable status, e.g. "USSD Initiated Successfully" */
  status: string;
}

// ── Async callback payloads (POSTed to your callbackUrl) ─────────────────────

/**
 * Callback when the merchant CANCELLED the USSD prompt.
 * resultCode "4001" = "User cancelled transaction"
 */
export interface B2BExpressCheckoutCallbackCancelled {
  /** "4001" */
  resultCode: string;
  resultDesc: string;
  requestId: string;
  amount: string;
  paymentReference: string;
}

/**
 * Callback when the M-PESA transaction SUCCEEDED.
 * resultCode "0"
 */
export interface B2BExpressCheckoutCallbackSuccess {
  /** "0" */
  resultCode: string;
  resultDesc: string;
  amount: string;
  requestId: string;
  /** Usually "0" */
  resultType: string;
  conversationID: string;
  /** M-PESA receipt number, e.g. "RDQ01NFT1Q" */
  transactionId: string;
  /** "SUCCESS" */
  status: string;
}

export type B2BExpressCheckoutCallback =
  | B2BExpressCheckoutCallbackSuccess
  | B2BExpressCheckoutCallbackCancelled;

// ── Error codes (from Daraja docs) ────────────────────────────────────────────

/**
 * B2B Express Checkout error codes:
 *   4104 — Missing Nominated Number → configure in M-PESA Web Portal
 *   4102 — Merchant KYC Fail        → provide valid KYC
 *   4201 — USSD Network Error       → retry on stable network
 *   4203 — USSD Exception Error     → retry on stable network
 *   4001 — User cancelled           → callback only, not a thrown error
 *
 * `(string & {})` keeps these literals in IntelliSense while still
 * accepting unknown codes, without triggering no-redundant-type-constituents.
 */
export type B2BExpressCheckoutErrorCode =
  | "4001"
  | "4102"
  | "4104"
  | "4201"
  | "4203"
  | (string & {});

// ── Synchronous error response ────────────────────────────────────────────────

export interface B2BExpressCheckoutErrorResponse {
  requestId: string;
  errorCode: B2BExpressCheckoutErrorCode;
  errorMessage: string;
}

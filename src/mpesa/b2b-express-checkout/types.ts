/**
 * src/mpesa/b2b-express-checkout/types.ts
 *
 * B2B Express Checkout (USSD Push to Till) type definitions.
 * Strictly aligned with Safaricom Daraja B2B Express Checkout API documentation.
 *
 * Endpoint: POST https://sandbox.safaricom.co.ke/v1/ussdpush/get-msisdn
 *
 * Flow:
 *   1. Vendor initiates USSD push via Daraja
 *   2. Merchant receives USSD prompt on their till
 *   3. Merchant enters Operator ID + M-PESA PIN
 *   4. M-PESA debits merchant, credits vendor
 *   5. Daraja POSTs callback to your callbackUrl
 */

// ── Request ───────────────────────────────────────────────────────────────────

/**
 * Request payload for B2B Express Checkout USSD Push.
 *
 * Daraja payload shape (all field names are camelCase except RequestRefID):
 * {
 *   "primaryShortCode": "000001",
 *   "receiverShortCode": "000002",
 *   "amount":            "100",          ← sent as string per Daraja spec
 *   "paymentRef":        "paymentRef",
 *   "callbackUrl":       "https://...",
 *   "partnerName":       "Vendor",
 *   "RequestRefID":      "uuid"          ← PascalCase per Daraja spec
 * }
 */
export interface B2BExpressCheckoutRequest {
  /**
   * Debit party — the merchant's till number that will be charged.
   * Daraja field: primaryShortCode
   */
  primaryShortCode: string

  /**
   * Credit party — the vendor's Paybill account that will receive funds.
   * Daraja field: receiverShortCode
   */
  receiverShortCode: string

  /**
   * Amount to send. Must be a whole number ≥ 1.
   * Sent as a string in the Daraja payload (e.g. "100").
   * Daraja field: amount
   */
  amount: number

  /**
   * Payment reference shown in the merchant's USSD prompt.
   * Daraja field: paymentRef
   */
  paymentRef: string

  /**
   * Publicly accessible URL where Daraja POSTs the transaction result.
   * Daraja field: callbackUrl
   */
  callbackUrl: string

  /**
   * Vendor's friendly name shown in the merchant's USSD prompt:
   * "You are about to send Ksh {{amount}} to {{partnerName}}..."
   * Daraja field: partnerName
   */
  partnerName: string

  /**
   * Unique identifier for this request — used for idempotency.
   * Auto-generated (UUID v4) if not provided.
   * Daraja field: RequestRefID (PascalCase per Daraja spec)
   */
  requestRefId?: string
}

// ── Synchronous acknowledgement (returned immediately by Daraja) ─────────────

/**
 * Synchronous acknowledgement returned immediately by Daraja.
 *
 * Daraja response shape:
 * {
 *   "code":   "0",
 *   "status": "USSD Initiated Successfully"
 * }
 *
 * code "0" means the USSD push was initiated. The actual transaction result
 * comes later via the callbackUrl.
 */
export interface B2BExpressCheckoutResponse {
  /** "0" = USSD push initiated successfully */
  code: string
  /** Human-readable status, e.g. "USSD Initiated Successfully" */
  status: string
}

// ── Async callback payloads (POSTed to your callbackUrl) ─────────────────────

/**
 * Callback when the merchant CANCELLED the USSD prompt.
 *
 * Daraja callback shape:
 * {
 *   "resultCode":       "4001",
 *   "resultDesc":       "User cancelled transaction",
 *   "requestId":        "c2a9ba32-9e11-4b90-892c-7bc54944609a",
 *   "amount":           "71.0",
 *   "paymentReference": "MAndbubry3hi"
 * }
 */
export interface B2BExpressCheckoutCallbackCancelled {
  /** "4001" for user cancellation */
  resultCode: string
  resultDesc: string
  requestId: string
  /** Amount as a string, e.g. "71.0" */
  amount: string
  /** The payment reference from the original request */
  paymentReference: string
}

/**
 * Callback when the M-PESA transaction SUCCEEDED.
 *
 * Daraja callback shape:
 * {
 *   "resultCode":    "0",
 *   "resultDesc":    "The service request is processed successfully.",
 *   "amount":        "71.0",
 *   "requestId":     "404e1aec-19e0-4ce3-973d-bd92e94c8021",
 *   "resultType":    "0",
 *   "conversationID":"AG_20230426_2010434680d9f5a73766",
 *   "transactionId": "RDQ01NFT1Q",
 *   "status":        "SUCCESS"
 * }
 */
export interface B2BExpressCheckoutCallbackSuccess {
  /** "0" */
  resultCode: string
  resultDesc: string
  /** Amount as a string, e.g. "71.0" */
  amount: string
  requestId: string
  /** Usually "0" */
  resultType: string
  /** M-PESA conversation ID, e.g. "AG_20230426_..." */
  conversationID: string
  /** M-PESA receipt number, e.g. "RDQ01NFT1Q" */
  transactionId: string
  /** "SUCCESS" */
  status: string
}

/**
 * Callback for any non-zero, non-cancelled failure
 * (e.g. KYC failure, USSD network error, missing nominated number).
 *
 * Error codes documented by Daraja:
 *   4102 — Merchant KYC failure
 *   4104 — Missing nominated number
 *   4201 — USSD network error
 *   4203 — USSD exception error
 */
export interface B2BExpressCheckoutCallbackFailed {
  resultCode: string
  resultDesc: string
  requestId: string
  amount: string
}

/**
 * Union of all possible callback payload shapes.
 * Discriminate on `resultCode`:
 *   "0"    → B2BExpressCheckoutCallbackSuccess
 *   "4001" → B2BExpressCheckoutCallbackCancelled
 *   other  → B2BExpressCheckoutCallbackFailed
 */
export type B2BExpressCheckoutCallback =
  | B2BExpressCheckoutCallbackSuccess
  | B2BExpressCheckoutCallbackCancelled
  | B2BExpressCheckoutCallbackFailed

// ── Error codes (documented by Daraja) ───────────────────────────────────────

/**
 * Known B2B Express Checkout result codes.
 *
 * SUCCESS  (0)    — Transaction completed successfully
 * CANCELLED(4001) — Merchant cancelled the USSD prompt
 * KYC_FAIL (4102) — Merchant KYC failure; provide valid KYC
 * NO_NUMBER(4104) — Missing nominated number; configure in M-PESA portal
 * NET_ERROR(4201) — USSD network error; retry on stable network
 * USSD_ERR (4203) — USSD exception error; retry on stable network
 */
export const B2B_RESULT_CODES = {
  SUCCESS: '0',
  CANCELLED: '4001',
  KYC_FAIL: '4102',
  NO_NOMINATED_NUMBER: '4104',
  USSD_NETWORK_ERROR: '4201',
  USSD_EXCEPTION_ERROR: '4203',
} as const

export type B2BResultCode = (typeof B2B_RESULT_CODES)[keyof typeof B2B_RESULT_CODES]

/**
 * B2B Express Checkout error codes.
 * `(string & {})` keeps these literals in IntelliSense while still accepting
 * unknown codes without triggering no-redundant-type-constituents.
 */
export type B2BExpressCheckoutErrorCode = B2BResultCode | (string & {})

// ── Synchronous error response ────────────────────────────────────────────────

/**
 * Synchronous error response from Daraja when the request itself fails
 * (before the USSD is initiated).
 */
export interface B2BExpressCheckoutErrorResponse {
  requestId: string
  errorCode: B2BExpressCheckoutErrorCode
  errorMessage: string
}

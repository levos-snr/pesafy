/**
 * src/mpesa/c2b/types.ts
 *
 * Customer to Business (C2B) type definitions.
 * Strictly aligned with Safaricom Daraja C2B API documentation (v2).
 *
 * Docs: https://developer.safaricom.co.ke/APIs/CustomerToBusinessRegisterURL
 */

// ── Shared ────────────────────────────────────────────────────────────────────

export type C2BApiVersion = 'v1' | 'v2'

/**
 * ResponseType for Register URL.
 *
 * Determines what M-PESA does when the Validation URL is unreachable.
 *
 * IMPORTANT (per docs): Must be sentence case — "Completed" or "Cancelled".
 *   ✓ "Completed"  ✗ "COMPLETED"  ✗ "completed"
 *   ✓ "Cancelled"  ✗ "CANCELLED"  ✗ "cancelled"
 */
export type C2BResponseType = 'Completed' | 'Cancelled'

// ── Register URL ──────────────────────────────────────────────────────────────

/**
 * Request body for C2B Register URL API.
 *
 * Daraja payload shape:
 * {
 *   "ShortCode":        "600984",
 *   "ResponseType":     "Completed",
 *   "ConfirmationURL":  "https://yourdomain.com/confirm",
 *   "ValidationURL":    "https://yourdomain.com/validate"
 * }
 */
export interface C2BRegisterUrlRequest {
  /** Paybill or Till shortcode */
  shortCode: string

  /**
   * Default action when Validation URL is unreachable.
   * Must be sentence-case: "Completed" or "Cancelled".
   */
  responseType: C2BResponseType

  /** URL that receives the confirmation callback after payment completes */
  confirmationUrl: string

  /**
   * URL that receives the validation callback before payment completes.
   * Only called when external validation is enabled on the shortcode.
   */
  validationUrl: string

  /** API version to use — defaults to "v2" */
  apiVersion?: C2BApiVersion
}

/**
 * Response from C2B Register URL API.
 *
 * Daraja response shape:
 * {
 *   "OriginatorCoversationID": "6e86-45dd-91ac-fd5d4178ab523408729",
 *   "ResponseCode":            "0",
 *   "ResponseDescription":     "Success"
 * }
 *
 * Note: "OriginatorCoversationID" — Daraja spells "Conversation" as
 * "Coverstation" in the actual API response. We preserve the typo to
 * match the real payload.
 */
export interface C2BRegisterUrlResponse {
  /** Global unique identifier for this request (note Daraja's spelling) */
  OriginatorCoversationID: string
  /** "0" = success */
  ResponseCode: string
  ResponseDescription: string
}

// ── Simulate (Sandbox only) ───────────────────────────────────────────────────

/**
 * CommandID for C2B simulation.
 *
 * "CustomerPayBillOnline" — payment to a Paybill number
 * "CustomerBuyGoodsOnline" — payment to a Till number
 */
export type C2BCommandID = 'CustomerPayBillOnline' | 'CustomerBuyGoodsOnline'

/**
 * Request body for C2B Simulate API (Sandbox only).
 *
 * Daraja payload shape:
 * {
 *   "ShortCode":      600984,          ← numeric
 *   "CommandID":      "CustomerPayBillOnline",
 *   "Amount":         1,               ← numeric, whole number
 *   "Msisdn":         254708374149,    ← numeric
 *   "BillRefNumber":  "TestRef"        ← omit entirely for CustomerBuyGoodsOnline
 * }
 */
export interface C2BSimulateRequest {
  /** Paybill or Till shortcode — sent as a number in the payload */
  shortCode: string | number

  /** Transaction type — Paybill or BuyGoods */
  commandId: C2BCommandID

  /** Amount in KES — whole numbers only; fractional values are rounded */
  amount: number

  /** Sender MSISDN. Sandbox test number: 254708374149 */
  msisdn: string | number

  /**
   * Account reference for Paybill payments.
   * MUST be omitted (not null, not "") for CustomerBuyGoodsOnline.
   * Per docs: "null for customer buy goods"
   */
  billRefNumber?: string | null

  /** API version to use — defaults to "v2" */
  apiVersion?: C2BApiVersion
}

/**
 * Response from C2B Simulate API.
 *
 * Daraja response shape:
 * {
 *   "OriginatorCoversationID": "53e3-4aa8-9fe0-8fb5e4092cdd3405976",
 *   "ResponseCode":            "0",
 *   "ResponseDescription":     "Accept the service request successfully."
 * }
 */
export interface C2BSimulateResponse {
  /** Global unique identifier for this request */
  OriginatorCoversationID: string
  /** "0" = accepted */
  ResponseCode: string
  ResponseDescription: string
}

// ── Validation Callback (POST → your ValidationURL) ───────────────────────────

/**
 * Payload POSTed to your ValidationURL by M-PESA (v2 masked MSISDN).
 *
 * Only received when external validation is enabled on the shortcode.
 * OrgAccountBalance is BLANK for validation requests.
 */
export interface C2BValidationPayload {
  /** "Pay Bill" or "Buy Goods" */
  TransactionType: string
  /** Unique M-PESA transaction ID */
  TransID: string
  /** Transaction timestamp: YYYYMMDDHHmmss */
  TransTime: string
  /** Amount the customer is paying */
  TransAmount: string
  /** Your shortcode (5–6 digits) */
  BusinessShortCode: string
  /** Account reference (Paybill only) — up to 20 alphanumeric chars */
  BillRefNumber: string
  /** Invoice number — usually empty */
  InvoiceNumber: string
  /**
   * Blank for validation requests.
   * Contains new balance after payment for confirmation requests.
   */
  OrgAccountBalance: string
  /** Third-party transaction ID. Can echo back in your validation response. */
  ThirdPartyTransID: string
  /**
   * v1: SHA-256 hashed MSISDN
   * v2: masked MSISDN e.g. "2547 ***** 126"
   */
  MSISDN: string
  FirstName: string
  MiddleName: string
  LastName: string
}

// ── Validation Response (your server → M-PESA) ────────────────────────────────

/**
 * Result codes for validation rejection.
 *
 * When rejecting, use one of these codes (NOT "0").
 * Using specific codes ensures customers receive appropriate messages.
 */
export type C2BValidationResultCode =
  | '0' // Accept
  | 'C2B00011' // Invalid MSISDN
  | 'C2B00012' // Invalid Account Number
  | 'C2B00013' // Invalid Amount
  | 'C2B00014' // Invalid KYC Details
  | 'C2B00015' // Invalid Short code
  | 'C2B00016' // Other Error

/**
 * Response your ValidationURL must return to M-PESA.
 *
 * Accept:
 *   { "ResultCode": "0",        "ResultDesc": "Accepted" }
 *
 * Reject:
 *   { "ResultCode": "C2B00011", "ResultDesc": "Rejected" }
 */
export interface C2BValidationResponse {
  /** "0" to accept; any C2B error code to reject */
  ResultCode: C2BValidationResultCode
  /** "Accepted" or "Rejected" */
  ResultDesc: 'Accepted' | 'Rejected'
  /**
   * Optional — echo back the ThirdPartyTransID from the validation request.
   * M-PESA will include it in the subsequent confirmation callback.
   */
  ThirdPartyTransID?: string
}

// ── Confirmation Callback (POST → your ConfirmationURL) ──────────────────────

/**
 * Payload POSTed to your ConfirmationURL by M-PESA after payment completes (v2).
 *
 * OrgAccountBalance contains the NEW balance after this payment.
 */
export interface C2BConfirmationPayload {
  /** "Pay Bill" or "Buy Goods" */
  TransactionType: string
  /** Unique M-PESA transaction ID */
  TransID: string
  /** Transaction timestamp: YYYYMMDDHHmmss */
  TransTime: string
  /** Amount transacted */
  TransAmount: string
  /** Your shortcode (5–6 digits) */
  BusinessShortCode: string
  /** Account reference (Paybill only) */
  BillRefNumber: string
  /** Invoice number — usually empty */
  InvoiceNumber: string
  /** New balance after this payment */
  OrgAccountBalance: string
  /** Third-party transaction ID (echoed from validation response if set) */
  ThirdPartyTransID: string
  /**
   * v1: SHA-256 hashed MSISDN
   * v2: masked MSISDN e.g. "2547 ***** 126"
   */
  MSISDN: string
  FirstName: string
  MiddleName: string
  LastName: string
}

/**
 * Acknowledgement your ConfirmationURL must return to M-PESA.
 * Always respond with ResultCode 0 to acknowledge receipt.
 */
export interface C2BConfirmationAck {
  /** Always 0 */
  ResultCode: 0
  ResultDesc: string
}

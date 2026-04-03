/**
 * src/mpesa/c2b/types.ts
 *
 * Customer to Business (C2B) type definitions.
 * Strictly aligned with Safaricom Daraja C2B Register URL API documentation.
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

// ── Register URL Error Codes (from Daraja troubleshooting docs) ───────────────

/**
 * Error codes returned by the C2B Register URL API.
 *
 * Note: Multiple error conditions share the code "500.003.1001" —
 * the `errorMessage` field in the response distinguishes them.
 *
 * Per Daraja documentation:
 * - 500.003.1001 → Internal Server Error / URLs already registered / Duplicate notification
 * - 400.003.01   → Invalid Access Token
 * - 400.003.02   → Bad Request (missing or malformed payload)
 * - 500.003.03   → Quota Violation (too many requests)
 * - 500.003.02   → Spike Arrest Violation (endpoint errors causing a traffic spike)
 * - 404.003.01   → Resource Not Found (wrong endpoint URL)
 * - 404.001.04   → Invalid Authenticator Header (used GET instead of POST)
 * - 400.002.05   → Invalid Request Payload (typo or schema mismatch)
 */
export const C2B_REGISTER_URL_ERROR_CODES = {
  /**
   * Internal server error — also returned when:
   * - URLs are already registered (re-register after portal deletion)
   * - Duplicate notification (URLs exist on aggregator platform)
   */
  INTERNAL_SERVER_ERROR: '500.003.1001',
  /** Invalid or expired access token. Regenerate and retry. */
  INVALID_ACCESS_TOKEN: '400.003.01',
  /** Bad request — server cannot process. Verify payload against docs. */
  BAD_REQUEST: '400.003.02',
  /** Quota violation — too many requests per second. */
  QUOTA_VIOLATION: '500.003.03',
  /** Spike arrest — endpoint errors causing a traffic spike. */
  SPIKE_ARREST: '500.003.02',
  /** Resource not found — verify you are calling the correct endpoint. */
  RESOURCE_NOT_FOUND: '404.003.01',
  /**
   * Invalid authenticator header.
   * All Daraja APIs use POST except Authorization (GET).
   */
  INVALID_AUTH_HEADER: '404.001.04',
  /** Invalid request payload — check for typos and schema mismatches. */
  INVALID_REQUEST_PAYLOAD: '400.002.05',
} as const

export type C2BRegisterUrlErrorCode =
  (typeof C2B_REGISTER_URL_ERROR_CODES)[keyof typeof C2B_REGISTER_URL_ERROR_CODES]

// ── Validation Result Codes (from Daraja C2B validation docs) ─────────────────

/**
 * Result codes your ValidationURL must return to M-PESA.
 *
 * Per Daraja documentation:
 *   ResultCode "0"        → Accept the payment
 *   ResultCode "C2B00011" → Reject: Invalid MSISDN
 *   ResultCode "C2B00012" → Reject: Invalid Account Number
 *   ResultCode "C2B00013" → Reject: Invalid Amount
 *   ResultCode "C2B00014" → Reject: Invalid KYC Details
 *   ResultCode "C2B00015" → Reject: Invalid Shortcode
 *   ResultCode "C2B00016" → Reject: Other Error
 */
export const C2B_VALIDATION_RESULT_CODES = {
  /** Accept the payment */
  ACCEPT: '0',
  /** Reject: Invalid MSISDN */
  INVALID_MSISDN: 'C2B00011',
  /** Reject: Invalid Account Number */
  INVALID_ACCOUNT_NUMBER: 'C2B00012',
  /** Reject: Invalid Amount */
  INVALID_AMOUNT: 'C2B00013',
  /** Reject: Invalid KYC Details */
  INVALID_KYC_DETAILS: 'C2B00014',
  /** Reject: Invalid Shortcode */
  INVALID_SHORTCODE: 'C2B00015',
  /** Reject: Other Error (catch-all rejection) */
  OTHER_ERROR: 'C2B00016',
} as const

// ── Register URL ──────────────────────────────────────────────────────────────

/**
 * Request body for C2B Register URL API.
 *
 * Daraja payload shape (v1):
 * {
 *   "ShortCode":        "601426",
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
   * Per docs: "The words Cancelled and Completed must be in Sentence case."
   */
  responseType: C2BResponseType

  /**
   * URL that receives the confirmation callback after payment completes.
   * Must be publicly accessible and internet-reachable.
   * Production requires HTTPS; Sandbox allows HTTP.
   */
  confirmationUrl: string

  /**
   * URL that receives the validation callback before payment completes.
   * Only called when external validation is enabled on the shortcode.
   * To enable external validation, email apisupport@safaricom.co.ke.
   */
  validationUrl: string

  /** API version to use — defaults to "v1" (documented endpoint) */
  apiVersion?: C2BApiVersion
}

/**
 * Response from C2B Register URL API.
 *
 * Daraja response shape:
 * {
 *   "OriginatorCoversationID": "7619-37765134-1",
 *   "ResponseCode":            "0",
 *   "ResponseDescription":     "success"
 * }
 *
 * Note: "OriginatorCoversationID" — Daraja spells "Conversation" as
 * "Coversation" in the actual API response. We preserve the typo to
 * match the real payload.
 */
export interface C2BRegisterUrlResponse {
  /** Global unique identifier for this request (note Daraja's spelling typo) */
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
 * Payload POSTed to your ValidationURL by M-PESA.
 *
 * Only received when external validation is enabled on the shortcode.
 * OrgAccountBalance is BLANK for validation requests.
 *
 * Sample from Daraja docs:
 * {
 *   "TransactionType": "Pay Bill",
 *   "TransID":         "RKTQDM7W6S",
 *   "TransTime":       "20191122063845",
 *   "TransAmount":     "10",
 *   "BusinessShortCode": "600638",
 *   "BillRefNumber":   "invoice008",
 *   "InvoiceNumber":   "",
 *   "OrgAccountBalance": "",
 *   "ThirdPartyTransID": "",
 *   "MSISDN":          "25470****149",
 *   "FirstName":       "John",
 *   "MiddleName":      "",
 *   "LastName":        "Doe"
 * }
 */
export interface C2BValidationPayload {
  /**
   * Transaction type as received from M-PESA.
   * Per docs: "Pay Bill" or "Buy Goods"
   * (NOT the CommandID strings "CustomerPayBillOnline" / "CustomerBuyGoodsOnline")
   */
  TransactionType: string
  /** Unique M-PESA transaction ID */
  TransID: string
  /** Transaction timestamp: YYYYMMDDHHmmss */
  TransTime: string
  /**
   * Amount the customer is paying.
   * Per docs: whole numbers only.
   */
  TransAmount: string
  /** Your shortcode (5–6 digits) */
  BusinessShortCode: string
  /** Account reference (Paybill only) — up to 20 alphanumeric chars */
  BillRefNumber: string
  /** Invoice number — usually empty */
  InvoiceNumber: string
  /**
   * Blank for validation requests per docs.
   * Contains new balance after payment for confirmation requests.
   */
  OrgAccountBalance: string
  /** Third-party transaction ID. Can echo back in your validation response. */
  ThirdPartyTransID: string
  /**
   * Masked mobile number of the customer.
   * Format example from docs: "25470****149"
   */
  MSISDN: string
  FirstName: string
  MiddleName: string
  LastName: string
}

// ── Validation Response (your server → M-PESA) ────────────────────────────────

/**
 * Result codes for validation response.
 *
 * Per Daraja documentation:
 *   "0"        → Accept the payment
 *   "C2B00011" → Invalid MSISDN
 *   "C2B00012" → Invalid Account Number
 *   "C2B00013" → Invalid Amount
 *   "C2B00014" → Invalid KYC Details
 *   "C2B00015" → Invalid Shortcode
 *   "C2B00016" → Other Error
 */
export type C2BValidationResultCode =
  | '0' // Accept
  | 'C2B00011' // Invalid MSISDN
  | 'C2B00012' // Invalid Account Number
  | 'C2B00013' // Invalid Amount
  | 'C2B00014' // Invalid KYC Details
  | 'C2B00015' // Invalid Shortcode
  | 'C2B00016' // Other Error

/**
 * Response your ValidationURL must return to M-PESA.
 *
 * To accept (per docs):
 *   { "ResultCode": "0",        "ResultDesc": "Accepted" }
 *
 * To reject (per docs):
 *   { "ResultCode": "C2B00011", "ResultDesc": "Rejected" }
 *
 * Per docs, you can also echo back ThirdPartyTransID.
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
 * Payload POSTed to your ConfirmationURL by M-PESA after payment completes.
 *
 * OrgAccountBalance contains the NEW balance after this payment.
 * This payload is only sent when the transaction completes successfully.
 *
 * Per docs process flow:
 * - External Validation ON: sent after validation succeeds
 * - External Validation OFF: sent automatically after every completed payment
 */
export interface C2BConfirmationPayload {
  /**
   * Transaction type as received from M-PESA.
   * Per docs: "Pay Bill" or "Buy Goods"
   */
  TransactionType: string
  /** Unique M-PESA transaction ID */
  TransID: string
  /** Transaction timestamp: YYYYMMDDHHmmss */
  TransTime: string
  /** Amount transacted — whole numbers only per docs */
  TransAmount: string
  /** Your shortcode (5–6 digits) */
  BusinessShortCode: string
  /** Account reference (Paybill only) */
  BillRefNumber: string
  /** Invoice number — usually empty */
  InvoiceNumber: string
  /**
   * New utility account balance after this payment.
   * Blank for validation requests; populated in confirmation.
   */
  OrgAccountBalance: string
  /** Third-party transaction ID (echoed from validation response if set) */
  ThirdPartyTransID: string
  /** Masked mobile number — e.g. "25470****149" */
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

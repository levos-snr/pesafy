/**
 * Customer to Business (C2B) types
 *
 * API Versions:
 *   v1: /mpesa/c2b/v1/registerurl  — callback MSISDN is SHA256-hashed
 *   v2: /mpesa/c2b/v2/registerurl  — callback MSISDN is masked (2547 ***** 126)
 *
 * Use v2 for new integrations (recommended by Safaricom).
 *
 * Ref: Customer To Business (C2B) — Daraja Developer Portal
 */

// ── API Version ───────────────────────────────────────────────────────────────

/** C2B API version. v2 is recommended; v1 sends SHA256-hashed MSISDN. */
export type C2BApiVersion = "v1" | "v2";

// ── Register URL ──────────────────────────────────────────────────────────────

/**
 * What M-PESA should do if your Validation URL is unreachable or times out.
 *   "Completed" — M-PESA automatically completes the transaction.
 *   "Cancelled" — M-PESA automatically cancels the transaction.
 *
 * NOTE: Must be exactly "Completed" or "Cancelled" (sentence case, no typos).
 * Daraja docs: "the words Cancelled/Completed must be in sentence case and well-spelled."
 */
export type C2BResponseType = "Completed" | "Cancelled";

export interface C2BRegisterUrlRequest {
  /**
   * Your M-PESA Paybill or Till shortcode.
   * Daraja field: ShortCode
   */
  shortCode: string;

  /**
   * Default action if the Validation URL is unreachable.
   * "Completed" | "Cancelled"
   * Daraja field: ResponseType
   */
  responseType: C2BResponseType;

  /**
   * URL that receives payment notification after successful payment.
   * Must be publicly accessible. HTTPS required in production.
   * Daraja field: ConfirmationURL
   */
  confirmationUrl: string;

  /**
   * URL that receives validation request before M-PESA processes the payment.
   * Only called if External Validation is enabled on your shortcode.
   * Contact apisupport@safaricom.co.ke to enable External Validation.
   * Daraja field: ValidationURL
   */
  validationUrl: string;

  /**
   * C2B API version to use.
   * v2 (default): callback MSISDN is masked — recommended for new integrations.
   * v1: callback MSISDN is SHA256-hashed.
   */
  apiVersion?: C2BApiVersion;
}

export interface C2BRegisterUrlResponse {
  /** Global unique identifier for this request */
  OriginatorCoversationID: string;
  /** "0" = success */
  ResponseCode: string;
  ResponseDescription: string;
}

// ── Simulate (Sandbox ONLY) ───────────────────────────────────────────────────

/**
 * C2B transaction type for simulation.
 *   "CustomerPayBillOnline" — Paybill payment (requires BillRefNumber)
 *   "CustomerBuyGoodsOnline" — Till/Buy Goods payment (BillRefNumber usually null)
 *
 * NOTE: Simulation is ONLY supported in Sandbox, NOT in production.
 */
export type C2BCommandID = "CustomerPayBillOnline" | "CustomerBuyGoodsOnline";

export interface C2BSimulateRequest {
  /**
   * Your M-PESA Paybill or Till shortcode.
   * Daraja field: ShortCode
   */
  shortCode: string | number;

  /**
   * Type of transaction to simulate.
   * Daraja field: CommandID
   */
  commandId: C2BCommandID;

  /**
   * Amount to transact. Only whole numbers are supported by M-PESA.
   * Daraja field: Amount
   */
  amount: number;

  /**
   * Phone number from which funds will be debited.
   * Use the test number from the Daraja simulator: 254708374149
   * Daraja field: Msisdn
   */
  msisdn: string | number;

  /**
   * Account reference (Paybill payments only).
   * For Buy Goods (till), this is usually null or empty.
   * Daraja field: BillRefNumber
   */
  billRefNumber?: string | null;

  /**
   * C2B API version — must match the version used when registering URLs.
   * Default: "v2"
   */
  apiVersion?: C2BApiVersion;
}

export interface C2BSimulateResponse {
  /** Global unique identifier for this request */
  OriginatorCoversationID: string;
  /** "0" = accepted */
  ResponseCode: string;
  ResponseDescription: string;
}

// ── Validation Callback (POST to your ValidationURL) ─────────────────────────

/**
 * Payload Safaricom POSTs to your ValidationURL.
 *
 * Only received if External Validation is enabled on your shortcode.
 * You must respond within ~8 seconds or M-PESA uses the ResponseType default.
 *
 * v1: MSISDN is SHA256-hashed
 * v2: MSISDN is masked (e.g. "2547 ***** 126")
 */
export interface C2BValidationPayload {
  /** "Pay Bill" or "Buy Goods" */
  TransactionType: string;
  /** Unique M-PESA transaction ID */
  TransID: string;
  /** YYYYMMDDHHMMSS */
  TransTime: string;
  /** Amount the customer is paying */
  TransAmount: string;
  /** Your shortcode */
  BusinessShortCode: string;
  /** Account reference (Paybill only) */
  BillRefNumber: string;
  /** Invoice number (usually empty) */
  InvoiceNumber: string;
  /**
   * Blank for validation requests.
   * Contains new balance after payment for confirmation requests.
   */
  OrgAccountBalance: string;
  /** Third-party transaction ID (optional, can echo back in response) */
  ThirdPartyTransID: string;
  /**
   * v1: SHA256-hashed MSISDN
   * v2: masked MSISDN e.g. "2547 ***** 126"
   */
  MSISDN: string;
  FirstName: string;
  MiddleName: string;
  LastName: string;
}

// ── Validation Response (your server → Safaricom) ────────────────────────────

/**
 * Result codes for C2B validation.
 *   "0"        — Accept the transaction
 *   "C2B00011" — Invalid MSISDN
 *   "C2B00012" — Invalid Account Number
 *   "C2B00013" — Invalid Amount
 *   "C2B00014" — Invalid KYC Details
 *   "C2B00015" — Invalid Short code
 *   "C2B00016" — Other Error
 */
export type C2BValidationResultCode =
  | "0"
  | "C2B00011"
  | "C2B00012"
  | "C2B00013"
  | "C2B00014"
  | "C2B00015"
  | "C2B00016";

export interface C2BValidationResponse {
  /**
   * "0" = Accept the transaction.
   * Any C2B error code = Reject.
   *
   * Typed as `C2BValidationResultCode` for known codes.
   * If you need to pass a custom/unknown code, cast to `string`.
   */
  ResultCode: C2BValidationResultCode;
  /**
   * "Accepted" when ResultCode is "0".
   * "Rejected" when ResultCode is a non-zero error code.
   */
  ResultDesc: "Accepted" | "Rejected";
  /**
   * Optional. If set, this value is echoed back in the Confirmation callback
   * as ThirdPartyTransID. Useful for correlating validation → confirmation.
   */
  ThirdPartyTransID?: string;
}

// ── Confirmation Callback (POST to your ConfirmationURL) ─────────────────────

/**
 * Payload Safaricom POSTs to your ConfirmationURL after a successful payment.
 *
 * Always respond with { ResultCode: 0, ResultDesc: "Success" }.
 * Daraja docs: always respond 200 to Safaricom.
 */
export interface C2BConfirmationPayload {
  TransactionType: string;
  TransID: string;
  TransTime: string;
  TransAmount: string;
  BusinessShortCode: string;
  BillRefNumber: string;
  InvoiceNumber: string;
  /** New balance after payment */
  OrgAccountBalance: string;
  ThirdPartyTransID: string;
  /**
   * v1: SHA256-hashed
   * v2: masked, e.g. "2547 ***** 126"
   */
  MSISDN: string;
  FirstName: string;
  MiddleName: string;
  LastName: string;
}

/** Acknowledgement your ConfirmationURL must return to Safaricom */
export interface C2BConfirmationAck {
  /** Always 0 */
  ResultCode: 0;
  /** Usually "Success" */
  ResultDesc: string;
}

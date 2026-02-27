/**
 * C2B (Customer to Business) types
 * API Reference: https://developer.safaricom.co.ke/APIs/CustomerToBusinessV2
 *
 * C2B v2 uses masked MSISDN (e.g. "2547 ***** 126").
 * C2B v1 used SHA-256 hashed MSISDN — do NOT use v1.
 */

// ─── Register URL ─────────────────────────────────────────────────────────────

/**
 * ResponseType controls what M-Pesa does if your Validation URL is unreachable.
 * "Completed" = auto-complete. "Cancelled" = auto-cancel.
 * Note: Must be sentence case exactly as shown.
 */
export type C2BResponseType = "Completed" | "Cancelled";

export interface C2BRegisterUrlRequest {
  /** Your Paybill or Till shortcode (5–6 digits). */
  shortCode: string;
  /**
   * What M-Pesa does if your Validation URL is unreachable.
   * Only relevant if External Validation is enabled on your shortcode.
   * Defaults to "Completed".
   */
  responseType?: C2BResponseType;
  /**
   * URL that receives payment confirmation after transaction completes.
   * Must be HTTPS in production. HTTP is allowed in sandbox.
   */
  confirmationUrl: string;
  /**
   * URL for payment validation before M-Pesa completes the transaction.
   * Only called if External Validation is enabled on your shortcode.
   * Optional — omit if validation is not required.
   */
  validationUrl?: string;
}

export interface C2BRegisterUrlResponse {
  /**
   * Global unique identifier for the request.
   * NOTE: Daraja has a typo in their field name ("Coversa" not "Conversa").
   * We mirror it exactly so JSON parsing works.
   */
  OriginatorCoversationID: string;
  ResponseCode: string;
  ResponseDescription: string;
}

// ─── Simulate (Sandbox Only) ─────────────────────────────────────────────────

/**
 * CommandID controls whether this is a Paybill or Buy Goods (Till) payment.
 * - "CustomerPayBillOnline" → Paybill (requires BillRefNumber / account number)
 * - "CustomerBuyGoodsOnline" → Till/Buy Goods (BillRefNumber is null)
 */
export type C2BCommandId = "CustomerPayBillOnline" | "CustomerBuyGoodsOnline";

export interface C2BSimulateRequest {
  /** Your Paybill or Till shortcode. */
  shortCode: string;
  /** Payment type. Paybill = "CustomerPayBillOnline", Till = "CustomerBuyGoodsOnline". */
  commandId: C2BCommandId;
  /** Amount to simulate (whole numbers only — Daraja rejects decimals). */
  amount: number;
  /** Phone number to debit in simulation. Use sandbox test numbers. */
  phoneNumber: string;
  /**
   * Account number / reference for Paybill payments.
   * Pass null or omit for Buy Goods (Till) transactions.
   */
  billRefNumber?: string | null;
}

export interface C2BSimulateResponse {
  /** @see C2BRegisterUrlResponse.OriginatorCoversationID (Daraja typo) */
  OriginatorCoversationID: string;
  ResponseCode: string;
  ResponseDescription: string;
}

// ─── Webhook Callback Payloads ───────────────────────────────────────────────

/**
 * C2B Confirmation/Validation callback body posted by Safaricom to your URLs.
 * C2B v2 returns a masked MSISDN: "2547 ***** 126"
 *
 * This type covers BOTH the confirmation and validation callbacks —
 * they share the same shape. The difference is:
 *   - Validation: OrgAccountBalance is blank; you must respond Accept/Reject.
 *   - Confirmation: OrgAccountBalance has the post-payment balance.
 */
export interface C2BCallbackPayload {
  /** "Pay Bill" or "Buy Goods" */
  TransactionType: string;
  /** Unique M-Pesa transaction ID (e.g. "RKL51ZDR4F") */
  TransID: string;
  /** Timestamp: "YYYYMMDDHHmmss" (e.g. "20231121121325") */
  TransTime: string;
  /** Amount as string decimal (e.g. "5.00") */
  TransAmount: string;
  /** Your Paybill or Till shortcode */
  BusinessShortCode: string;
  /**
   * Account reference / bill number entered by customer.
   * Applies to Paybill transactions. Empty string for Buy Goods.
   */
  BillRefNumber: string;
  /** Invoice number if applicable (usually empty string) */
  InvoiceNumber: string;
  /**
   * Post-payment balance of your Utility Account (confirmation only).
   * Empty string in validation requests.
   */
  OrgAccountBalance: string;
  /**
   * Opaque ID the partner can echo back in the validation response.
   * Safaricom sends it back in the confirmation if you returned it.
   */
  ThirdPartyTransID: string;
  /**
   * Masked phone number: "2547 ***** 126"
   * C2B v2 masks for privacy. C2B v1 used SHA-256 hash.
   */
  MSISDN: string;
  /** Customer first name (may be empty) */
  FirstName: string;
  /** Customer middle name (may be empty) */
  MiddleName: string;
  /** Customer last name (may be empty) */
  LastName: string;
}

/**
 * Your response to M-Pesa's Validation request.
 * You must reply within ~8 seconds or M-Pesa uses ResponseType default.
 */
export interface C2BValidationResponse {
  /**
   * "0" to accept the payment.
   * Any of the C2B rejection codes to reject (e.g. "C2B00011").
   */
  ResultCode: string;
  /** "Accepted" or "Rejected" */
  ResultDesc: string;
}

/**
 * Rejection codes for the Validation response.
 * Use these ResultCode values when rejecting a payment.
 */
export const C2B_REJECTION_CODES = {
  INVALID_MSISDN: "C2B00011",
  INVALID_ACCOUNT_NUMBER: "C2B00012",
  INVALID_AMOUNT: "C2B00013",
  INVALID_KYC_DETAILS: "C2B00014",
  INVALID_SHORT_CODE: "C2B00015",
  OTHER_ERROR: "C2B00016",
} as const;

export type C2BRejectionCode =
  (typeof C2B_REJECTION_CODES)[keyof typeof C2B_REJECTION_CODES];

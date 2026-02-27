/**
 * C2B (Customer to Business) types
 * API Reference: https://developer.safaricom.co.ke/APIs/CustomerToBusinessV2
 *
 * C2B v2 uses masked MSISDN (e.g. "2547 ***** 126").
 * C2B v1 used SHA-256 hashed MSISDN — do NOT use v1.
 */

// ─── Command IDs ─────────────────────────────────────────────────────────────

/**
 * The two valid C2B CommandID values:
 *  - CustomerPayBillOnline  → payment to a Paybill number
 *  - CustomerBuyGoodsOnline → payment to a Till number
 */
export type C2BCommandId = "CustomerPayBillOnline" | "CustomerBuyGoodsOnline";

/**
 * Default action when the ValidationURL is unreachable.
 * "Completed" → M-PESA auto-completes the transaction.
 * "Cancelled" → M-PESA auto-cancels the transaction.
 * Note: values are case-sensitive per Daraja docs.
 */
export type C2BResponseType = "Completed" | "Cancelled";

// ─── Register URL ─────────────────────────────────────────────────────────────

export interface C2BRegisterUrlRequest {
  /** Paybill or Till short code */
  shortCode: string;
  /** URL that receives payment confirmation after a successful transaction */
  confirmationUrl: string;
  /** URL that receives validation requests (only when external validation is enabled) */
  validationUrl: string;
  responseType?: C2BResponseType;
}

// ─── C2B Simulate (sandbox only) ─────────────────────────────────────────────

export interface C2BSimulateRequest {
  /** Paybill or Till short code */
  shortCode: string;
  /**
   * Transaction type.
   * "CustomerPayBillOnline"  → payment to a Paybill number (default)
   * "CustomerBuyGoodsOnline" → payment to a Till number
   */
  commandId?: C2BCommandId;
  /** Transaction amount (whole number, min 1 KES) */
  amount: number;
  /** Customer's phone number — any valid Kenyan MSISDN */
  phoneNumber: string;
  /**
   * Account reference for Paybill payments.
   * Must be null / omitted for CustomerBuyGoodsOnline.
   */
  billRefNumber?: string;
}

// ─── C2B Callback payload types ───────────────────────────────────────────────
// Safaricom POSTs these to your ConfirmationURL / ValidationURL after payment.
// v2 returns a masked MSISDN (e.g. "2547 ***** 126").

/**
 * Shared fields present in both Validation and Confirmation callback payloads.
 */
export interface C2BCallbackPayloadBase {
  TransactionType: string;
  /** Unique M-PESA transaction ID (e.g. "RKL51ZDR4F") */
  TransID: string;
  /** 14-digit timestamp: YYYYMMDDHHmmss */
  TransTime: string;
  /** Transaction amount as a string (e.g. "5.00") */
  TransAmount: string;
  BusinessShortCode: string;
  /** Account reference; empty for Till transactions */
  BillRefNumber: string;
  InvoiceNumber: string;
  OrgAccountBalance: string;
  ThirdPartyTransID: string;
  /** v2: masked MSISDN e.g. "2547 ***** 126" */
  MSISDN: string;
  FirstName: string;
  MiddleName: string;
  LastName: string;
}

/** Payload posted to your ValidationURL (if external validation is enabled) */
export type C2BValidationPayload = C2BCallbackPayloadBase;

/** Payload posted to your ConfirmationURL after successful payment */
export type C2BConfirmationPayload = C2BCallbackPayloadBase;

/**
 * Union of both C2B callback types.
 * Use the discriminated `TransactionType` field if you need to distinguish them,
 * or register separate Express routes for each URL.
 */
export type C2BCallbackPayload = C2BValidationPayload | C2BConfirmationPayload;

// ─── Validation response codes ────────────────────────────────────────────────

/**
 * Codes your ValidationURL must return to Safaricom to accept or reject
 * a payment before it is processed.
 */
export const C2B_REJECTION_CODES = {
  /** Accept the transaction — M-PESA proceeds to process and confirm */
  ACCEPT: "0",
  /** Reject the transaction — M-PESA cancels and notifies the customer */
  REJECT: "1",
} as const;

export type C2BRejectionCode =
  (typeof C2B_REJECTION_CODES)[keyof typeof C2B_REJECTION_CODES];

/**
 * C2B (Customer to Business) types
 * Spec: https://developer.safaricom.co.ke/APIs/CustomerToBusinessRegisterURL
 */

// ─── Command IDs ─────────────────────────────────────────────────────────────

/**
 * The two valid C2B CommandID values:
 *  - CustomerPayBillOnline  → payment to a Paybill number
 *  - CustomerBuyGoodsOnline → payment to a Till number
 */
export type C2BCommandId = "CustomerPayBillOnline" | "CustomerBuyGoodsOnline";

// ─── Register URL ─────────────────────────────────────────────────────────────

export interface C2BRegisterUrlRequest {
  /** Paybill or Till short code */
  shortCode: string;
  /** URL that receives payment confirmation after a successful transaction */
  confirmationUrl: string;
  /** URL that receives validation requests (only when external validation is enabled) */
  validationUrl: string;
  /**
   * Default action when the validation URL is unreachable.
   * "Completed" → M-PESA auto-completes the transaction.
   * "Cancelled" → M-PESA auto-cancels the transaction.
   * Note: the value is case-sensitive ("Completed" / "Cancelled").
   */
  responseType?: "Completed" | "Cancelled";
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

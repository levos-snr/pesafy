/**
 * STK Push (M-Pesa Express) types
 *
 * API: POST /mpesa/stkpush/v1/processrequest
 * Query: POST /mpesa/stkpushquery/v1/query
 *
 * Ref: M-Pesa Express Simulate docs + Discover APIs M-Pesa Express Query docs
 */

// ── Transaction type ─────────────────────────────────────────────────────────

/**
 * CustomerPayBillOnline  → Paybill numbers  (PartyB = shortcode)
 * CustomerBuyGoodsOnline → Till numbers     (PartyB = till number)
 */
export type TransactionType =
  | "CustomerPayBillOnline"
  | "CustomerBuyGoodsOnline";

// ── STK Push request ─────────────────────────────────────────────────────────

export interface StkPushRequest {
  /** Transaction amount (minimum KES 1, must round to a whole number ≥ 1) */
  amount: number;

  /**
   * Phone number sending the money. Format: 2547XXXXXXXX.
   * Must be a valid Safaricom M-PESA number.
   * Daraja docs field name: PartyA / PhoneNumber
   */
  phoneNumber: string;

  /**
   * URL where Safaricom will POST the callback result.
   * Must be publicly accessible (use ngrok/localtunnel for local dev).
   * Daraja docs field name: CallBackURL
   */
  callbackUrl: string;

  /**
   * Alpha-numeric reference shown to customer in the USSD prompt.
   * Max 12 characters.
   * Daraja docs field name: AccountReference
   */
  accountReference: string;

  /**
   * Additional description for the transaction.
   * Max 13 characters.
   * Daraja docs field name: TransactionDesc
   */
  transactionDesc: string;

  /**
   * Business shortcode — Paybill number or HO/Store number for Till.
   * Daraja docs field name: BusinessShortCode
   */
  shortCode: string;

  /**
   * Passkey used to generate the Password.
   * Sandbox value: from Daraja simulator test data.
   * Production value: emailed after Go Live.
   */
  passKey: string;

  /**
   * "CustomerPayBillOnline" (default) for Paybill.
   * "CustomerBuyGoodsOnline" for Till Numbers.
   */
  transactionType?: TransactionType;

  /**
   * Credit party receiving funds.
   * - CustomerPayBillOnline: defaults to shortCode
   * - CustomerBuyGoodsOnline: set to the Till Number
   * Daraja docs field name: PartyB
   */
  partyB?: string;
}

// ── STK Push response ────────────────────────────────────────────────────────

export interface StkPushResponse {
  /** Global unique identifier for the submitted payment request */
  MerchantRequestID: string;
  /** Global unique identifier for the checkout transaction */
  CheckoutRequestID: string;
  /** "0" = successful submission */
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

// ── STK Query request/response ───────────────────────────────────────────────

export interface StkQueryRequest {
  /** CheckoutRequestID from the STK Push response */
  checkoutRequestId: string;
  shortCode: string;
  passKey: string;
}

export interface StkQueryResponse {
  ResponseCode: string;
  ResponseDescription: string;
  MerchantRequestID: string;
  CheckoutRequestID: string;
  /**
   * Daraja returns ResultCode as a NUMBER.
   * 0    = success
   * 1    = insufficient balance
   * 1032 = cancelled by user
   * 1037 = timeout / unreachable
   * 2001 = wrong PIN
   */
  ResultCode: number;
  ResultDesc: string;
}

// ── Callback payload types ────────────────────────────────────────────────────
// Safaricom POSTs these to your CallBackURL after the customer responds.

/** Single metadata item in a successful STK callback */
export interface StkCallbackMetadataItem {
  Name:
    | "Amount"
    | "MpesaReceiptNumber"
    | "TransactionDate"
    | "PhoneNumber"
    | "Balance";
  /** Present on successful transactions; absent on failure */
  Value?: number | string;
}

/** Inner callback for a SUCCESSFUL STK Push (ResultCode === 0) */
export interface StkCallbackSuccess {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResultCode: 0;
  ResultDesc: string;
  CallbackMetadata: {
    Item: StkCallbackMetadataItem[];
  };
}

/** Inner callback for a FAILED / CANCELLED STK Push (ResultCode !== 0) */
export interface StkCallbackFailure {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  /** e.g. 1032 = cancelled by user, 1037 = timeout */
  ResultCode: number;
  ResultDesc: string;
  CallbackMetadata?: never;
}

export type StkCallbackInner = StkCallbackSuccess | StkCallbackFailure;

/** Full wrapper Safaricom POSTs to your CallBackURL */
export interface StkPushCallback {
  Body: {
    stkCallback: StkCallbackInner;
  };
}

// ── Type guards & helpers ─────────────────────────────────────────────────────

/**
 * Narrows StkCallbackInner to the success shape.
 *
 * @example
 * if (isStkCallbackSuccess(callback.Body.stkCallback)) {
 *   const receipt = getCallbackValue(callback, "MpesaReceiptNumber");
 * }
 */
export function isStkCallbackSuccess(
  cb: StkCallbackInner
): cb is StkCallbackSuccess {
  return cb.ResultCode === 0;
}

/**
 * Extracts a named value from a successful callback's metadata.
 * Returns undefined if the key is absent or the transaction failed.
 */
export function getCallbackValue(
  callback: StkPushCallback,
  name: StkCallbackMetadataItem["Name"]
): string | number | undefined {
  const inner = callback.Body.stkCallback;
  if (!isStkCallbackSuccess(inner)) return undefined;
  return inner.CallbackMetadata.Item.find((i) => i.Name === name)?.Value;
}

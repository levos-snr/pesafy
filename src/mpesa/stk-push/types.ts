/** STK Push (M-Pesa Express) types */

export type TransactionType =
  | "CustomerPayBillOnline"
  | "CustomerBuyGoodsOnline";

export interface StkPushRequest {
  amount: number;
  phoneNumber: string;
  callbackUrl: string;
  accountReference: string;
  transactionDesc: string;
  /** Business shortcode - Paybill or HO/store number for Till */
  shortCode: string;
  passKey: string;
  transactionType?: TransactionType;
  /**
   * The credit party receiving funds.
   * - CustomerPayBillOnline: omit (defaults to shortCode)
   * - CustomerBuyGoodsOnline: provide the Till Number
   * Docs: PartyB must be the Till Number when using Buy Goods.
   */
  partyB?: string;
}

export interface StkPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

export interface StkQueryRequest {
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
   * Daraja returns ResultCode as a NUMBER, not a string.
   * 0       = success
   * 1032    = cancelled by user
   * 1037    = timeout (customer did not respond)
   * 2001    = wrong PIN
   * etc.
   * Always compare with === 0, not === "0".
   */
  ResultCode: number;
  ResultDesc: string;
}

// ---------------------------------------------------------------------------
// Callback payload types — Safaricom POSTs these to your CallBackURL
// ---------------------------------------------------------------------------

/** A single metadata item in a successful STK callback */
export interface StkCallbackMetadataItem {
  Name: "Amount" | "MpesaReceiptNumber" | "TransactionDate" | "PhoneNumber";
  /** Present on successful transactions; absent on failure */
  Value?: number | string;
}

/** Inner callback object for a SUCCESSFUL STK Push */
export interface StkCallbackSuccess {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  /** 0 = success */
  ResultCode: 0;
  ResultDesc: string;
  CallbackMetadata: {
    Item: StkCallbackMetadataItem[];
  };
}

/** Inner callback object for a FAILED/CANCELLED STK Push */
export interface StkCallbackFailure {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  /** Non-zero result codes: e.g. 1032 = cancelled by user */
  ResultCode: number;
  ResultDesc: string;
  CallbackMetadata?: never;
}

export type StkCallbackInner = StkCallbackSuccess | StkCallbackFailure;

/** Full wrapper that Safaricom POSTs to your CallBackURL */
export interface StkPushCallback {
  Body: {
    stkCallback: StkCallbackInner;
  };
}

/**
 * Type guard — narrows an StkCallbackInner to the success shape.
 * Usage:
 *   if (isStkCallbackSuccess(callback.Body.stkCallback)) {
 *     const receipt = getCallbackValue(callback, "MpesaReceiptNumber");
 *   }
 */
export function isStkCallbackSuccess(
  cb: StkCallbackInner
): cb is StkCallbackSuccess {
  return cb.ResultCode === 0;
}

/**
 * Extracts a named value from a successful callback's metadata items.
 * Returns undefined if the key is absent or the callback failed.
 */
export function getCallbackValue(
  callback: StkPushCallback,
  name: StkCallbackMetadataItem["Name"]
): string | number | undefined {
  const inner = callback.Body.stkCallback;
  if (!isStkCallbackSuccess(inner)) return undefined;
  return inner.CallbackMetadata.Item.find((i) => i.Name === name)?.Value;
}

/**
 * src/mpesa/stk-push/types.ts
 *
 * Types, constants, and helpers for the M-PESA STK Push (M-PESA Express) API.
 *
 * Daraja docs:
 *   STK Push  → POST /mpesa/stkpush/v1/processrequest
 *   STK Query → POST /mpesa/stkpushquery/v1/query
 */

// ── Transaction type ──────────────────────────────────────────────────────────

export type TransactionType = 'CustomerPayBillOnline' | 'CustomerBuyGoodsOnline'

// ── Transaction limits (from Daraja docs) ─────────────────────────────────────

/**
 * M-PESA transaction limits as documented by Safaricom Daraja.
 *
 * | Limit            | Value      |
 * |------------------|-----------|
 * | Min per tx       | KES 1     |
 * | Max per tx       | KES 250 000|
 * | Max daily        | KES 500 000|
 * | Max balance      | KES 500 000|
 */
export const STK_PUSH_LIMITS = {
  MIN_AMOUNT: 1,
  MAX_AMOUNT: 250_000,
} as const

// ── Result codes (from Daraja docs) ──────────────────────────────────────────

/**
 * All documented STK Push / Query result codes.
 *
 * These codes appear in:
 *   - STK Query response  → `ResultCode` field
 *   - STK Callback body   → `Body.stkCallback.ResultCode`
 *
 * | Code | Meaning                  |
 * |------|--------------------------|
 * |    0 | Transaction successful   |
 * |    1 | Insufficient balance     |
 * | 1032 | Cancelled by user        |
 * | 1037 | Phone unreachable        |
 * | 2001 | Invalid PIN              |
 */
export const STK_RESULT_CODES = {
  SUCCESS: 0,
  INSUFFICIENT_BALANCE: 1,
  CANCELLED_BY_USER: 1032,
  PHONE_UNREACHABLE: 1037,
  INVALID_PIN: 2001,
} as const satisfies Record<string, number>

/** Union of all documented STK result code values */
export type StkResultCode = (typeof STK_RESULT_CODES)[keyof typeof STK_RESULT_CODES]

/**
 * Returns true when `code` is one of the documented STK result codes.
 * Useful for narrowing unknown values from the Daraja response.
 */
export function isKnownStkResultCode(code: number): code is StkResultCode {
  return Object.values(STK_RESULT_CODES).includes(code as StkResultCode)
}

// ── STK Push request ─────────────────────────────────────────────────────────

export interface StkPushRequest {
  /**
   * Transaction amount in KES.
   * Min: {@link STK_PUSH_LIMITS.MIN_AMOUNT} (KES 1)
   * Max: {@link STK_PUSH_LIMITS.MAX_AMOUNT} (KES 250 000)
   * Must round to a whole number ≥ 1.
   * Daraja field: `Amount`
   */
  amount: number

  /**
   * Phone number sending the money. Format: 2547XXXXXXXX.
   * Must be a valid Safaricom M-PESA number.
   * Daraja fields: `PartyA`, `PhoneNumber`
   */
  phoneNumber: string

  /**
   * URL where Safaricom will POST the callback result.
   * Must be publicly accessible (use ngrok/localtunnel for local dev).
   * Daraja field: `CallBackURL`
   */
  callbackUrl: string

  /**
   * Alpha-numeric reference shown to customer in the USSD prompt.
   * Truncated to max 12 characters before sending.
   * Daraja field: `AccountReference`
   */
  accountReference: string

  /**
   * Additional description for the transaction.
   * Truncated to max 13 characters before sending.
   * Daraja field: `TransactionDesc`
   */
  transactionDesc: string

  /**
   * Business shortcode — Paybill number or HO/Store number for Till.
   * Daraja field: `BusinessShortCode`
   */
  shortCode: string

  /**
   * Passkey used to generate the Password.
   * Sandbox: from Daraja simulator test data.
   * Production: emailed after Go Live.
   */
  passKey: string

  /**
   * "CustomerPayBillOnline" (default) for Paybill.
   * "CustomerBuyGoodsOnline" for Till Numbers.
   * Daraja field: `TransactionType`
   */
  transactionType?: TransactionType

  /**
   * Credit party receiving funds.
   * - CustomerPayBillOnline → defaults to `shortCode`
   * - CustomerBuyGoodsOnline → set to the Till Number
   * Daraja field: `PartyB`
   */
  partyB?: string
}

// ── STK Push response ────────────────────────────────────────────────────────

/**
 * Synchronous acknowledgement returned immediately after STK Push submission.
 * This is NOT the payment result — the result arrives via callback.
 *
 * Daraja endpoint: POST /mpesa/stkpush/v1/processrequest
 */
export interface StkPushResponse {
  /** Global unique identifier for the submitted payment request */
  MerchantRequestID: string
  /** Global unique identifier for the checkout transaction — use this for STK Query */
  CheckoutRequestID: string
  /**
   * "0" = request accepted successfully.
   * Any other value = submission error.
   */
  ResponseCode: string
  /** Human-readable submission status */
  ResponseDescription: string
  /** Message shown to customer on their device */
  CustomerMessage: string
}

// ── STK Query request / response ─────────────────────────────────────────────

/**
 * Parameters for querying the status of a previously initiated STK Push.
 *
 * Daraja endpoint: POST /mpesa/stkpushquery/v1/query
 */
export interface StkQueryRequest {
  /** `CheckoutRequestID` from the STK Push response */
  checkoutRequestId: string
  shortCode: string
  passKey: string
}

/**
 * Response from the STK Query API.
 *
 * Note: `ResultCode` is documented as "Numeric" by Daraja.
 * The Daraja JSON example shows it as a string (`"ResultCode": "0"`),
 * but actual API responses return a number. Typed as `number` here.
 * Use {@link STK_RESULT_CODES} constants for comparisons.
 */
export interface StkQueryResponse {
  /** "0" = request accepted. Not the final payment status. */
  ResponseCode: string
  /** Submission status message */
  ResponseDescription: string
  /** Unique identifier for the merchant request */
  MerchantRequestID: string
  /** Unique identifier for the checkout transaction */
  CheckoutRequestID: string
  /**
   * Payment processing status code.
   * See {@link STK_RESULT_CODES} for all documented values:
   *   0    → success
   *   1    → insufficient balance
   *   1032 → cancelled by user
   *   1037 → phone unreachable
   *   2001 → wrong PIN
   */
  ResultCode: number
  /** Human-readable description of the result */
  ResultDesc: string
}

// ── Callback payload types ────────────────────────────────────────────────────

/**
 * Single metadata item in a successful STK callback.
 * Daraja always sends these 4 items on success; `Balance` may appear on some accounts.
 */
export interface StkCallbackMetadataItem {
  Name: 'Amount' | 'MpesaReceiptNumber' | 'TransactionDate' | 'PhoneNumber' | 'Balance'
  /**
   * Present on successful transactions; absent on failure.
   * `TransactionDate` and `PhoneNumber` come back as numbers from Daraja.
   */
  Value?: number | string
}

/** Inner callback for a SUCCESSFUL STK Push — `ResultCode === 0` */
export interface StkCallbackSuccess {
  MerchantRequestID: string
  CheckoutRequestID: string
  ResultCode: typeof STK_RESULT_CODES.SUCCESS
  ResultDesc: string
  CallbackMetadata: {
    Item: StkCallbackMetadataItem[]
  }
}

/**
 * Inner callback for a FAILED or CANCELLED STK Push.
 * `ResultCode` is one of 1, 1032, 1037, 2001 (or another undocumented code).
 */
export interface StkCallbackFailure {
  MerchantRequestID: string
  CheckoutRequestID: string
  /** e.g. 1032 = cancelled by user, 1037 = timeout */
  ResultCode: number
  ResultDesc: string
  CallbackMetadata?: never
}

export type StkCallbackInner = StkCallbackSuccess | StkCallbackFailure

/**
 * Full wrapper Safaricom POSTs to your `CallBackURL`.
 *
 * Successful example:
 * ```json
 * {
 *   "Body": {
 *     "stkCallback": {
 *       "MerchantRequestID": "29115",
 *       "CheckoutRequestID": "ws_CO_191220",
 *       "ResultCode": 0,
 *       "ResultDesc": "Success",
 *       "CallbackMetadata": {
 *         "Item": [
 *           { "Name": "Amount",             "Value": 1.00            },
 *           { "Name": "MpesaReceiptNumber", "Value": "NLJ7RT61SV"   },
 *           { "Name": "TransactionDate",    "Value": 20191219102115  },
 *           { "Name": "PhoneNumber",        "Value": 254708374149    }
 *         ]
 *       }
 *     }
 *   }
 * }
 * ```
 */
export interface StkPushCallback {
  Body: {
    stkCallback: StkCallbackInner
  }
}

// ── Type guards & helpers ─────────────────────────────────────────────────────

/**
 * Narrows `StkCallbackInner` to the success shape.
 * A callback is successful when `ResultCode === 0`.
 *
 * @example
 * if (isStkCallbackSuccess(callback.Body.stkCallback)) {
 *   const receipt = getCallbackValue(callback, 'MpesaReceiptNumber')
 * }
 */
export function isStkCallbackSuccess(cb: StkCallbackInner): cb is StkCallbackSuccess {
  return cb.ResultCode === STK_RESULT_CODES.SUCCESS
}

/**
 * Extracts a named value from a successful callback's metadata.
 * Returns `undefined` if the key is absent or the transaction failed.
 *
 * @example
 * const receipt = getCallbackValue(callback, 'MpesaReceiptNumber') // "NLJ7RT61SV"
 * const amount  = getCallbackValue(callback, 'Amount')              // 1
 * const phone   = getCallbackValue(callback, 'PhoneNumber')         // 254708374149
 * const date    = getCallbackValue(callback, 'TransactionDate')     // 20191219102115
 */
export function getCallbackValue(
  callback: StkPushCallback,
  name: StkCallbackMetadataItem['Name'],
): string | number | undefined {
  const inner = callback.Body.stkCallback
  if (!isStkCallbackSuccess(inner)) return undefined
  return inner.CallbackMetadata.Item.find((i) => i.Name === name)?.Value
}

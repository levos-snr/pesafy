/**
 * src/mpesa/b2b-pay-bill/types.ts
 *
 * Strictly aligned with Safaricom Daraja Business Pay Bill API documentation.
 * Endpoint: POST /mpesa/b2b/v1/paymentrequest
 * CommandID: "BusinessPayBill"
 *
 * Moves money from your MMF/Working account to a recipient's utility account.
 * SenderIdentifierType and RecieverIdentifierType are always "4" per docs.
 */

// ── Command ID ────────────────────────────────────────────────────────────────

/**
 * The only CommandID supported by the Business Pay Bill API.
 * Docs: "For this API use Business PayBill only"
 */
export type B2BPayBillCommandID = 'BusinessPayBill'

// ── Request ───────────────────────────────────────────────────────────────────

/**
 * Request payload for Business Pay Bill.
 *
 * Daraja payload shape:
 * {
 *   "Initiator":             "API Username",
 *   "SecurityCredential":    "FKX1/KPzT8hFO...",
 *   "CommandID":             "BusinessPayBill",
 *   "SenderIdentifierType":  "4",
 *   "RecieverIdentifierType":"4",
 *   "Amount":                "239",
 *   "PartyA":                "123456",
 *   "PartyB":                "000000",
 *   "AccountReference":      "353353",
 *   "Requester":             "254700000000",
 *   "Remarks":               "OK",
 *   "QueueTimeOutURL":       "https://...",
 *   "ResultURL":             "https://...",
 *   "Occassion":             ""
 * }
 */
export interface B2BPayBillRequest {
  /**
   * Transaction type. Must be "BusinessPayBill".
   * Daraja field: CommandID
   */
  commandId: B2BPayBillCommandID

  /**
   * Transaction amount in KES. Must be a whole number ≥ 1.
   * Daraja field: Amount (sent as string per API spec)
   */
  amount: number

  /**
   * Your shortcode from which money will be deducted.
   * SenderIdentifierType is always "4" (Organisation ShortCode) per docs.
   * Daraja field: PartyA
   */
  partyA: string

  /**
   * The shortcode to which money will be moved (Paybill number).
   * RecieverIdentifierType is always "4" (Organisation ShortCode) per docs.
   * Daraja field: PartyB
   */
  partyB: string

  /**
   * The account number associated with the payment (up to 13 characters).
   * Daraja field: AccountReference
   */
  accountReference: string

  /**
   * Optional. The consumer's mobile number on whose behalf you are paying.
   * Format: 254XXXXXXXXX
   * Daraja field: Requester
   */
  requester?: string

  /**
   * Any additional information for the transaction.
   * Daraja field: Remarks
   */
  remarks?: string

  /**
   * URL Safaricom calls with the final async result after processing.
   * Must be publicly accessible. HTTPS required in production.
   * Daraja field: ResultURL
   */
  resultUrl: string

  /**
   * URL Safaricom calls when the request times out in the queue.
   * Must be publicly accessible. HTTPS required in production.
   * Daraja field: QueueTimeOutURL
   */
  queueTimeOutUrl: string

  /**
   * Optional additional information for the transaction.
   * Daraja field: Occassion (sic — preserved Daraja typo)
   */
  occasion?: string
}

// ── Synchronous acknowledgement response ──────────────────────────────────────

/**
 * Synchronous acknowledgement returned immediately by Daraja.
 *
 * Daraja response shape:
 * {
 *   "OriginatorConversationID": "5118-111210482-1",
 *   "ConversationID":           "AG_20230420_2010759fd5662ef6d054",
 *   "ResponseCode":             "0",
 *   "Response Description":     "Accept the service request successfully"
 * }
 *
 * Note: Daraja uses "Response Description" (with a space) in their docs.
 * We map this to ResponseDescription for consistency.
 */
export interface B2BPayBillResponse {
  /** Unique request identifier assigned by Daraja upon successful submission */
  OriginatorConversationID: string
  /** Unique request identifier assigned by M-Pesa */
  ConversationID: string
  /** "0" indicates the request was accepted for processing */
  ResponseCode: string
  /** Human-readable submission status description */
  ResponseDescription: string
}

// ── Async result callback (POSTed to your ResultURL) ─────────────────────────

/**
 * Documented result parameter keys for Business Pay Bill transactions.
 * Source: Safaricom Daraja Business Pay Bill — Successful Result Parameters.
 */
export type B2BPayBillResultParameterKey =
  | 'Amount'
  | 'TransCompletedTime'
  | 'ReceiverPartyPublicName'
  | 'DebitPartyCharges'
  | 'Currency'
  | 'DebitPartyAffectedAccountBalance'
  | 'DebitAccountCurrentBalance'
  | 'InitiatorAccountCurrentBalance'
  | 'BOCompletedTime'
  | (string & {})

export interface B2BPayBillResultParameter {
  Key: B2BPayBillResultParameterKey
  Value: string | number
}

export interface B2BPayBillReferenceItem {
  Key: string
  Value?: string
}

/**
 * Full async result payload POSTed to your ResultURL by Safaricom.
 *
 * Success shape (condensed):
 * {
 *   "Result": {
 *     "ResultType":  "0",
 *     "ResultCode":  "0",
 *     "ResultDesc":  "The service request is processed successfully",
 *     "OriginatorConversationID": "...",
 *     "ConversationID":           "...",
 *     "TransactionID":            "QKA81LK5CY",
 *     "ResultParameters": {
 *       "ResultParameter": [
 *         { "Key": "Amount",            "Value": "190.00" },
 *         { "Key": "TransCompletedTime","Value": "20221110110717" }
 *       ]
 *     },
 *     "ReferenceData": {
 *       "ReferenceItem": [
 *         { "Key": "BillReferenceNumber", "Value": "19008" }
 *       ]
 *     }
 *   }
 * }
 *
 * Failure: ResultCode is non-zero (e.g. 2001); ResultParameters may still be present.
 */
export interface B2BPayBillResult {
  Result: {
    /**
     * Usually "0". Docs show string "0" on success, number on failure.
     * Typed as both for safety.
     */
    ResultType: string | number

    /**
     * "0" or 0 = success; non-zero = failure.
     * Docs show string "0" on success, number 2001 on failure.
     */
    ResultCode: string | number

    /** Human-readable result description */
    ResultDesc: string

    OriginatorConversationID: string
    ConversationID: string

    /**
     * Unique M-PESA transaction/receipt ID.
     * A generic value (e.g. "OAK0000000") is passed for certain failure scenarios.
     */
    TransactionID: string

    ResultParameters?: {
      ResultParameter: B2BPayBillResultParameter | B2BPayBillResultParameter[]
    }

    ReferenceData?: {
      ReferenceItem: B2BPayBillReferenceItem | B2BPayBillReferenceItem[]
    }
  }
}

// ── Result codes (documented by Daraja) ──────────────────────────────────────

/**
 * Known Business Pay Bill result codes documented by Safaricom Daraja.
 */
export const B2B_PAY_BILL_RESULT_CODES = {
  /** Transaction processed successfully */
  SUCCESS: 0,
  /** Insufficient funds in the account */
  INSUFFICIENT_FUNDS: 1,
  /** Less than minimum transaction value */
  AMOUNT_TOO_SMALL: 2,
  /** More than maximum transaction value */
  AMOUNT_TOO_LARGE: 3,
  /** Would exceed daily limit */
  DAILY_LIMIT_EXCEEDED: 4,
  /** Would exceed maximum balance */
  MAX_BALANCE_EXCEEDED: 8,
  /** Initiator information is invalid */
  INVALID_INITIATOR_INFO: 2001,
  /** Account is in inactive state */
  ACCOUNT_INACTIVE: 2006,
  /** Initiator has no permission for this transaction */
  PRODUCT_NOT_PERMITTED: 2028,
  /** Receiver is not a registered M-PESA customer */
  CUSTOMER_NOT_REGISTERED: 2040,
} as const

export type B2BPayBillResultCode =
  (typeof B2B_PAY_BILL_RESULT_CODES)[keyof typeof B2B_PAY_BILL_RESULT_CODES]

// ── Error response (synchronous, on bad request) ──────────────────────────────

/**
 * Documented Daraja error codes for the Business Pay Bill API.
 */
export const B2B_PAY_BILL_ERROR_CODES = {
  /** Invalid or expired access token */
  INVALID_ACCESS_TOKEN: '400.003.01',
  /** Bad request — missing or malformed data */
  BAD_REQUEST: '400.003.02',
  /** Internal server error */
  INTERNAL_SERVER_ERROR: '500.003.1001',
  /** Quota violation — too many requests */
  QUOTA_VIOLATION: '500.003.03',
  /** Spike arrest violation */
  SPIKE_ARREST: '500.003.02',
  /** Resource not found — wrong endpoint */
  NOT_FOUND: '404.003.01',
  /** Invalid authentication header */
  INVALID_AUTH_HEADER: '404.001.04',
  /** Invalid request payload */
  INVALID_PAYLOAD: '400.002.05',
} as const

export type B2BPayBillErrorCode =
  (typeof B2B_PAY_BILL_ERROR_CODES)[keyof typeof B2B_PAY_BILL_ERROR_CODES]

export interface B2BPayBillErrorResponse {
  /** Unique request ID assigned by the API gateway */
  requestId: string
  /** Daraja error code, e.g. "404.001.04" */
  errorCode: string
  /** Human-readable error message */
  errorMessage: string
}

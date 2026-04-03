/**
 * src/mpesa/b2b-buy-goods/types.ts
 *
 * Strictly aligned with Safaricom Daraja Business Buy Goods API documentation.
 * Endpoint: POST /mpesa/b2b/v1/paymentrequest
 * CommandID: "BusinessBuyGoods"
 *
 * Moves money from your MMF/Working account to the recipient's merchant account
 * (till number, merchant store number, or Merchant HO).
 * SenderIdentifierType and RecieverIdentifierType are always "4" per docs.
 */

// ── Command ID ────────────────────────────────────────────────────────────────

/**
 * The only CommandID supported by the Business Buy Goods API.
 * Docs: "For this API use BusinessBuyGoods only"
 */
export type B2BBuyGoodsCommandID = 'BusinessBuyGoods'

// ── Request ───────────────────────────────────────────────────────────────────

/**
 * Request payload for Business Buy Goods.
 *
 * Daraja payload shape:
 * {
 *   "Initiator":              "API_Username",
 *   "SecurityCredential":     "FKX1/KPzT8hFO...",
 *   "CommandID":              "BusinessBuyGoods",
 *   "SenderIdentifierType":   "4",
 *   "RecieverIdentifierType": "4",
 *   "Amount":                 "239",
 *   "PartyA":                 "123456",
 *   "PartyB":                 "000000",
 *   "AccountReference":       "353353",
 *   "Requester":              "254700000000",
 *   "Remarks":                "OK",
 *   "QueueTimeOutURL":        "https://...",
 *   "ResultURL":              "https://...",
 *   "Occassion":              ""
 * }
 */
export interface B2BBuyGoodsRequest {
  /**
   * Transaction type. Must be "BusinessBuyGoods".
   * Daraja field: CommandID
   */
  commandId: B2BBuyGoodsCommandID

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
   * The till number / merchant store number / Merchant HO to which money is moved.
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
 *   "ResponseDescription":      "Accept the service request successfully"
 * }
 */
export interface B2BBuyGoodsResponse {
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
 * Documented result parameter keys for Business Buy Goods transactions.
 * Source: Safaricom Daraja Business Buy Goods — Successful Result Parameters.
 */
export type B2BBuyGoodsResultParameterKey =
  | 'Amount'
  | 'TransCompletedTime'
  | 'ReceiverPartyPublicName'
  | 'DebitPartyCharges'
  | 'Currency'
  | 'DebitPartyAffectedAccountBalance'
  | 'DebitAccountBalance'
  | 'InitiatorAccountCurrentBalance'
  | 'BOCompletedTime'
  | (string & {})

export interface B2BBuyGoodsResultParameter {
  Key: B2BBuyGoodsResultParameterKey
  Value: string | number
}

export interface B2BBuyGoodsReferenceItem {
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
 *         { "Key": "Amount",                        "Value": "190.00" },
 *         { "Key": "TransCompletedTime",            "Value": "20221110110717" },
 *         { "Key": "ReceiverPartyPublicName",       "Value": "000000 - Biller Company" },
 *         { "Key": "Currency",                      "Value": "KES" },
 *         { "Key": "DebitAccountBalance",           "Value": "{Amount={CurrencyCode=KES,...}}" },
 *         { "Key": "DebitPartyAffectedAccountBalance", "Value": "Working Account|KES|..." },
 *         { "Key": "DebitPartyCharges",             "Value": "" },
 *         { "Key": "InitiatorAccountCurrentBalance","Value": "{Amount={CurrencyCode=KES,...}}" }
 *       ]
 *     },
 *     "ReferenceData": {
 *       "ReferenceItem": [
 *         { "Key": "BillReferenceNumber", "Value": "19008" },
 *         { "Key": "QueueTimeoutURL",     "Value": "https://..." }
 *       ]
 *     }
 *   }
 * }
 *
 * Failure: ResultCode is non-zero (e.g. 2001); ResultParameters may still be present.
 */
export interface B2BBuyGoodsResult {
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
      ResultParameter: B2BBuyGoodsResultParameter | B2BBuyGoodsResultParameter[]
    }

    ReferenceData?: {
      ReferenceItem: B2BBuyGoodsReferenceItem | B2BBuyGoodsReferenceItem[]
    }
  }
}

// ── Result codes (documented by Daraja) ──────────────────────────────────────

/**
 * Known Business Buy Goods result codes documented by Safaricom Daraja.
 */
export const B2B_BUY_GOODS_RESULT_CODES = {
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

export type B2BBuyGoodsResultCode =
  (typeof B2B_BUY_GOODS_RESULT_CODES)[keyof typeof B2B_BUY_GOODS_RESULT_CODES]

// ── Error response (synchronous, on bad request) ──────────────────────────────

/**
 * Documented Daraja error codes for the Business Buy Goods API.
 */
export const B2B_BUY_GOODS_ERROR_CODES = {
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

export type B2BBuyGoodsErrorCode =
  (typeof B2B_BUY_GOODS_ERROR_CODES)[keyof typeof B2B_BUY_GOODS_ERROR_CODES]

export interface B2BBuyGoodsErrorResponse {
  /** Unique request ID assigned by the API gateway */
  requestId: string
  /** Daraja error code, e.g. "404.001.04" */
  errorCode: string
  /** Human-readable error message */
  errorMessage: string
}

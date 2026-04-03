// src/mpesa/transaction-status/types.ts

/**
 * Transaction Status Query types
 *
 * API: POST /mpesa/transactionstatus/v1/query
 *
 * Daraja request body (from official documentation):
 * {
 *   "Initiator":                "",
 *   "SecurityCredential":       "",
 *   "CommandID":                "TransactionStatusQuery",
 *   "TransactionID":            "",
 *   "OriginalConversationID":   "",
 *   "PartyA":                   "",
 *   "IdentifierType":           "",
 *   "ResultURL":                "",
 *   "QueueTimeOutURL":          "",
 *   "Remarks":                  "",
 *   "Occasion":                 ""
 * }
 *
 * NOTE: This is an ASYNCHRONOUS API.
 * The synchronous response only confirms Safaricom received the request.
 * The actual transaction details arrive later via POST to your ResultURL.
 *
 * Reconciliation: Either transactionId OR originalConversationId is required.
 */

// ── Request ───────────────────────────────────────────────────────────────────

export interface TransactionStatusRequest {
  /**
   * M-Pesa transaction ID to look up (M-Pesa Receipt Number).
   * Either transactionId OR originalConversationId is required.
   * Daraja field: TransactionID
   * Example: "NEF61H8J60"
   */
  transactionId?: string

  /**
   * The Originator Conversation ID of the transaction whose status is being
   * checked. Either transactionId OR originalConversationId is required.
   * Use this when you have a ConversationID from the original API response
   * but no M-Pesa receipt number.
   * Daraja field: OriginalConversationID
   * Example: "7071-4170-a0e5-8345632bad4421"
   */
  originalConversationId?: string

  /**
   * Organization/MSISDN receiving the transaction.
   * Usually your business shortcode.
   * Daraja field: PartyA
   */
  partyA: string

  /**
   * Type of the partyA identifier.
   *   "1" = MSISDN
   *   "2" = Till Number (Buy Goods)
   *   "4" = Organisation ShortCode (Paybill / B2C) ← most common
   * Daraja field: IdentifierType
   */
  identifierType: '1' | '2' | '4'

  /**
   * URL where Safaricom POSTs the final result.
   * Must be publicly accessible.
   * Daraja field: ResultURL
   */
  resultUrl: string

  /**
   * URL Safaricom calls when the request times out in the queue.
   * Must be publicly accessible.
   * Daraja field: QueueTimeOutURL
   */
  queueTimeOutUrl: string

  /**
   * CommandID — always "TransactionStatusQuery".
   * Defaults to "TransactionStatusQuery" if omitted.
   */
  commandId?: 'TransactionStatusQuery'

  /** Optional remarks (up to 100 characters) */
  remarks?: string

  /** Optional occasion / reference (up to 100 characters) */
  occasion?: string
}

// ── Synchronous acknowledgement response ──────────────────────────────────────

export interface TransactionStatusResponse {
  /** Unique request ID for tracking */
  OriginatorConversationID: string
  /** Unique request ID returned by M-PESA */
  ConversationID: string
  /** "0" = request accepted */
  ResponseCode: string
  ResponseDescription: string
}

// ── Documented API error codes ────────────────────────────────────────────────

/**
 * Daraja Transaction Status API error codes.
 * Returned in the errorCode field of error response bodies.
 *
 * @see https://developer.safaricom.co.ke/APIs/TransactionStatus
 */
export const TRANSACTION_STATUS_ERROR_CODES = {
  /** Wrong or expired access token */
  INVALID_ACCESS_TOKEN: '400.003.01',
  /** Server cannot process the request — something is missing */
  BAD_REQUEST: '400.003.02',
  /** Server failure */
  INTERNAL_SERVER_ERROR: '500.003.1001',
  /** Multiple requests violating M-PESA TPS limit */
  QUOTA_VIOLATION: '500.003.03',
  /** Spike arrest — endpoints generating constant errors */
  SPIKE_ARREST: '500.003.02',
  /** Requested resource could not be found */
  NOT_FOUND: '404.003.01',
  /** Invalid auth header / using GET instead of POST */
  INVALID_AUTH_HEADER: '404.001.04',
  /** Request body is not properly drafted */
  INVALID_PAYLOAD: '400.002.05',
} as const

export type TransactionStatusErrorCode =
  (typeof TRANSACTION_STATUS_ERROR_CODES)[keyof typeof TRANSACTION_STATUS_ERROR_CODES]

// ── Async result payload (POSTed to your ResultURL) ───────────────────────────

/**
 * Documented result parameter keys for the Transaction Status callback.
 * @see Daraja Transaction Status result documentation
 */
export type TransactionStatusResultParameterKey =
  | 'DebitPartyName'
  | 'TransactionStatus'
  | 'Amount'
  | 'ReceiptNo'
  | 'DebitAccountBalance'
  | 'TransactionDate'
  | 'CreditPartyName'

export interface TransactionStatusResultParameter {
  Key: TransactionStatusResultParameterKey | string
  Value: string | number
}

export interface TransactionStatusResult {
  Result: {
    /** 0 = completed, 1 = waiting for further messages */
    ResultType: number | string
    /** 0 = success */
    ResultCode: number | string
    /** Human-readable description of the result */
    ResultDesc: string
    OriginatorConversationID: string
    ConversationID: string
    TransactionID: string
    ResultParameters?: {
      ResultParameter: TransactionStatusResultParameter | TransactionStatusResultParameter[]
    }
    ReferenceData?: {
      ReferenceItem: { Key: string; Value?: string } | Array<{ Key: string; Value?: string }>
    }
  }
}

/**
 * Documented result codes for the Transaction Status async callback.
 * ResultCode 0 = success; anything else is a failure.
 */
export const TRANSACTION_STATUS_RESULT_CODES = {
  /** Transaction processed successfully */
  SUCCESS: 0,
  /** Invalid initiator information */
  INVALID_INITIATOR: 2001,
} as const

export type TransactionStatusResultCode =
  (typeof TRANSACTION_STATUS_RESULT_CODES)[keyof typeof TRANSACTION_STATUS_RESULT_CODES]

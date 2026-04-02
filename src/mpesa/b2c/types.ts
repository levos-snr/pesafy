/**
 * src/mpesa/b2c/types.ts
 *
 * Strictly aligned with Safaricom Daraja B2C Account Top Up API documentation.
 * Endpoint: POST /mpesa/b2b/v1/paymentrequest
 *
 * Only CommandID = "BusinessPayToBulk" is documented and supported.
 * SenderIdentifierType and RecieverIdentifierType are always "4" per docs.
 */

// ── Command ID ────────────────────────────────────────────────────────────────

/**
 * The only CommandID supported by the B2C Account Top Up API.
 * Docs: "Use BusinessPayToBulk only"
 */
export type B2CCommandID = 'BusinessPayToBulk'

// ── Request ───────────────────────────────────────────────────────────────────

export interface B2CRequest {
  /**
   * Transaction type. Must be "BusinessPayToBulk".
   * Daraja field: CommandID
   */
  commandId: B2CCommandID

  /**
   * Transaction amount in KES. Must be a whole number ≥ 1.
   * Daraja field: Amount (sent as string per API spec)
   */
  amount: number

  /**
   * Sender shortcode — the originating business shortcode.
   * Daraja field: PartyA
   * SenderIdentifierType is always "4" (Organisation ShortCode) per docs.
   */
  partyA: string

  /**
   * Receiver shortcode — the B2C shortcode that receives the funds.
   * Daraja field: PartyB
   * RecieverIdentifierType is always "4" (Organisation ShortCode) per docs.
   */
  partyB: string

  /**
   * Account reference for the transaction (e.g. invoice or batch number).
   * Daraja field: AccountReference
   */
  accountReference: string

  /**
   * Optional. Customer phone number on whose behalf the transfer is made.
   * Format: 254XXXXXXXXX
   * Daraja field: Requester
   */
  requester?: string

  /**
   * Additional remarks for the transaction. Up to 100 characters.
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
}

// ── Synchronous acknowledgement response ──────────────────────────────────────

export interface B2CResponse {
  /**
   * Unique request identifier assigned by Daraja upon successful submission.
   * Daraja field: OriginatorConversationID
   */
  OriginatorConversationID: string

  /**
   * Unique request identifier assigned by M-Pesa.
   * Daraja field: ConversationID
   */
  ConversationID: string

  /**
   * "0" indicates the request was accepted for processing.
   * Daraja field: ResponseCode
   */
  ResponseCode: string

  /**
   * Human-readable submission status description.
   * Daraja field: ResponseDescription
   */
  ResponseDescription: string
}

// ── Async result payload (POSTed to your ResultURL) ───────────────────────────

/**
 * Documented result parameter keys for B2C Account Top Up transactions.
 * Source: Safaricom Daraja B2C Account Top Up — Successful Result Parameters.
 *
 * `(string & {})` is used as a catch-all so:
 *   - Named literals appear in IntelliSense/autocomplete.
 *   - Future undocumented keys from Daraja are still accepted at runtime.
 */
export type B2CResultParameterKey =
  | 'DebitAccountBalance'
  | 'Amount'
  | 'Currency'
  | 'ReceiverPartyPublicName'
  | 'TransactionCompletedTime'
  | 'DebitPartyCharges'
  | (string & {})

export interface B2CResultParameter {
  Key: B2CResultParameterKey
  Value: string | number
}

export interface B2CResult {
  Result: {
    /**
     * Usually "0" for success. Docs show "0" (string) on success,
     * numeric (e.g. 2001) on failure — typed as both for safety.
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
    TransactionID: string

    ResultParameters?: {
      ResultParameter: B2CResultParameter | B2CResultParameter[]
    }

    ReferenceData?: {
      ReferenceItem: { Key: string; Value?: string } | Array<{ Key: string; Value?: string }>
    }
  }
}

// ── Error response (synchronous, on bad request) ──────────────────────────────

/**
 * Documented Daraja error codes for the B2C Account Top Up API.
 */
export const B2C_ERROR_CODES = {
  /** Internal server error */
  INTERNAL_SERVER_ERROR: '500.003.1001',
  /** Invalid or expired access token */
  INVALID_ACCESS_TOKEN: '400.003.01',
  /** Bad request — missing or malformed data */
  BAD_REQUEST: '400.003.02',
  /** Quota violation — too many requests */
  QUOTA_VIOLATION: '500.003.03',
  /** Spike arrest violation — server not responding */
  SPIKE_ARREST: '500.003.02',
  /** Resource not found — wrong endpoint */
  NOT_FOUND: '404.003.01',
  /** Invalid authentication header — wrong HTTP method */
  INVALID_AUTH_HEADER: '404.001.04',
  /** Invalid request payload — incorrect JSON format */
  INVALID_PAYLOAD: '400.002.05',
} as const

export type B2CErrorCode = (typeof B2C_ERROR_CODES)[keyof typeof B2C_ERROR_CODES]

export interface B2CErrorResponse {
  /** Unique request ID assigned by the API gateway */
  requestId: string
  /** Daraja error code, e.g. "400.003.01" */
  errorCode: string
  /** Human-readable error message */
  errorMessage: string
}

// ── Known result codes (from documentation examples) ─────────────────────────

/**
 * Known B2C result codes documented by Safaricom Daraja.
 */
export const B2C_RESULT_CODES = {
  /** Transaction processed successfully */
  SUCCESS: 0,
  /** Initiator information is invalid */
  INVALID_INITIATOR: 2001,
} as const

export type B2CResultCode = (typeof B2C_RESULT_CODES)[keyof typeof B2C_RESULT_CODES]

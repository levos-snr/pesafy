/**
 * src/mpesa/b2c-disbursement/types.ts

// ── Command IDs ───────────────────────────────────────────────────────────────

/**
 * Supported CommandIDs for B2C Disbursement.
 * Source: Safaricom Daraja B2C API documentation.
 */
export type B2CDisbursementCommandID = 'BusinessPayment' | 'SalaryPayment' | 'PromotionPayment'

// ── Request ───────────────────────────────────────────────────────────────────

export interface B2CDisbursementRequest {
  /**
   * Unique request ID from the merchant.
   * Daraja field: OriginatorConversationID
   */
  originatorConversationId: string

  /**
   * Transaction type.
   * Daraja field: CommandID
   */
  commandId: B2CDisbursementCommandID

  /**
   * Transaction amount in KES.
   * Daraja field: Amount
   */
  amount: number

  /**
   * Sending organisation shortcode.
   * Daraja field: PartyA
   */
  partyA: string

  /**
   * Receiving customer MSISDN (2547XXXXXXXX).
   * Daraja field: PartyB
   */
  partyB: string

  /**
   * Additional transaction info (2–100 characters).
   * Daraja field: Remarks
   */
  remarks: string

  /**
   * URL Safaricom calls with the async result.
   * Daraja field: ResultURL
   */
  resultUrl: string

  /**
   * URL Safaricom calls on queue timeout.
   * Daraja field: QueueTimeOutURL
   */
  queueTimeOutUrl: string

  /**
   * Optional additional info.
   * Daraja field: Occassion (sic — preserved from Daraja docs)
   */
  occasion?: string
}

// ── Synchronous acknowledgement ───────────────────────────────────────────────

export interface B2CDisbursementResponse {
  /** Unique request ID assigned by M-Pesa */
  ConversationID: string
  /** Merchant-supplied request ID echoed back */
  OriginatorConversationID: string
  /** "0" = accepted */
  ResponseCode: string
  /** Human-readable submission status */
  ResponseDescription: string
}

// ── Async result callback ─────────────────────────────────────────────────────

export interface B2CDisbursementResultParameter {
  Key: B2CDisbursementResultParameterKey
  Value: string | number
}

/**
 * Known result parameter keys from Daraja B2C success callback.
 */
export type B2CDisbursementResultParameterKey =
  | 'TransactionAmount'
  | 'TransactionReceipt'
  | 'ReceiverPartyPublicName'
  | 'TransactionCompletedDateTime'
  | 'B2CUtilityAccountAvailableFunds'
  | 'B2CWorkingAccountAvailableFunds'
  | 'B2CRecipientIsRegisteredCustomer'
  | 'B2CChargesPaidAccountAvailableFunds'
  | (string & {})

export interface B2CDisbursementResult {
  Result: {
    ResultType: number
    ResultCode: number | string
    ResultDesc: string
    OriginatorConversationID: string
    ConversationID: string
    TransactionID: string
    ResultParameters?: {
      ResultParameter: B2CDisbursementResultParameter | B2CDisbursementResultParameter[]
    }
    ReferenceData?: {
      ReferenceItem: { Key: string; Value?: string } | Array<{ Key: string; Value?: string }>
    }
  }
}

// ── Result codes ──────────────────────────────────────────────────────────────

/**
 * All documented B2C result codes.
 * Note: SFC_IC0003 is a string — all others are numeric.
 */
export const B2C_DISBURSEMENT_RESULT_CODES = {
  SUCCESS: 0,
  INSUFFICIENT_BALANCE: 1,
  AMOUNT_TOO_SMALL: 2,
  AMOUNT_TOO_LARGE: 3,
  DAILY_LIMIT_EXCEEDED: 4,
  MAX_BALANCE_EXCEEDED: 8,
  DEBIT_PARTY_INVALID: 11,
  INITIATOR_NOT_ALLOWED: 21,
  INVALID_INITIATOR_INFO: 2001,
  ACCOUNT_INACTIVE: 2006,
  PRODUCT_NOT_PERMITTED: 2028,
  CUSTOMER_NOT_REGISTERED: 2040,
  SECURITY_CREDENTIAL_LOCKED: 8006,
  OPERATOR_DOES_NOT_EXIST: 'SFC_IC0003',
} as const

export type B2CDisbursementResultCode =
  (typeof B2C_DISBURSEMENT_RESULT_CODES)[keyof typeof B2C_DISBURSEMENT_RESULT_CODES]

// ── Error response ────────────────────────────────────────────────────────────

export interface B2CDisbursementErrorResponse {
  requestId: string
  errorCode: string
  errorMessage: string
}

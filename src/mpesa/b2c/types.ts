// src/mpesa/b2c/types.ts

/**
 * Business to Customer (B2C) types
 *
 * API: POST /mpesa/b2b/v1/paymentrequest
 *
 * B2C enables two flows:
 *   1. BusinessPayToBulk  — load funds from MMF/Working account to a B2C shortcode
 *      for bulk disbursement (salaries, commissions, winnings, etc.)
 *   2. Standard B2C       — pay directly to a customer's M-PESA wallet
 *
 * NOTE: This is an ASYNCHRONOUS API.
 * The synchronous response only confirms Safaricom received the request.
 * The actual result arrives later via POST to your ResultURL.
 *
 * Ref: B2C Account Top Up — Daraja Developer Portal
 */

// ── Command IDs ───────────────────────────────────────────────────────────────

/**
 * B2C CommandID values.
 *
 *   BusinessPayment      — Unsecured business payment to a customer (e.g. winnings)
 *   SalaryPayment        — Disbursement of salaries to customers
 *   PromotionPayment     — Payment of promotions/bonuses
 *   BusinessPayToBulk    — Load funds to a B2C shortcode for bulk disbursement
 */
export type B2CCommandID =
  | 'BusinessPayment'
  | 'SalaryPayment'
  | 'PromotionPayment'
  | 'BusinessPayToBulk'

// ── Request ───────────────────────────────────────────────────────────────────

export interface B2CRequest {
  /**
   * The type of transaction. Use "BusinessPayToBulk" for account top-up.
   * For direct customer payments use: "BusinessPayment", "SalaryPayment",
   * or "PromotionPayment".
   * Daraja field: CommandID
   */
  commandId: B2CCommandID

  /**
   * The transaction amount. Must be a whole number ≥ 1.
   * Daraja field: Amount
   */
  amount: number

  /**
   * Your business shortcode from which money is deducted.
   * This is the PartyA (debit party).
   * Daraja field: PartyA
   */
  partyA: string

  /**
   * The recipient shortcode or MSISDN (credit party).
   *
   * For BusinessPayToBulk:
   *   - The B2C shortcode to which money is moved (e.g. "600000")
   *
   * For BusinessPayment / SalaryPayment / PromotionPayment:
   *   - The customer's M-PESA phone number (254XXXXXXXXX format)
   *
   * Daraja field: PartyB
   */
  partyB: string

  /**
   * Type of the sender (PartyA) identifier.
   * For this API, only "4" (Organisation ShortCode) is allowed.
   * Daraja field: SenderIdentifierType
   * Default: "4"
   */
  senderIdentifierType?: '4'

  /**
   * Type of the receiver (PartyB) identifier.
   * For this API, only "4" (Organisation ShortCode) is allowed.
   * Daraja field: RecieverIdentifierType
   * Default: "4"
   */
  receiverIdentifierType?: '4'

  /**
   * A reference for this transaction (e.g. invoice number, batch reference).
   * Daraja field: AccountReference
   */
  accountReference: string

  /**
   * Optional. The consumer's mobile number on behalf of whom you are paying.
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
   * URL where Safaricom POSTs the final result after processing.
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
  /** Unique request identifier assigned by Daraja upon successful submission */
  OriginatorConversationID: string
  /** Unique request identifier assigned by M-Pesa upon successful submission */
  ConversationID: string
  /** "0" = successful submission */
  ResponseCode: string
  /** Human-readable status, e.g. "Accept the service request successfully." */
  ResponseDescription: string
}

// ── Async result payload (POSTed to your ResultURL) ───────────────────────────

/**
 * Known result parameter keys returned by Daraja for B2C transactions.
 *
 * `(string & {})` is used as the catch-all so that:
 *   - The named literals appear in IntelliSense / autocomplete.
 *   - Any unknown future key Daraja may return is still accepted.
 *   - The `no-redundant-type-constituents` ESLint rule is not triggered.
 */
export type B2CResultParameterKey =
  | 'DebitAccountBalance'
  | 'Amount'
  | 'DebitPartyAffectedAccountBalance'
  | 'TransCompletedTime'
  | 'DebitPartyCharges'
  | 'ReceiverPartyPublicName'
  | 'Currency'
  | 'InitiatorAccountCurrentBalance'
  | 'B2CRecipientIsRegisteredCustomer'
  | 'B2CChargesPaidAccountAvailableFunds'
  | 'B2CWorkingAccountAvailableFunds'
  | 'B2CUtilityAccountAvailableFunds'
  | (string & {})

export interface B2CResultParameter {
  Key: B2CResultParameterKey
  Value: string | number
}

export interface B2CResult {
  Result: {
    /** Usually "0" */
    ResultType: string | number
    /** 0 = success */
    ResultCode: number
    /** Human-readable result description */
    ResultDesc: string
    OriginatorConversationID: string
    ConversationID: string
    TransactionID: string
    ResultParameters?: {
      ResultParameter: B2CResultParameter | B2CResultParameter[]
    }
    ReferenceData?: {
      ReferenceItem:
        | { Key: string; Value?: string }
        | Array<{ Key: string; Value?: string }>
    }
  }
}

// ── Error response (synchronous, on bad request) ──────────────────────────────

export interface B2CErrorResponse {
  /** Unique request ID assigned by the API gateway */
  requestId: string
  /** Daraja error code, e.g. "400.003.01" */
  errorCode: string
  /** Human-readable error message */
  errorMessage: string
}

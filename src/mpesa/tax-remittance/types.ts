// src/mpesa/tax-remittance/types.ts

// ── Request ───────────────────────────────────────────────────────────────────

export interface TaxRemittanceRequest {
  /**
   * The transaction amount to remit to KRA.
   * Must be a whole number ≥ 1.
   * Daraja field: Amount
   */
  amount: number

  /**
   * Your own M-PESA business shortcode from which the money is deducted.
   * Daraja field: PartyA
   */
  partyA: string

  /**
   * The KRA account to which money is credited.
   * For Tax Remittance, only "572572" is allowed.
   * Defaults to KRA_SHORTCODE ("572572") when omitted.
   * Daraja field: PartyB
   */
  partyB?: string

  /**
   * The Payment Registration Number (PRN) issued by KRA.
   * This is your tax declaration reference from KRA.
   * Daraja field: AccountReference
   */
  accountReference: string

  /**
   * URL where Safaricom POSTs the final result after processing.
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
   * Additional information associated with the transaction.
   * Optional — defaults to "Tax Remittance" when omitted.
   * Daraja field: Remarks
   */
  remarks?: string
}

// ── Synchronous response (request acknowledgement) ────────────────────────────

export interface TaxRemittanceResponse {
  /** Unique request identifier assigned by Daraja upon successful submission */
  OriginatorConversationID: string
  /** Unique request identifier assigned by M-Pesa upon successful submission */
  ConversationID: string
  /** "0" = successful submission */
  ResponseCode: string
  /** Descriptive message of the submission status */
  ResponseDescription: string
}

// ── Result parameter keys — strictly from Daraja docs ─────────────────────────

/**
 * Known result parameter keys for Tax Remittance as documented by Daraja.
 *
 * `(string & {})` is used as the catch-all so that:
 *   - Named literals appear in IntelliSense / autocomplete.
 *   - Any unknown future key Daraja may return is still accepted.
 *   - The `no-redundant-type-constituents` ESLint rule is not triggered.
 */
export type TaxRemittanceResultParameterKey =
  | 'Amount'
  | 'TransactionCompletedTime'
  | 'ReceiverPartyPublicName'
  | (string & {})

export interface TaxRemittanceResultParameter {
  Key: TaxRemittanceResultParameterKey
  Value: string | number
}

// ── Async result payload (POSTed to your ResultURL) ───────────────────────────

export interface TaxRemittanceResult {
  Result: {
    /**
     * Result type indicator.
     * Daraja returns "0" (string) in success callbacks.
     * Can also be numeric in some environments.
     */
    ResultType: string | number
    /**
     * 0 / "0" = success; non-zero = failure.
     * Daraja returns "0" (string) in success callbacks per the docs.
     * Failure codes (e.g. 2001) are typically returned as numbers.
     */
    ResultCode: string | number
    /** Human-readable result description */
    ResultDesc: string
    OriginatorConversationID: string
    ConversationID: string
    TransactionID: string
    /**
     * Present on successful results only.
     * Daraja may return ResultParameter as a single object or an array —
     * both shapes are handled by the webhook helpers.
     */
    ResultParameters?: {
      ResultParameter: TaxRemittanceResultParameter | TaxRemittanceResultParameter[]
    }
  }
}

// ── Error response (synchronous, on bad request) ──────────────────────────────

export interface TaxRemittanceErrorResponse {
  /** Unique requestID for the payment request */
  requestId: string
  /** Unique error code defined in documentation, e.g. "404.001.04" */
  errorCode: string
  /** Descriptive message of the failure, e.g. "Invalid Access Token" */
  errorMessage: string
}

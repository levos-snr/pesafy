/**
 * src/mpesa/reversal/types.ts
 *
 * Transaction Reversal types, constants, and helpers.
 *
 * API: POST /mpesa/reversal/v1/request
 *
 * Reverses a completed M-PESA C2B transaction. The API is ASYNCHRONOUS —
 * the synchronous response is only an acknowledgement. The actual reversal
 * result is POSTed to your ResultURL after processing.
 *
 * Required org portal role: "Org Reversals Initiator"
 *
 * Per Daraja docs:
 *   RecieverIdentifierType MUST always be "11" for reversals.
 *   CommandID MUST always be "TransactionReversal".
 *
 * Ref: Reversals — Safaricom Daraja Developer Portal
 */

// ── Constants ──────────────────────────────────────────────────────────────────

/**
 * CommandID for the Reversals API.
 * Only "TransactionReversal" is allowed per Daraja docs.
 */
export const REVERSAL_COMMAND_ID = 'TransactionReversal' as const

/**
 * RecieverIdentifierType for the Reversals API.
 * Per Daraja docs: "Type of Organization (should be '11')".
 * This value is fixed for all reversal requests.
 */
export const REVERSAL_RECEIVER_IDENTIFIER_TYPE = '11' as const

/**
 * Result codes returned in the async callback POSTed to your ResultURL.
 *
 * Per Daraja Reversals documentation:
 *
 * | ResultCode | Meaning                                            |
 * |------------|----------------------------------------------------|
 * | 0          | Success — transaction reversed                     |
 * | 1          | Insufficient balance                               |
 * | 11         | DebitParty in invalid state (shortcode not active) |
 * | 21         | Initiator not allowed to initiate reversals        |
 * | 2001       | Initiator information invalid (bad credentials)    |
 * | 2006       | Declined due to account rule (shortcode inactive)  |
 * | 2028       | Not permitted (shortcode lacks reversal permission)|
 * | 8006       | Security credential locked                         |
 * | R000001    | Transaction already reversed                       |
 * | R000002    | OriginalTransactionID is invalid / does not exist  |
 */
export const REVERSAL_RESULT_CODES = {
  /** Transaction reversed successfully */
  SUCCESS: 0,
  /** Organisation shortcode has insufficient balance */
  INSUFFICIENT_BALANCE: 1,
  /** DebitParty (shortcode) is in an invalid state */
  DEBIT_PARTY_INVALID_STATE: 11,
  /** Initiator does not have the Org Reversals Initiator role */
  INITIATOR_NOT_ALLOWED: 21,
  /** API user credentials are invalid */
  INITIATOR_INFORMATION_INVALID: 2001,
  /** Organisation/shortcode account is not active */
  DECLINED_ACCOUNT_RULE: 2006,
  /** Shortcode has no permission to perform this reversal */
  NOT_PERMITTED: 2028,
  /** API user password is locked — too many failed attempts */
  SECURITY_CREDENTIAL_LOCKED: 8006,
  /** The TransactionID has already been reversed */
  ALREADY_REVERSED: 'R000001',
  /** The TransactionID is invalid or does not exist on M-PESA */
  INVALID_TRANSACTION_ID: 'R000002',
} as const satisfies Record<string, number | string>

export type ReversalResultCode = (typeof REVERSAL_RESULT_CODES)[keyof typeof REVERSAL_RESULT_CODES]

/**
 * API-level error codes returned in the synchronous HTTP error response.
 *
 * Per Daraja Reversals error response documentation:
 *
 * | errorCode       | Meaning                                         | HTTP |
 * |-----------------|-------------------------------------------------|------|
 * | 404.001.03      | Invalid Access Token                            | 404  |
 * | 400.002.02      | Bad Request — Invalid payload field             | 400  |
 * | 404.001.01      | Resource not found (wrong endpoint)             | 404  |
 * | 500.001.1001    | Internal Server Error                           | 500  |
 * | 500.003.02      | Spike Arrest Violation (TPS limit exceeded)     | 500  |
 * | 500.003.03      | Quota Violation (API request limit exceeded)    | 500  |
 */
export const REVERSAL_ERROR_CODES = {
  /** Access token is invalid or expired. Regenerate and retry. */
  INVALID_ACCESS_TOKEN: '404.001.03',
  /** Request payload is malformed or missing required fields. */
  BAD_REQUEST: '400.002.02',
  /** Wrong endpoint URL — verify you are calling /mpesa/reversal/v1/request */
  RESOURCE_NOT_FOUND: '404.001.01',
  /** Internal server error on Daraja. Verify payload matches documentation. */
  INTERNAL_SERVER_ERROR: '500.001.1001',
  /** Too many requests per second — reduce TPS. */
  SPIKE_ARREST: '500.003.02',
  /** API request quota exceeded. */
  QUOTA_VIOLATION: '500.003.03',
} as const

export type ReversalErrorCode = (typeof REVERSAL_ERROR_CODES)[keyof typeof REVERSAL_ERROR_CODES]

// ── ResultParameter keys ──────────────────────────────────────────────────────

/**
 * Keys present in the ResultParameters.ResultParameter array of a successful
 * reversal callback, as documented by Daraja.
 */
export type ReversalResultParameterKey =
  | 'DebitAccountBalance'
  | 'Amount'
  | 'TransCompletedTime'
  | 'OriginalTransactionID'
  | 'Charge'
  | 'CreditPartyPublicName'
  | 'DebitPartyPublicName'

// ── Request ───────────────────────────────────────────────────────────────────

/**
 * Parameters for the Reversals API request.
 *
 * Daraja request body shape:
 * ```json
 * {
 *   "Initiator":             "apiop37",
 *   "SecurityCredential":    "RC6E9WDx9X2c6z3gp0oC5Th==",
 *   "CommandID":             "TransactionReversal",
 *   "TransactionID":         "PDU91HIVIT",
 *   "Amount":                "200",
 *   "ReceiverParty":         "603021",
 *   "RecieverIdentifierType":"11",
 *   "ResultURL":             "https://mydomain.com/reversal/result",
 *   "QueueTimeOutURL":       "https://mydomain.com/reversal/queue",
 *   "Remarks":               "Payment reversal"
 * }
 * ```
 *
 * Note: Initiator and SecurityCredential are supplied by the SDK layer;
 * they are not part of this user-facing request interface.
 */
export interface ReversalRequest {
  /**
   * The M-PESA receipt number of the transaction to reverse.
   * Example: "PDU91HIVIT"
   * Daraja field: TransactionID
   */
  transactionId: string

  /**
   * Your organisation shortcode (Paybill or Till number).
   * Daraja field: ReceiverParty
   */
  receiverParty: string

  /**
   * Identifier type for ReceiverParty.
   * Per Daraja docs: MUST be "11" (Organisation/ShortCode reversal type).
   * This value is validated and always sent as "11".
   * Daraja field: RecieverIdentifierType (note Daraja's spelling)
   *
   * @default "11"
   */
  receiverIdentifierType?: '11'

  /**
   * Amount to reverse. Must equal the original transaction amount.
   * Must be a whole number ≥ 1.
   * Daraja field: Amount (sent as string per Daraja docs sample)
   */
  amount: number

  /**
   * URL where Safaricom POSTs the reversal result asynchronously.
   * Must be publicly accessible over the internet.
   * Daraja field: ResultURL
   */
  resultUrl: string

  /**
   * URL called when the request times out in the Daraja queue.
   * Must be publicly accessible over the internet.
   * Daraja field: QueueTimeOutURL
   */
  queueTimeOutUrl: string

  /**
   * Short description of the reversal reason (2–100 characters).
   * Daraja field: Remarks
   * @default "Transaction Reversal"
   */
  remarks?: string

  /**
   * Optional occasion/reference string.
   * Not in the Daraja sample payload but accepted by the API.
   * Daraja field: Occasion
   */
  occasion?: string
}

// ── Synchronous acknowledgement ───────────────────────────────────────────────

/**
 * Synchronous response from the Reversals API.
 *
 * This is only an acknowledgement that the request was received.
 * The actual reversal result arrives asynchronously at your ResultURL.
 *
 * Daraja response shape:
 * ```json
 * {
 *   "OriginatorConversationID": "f1e2-4b95-a71d-b30d3cdbb7a7735297",
 *   "ConversationID":           "AG_20210706_20106e9209f64bebd05b",
 *   "ResponseCode":             "0",
 *   "ResponseDescription":      "Accept the service request successfully."
 * }
 * ```
 */
export interface ReversalResponse {
  /** Unique identifier for this reversal request from M-PESA */
  OriginatorConversationID: string
  /** Unique global identifier for the transaction request */
  ConversationID: string
  /**
   * "0" = request accepted successfully.
   * Any other value = API-level error (not reversal failure).
   */
  ResponseCode: string
  /** Human-readable acknowledgement message */
  ResponseDescription: string
}

// ── Async result callback (POSTed to ResultURL) ───────────────────────────────

/**
 * Result parameter item in a successful reversal callback.
 */
export interface ReversalResultParameter {
  Key: ReversalResultParameterKey
  Value: string | number
}

/**
 * Full async reversal result POSTed to your ResultURL after processing.
 *
 * Successful callback shape (per Daraja docs):
 * ```json
 * {
 *   "Result": {
 *     "ResultType": 0,
 *     "ResultCode": 0,
 *     "ResultDesc": "The service request is processed successfully.",
 *     "OriginatorConversationID": "...",
 *     "ConversationID": "AG_...",
 *     "TransactionID": "SKE52PAWR9",
 *     "ResultParameters": {
 *       "ResultParameter": [
 *         { "Key": "DebitAccountBalance",  "Value": "Utility Account|KES|..." },
 *         { "Key": "Amount",               "Value": 1.00 },
 *         { "Key": "TransCompletedTime",   "Value": 20211114132711 },
 *         { "Key": "OriginalTransactionID","Value": "SKC82PACB8" },
 *         { "Key": "Charge",               "Value": 0.00 },
 *         { "Key": "CreditPartyPublicName","Value": "254705912645 - NICHOLAS JOHN SONGOK" },
 *         { "Key": "DebitPartyPublicName", "Value": "600992 - Safaricom Daraja 992" }
 *       ]
 *     },
 *     "ReferenceData": {
 *       "ReferenceItem": {
 *         "Key": "QueueTimeoutURL",
 *         "Value": "https://..."
 *       }
 *     }
 *   }
 * }
 * ```
 *
 * Failed callback shape (per Daraja docs):
 * ```json
 * {
 *   "Result": {
 *     "ResultType": 0,
 *     "ResultCode": "R000002",
 *     "ResultDesc": "The OriginalTransactionID is invalid.",
 *     ...
 *   }
 * }
 * ```
 *
 * Note: ResultCode is 0 (number) on success and a string like "R000002" on failure.
 */
export interface ReversalResult {
  Result: {
    /** Status type (usually 0) */
    ResultType: number
    /**
     * 0 (number) = success.
     * String codes like "R000002" = failure.
     * See REVERSAL_RESULT_CODES for all documented values.
     */
    ResultCode: number | string
    /** Human-readable result description */
    ResultDesc: string
    /** Unique identifier for the reversal request */
    OriginatorConversationID: string
    /** Unique identifier from M-PESA */
    ConversationID: string
    /** M-PESA receipt number for the reversal transaction */
    TransactionID: string
    /**
     * Present on success — contains transaction details.
     * Absent on failure.
     */
    ResultParameters?: {
      ResultParameter: ReversalResultParameter[]
    }
    ReferenceData?: {
      ReferenceItem: { Key: string; Value: string } | Array<{ Key: string; Value: string }>
    }
  }
}

// ── Type guards ───────────────────────────────────────────────────────────────

/**
 * Returns true when the payload matches the shape of a ReversalResult.
 * Works for both success and failure callbacks.
 */
export function isReversalResult(body: unknown): body is ReversalResult {
  if (!body || typeof body !== 'object') return false
  const b = body as Record<string, unknown>
  if (!b['Result'] || typeof b['Result'] !== 'object') return false
  const r = b['Result'] as Record<string, unknown>
  return (
    typeof r['ResultCode'] !== 'undefined' &&
    typeof r['ResultDesc'] === 'string' &&
    typeof r['ConversationID'] === 'string'
  )
}

/**
 * Returns true when the reversal result indicates a successful reversal.
 * A successful reversal has ResultCode === 0 (number).
 */
export function isReversalSuccess(result: ReversalResult): boolean {
  return result.Result.ResultCode === REVERSAL_RESULT_CODES.SUCCESS
}

/**
 * Returns true when the reversal result indicates a failure.
 */
export function isReversalFailure(result: ReversalResult): boolean {
  return !isReversalSuccess(result)
}

/**
 * Returns true when the specified result code is a known documented code.
 */
export function isKnownReversalResultCode(code: number | string): code is ReversalResultCode {
  return Object.values(REVERSAL_RESULT_CODES).includes(code as ReversalResultCode)
}

// ── Result extractors ─────────────────────────────────────────────────────────

/**
 * Extracts the M-PESA receipt number for the reversal transaction.
 * Returns null if the result does not contain a TransactionID.
 */
export function getReversalTransactionId(result: ReversalResult): string | null {
  return result.Result.TransactionID ?? null
}

/**
 * Extracts the ConversationID from the reversal result.
 */
export function getReversalConversationId(result: ReversalResult): string {
  return result.Result.ConversationID
}

/**
 * Extracts the OriginatorConversationID from the reversal result.
 */
export function getReversalOriginatorConversationId(result: ReversalResult): string {
  return result.Result.OriginatorConversationID
}

/**
 * Extracts the ResultCode from the reversal result.
 * Returns 0 for success, or a string/number error code for failure.
 */
export function getReversalResultCode(result: ReversalResult): number | string {
  return result.Result.ResultCode
}

/**
 * Extracts the ResultDesc from the reversal result.
 */
export function getReversalResultDesc(result: ReversalResult): string {
  return result.Result.ResultDesc
}

/**
 * Extracts a named parameter value from the ResultParameters of a successful
 * reversal callback. Returns undefined if absent or if the reversal failed.
 *
 * @example
 * const amount = getReversalResultParam(result, 'Amount')
 * const origTxId = getReversalResultParam(result, 'OriginalTransactionID')
 */
export function getReversalResultParam(
  result: ReversalResult,
  key: ReversalResultParameterKey,
): string | number | undefined {
  const params = result.Result.ResultParameters?.ResultParameter
  if (!params) return undefined
  return params.find((p) => p.Key === key)?.Value
}

/**
 * Extracts the reversed transaction amount from a successful reversal callback.
 */
export function getReversalAmount(result: ReversalResult): number | undefined {
  const val = getReversalResultParam(result, 'Amount')
  return val !== undefined ? Number(val) : undefined
}

/**
 * Extracts the original TransactionID that was reversed.
 * This is the M-PESA receipt number of the original C2B transaction.
 */
export function getReversalOriginalTransactionId(result: ReversalResult): string | undefined {
  const val = getReversalResultParam(result, 'OriginalTransactionID')
  return val !== undefined ? String(val) : undefined
}

/**
 * Extracts the CreditPartyPublicName from a successful reversal callback.
 * Format: "254705912645 - NICHOLAS JOHN SONGOK"
 */
export function getReversalCreditPartyPublicName(result: ReversalResult): string | undefined {
  const val = getReversalResultParam(result, 'CreditPartyPublicName')
  return val !== undefined ? String(val) : undefined
}

/**
 * Extracts the DebitPartyPublicName from a successful reversal callback.
 * Format: "600992 - Safaricom Daraja 992"
 */
export function getReversalDebitPartyPublicName(result: ReversalResult): string | undefined {
  const val = getReversalResultParam(result, 'DebitPartyPublicName')
  return val !== undefined ? String(val) : undefined
}

/**
 * Extracts the DebitAccountBalance from a successful reversal callback.
 * Format: "Utility Account|KES|7722179.62|7722179.62|0.00|0.00"
 */
export function getReversalDebitAccountBalance(result: ReversalResult): string | undefined {
  const val = getReversalResultParam(result, 'DebitAccountBalance')
  return val !== undefined ? String(val) : undefined
}

/**
 * Extracts the reversal completion timestamp.
 * Format: YYYYMMDDHHmmss (e.g. 20211114132711)
 */
export function getReversalCompletedTime(result: ReversalResult): number | undefined {
  const val = getReversalResultParam(result, 'TransCompletedTime')
  return val !== undefined ? Number(val) : undefined
}

/**
 * Extracts the Charge from a successful reversal callback.
 * Per docs: usually 0.00 for reversals.
 */
export function getReversalCharge(result: ReversalResult): number | undefined {
  const val = getReversalResultParam(result, 'Charge')
  return val !== undefined ? Number(val) : undefined
}

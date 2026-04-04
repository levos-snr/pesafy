/**
 * src/mpesa/reversal/index.ts
 *
 * Transaction Reversal module exports.
 *
 * Covers:
 *   - requestReversal()                — Submit a reversal request (POST /mpesa/reversal/v1/request)
 *   - REVERSAL_RESULT_CODES            — Async callback result code constants
 *   - REVERSAL_ERROR_CODES             — Synchronous API error code constants
 *   - REVERSAL_COMMAND_ID              — Fixed CommandID ("TransactionReversal")
 *   - REVERSAL_RECEIVER_IDENTIFIER_TYPE— Fixed identifier type ("11")
 *   - isReversalResult()               — Type guard for result callback shape
 *   - isReversalSuccess()              — True when ResultCode === 0
 *   - isReversalFailure()              — True when ResultCode !== 0
 *   - isKnownReversalResultCode()      — True when code is a documented result code
 *   - getReversalResultParam()         — Extract a ResultParameter value by key
 *   - getReversalTransactionId()       — Extract reversal receipt number
 *   - getReversalConversationId()      — Extract ConversationID
 *   - getReversalOriginatorConversationId() — Extract OriginatorConversationID
 *   - getReversalResultCode()          — Extract ResultCode (0 or string error)
 *   - getReversalResultDesc()          — Extract ResultDesc
 *   - getReversalAmount()              — Extract reversed Amount
 *   - getReversalOriginalTransactionId()— Extract OriginalTransactionID
 *   - getReversalCreditPartyPublicName()— Extract CreditPartyPublicName
 *   - getReversalDebitPartyPublicName() — Extract DebitPartyPublicName
 *   - getReversalDebitAccountBalance() — Extract DebitAccountBalance
 *   - getReversalCompletedTime()       — Extract TransCompletedTime
 *   - getReversalCharge()              — Extract Charge
 */

export { requestReversal } from './request'

export type {
  ReversalErrorCode,
  ReversalRequest,
  ReversalResponse,
  ReversalResult,
  ReversalResultCode,
  ReversalResultParameter,
  ReversalResultParameterKey,
} from './types'

export {
  // Constants
  REVERSAL_COMMAND_ID,
  REVERSAL_ERROR_CODES,
  REVERSAL_RECEIVER_IDENTIFIER_TYPE,
  REVERSAL_RESULT_CODES,
  // Type guards
  isKnownReversalResultCode,
  isReversalFailure,
  isReversalResult,
  isReversalSuccess,
  // Extractors
  getReversalAmount,
  getReversalCharge,
  getReversalCompletedTime,
  getReversalConversationId,
  getReversalCreditPartyPublicName,
  getReversalDebitAccountBalance,
  getReversalDebitPartyPublicName,
  getReversalOriginalTransactionId,
  getReversalOriginatorConversationId,
  getReversalResultCode,
  getReversalResultDesc,
  getReversalResultParam,
  getReversalTransactionId,
} from './types'

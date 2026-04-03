/**
 * src/mpesa/b2b-pay-bill/index.ts
 *
 * Business Pay Bill module exports.
 *
 * Covers:
 *   - Business Pay Bill initiation (initiateB2BPayBill)
 *   - Result type guards (isB2BPayBillResult, isB2BPayBillSuccess, isB2BPayBillFailure)
 *   - Error code helper (isKnownB2BPayBillResultCode)
 *   - Payload extractors (getB2BPayBillAmount, getB2BPayBillTransactionId, etc.)
 *   - Result code constants (B2B_PAY_BILL_RESULT_CODES, B2B_PAY_BILL_ERROR_CODES)
 *   - All payload types
 */

export { initiateB2BPayBill } from './payment'

export { B2B_PAY_BILL_ERROR_CODES, B2B_PAY_BILL_RESULT_CODES } from './types'

export type {
  B2BPayBillCommandID,
  B2BPayBillErrorCode,
  B2BPayBillErrorResponse,
  B2BPayBillReferenceItem,
  B2BPayBillRequest,
  B2BPayBillResponse,
  B2BPayBillResult,
  B2BPayBillResultCode,
  B2BPayBillResultParameter,
  B2BPayBillResultParameterKey,
} from './types'

export {
  getB2BPayBillAmount,
  getB2BPayBillBillReferenceNumber,
  getB2BPayBillCompletedTime,
  getB2BPayBillConversationId,
  getB2BPayBillCurrency,
  getB2BPayBillDebitAccountBalance,
  getB2BPayBillDebitPartyAffectedBalance,
  getB2BPayBillDebitPartyCharges,
  getB2BPayBillInitiatorBalance,
  getB2BPayBillOriginatorConversationId,
  getB2BPayBillReceiverName,
  getB2BPayBillResultCode,
  getB2BPayBillResultDesc,
  getB2BPayBillResultParam,
  getB2BPayBillTransactionId,
  isB2BPayBillFailure,
  isB2BPayBillResult,
  isB2BPayBillSuccess,
  isKnownB2BPayBillResultCode,
} from './webhooks'

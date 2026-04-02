/**
 * src/mpesa/b2c/index.ts
 *
 * Public API for the B2C Account Top Up module.
 * Aligned with Safaricom Daraja B2C Account Top Up documentation.
 */

export { initiateB2CPayment } from './payment'

export { B2C_ERROR_CODES, B2C_RESULT_CODES } from './types'

export type {
  B2CCommandID,
  B2CErrorCode,
  B2CErrorResponse,
  B2CRequest,
  B2CResponse,
  B2CResult,
  B2CResultCode,
  B2CResultParameter,
  B2CResultParameterKey,
} from './types'

export {
  getB2CAmount,
  getB2CCurrency,
  getB2CDebitAccountBalance,
  getB2CDebitPartyCharges,
  getB2CConversationId,
  getB2COriginatorConversationId,
  getB2CReceiverPublicName,
  getB2CResultDesc,
  getB2CResultParam,
  getB2CTransactionCompletedTime,
  getB2CTransactionId,
  isB2CFailure,
  isB2CResult,
  isB2CSuccess,
  isKnownB2CResultCode,
} from './webhooks'

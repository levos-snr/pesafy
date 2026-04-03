// src/mpesa/transaction-status/index.ts

export { queryTransactionStatus } from './query'
export {
  // Type guards
  isTransactionStatusFailure,
  isTransactionStatusResult,
  isTransactionStatusSuccess,
  isKnownTransactionStatusResultCode,
  // Core field extractors
  getTransactionStatusConversationId,
  getTransactionStatusOriginatorConversationId,
  getTransactionStatusResultCode,
  getTransactionStatusResultDesc,
  getTransactionStatusTransactionId,
  // Result parameter extractors
  getTransactionStatusAmount,
  getTransactionStatusCreditPartyName,
  getTransactionStatusDebitAccountBalance,
  getTransactionStatusDebitPartyName,
  getTransactionStatusReceiptNo,
  getTransactionStatusResultParam,
  getTransactionStatusStatus,
  getTransactionStatusTransactionDate,
} from './webhooks'
export type {
  TransactionStatusErrorCode,
  TransactionStatusRequest,
  TransactionStatusResponse,
  TransactionStatusResult,
  TransactionStatusResultCode,
  TransactionStatusResultParameter,
  TransactionStatusResultParameterKey,
} from './types'
export { TRANSACTION_STATUS_ERROR_CODES, TRANSACTION_STATUS_RESULT_CODES } from './types'

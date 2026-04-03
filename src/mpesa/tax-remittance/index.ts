// src/mpesa/tax-remittance/index.ts

export { KRA_SHORTCODE, remitTax, TAX_COMMAND_ID } from './remit-tax'

export {
  getTaxAmount,
  getTaxCompletedTime,
  getTaxConversationId,
  getTaxOriginatorConversationId,
  getTaxReceiverName,
  getTaxResultCode,
  getTaxResultDesc,
  getTaxResultParam,
  getTaxTransactionId,
  isTaxRemittanceFailure,
  isTaxRemittanceResult,
  isTaxRemittanceSuccess,
} from './webhooks'

export type {
  TaxRemittanceErrorResponse,
  TaxRemittanceRequest,
  TaxRemittanceResponse,
  TaxRemittanceResult,
  TaxRemittanceResultParameter,
  TaxRemittanceResultParameterKey,
} from './types'

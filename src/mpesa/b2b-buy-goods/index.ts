/**
 * src/mpesa/b2b-buy-goods/index.ts
 *
 * Business Buy Goods module exports.
 *
 * Covers:
 *   - Business Buy Goods initiation (initiateB2BBuyGoods)
 *   - Result type guards (isB2BBuyGoodsResult, isB2BBuyGoodsSuccess, isB2BBuyGoodsFailure)
 *   - Error code helper (isKnownB2BBuyGoodsResultCode)
 *   - Payload extractors (getB2BBuyGoodsAmount, getB2BBuyGoodsTransactionId, etc.)
 *   - Result code constants (B2B_BUY_GOODS_RESULT_CODES, B2B_BUY_GOODS_ERROR_CODES)
 *   - All payload types
 */

export { initiateB2BBuyGoods } from './payment'

export { B2B_BUY_GOODS_ERROR_CODES, B2B_BUY_GOODS_RESULT_CODES } from './types'

export type {
  B2BBuyGoodsCommandID,
  B2BBuyGoodsErrorCode,
  B2BBuyGoodsErrorResponse,
  B2BBuyGoodsReferenceItem,
  B2BBuyGoodsRequest,
  B2BBuyGoodsResponse,
  B2BBuyGoodsResult,
  B2BBuyGoodsResultCode,
  B2BBuyGoodsResultParameter,
  B2BBuyGoodsResultParameterKey,
} from './types'

export {
  getB2BBuyGoodsAmount,
  getB2BBuyGoodsBillReferenceNumber,
  getB2BBuyGoodsCompletedTime,
  getB2BBuyGoodsConversationId,
  getB2BBuyGoodsCurrency,
  getB2BBuyGoodsDebitAccountBalance,
  getB2BBuyGoodsDebitPartyAffectedBalance,
  getB2BBuyGoodsDebitPartyCharges,
  getB2BBuyGoodsInitiatorBalance,
  getB2BBuyGoodsOriginatorConversationId,
  getB2BBuyGoodsQueueTimeoutUrl,
  getB2BBuyGoodsReceiverName,
  getB2BBuyGoodsResultCode,
  getB2BBuyGoodsResultDesc,
  getB2BBuyGoodsResultParam,
  getB2BBuyGoodsTransactionId,
  isB2BBuyGoodsFailure,
  isB2BBuyGoodsResult,
  isB2BBuyGoodsSuccess,
  isKnownB2BBuyGoodsResultCode,
} from './webhooks'

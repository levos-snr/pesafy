/**
 * src/mpesa/b2b-express-checkout/index.ts
 *
 * B2B Express Checkout (USSD Push to Till) module exports.
 *
 * Covers:
 *   - USSD push initiation (initiateB2BExpressCheckout)
 *   - Callback type guards (isB2BCheckoutCallback, isB2BCheckoutSuccess,
 *     isB2BCheckoutCancelled, isB2BCheckoutFailed)
 *   - Error code helper (isKnownB2BResultCode)
 *   - Payload extractors (getB2BTransactionId, getB2BAmount, etc.)
 *   - Error code constants (B2B_RESULT_CODES)
 *   - All payload types
 */

export { initiateB2BExpressCheckout } from './initiate'

export { B2B_RESULT_CODES } from './types'
export type {
  B2BExpressCheckoutCallback,
  B2BExpressCheckoutCallbackCancelled,
  B2BExpressCheckoutCallbackFailed,
  B2BExpressCheckoutCallbackSuccess,
  B2BExpressCheckoutErrorCode,
  B2BExpressCheckoutErrorResponse,
  B2BExpressCheckoutRequest,
  B2BExpressCheckoutResponse,
  B2BResultCode,
} from './types'

export {
  getB2BAmount,
  getB2BConversationId,
  getB2BPaymentReference,
  getB2BRequestId,
  getB2BResultCode,
  getB2BResultDesc,
  getB2BTransactionId,
  isB2BCheckoutCallback,
  isB2BCheckoutCancelled,
  isB2BCheckoutFailed,
  isB2BCheckoutSuccess,
  isB2BStatusSuccess,
  isKnownB2BResultCode,
} from './webhooks'

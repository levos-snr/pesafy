// src/mpesa/b2b-express-checkout/index.ts

/**
 * B2B Express Checkout module exports
 *
 * Enables vendors to initiate a USSD Push to a merchant's till, causing the
 * merchant to be prompted to pay from their till to the vendor's Paybill.
 *
 * API: POST /v1/ussdpush/get-msisdn
 * Sandbox: https://sandbox.safaricom.co.ke/v1/ussdpush/get-msisdn
 *
 * Supports:
 *   - initiateB2BExpressCheckout() — trigger USSD Push to merchant's till
 *   - isB2BCheckoutSuccess()       — type guard: successful callback
 *   - isB2BCheckoutCancelled()     — type guard: merchant cancelled
 *   - isB2BCheckoutCallback()      — runtime payload validator
 *   - getB2BTransactionId()        — extract M-PESA receipt from callback
 *   - getB2BAmount()               — extract amount from callback
 *   - getB2BRequestId()            — extract requestId for correlation
 *   - getB2BConversationId()       — extract conversationID from callback
 *
 * Authentication:
 *   Standard OAuth credentials only (consumerKey + consumerSecret).
 *   No initiatorName or SecurityCredential required.
 *
 * Prerequisites (from Daraja docs):
 *   - Merchant's till (primaryShortCode) must have a Nominated Number
 *     configured in M-PESA Web Portal. Error 4104 = Nominated Number missing.
 *   - Merchant KYC must be valid. Error 4102 = KYC fail.
 *
 * Error codes:
 *   4104 — Missing Nominated Number → configure in M-PESA Web Portal
 *   4102 — Merchant KYC Fail        → provide valid KYC
 *   4201 — USSD Network Error       → retry on stable network
 *   4203 — USSD Exception Error     → retry on stable network
 *   4001 — User cancelled           → async callback only, not a thrown error
 */

export { initiateB2BExpressCheckout } from './initiate'
export type {
  B2BExpressCheckoutCallback,
  B2BExpressCheckoutCallbackCancelled,
  B2BExpressCheckoutCallbackSuccess,
  B2BExpressCheckoutErrorCode,
  B2BExpressCheckoutErrorResponse,
  B2BExpressCheckoutRequest,
  B2BExpressCheckoutResponse,
} from './types'
export {
  getB2BAmount,
  getB2BConversationId,
  getB2BRequestId,
  getB2BTransactionId,
  isB2BCheckoutCallback,
  isB2BCheckoutCancelled,
  isB2BCheckoutSuccess,
} from './webhooks'

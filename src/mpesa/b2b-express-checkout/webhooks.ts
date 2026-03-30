// src/mpesa/b2b-express-checkout/webhooks.ts

/**
 * B2B Express Checkout webhook helpers
 *
 * Utilities for parsing and handling B2B Express Checkout callbacks.
 *
 * Two callback scenarios (both POSTed to your callbackUrl):
 *
 *   Cancelled — resultCode "4001": merchant cancelled the USSD prompt.
 *   Successful — resultCode "0": M-PESA transaction completed.
 *
 * Always respond HTTP 200 immediately — log errors internally.
 *
 * Ref: B2B Express CheckOut — Daraja Developer Portal (USSD Callback Response)
 */

import type {
  B2BExpressCheckoutCallback,
  B2BExpressCheckoutCallbackSuccess,
} from './types'

// ── Type guards ───────────────────────────────────────────────────────────────

/**
 * Returns true if the callback represents a successful B2B transaction.
 * A successful callback has resultCode "0" and includes a transactionId.
 */
export function isB2BCheckoutSuccess(
  callback: B2BExpressCheckoutCallback,
): callback is B2BExpressCheckoutCallbackSuccess {
  return callback.resultCode === '0'
}

/**
 * Returns true if the merchant cancelled the USSD prompt.
 * resultCode "4001" = "User cancelled transaction"
 */
export function isB2BCheckoutCancelled(
  callback: B2BExpressCheckoutCallback,
): boolean {
  return callback.resultCode === '4001'
}

/**
 * Runtime type guard — checks if a body looks like a B2B Express Checkout callback.
 * Use this in your callback route before casting the body.
 */
export function isB2BCheckoutCallback(
  body: unknown,
): body is B2BExpressCheckoutCallback {
  if (!body || typeof body !== 'object') return false
  const b = body as Record<string, unknown>
  return (
    typeof b['resultCode'] === 'string' &&
    typeof b['requestId'] === 'string' &&
    typeof b['amount'] === 'string'
  )
}

// ── Convenience extractors ────────────────────────────────────────────────────

/**
 * Extracts the M-PESA receipt number from a successful callback.
 * Returns null if the callback is not a success.
 */
export function getB2BTransactionId(
  callback: B2BExpressCheckoutCallback,
): string | null {
  if (!isB2BCheckoutSuccess(callback)) return null
  return callback.transactionId ?? null
}

/**
 * Extracts the transaction amount as a number from any B2B callback.
 */
export function getB2BAmount(callback: B2BExpressCheckoutCallback): number {
  return Number(callback.amount)
}

/**
 * Extracts the requestId from any B2B callback.
 * Use this to correlate the callback with your original request.
 */
export function getB2BRequestId(callback: B2BExpressCheckoutCallback): string {
  return callback.requestId
}

/**
 * Extracts the conversationID from a successful callback.
 * Returns null if the callback is not a success.
 */
export function getB2BConversationId(
  callback: B2BExpressCheckoutCallback,
): string | null {
  if (!isB2BCheckoutSuccess(callback)) return null
  return callback.conversationID ?? null
}

/**
 * src/mpesa/b2b-express-checkout/webhooks.ts
 *
 * B2B Express Checkout callback (webhook) helpers.
 * Strictly aligned with Safaricom Daraja B2B Express Checkout documentation.
 *
 * All callbacks are discriminated on `resultCode`:
 *   "0"    → success  (B2BExpressCheckoutCallbackSuccess)
 *   "4001" → cancelled (B2BExpressCheckoutCallbackCancelled)
 *   other  → failed   (B2BExpressCheckoutCallbackFailed)
 */

import {
  B2B_RESULT_CODES,
  type B2BExpressCheckoutCallback,
  type B2BExpressCheckoutCallbackCancelled,
  type B2BExpressCheckoutCallbackFailed,
  type B2BExpressCheckoutCallbackSuccess,
  type B2BResultCode,
} from './types'

// ── Known result codes set (for O(1) lookup) ──────────────────────────────────

const KNOWN_RESULT_CODES = new Set<string>(Object.values(B2B_RESULT_CODES))

// ── Runtime type guard ─────────────────────────────────────────────────────────

/**
 * Runtime type guard — returns true if `body` looks like a valid B2B
 * Express Checkout callback payload.
 *
 * Use this in your callback route before casting the body:
 * @example
 * app.post('/mpesa/b2b/callback', (req, res) => {
 *   if (!isB2BCheckoutCallback(req.body)) {
 *     return res.status(400).json({ error: 'unrecognised payload' })
 *   }
 *   // safe to use as B2BExpressCheckoutCallback
 * })
 */
export function isB2BCheckoutCallback(body: unknown): body is B2BExpressCheckoutCallback {
  if (!body || typeof body !== 'object') return false
  const b = body as Record<string, unknown>
  return (
    typeof b['resultCode'] === 'string' &&
    typeof b['requestId'] === 'string' &&
    typeof b['amount'] === 'string'
  )
}

// ── Success type guard ────────────────────────────────────────────────────────

/**
 * Returns true when the B2B callback represents a SUCCESSFUL transaction.
 * A successful callback has resultCode "0" and includes transactionId.
 *
 * Per Daraja docs:
 * {
 *   "resultCode":    "0",
 *   "resultDesc":    "The service request is processed successfully.",
 *   "transactionId": "RDQ01NFT1Q",
 *   "status":        "SUCCESS",
 *   ...
 * }
 */
export function isB2BCheckoutSuccess(
  callback: B2BExpressCheckoutCallback,
): callback is B2BExpressCheckoutCallbackSuccess {
  return callback.resultCode === B2B_RESULT_CODES.SUCCESS
}

// ── Cancelled type guard ──────────────────────────────────────────────────────

/**
 * Returns true when the merchant CANCELLED the USSD prompt.
 * resultCode "4001" = "User cancelled transaction".
 *
 * Per Daraja docs:
 * {
 *   "resultCode":       "4001",
 *   "resultDesc":       "User cancelled transaction",
 *   "paymentReference": "MAndbubry3hi",
 *   ...
 * }
 */
export function isB2BCheckoutCancelled(
  callback: B2BExpressCheckoutCallback,
): callback is B2BExpressCheckoutCallbackCancelled {
  return callback.resultCode === B2B_RESULT_CODES.CANCELLED
}

// ── Failed type guard ─────────────────────────────────────────────────────────

/**
 * Returns true when the callback represents any non-success outcome.
 * This covers cancelled (4001) AND all other error codes
 * (4102, 4104, 4201, 4203, etc.).
 */
export function isB2BCheckoutFailed(callback: B2BExpressCheckoutCallback): boolean {
  return callback.resultCode !== B2B_RESULT_CODES.SUCCESS
}

// ── Error code helper ─────────────────────────────────────────────────────────

/**
 * Returns true if the given result code is one of the documented B2B codes.
 *
 * Documented codes:
 *   "0"    — SUCCESS
 *   "4001" — CANCELLED (user cancelled USSD)
 *   "4102" — KYC_FAIL (merchant KYC failure)
 *   "4104" — NO_NOMINATED_NUMBER (configure in M-PESA portal)
 *   "4201" — USSD_NETWORK_ERROR (retry on stable network)
 *   "4203" — USSD_EXCEPTION_ERROR (retry on stable network)
 */
export function isKnownB2BResultCode(code: string): code is B2BResultCode {
  return KNOWN_RESULT_CODES.has(code)
}

// ── Payload extractors ────────────────────────────────────────────────────────

/**
 * Returns the result code from any B2B callback.
 */
export function getB2BResultCode(callback: B2BExpressCheckoutCallback): string {
  return callback.resultCode
}

/**
 * Returns the result description from any B2B callback.
 */
export function getB2BResultDesc(callback: B2BExpressCheckoutCallback): string {
  return callback.resultDesc
}

/**
 * Returns the requestId from any B2B callback.
 * Use this to correlate the callback with your original request.
 */
export function getB2BRequestId(callback: B2BExpressCheckoutCallback): string {
  return callback.requestId
}

/**
 * Returns the transaction amount as a number from any B2B callback.
 * Daraja sends amount as a string (e.g. "71.0"); this converts it to number.
 */
export function getB2BAmount(callback: B2BExpressCheckoutCallback): number {
  return Number(callback.amount)
}

/**
 * Returns the M-PESA receipt number from a SUCCESSFUL callback.
 * Returns null if the callback is not a success.
 */
export function getB2BTransactionId(callback: B2BExpressCheckoutCallback): string | null {
  if (!isB2BCheckoutSuccess(callback)) return null
  return (callback as B2BExpressCheckoutCallbackSuccess).transactionId ?? null
}

/**
 * Returns the M-PESA conversationID from a SUCCESSFUL callback.
 * Returns null if the callback is not a success.
 */
export function getB2BConversationId(callback: B2BExpressCheckoutCallback): string | null {
  if (!isB2BCheckoutSuccess(callback)) return null
  return (callback as B2BExpressCheckoutCallbackSuccess).conversationID ?? null
}

/**
 * Returns the paymentReference from a CANCELLED callback.
 * Returns null if the callback is not a cancellation.
 *
 * Per Daraja docs: "paymentReference" is only present on cancelled callbacks.
 */
export function getB2BPaymentReference(callback: B2BExpressCheckoutCallback): string | null {
  if (!isB2BCheckoutCancelled(callback)) return null
  return (callback as B2BExpressCheckoutCallbackCancelled).paymentReference ?? null
}

/**
 * Returns true if the transaction status is "SUCCESS".
 * Only meaningful for success callbacks — always false otherwise.
 */
export function isB2BStatusSuccess(callback: B2BExpressCheckoutCallback): boolean {
  if (!isB2BCheckoutSuccess(callback)) return false
  return (callback as B2BExpressCheckoutCallbackSuccess).status === 'SUCCESS'
}

export function isB2BCheckoutFailedCode(
  callback: B2BExpressCheckoutCallback,
): callback is B2BExpressCheckoutCallbackFailed {
  return !isB2BCheckoutSuccess(callback) && !isB2BCheckoutCancelled(callback)
}

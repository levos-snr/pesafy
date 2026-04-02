/**
 * src/mpesa/b2c/webhooks.ts
 *
 * Type guards and payload extractors for B2C Account Top Up result callbacks.
 *
 * Result parameters are aligned strictly to Safaricom Daraja documentation:
 *   - DebitAccountBalance
 *   - Amount
 *   - Currency
 *   - ReceiverPartyPublicName
 *   - TransactionCompletedTime
 *   - DebitPartyCharges
 *
 * Docs note: ResultCode is "0" (string) on success but 2001 (number) on
 * failure — both forms are handled by the type guard.
 */

import { B2C_RESULT_CODES } from './types'
import type { B2CResult, B2CResultParameter } from './types'

// ── Type guards ───────────────────────────────────────────────────────────────

/**
 * Runtime type guard — checks if a body looks like a B2C result callback.
 * Validates the minimum documented structure.
 */
export function isB2CResult(body: unknown): body is B2CResult {
  if (!body || typeof body !== 'object') return false
  const b = body as Record<string, unknown>
  if (!b['Result'] || typeof b['Result'] !== 'object') return false
  const result = b['Result'] as Record<string, unknown>
  return (
    (typeof result['ResultCode'] === 'number' || typeof result['ResultCode'] === 'string') &&
    typeof result['ConversationID'] === 'string' &&
    typeof result['OriginatorConversationID'] === 'string'
  )
}

/**
 * Returns true if the B2C result represents a successful transaction.
 * Handles both string "0" (documented in success sample) and number 0.
 */
export function isB2CSuccess(result: B2CResult): boolean {
  const code = result.Result.ResultCode
  return code === 0 || code === '0'
}

/**
 * Returns true if the B2C result represents a failure.
 * Handles both string "0" (documented in success sample) and number 0.
 */
export function isB2CFailure(result: B2CResult): boolean {
  return !isB2CSuccess(result)
}

/**
 * Returns true if the result code matches a known documented code.
 * Empty strings are explicitly rejected — Number('') coerces to 0 which
 * would otherwise incorrectly match B2C_RESULT_CODES.SUCCESS.
 */
export function isKnownB2CResultCode(code: unknown): boolean {
  if (typeof code !== 'number' && typeof code !== 'string') return false
  if (typeof code === 'string' && code.trim() === '') return false
  const numeric = Number(code)
  return Object.values(B2C_RESULT_CODES).includes(numeric as 0 | 2001)
}

// ── Core field extractors ─────────────────────────────────────────────────────

/**
 * Extracts the M-PESA transaction ID from a B2C result.
 * Present on both success and failure (generic ID on failure).
 */
export function getB2CTransactionId(result: B2CResult): string | null {
  return result.Result.TransactionID ?? null
}

/**
 * Extracts the ConversationID from a B2C result.
 */
export function getB2CConversationId(result: B2CResult): string {
  return result.Result.ConversationID
}

/**
 * Extracts the OriginatorConversationID from a B2C result.
 * Use this to correlate with the original API call response.
 */
export function getB2COriginatorConversationId(result: B2CResult): string {
  return result.Result.OriginatorConversationID
}

/**
 * Extracts the result description (human-readable status).
 */
export function getB2CResultDesc(result: B2CResult): string {
  return result.Result.ResultDesc
}

// ── Result parameter extractors (documented fields only) ──────────────────────

/**
 * Extracts the transaction amount from B2C result parameters.
 * Documented field: "Amount"
 * Returns null if not present (e.g. on failure).
 */
export function getB2CAmount(result: B2CResult): number | null {
  const value = getB2CResultParam(result, 'Amount')
  if (value === undefined) return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

/**
 * Extracts the transaction currency from B2C result parameters.
 * Documented field: "Currency"
 * Returns "KES" as default when not present.
 */
export function getB2CCurrency(result: B2CResult): string {
  const value = getB2CResultParam(result, 'Currency')
  if (value === undefined || value === '') return 'KES'
  return String(value)
}

/**
 * Extracts the receiver's public name from B2C result parameters.
 * Documented field: "ReceiverPartyPublicName"
 * Returns null if not present.
 */
export function getB2CReceiverPublicName(result: B2CResult): string | null {
  const value = getB2CResultParam(result, 'ReceiverPartyPublicName')
  if (value === undefined) return null
  return String(value)
}

/**
 * Extracts the transaction completion timestamp from B2C result parameters.
 * Documented field: "TransactionCompletedTime" — format: YYYYMMDDHHmmss
 * Returns null if not present.
 */
export function getB2CTransactionCompletedTime(result: B2CResult): string | null {
  const value = getB2CResultParam(result, 'TransactionCompletedTime')
  if (value === undefined) return null
  return String(value)
}

/**
 * Extracts the debit account balance from B2C result parameters.
 * Documented field: "DebitAccountBalance" (e.g. "{CurrencyCode=KES}")
 * Returns null if not present.
 */
export function getB2CDebitAccountBalance(result: B2CResult): string | null {
  const value = getB2CResultParam(result, 'DebitAccountBalance')
  if (value === undefined) return null
  return String(value)
}

/**
 * Extracts the debit party charges from B2C result parameters.
 * Documented field: "DebitPartyCharges"
 * Returns null if not present or empty.
 */
export function getB2CDebitPartyCharges(result: B2CResult): string | null {
  const value = getB2CResultParam(result, 'DebitPartyCharges')
  if (value === undefined || value === '') return null
  return String(value)
}

// ── Internal helper ───────────────────────────────────────────────────────────

/**
 * Extracts a named value from B2C result parameters.
 * Handles both single-object and array forms of ResultParameter
 * (Daraja returns either depending on how many parameters are present).
 * Returns undefined if key is absent or no ResultParameters exist.
 */
export function getB2CResultParam(result: B2CResult, key: string): string | number | undefined {
  const params = result.Result.ResultParameters?.ResultParameter
  if (!params) return undefined

  // ResultParameter may be a single object or an array
  const paramArray = Array.isArray(params)
    ? (params as B2CResultParameter[])
    : [params as B2CResultParameter]

  const item = paramArray.find((p) => p.Key === key)
  return item?.Value
}

// src/mpesa/b2c/webhooks.ts

/**
 * B2C Webhook / Result Helpers
 *
 * Utilities for parsing and handling B2C result callbacks POSTed to your ResultURL.
 *
 * Two result scenarios:
 *   Successful — ResultCode 0, includes TransactionID and ResultParameters
 *   Failed     — ResultCode non-zero (e.g. 2001 = invalid initiator info)
 *
 * Always respond HTTP 200 immediately — process the result asynchronously.
 *
 * Common ResultCodes:
 *   0    — Success
 *   2001 — The initiator information is invalid
 *
 * Ref: B2C Account Top Up — Daraja Developer Portal (Result Body section)
 */

import type { B2CResult, B2CResultParameter } from './types'

// ── Type guards ───────────────────────────────────────────────────────────────

/**
 * Runtime type guard — checks if a body looks like a B2C result callback.
 */
export function isB2CResult(body: unknown): body is B2CResult {
  if (!body || typeof body !== 'object') return false
  const b = body as Record<string, unknown>
  if (!b['Result'] || typeof b['Result'] !== 'object') return false
  const result = b['Result'] as Record<string, unknown>
  return (
    typeof result['ResultCode'] === 'number' &&
    typeof result['ConversationID'] === 'string'
  )
}

/**
 * Returns true if the B2C result represents a successful transaction.
 */
export function isB2CSuccess(result: B2CResult): boolean {
  return result.Result.ResultCode === 0
}

/**
 * Returns true if the B2C result represents a failure.
 */
export function isB2CFailure(result: B2CResult): boolean {
  return result.Result.ResultCode !== 0
}

// ── Convenience extractors ────────────────────────────────────────────────────

/**
 * Extracts the M-PESA transaction ID from a B2C result.
 * Returns null if not present.
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

/**
 * Extracts the transaction amount from the B2C result parameters.
 * Returns null if not present (e.g. on failure).
 */
export function getB2CAmount(result: B2CResult): number | null {
  const value = getB2CResultParam(result, 'Amount')
  if (value === undefined) return null
  return Number(value)
}

/**
 * Extracts the transaction completion time from B2C result parameters.
 * Format: YYYYMMDDHHmmss
 * Returns null if not present.
 */
export function getB2CTransactionCompletedTime(
  result: B2CResult,
): string | null {
  const value = getB2CResultParam(result, 'TransCompletedTime')
  if (value === undefined) return null
  return String(value)
}

/**
 * Extracts the debit party charges from B2C result parameters.
 * Returns null if not present or empty.
 */
export function getB2CDebitPartyCharges(result: B2CResult): string | null {
  const value = getB2CResultParam(result, 'DebitPartyCharges')
  if (value === undefined || value === '') return null
  return String(value)
}

/**
 * Extracts the receiver's public name from B2C result parameters.
 * Returns null if not present.
 */
export function getB2CReceiverPublicName(result: B2CResult): string | null {
  const value = getB2CResultParam(result, 'ReceiverPartyPublicName')
  if (value === undefined) return null
  return String(value)
}

/**
 * Extracts the currency from B2C result parameters.
 * Returns "KES" as default if not present.
 */
export function getB2CCurrency(result: B2CResult): string {
  const value = getB2CResultParam(result, 'Currency')
  if (value === undefined) return 'KES'
  return String(value)
}

/**
 * Extracts the debit account balance from B2C result parameters.
 * Returns null if not present.
 */
export function getB2CDebitAccountBalance(result: B2CResult): string | null {
  const value = getB2CResultParam(result, 'DebitAccountBalance')
  if (value === undefined) return null
  return String(value)
}

/**
 * Extracts the initiator account current balance from B2C result parameters.
 * Returns null if not present.
 */
export function getB2CInitiatorAccountBalance(
  result: B2CResult,
): string | null {
  const value = getB2CResultParam(result, 'InitiatorAccountCurrentBalance')
  if (value === undefined) return null
  return String(value)
}

// ── Internal helper ───────────────────────────────────────────────────────────

/**
 * Extracts a named value from B2C result parameters.
 * Handles both single-object and array forms of ResultParameter.
 * Returns undefined if key is absent.
 */
export function getB2CResultParam(
  result: B2CResult,
  key: string,
): string | number | undefined {
  const params = result.Result.ResultParameters?.ResultParameter
  if (!params) return undefined

  // ResultParameter can be a single object or an array (Daraja inconsistency)
  const paramArray = Array.isArray(params) ? params : [params]
  const item = (paramArray as B2CResultParameter[]).find((p) => p.Key === key)
  return item?.Value
}

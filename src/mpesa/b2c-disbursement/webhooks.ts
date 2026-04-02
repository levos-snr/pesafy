/**
 * src/mpesa/b2c-disbursement/webhooks.ts
 *
 * Type guards and payload extractors for B2C Disbursement result callbacks.
 */

import { B2C_DISBURSEMENT_RESULT_CODES } from './types'
import type { B2CDisbursementResult, B2CDisbursementResultParameter } from './types'

// ── Type guards ───────────────────────────────────────────────────────────────

export function isB2CDisbursementResult(body: unknown): body is B2CDisbursementResult {
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

export function isB2CDisbursementSuccess(result: B2CDisbursementResult): boolean {
  const code = result.Result.ResultCode
  return code === 0 || code === '0'
}

export function isB2CDisbursementFailure(result: B2CDisbursementResult): boolean {
  return !isB2CDisbursementSuccess(result)
}

/**
 * Returns true if the result code is among the 14 documented codes.
 * Handles both numeric codes and the string code "SFC_IC0003".
 * Rejects empty strings (Number('') → 0 which would falsely match SUCCESS).
 */
export function isKnownB2CDisbursementResultCode(code: unknown): boolean {
  if (code === null || code === undefined) return false
  if (typeof code !== 'number' && typeof code !== 'string') return false

  // String code check first (SFC_IC0003 is the only non-numeric documented code)
  if (typeof code === 'string' && code === B2C_DISBURSEMENT_RESULT_CODES.OPERATOR_DOES_NOT_EXIST) {
    return true
  }

  // Reject blank strings before numeric coercion
  if (typeof code === 'string' && code.trim() === '') return false

  const numeric = Number(code)
  const numericCodes = Object.values(B2C_DISBURSEMENT_RESULT_CODES).filter(
    (v) => typeof v === 'number',
  ) as number[]

  return numericCodes.includes(numeric)
}

// ── Field extractors ──────────────────────────────────────────────────────────

export function getB2CDisbursementTransactionId(result: B2CDisbursementResult): string | null {
  return result.Result.TransactionID ?? null
}

export function getB2CDisbursementConversationId(result: B2CDisbursementResult): string {
  return result.Result.ConversationID
}

export function getB2CDisbursementOriginatorConversationId(result: B2CDisbursementResult): string {
  return result.Result.OriginatorConversationID
}

export function getB2CDisbursementResultDesc(result: B2CDisbursementResult): string {
  return result.Result.ResultDesc
}

export function getB2CDisbursementResultCode(result: B2CDisbursementResult): number | string {
  return result.Result.ResultCode
}

// ── Result parameter extractors ───────────────────────────────────────────────

export function getB2CDisbursementResultParam(
  result: B2CDisbursementResult,
  key: string,
): string | number | undefined {
  const params = result.Result.ResultParameters?.ResultParameter
  if (!params) return undefined
  const arr = Array.isArray(params)
    ? (params as B2CDisbursementResultParameter[])
    : [params as B2CDisbursementResultParameter]
  return arr.find((p) => p.Key === key)?.Value
}

export function getB2CDisbursementAmount(result: B2CDisbursementResult): number | null {
  const value = getB2CDisbursementResultParam(result, 'TransactionAmount')
  if (value === undefined) return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

export function getB2CDisbursementReceiptNumber(result: B2CDisbursementResult): string | null {
  const value = getB2CDisbursementResultParam(result, 'TransactionReceipt')
  if (value === undefined) return null
  return String(value)
}

export function getB2CDisbursementReceiverName(result: B2CDisbursementResult): string | null {
  const value = getB2CDisbursementResultParam(result, 'ReceiverPartyPublicName')
  if (value === undefined) return null
  return String(value)
}

export function getB2CDisbursementCompletedTime(result: B2CDisbursementResult): string | null {
  const value = getB2CDisbursementResultParam(result, 'TransactionCompletedDateTime')
  if (value === undefined) return null
  return String(value)
}

export function getB2CDisbursementUtilityBalance(result: B2CDisbursementResult): number | null {
  const value = getB2CDisbursementResultParam(result, 'B2CUtilityAccountAvailableFunds')
  if (value === undefined) return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

export function getB2CDisbursementWorkingBalance(result: B2CDisbursementResult): number | null {
  const value = getB2CDisbursementResultParam(result, 'B2CWorkingAccountAvailableFunds')
  if (value === undefined) return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

export function isB2CDisbursementRecipientRegistered(
  result: B2CDisbursementResult,
): boolean | null {
  const value = getB2CDisbursementResultParam(result, 'B2CRecipientIsRegisteredCustomer')
  if (value === undefined) return null
  return String(value).toUpperCase() === 'Y'
}

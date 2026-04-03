// src/mpesa/tax-remittance/webhooks.ts

import type {
  TaxRemittanceResult,
  TaxRemittanceResultParameter,
  TaxRemittanceResultParameterKey,
} from './types'

// ── Internal helpers ──────────────────────────────────────────────────────────

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normaliseResultCode(code: string | number): number {
  return typeof code === 'string' ? Number(code) : code
}

// ── Runtime type guard ────────────────────────────────────────────────────────

/**
 * Returns `true` when the value is a valid Tax Remittance async result payload
 * (the shape POSTed by Safaricom to your ResultURL).
 *
 * Checks the minimum required fields per the Daraja documentation:
 *   - Result.ResultCode
 *   - Result.ConversationID
 *   - Result.OriginatorConversationID
 */
export function isTaxRemittanceResult(value: unknown): value is TaxRemittanceResult {
  if (!isObject(value)) return false

  const root = value as Record<string, unknown>
  if (!isObject(root['Result'])) return false

  const result = root['Result'] as Record<string, unknown>
  return (
    result['ResultCode'] !== undefined &&
    result['ResultCode'] !== null &&
    typeof result['ConversationID'] === 'string' &&
    typeof result['OriginatorConversationID'] === 'string'
  )
}

// ── Success / failure type guards ─────────────────────────────────────────────

/**
 * Returns `true` when the Tax Remittance result indicates a successful
 * transaction — i.e. ResultCode is 0 or "0".
 */
export function isTaxRemittanceSuccess(result: TaxRemittanceResult): boolean {
  return normaliseResultCode(result.Result.ResultCode) === 0
}

/**
 * Returns `true` when the Tax Remittance result indicates a failure
 * — i.e. ResultCode is non-zero.
 *
 * `isTaxRemittanceSuccess` and `isTaxRemittanceFailure` are mutually exclusive.
 */
export function isTaxRemittanceFailure(result: TaxRemittanceResult): boolean {
  return !isTaxRemittanceSuccess(result)
}

// ── Result parameter extractor ────────────────────────────────────────────────

/**
 * Extracts a single value from the Result's ResultParameter collection.
 *
 * Handles both the array form and the single-object form that Daraja may return.
 * Returns `undefined` when the key is not found or ResultParameters is absent.
 *
 * Documented result parameter keys:
 *   - `Amount`
 *   - `TransactionCompletedTime`
 *   - `ReceiverPartyPublicName`
 */
export function getTaxResultParam(
  result: TaxRemittanceResult,
  key: TaxRemittanceResultParameterKey,
): string | number | undefined {
  const params = result.Result.ResultParameters?.ResultParameter
  if (params === undefined || params === null) return undefined

  if (Array.isArray(params)) {
    return (params as TaxRemittanceResultParameter[]).find((p) => p.Key === key)?.Value
  }

  // Single-object form
  const single = params as TaxRemittanceResultParameter
  return single.Key === key ? single.Value : undefined
}

// ── Field extractors ──────────────────────────────────────────────────────────

/**
 * Returns the ResultCode as-is (string or number) from the result payload.
 */
export function getTaxResultCode(result: TaxRemittanceResult): string | number {
  return result.Result.ResultCode
}

/**
 * Returns the ResultDesc from the result payload.
 */
export function getTaxResultDesc(result: TaxRemittanceResult): string {
  return result.Result.ResultDesc
}

/**
 * Returns the TransactionID (M-PESA receipt number) from the result payload.
 */
export function getTaxTransactionId(result: TaxRemittanceResult): string {
  return result.Result.TransactionID
}

/**
 * Returns the ConversationID from the result payload.
 */
export function getTaxConversationId(result: TaxRemittanceResult): string {
  return result.Result.ConversationID
}

/**
 * Returns the OriginatorConversationID from the result payload.
 */
export function getTaxOriginatorConversationId(result: TaxRemittanceResult): string {
  return result.Result.OriginatorConversationID
}

/**
 * Returns the remitted Amount as a number, or `null` when ResultParameters
 * is absent (e.g. on failure callbacks).
 *
 * Documented key: `Amount` — Daraja returns it as a string like "190.00".
 */
export function getTaxAmount(result: TaxRemittanceResult): number | null {
  const raw = getTaxResultParam(result, 'Amount')
  if (raw === undefined || raw === null) return null
  const parsed = typeof raw === 'number' ? raw : parseFloat(String(raw))
  return Number.isNaN(parsed) ? null : parsed
}

/**
 * Returns the TransactionCompletedTime string from ResultParameters,
 * or `null` when absent.
 *
 * Documented key: `TransactionCompletedTime` — format e.g. "20221110110717".
 */
export function getTaxCompletedTime(result: TaxRemittanceResult): string | null {
  const raw = getTaxResultParam(result, 'TransactionCompletedTime')
  return raw !== undefined ? String(raw) : null
}

/**
 * Returns the ReceiverPartyPublicName from ResultParameters, or `null` when absent.
 *
 * Documented key: `ReceiverPartyPublicName` — e.g. "00000 Tax Collecting Company".
 */
export function getTaxReceiverName(result: TaxRemittanceResult): string | null {
  const raw = getTaxResultParam(result, 'ReceiverPartyPublicName')
  return raw !== undefined ? String(raw) : null
}

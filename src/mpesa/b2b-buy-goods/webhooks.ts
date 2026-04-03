/**
 * src/mpesa/b2b-buy-goods/webhooks.ts
 *
 * Type guards and payload extractors for Business Buy Goods result callbacks.
 *
 * Result parameters are aligned strictly to Safaricom Daraja documentation:
 *   - Amount
 *   - TransCompletedTime
 *   - ReceiverPartyPublicName
 *   - DebitPartyCharges
 *   - Currency
 *   - DebitPartyAffectedAccountBalance
 *   - DebitAccountBalance
 *   - InitiatorAccountCurrentBalance
 *   - BillReferenceNumber (from ReferenceData)
 *   - QueueTimeoutURL (from ReferenceData)
 *
 * Docs note: ResultCode is "0" (string) on success but 2001 (number) on
 * failure — both forms are handled.
 */

import { B2B_BUY_GOODS_RESULT_CODES } from './types'
import type {
  B2BBuyGoodsResult,
  B2BBuyGoodsResultParameter,
  B2BBuyGoodsReferenceItem,
} from './types'

// ── Known result codes set (for O(1) lookup) ──────────────────────────────────
// B2B_BUY_GOODS_RESULT_CODES is `as const` with only numeric values, so
// Object.values() already returns the narrow literal union — no filter needed.

const KNOWN_RESULT_CODES = new Set<number>(Object.values(B2B_BUY_GOODS_RESULT_CODES))

// ── Type guards ───────────────────────────────────────────────────────────────

/**
 * Runtime type guard — checks if a body looks like a B2B Buy Goods result callback.
 * Validates the minimum documented structure.
 */
export function isB2BBuyGoodsResult(body: unknown): body is B2BBuyGoodsResult {
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
 * Returns true if the B2B Buy Goods result represents a successful transaction.
 * Handles both string "0" (documented in success sample) and number 0.
 */
export function isB2BBuyGoodsSuccess(result: B2BBuyGoodsResult): boolean {
  const code = result.Result.ResultCode
  return code === 0 || code === '0'
}

/**
 * Returns true if the B2B Buy Goods result represents a failure.
 */
export function isB2BBuyGoodsFailure(result: B2BBuyGoodsResult): boolean {
  return !isB2BBuyGoodsSuccess(result)
}

/**
 * Returns true if the result code is among the documented codes.
 * Handles both numeric and string representations.
 * Empty strings are explicitly rejected.
 */
export function isKnownB2BBuyGoodsResultCode(code: unknown): boolean {
  if (typeof code !== 'number' && typeof code !== 'string') return false
  if (typeof code === 'string' && code.trim() === '') return false
  const numeric = Number(code)
  return Number.isFinite(numeric) && KNOWN_RESULT_CODES.has(numeric)
}

// ── Core field extractors ─────────────────────────────────────────────────────

/**
 * Extracts the M-PESA transaction ID from a B2B Buy Goods result.
 * Present on both success and failure (generic ID on failure).
 */
export function getB2BBuyGoodsTransactionId(result: B2BBuyGoodsResult): string {
  return result.Result.TransactionID
}

/**
 * Extracts the ConversationID from a B2B Buy Goods result.
 */
export function getB2BBuyGoodsConversationId(result: B2BBuyGoodsResult): string {
  return result.Result.ConversationID
}

/**
 * Extracts the OriginatorConversationID from a B2B Buy Goods result.
 * Use this to correlate with the original API call response.
 */
export function getB2BBuyGoodsOriginatorConversationId(result: B2BBuyGoodsResult): string {
  return result.Result.OriginatorConversationID
}

/**
 * Extracts the result description (human-readable status).
 */
export function getB2BBuyGoodsResultDesc(result: B2BBuyGoodsResult): string {
  return result.Result.ResultDesc
}

/**
 * Extracts the result code from a B2B Buy Goods result.
 */
export function getB2BBuyGoodsResultCode(result: B2BBuyGoodsResult): string | number {
  return result.Result.ResultCode
}

// ── Result parameter extractors (documented fields only) ──────────────────────

/**
 * Extracts the transaction amount from B2B Buy Goods result parameters.
 * Documented field: "Amount"
 * Returns null if not present (e.g. on failure).
 */
export function getB2BBuyGoodsAmount(result: B2BBuyGoodsResult): number | null {
  const value = getB2BBuyGoodsResultParam(result, 'Amount')
  if (value === undefined) return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

/**
 * Extracts the transaction completion time.
 * Documented field: "TransCompletedTime" — format: YYYYMMDDHHmmss
 * Falls back to "BOCompletedTime" (present on some failure callbacks).
 * Returns null if not present.
 */
export function getB2BBuyGoodsCompletedTime(result: B2BBuyGoodsResult): string | null {
  const value =
    getB2BBuyGoodsResultParam(result, 'TransCompletedTime') ??
    getB2BBuyGoodsResultParam(result, 'BOCompletedTime')
  if (value === undefined) return null
  return String(value)
}

/**
 * Extracts the receiver's public name from result parameters.
 * Documented field: "ReceiverPartyPublicName"
 * Returns null if not present.
 */
export function getB2BBuyGoodsReceiverName(result: B2BBuyGoodsResult): string | null {
  const value = getB2BBuyGoodsResultParam(result, 'ReceiverPartyPublicName')
  if (value === undefined) return null
  return String(value)
}

/**
 * Extracts debit party charges from result parameters.
 * Documented field: "DebitPartyCharges"
 * Returns null if not present or empty string (no charges applied).
 */
export function getB2BBuyGoodsDebitPartyCharges(result: B2BBuyGoodsResult): string | null {
  const value = getB2BBuyGoodsResultParam(result, 'DebitPartyCharges')
  if (value === undefined || value === '') return null
  return String(value)
}

/**
 * Extracts the transaction currency from result parameters.
 * Documented field: "Currency"
 * Returns "KES" as default when not present.
 */
export function getB2BBuyGoodsCurrency(result: B2BBuyGoodsResult): string {
  const value = getB2BBuyGoodsResultParam(result, 'Currency')
  if (value === undefined || value === '') return 'KES'
  return String(value)
}

/**
 * Extracts the debit party affected account balance.
 * Documented field: "DebitPartyAffectedAccountBalance"
 * Format: "Working Account|KES|346568.83|6186.83|340382.00|0.00"
 * Returns null if not present.
 */
export function getB2BBuyGoodsDebitPartyAffectedBalance(result: B2BBuyGoodsResult): string | null {
  const value = getB2BBuyGoodsResultParam(result, 'DebitPartyAffectedAccountBalance')
  if (value === undefined) return null
  return String(value)
}

/**
 * Extracts the debit account balance.
 * Documented field: "DebitAccountBalance"
 * Format: "{Amount={CurrencyCode=KES, MinimumAmount=618683, BasicAmount=6186.83}}"
 * Returns null if not present.
 */
export function getB2BBuyGoodsDebitAccountBalance(result: B2BBuyGoodsResult): string | null {
  const value = getB2BBuyGoodsResultParam(result, 'DebitAccountBalance')
  if (value === undefined) return null
  return String(value)
}

/**
 * Extracts the initiator account current balance.
 * Documented field: "InitiatorAccountCurrentBalance"
 * Returns null if not present.
 */
export function getB2BBuyGoodsInitiatorBalance(result: B2BBuyGoodsResult): string | null {
  const value = getB2BBuyGoodsResultParam(result, 'InitiatorAccountCurrentBalance')
  if (value === undefined) return null
  return String(value)
}

/**
 * Extracts the Bill Reference Number from ReferenceData.
 * Documented field: "BillReferenceNumber" (in ReferenceData, not ResultParameters)
 * Returns null if not present.
 */
export function getB2BBuyGoodsBillReferenceNumber(result: B2BBuyGoodsResult): string | null {
  const refData = result.Result.ReferenceData?.ReferenceItem
  if (!refData) return null

  const items = Array.isArray(refData)
    ? (refData as B2BBuyGoodsReferenceItem[])
    : [refData as B2BBuyGoodsReferenceItem]

  const item = items.find((i) => i.Key === 'BillReferenceNumber')
  return item?.Value ?? null
}

/**
 * Extracts the QueueTimeoutURL from ReferenceData.
 * Documented field: "QueueTimeoutURL" (in ReferenceData)
 * Returns null if not present.
 */
export function getB2BBuyGoodsQueueTimeoutUrl(result: B2BBuyGoodsResult): string | null {
  const refData = result.Result.ReferenceData?.ReferenceItem
  if (!refData) return null

  const items = Array.isArray(refData)
    ? (refData as B2BBuyGoodsReferenceItem[])
    : [refData as B2BBuyGoodsReferenceItem]

  const item = items.find((i) => i.Key === 'QueueTimeoutURL')
  return item?.Value ?? null
}

// ── Internal helper ───────────────────────────────────────────────────────────

/**
 * Extracts a named value from B2B Buy Goods result parameters.
 * Handles both single-object and array forms of ResultParameter
 * (Daraja returns either depending on how many parameters are present).
 * Returns undefined if key is absent or no ResultParameters exist.
 */
export function getB2BBuyGoodsResultParam(
  result: B2BBuyGoodsResult,
  key: string,
): string | number | undefined {
  const params = result.Result.ResultParameters?.ResultParameter
  if (!params) return undefined

  const paramArray = Array.isArray(params)
    ? (params as B2BBuyGoodsResultParameter[])
    : [params as B2BBuyGoodsResultParameter]

  const item = paramArray.find((p) => p.Key === key)
  return item?.Value
}

/**
 * src/mpesa/b2b-pay-bill/webhooks.ts
 *
 * Type guards and payload extractors for Business Pay Bill result callbacks.
 *
 * Result parameters are aligned strictly to Safaricom Daraja documentation:
 *   - Amount
 *   - TransCompletedTime
 *   - ReceiverPartyPublicName
 *   - DebitPartyCharges
 *   - Currency
 *   - DebitPartyAffectedAccountBalance
 *   - DebitAccountCurrentBalance
 *   - InitiatorAccountCurrentBalance
 *   - BillReferenceNumber (from ReferenceData)
 *
 * Docs note: ResultCode is "0" (string) on success but 2001 (number) on
 * failure — both forms are handled.
 */

import { B2B_PAY_BILL_RESULT_CODES } from './types'
import type { B2BPayBillResult, B2BPayBillResultParameter, B2BPayBillReferenceItem } from './types'

// ── Known result codes set (for O(1) lookup) ──────────────────────────────────

const KNOWN_RESULT_CODES = new Set<number>(Object.values(B2B_PAY_BILL_RESULT_CODES))

// ── Type guards ───────────────────────────────────────────────────────────────

/**
 * Runtime type guard — checks if a body looks like a B2B Pay Bill result callback.
 * Validates the minimum documented structure.
 */
export function isB2BPayBillResult(body: unknown): body is B2BPayBillResult {
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
 * Returns true if the B2B Pay Bill result represents a successful transaction.
 * Handles both string "0" (documented in success sample) and number 0.
 */
export function isB2BPayBillSuccess(result: B2BPayBillResult): boolean {
  const code = result.Result.ResultCode
  return code === 0 || code === '0'
}

/**
 * Returns true if the B2B Pay Bill result represents a failure.
 */
export function isB2BPayBillFailure(result: B2BPayBillResult): boolean {
  return !isB2BPayBillSuccess(result)
}

/**
 * Returns true if the result code is among the documented codes.
 * Handles both numeric and string representations.
 * Empty strings are explicitly rejected.
 */
export function isKnownB2BPayBillResultCode(code: unknown): boolean {
  if (typeof code !== 'number' && typeof code !== 'string') return false
  if (typeof code === 'string' && code.trim() === '') return false
  const numeric = Number(code)
  return Number.isFinite(numeric) && KNOWN_RESULT_CODES.has(numeric)
}

// ── Core field extractors ─────────────────────────────────────────────────────

/**
 * Extracts the M-PESA transaction ID from a B2B Pay Bill result.
 * Present on both success and failure (generic ID on failure).
 */
export function getB2BPayBillTransactionId(result: B2BPayBillResult): string {
  return result.Result.TransactionID
}

/**
 * Extracts the ConversationID from a B2B Pay Bill result.
 */
export function getB2BPayBillConversationId(result: B2BPayBillResult): string {
  return result.Result.ConversationID
}

/**
 * Extracts the OriginatorConversationID from a B2B Pay Bill result.
 * Use this to correlate with the original API call response.
 */
export function getB2BPayBillOriginatorConversationId(result: B2BPayBillResult): string {
  return result.Result.OriginatorConversationID
}

/**
 * Extracts the result description (human-readable status).
 */
export function getB2BPayBillResultDesc(result: B2BPayBillResult): string {
  return result.Result.ResultDesc
}

/**
 * Extracts the numeric result code from a B2B Pay Bill result.
 */
export function getB2BPayBillResultCode(result: B2BPayBillResult): string | number {
  return result.Result.ResultCode
}

// ── Result parameter extractors (documented fields only) ──────────────────────

/**
 * Extracts the transaction amount from B2B Pay Bill result parameters.
 * Documented field: "Amount"
 * Returns null if not present (e.g. on failure).
 */
export function getB2BPayBillAmount(result: B2BPayBillResult): number | null {
  const value = getB2BPayBillResultParam(result, 'Amount')
  if (value === undefined) return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

/**
 * Extracts the transaction completion time.
 * Documented field: "TransCompletedTime" — format: YYYYMMDDHHmmss
 * Returns null if not present.
 */
export function getB2BPayBillCompletedTime(result: B2BPayBillResult): string | null {
  const value =
    getB2BPayBillResultParam(result, 'TransCompletedTime') ??
    getB2BPayBillResultParam(result, 'BOCompletedTime')
  if (value === undefined) return null
  return String(value)
}

/**
 * Extracts the receiver's public name from result parameters.
 * Documented field: "ReceiverPartyPublicName"
 * Returns null if not present.
 */
export function getB2BPayBillReceiverName(result: B2BPayBillResult): string | null {
  const value = getB2BPayBillResultParam(result, 'ReceiverPartyPublicName')
  if (value === undefined) return null
  return String(value)
}

/**
 * Extracts debit party charges from result parameters.
 * Documented field: "DebitPartyCharges"
 * Returns null if not present or empty.
 */
export function getB2BPayBillDebitPartyCharges(result: B2BPayBillResult): string | null {
  const value = getB2BPayBillResultParam(result, 'DebitPartyCharges')
  if (value === undefined || value === '') return null
  return String(value)
}

/**
 * Extracts the transaction currency from result parameters.
 * Documented field: "Currency"
 * Returns "KES" as default when not present.
 */
export function getB2BPayBillCurrency(result: B2BPayBillResult): string {
  const value = getB2BPayBillResultParam(result, 'Currency')
  if (value === undefined || value === '') return 'KES'
  return String(value)
}

/**
 * Extracts the debit party affected account balance.
 * Documented field: "DebitPartyAffectedAccountBalance"
 * Returns null if not present.
 */
export function getB2BPayBillDebitPartyAffectedBalance(result: B2BPayBillResult): string | null {
  const value = getB2BPayBillResultParam(result, 'DebitPartyAffectedAccountBalance')
  if (value === undefined) return null
  return String(value)
}

/**
 * Extracts the debit account current balance.
 * Documented field: "DebitAccountCurrentBalance"
 * Returns null if not present.
 */
export function getB2BPayBillDebitAccountBalance(result: B2BPayBillResult): string | null {
  const value = getB2BPayBillResultParam(result, 'DebitAccountCurrentBalance')
  if (value === undefined) return null
  return String(value)
}

/**
 * Extracts the initiator account current balance.
 * Documented field: "InitiatorAccountCurrentBalance"
 * Returns null if not present.
 */
export function getB2BPayBillInitiatorBalance(result: B2BPayBillResult): string | null {
  const value = getB2BPayBillResultParam(result, 'InitiatorAccountCurrentBalance')
  if (value === undefined) return null
  return String(value)
}

/**
 * Extracts the Bill Reference Number from ReferenceData.
 * Documented field: "BillReferenceNumber" (in ReferenceData, not ResultParameters)
 * Returns null if not present.
 */
export function getB2BPayBillBillReferenceNumber(result: B2BPayBillResult): string | null {
  const refData = result.Result.ReferenceData?.ReferenceItem
  if (!refData) return null

  const items = Array.isArray(refData)
    ? (refData as B2BPayBillReferenceItem[])
    : [refData as B2BPayBillReferenceItem]

  const item = items.find((i) => i.Key === 'BillReferenceNumber')
  return item?.Value ?? null
}

// ── Internal helper ───────────────────────────────────────────────────────────

/**
 * Extracts a named value from B2B Pay Bill result parameters.
 * Handles both single-object and array forms of ResultParameter
 * (Daraja returns either depending on how many parameters are present).
 * Returns undefined if key is absent or no ResultParameters exist.
 */
export function getB2BPayBillResultParam(
  result: B2BPayBillResult,
  key: string,
): string | number | undefined {
  const params = result.Result.ResultParameters?.ResultParameter
  if (!params) return undefined

  const paramArray = Array.isArray(params)
    ? (params as B2BPayBillResultParameter[])
    : [params as B2BPayBillResultParameter]

  const item = paramArray.find((p) => p.Key === key)
  return item?.Value
}

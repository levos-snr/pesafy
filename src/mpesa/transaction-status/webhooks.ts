// src/mpesa/transaction-status/webhooks.ts

/**
 * Type guards and payload extractors for Transaction Status result callbacks.
 *
 * Documented result parameters (POSTed to your ResultURL):
 *   - DebitPartyName
 *   - TransactionStatus
 *   - Amount
 *   - ReceiptNo
 *   - DebitAccountBalance
 *   - TransactionDate
 *   - CreditPartyName
 *
 * Docs note: ResultCode is 0 (number) on success. Daraja may return either
 * a number or a string depending on the transaction type — both forms handled.
 *
 * @see https://developer.safaricom.co.ke/APIs/TransactionStatus
 */

import { TRANSACTION_STATUS_RESULT_CODES } from './types'
import type { TransactionStatusResult, TransactionStatusResultParameter } from './types'

// ── Known result codes set (O(1) lookup) ──────────────────────────────────────

const KNOWN_RESULT_CODES = new Set<number>(Object.values(TRANSACTION_STATUS_RESULT_CODES))

// ── Type guards ───────────────────────────────────────────────────────────────

/**
 * Runtime type guard — checks if a body looks like a Transaction Status
 * result callback. Validates the minimum documented structure.
 */
export function isTransactionStatusResult(body: unknown): body is TransactionStatusResult {
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
 * Returns true if the Transaction Status result represents a successful query.
 * Handles both string "0" and number 0 (Daraja inconsistency).
 */
export function isTransactionStatusSuccess(result: TransactionStatusResult): boolean {
  const code = result.Result.ResultCode
  return code === 0 || code === '0'
}

/**
 * Returns true if the Transaction Status result represents a failure.
 */
export function isTransactionStatusFailure(result: TransactionStatusResult): boolean {
  return !isTransactionStatusSuccess(result)
}

/**
 * Returns true if the result code is among the documented codes.
 * Handles both numeric and string representations.
 */
export function isKnownTransactionStatusResultCode(code: unknown): boolean {
  if (typeof code !== 'number' && typeof code !== 'string') return false
  if (typeof code === 'string' && code.trim() === '') return false
  const numeric = Number(code)
  return Number.isFinite(numeric) && KNOWN_RESULT_CODES.has(numeric)
}

// ── Core field extractors ─────────────────────────────────────────────────────

/**
 * Extracts the M-PESA transaction ID from a Transaction Status result.
 */
export function getTransactionStatusTransactionId(result: TransactionStatusResult): string {
  return result.Result.TransactionID
}

/**
 * Extracts the ConversationID from a Transaction Status result.
 */
export function getTransactionStatusConversationId(result: TransactionStatusResult): string {
  return result.Result.ConversationID
}

/**
 * Extracts the OriginatorConversationID from a Transaction Status result.
 * Use this to correlate with the original API call response.
 */
export function getTransactionStatusOriginatorConversationId(
  result: TransactionStatusResult,
): string {
  return result.Result.OriginatorConversationID
}

/**
 * Extracts the human-readable result description.
 */
export function getTransactionStatusResultDesc(result: TransactionStatusResult): string {
  return result.Result.ResultDesc
}

/**
 * Extracts the result code from a Transaction Status result.
 */
export function getTransactionStatusResultCode(result: TransactionStatusResult): string | number {
  return result.Result.ResultCode
}

// ── Result parameter extractors (documented fields only) ──────────────────────

/**
 * Extracts the transaction amount from result parameters.
 * Documented field: "Amount"
 * Returns null if not present (e.g. on failure).
 */
export function getTransactionStatusAmount(result: TransactionStatusResult): number | null {
  const value = getTransactionStatusResultParam(result, 'Amount')
  if (value === undefined) return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

/**
 * Extracts the M-Pesa receipt number from result parameters.
 * Documented field: "ReceiptNo"
 * Returns null if not present.
 */
export function getTransactionStatusReceiptNo(result: TransactionStatusResult): string | null {
  const value = getTransactionStatusResultParam(result, 'ReceiptNo')
  if (value === undefined) return null
  return String(value)
}

/**
 * Extracts the transaction status string from result parameters.
 * Documented field: "TransactionStatus" — e.g. "Completed"
 * Returns null if not present.
 */
export function getTransactionStatusStatus(result: TransactionStatusResult): string | null {
  const value = getTransactionStatusResultParam(result, 'TransactionStatus')
  if (value === undefined) return null
  return String(value)
}

/**
 * Extracts the debit party name from result parameters.
 * Documented field: "DebitPartyName" — e.g. "600310 Safaricom333"
 * Returns null if not present.
 */
export function getTransactionStatusDebitPartyName(result: TransactionStatusResult): string | null {
  const value = getTransactionStatusResultParam(result, 'DebitPartyName')
  if (value === undefined) return null
  return String(value)
}

/**
 * Extracts the credit party name from result parameters.
 * Documented field: "CreditPartyName"
 * Returns null if not present.
 */
export function getTransactionStatusCreditPartyName(
  result: TransactionStatusResult,
): string | null {
  const value = getTransactionStatusResultParam(result, 'CreditPartyName')
  if (value === undefined) return null
  return String(value)
}

/**
 * Extracts the debit account balance from result parameters.
 * Documented field: "DebitAccountBalance"
 * Returns null if not present.
 */
export function getTransactionStatusDebitAccountBalance(
  result: TransactionStatusResult,
): string | null {
  const value = getTransactionStatusResultParam(result, 'DebitAccountBalance')
  if (value === undefined) return null
  return String(value)
}

/**
 * Extracts the transaction date from result parameters.
 * Documented field: "TransactionDate"
 * Returns null if not present.
 */
export function getTransactionStatusTransactionDate(
  result: TransactionStatusResult,
): string | null {
  const value = getTransactionStatusResultParam(result, 'TransactionDate')
  if (value === undefined) return null
  return String(value)
}

// ── Internal helper ───────────────────────────────────────────────────────────

/**
 * Extracts a named value from Transaction Status result parameters.
 * Handles both single-object and array forms of ResultParameter
 * (Daraja returns either depending on how many parameters are present).
 * Returns undefined if key is absent or no ResultParameters exist.
 */
export function getTransactionStatusResultParam(
  result: TransactionStatusResult,
  key: string,
): string | number | undefined {
  const params = result.Result.ResultParameters?.ResultParameter
  if (!params) return undefined

  const paramArray = Array.isArray(params)
    ? (params as TransactionStatusResultParameter[])
    : [params as TransactionStatusResultParameter]

  const item = paramArray.find((p) => p.Key === key)
  return item?.Value
}

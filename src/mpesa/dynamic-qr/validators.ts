/**
 * src/mpesa/dynamic-qr/validators.ts
 *
 * Pure validation functions for the Dynamic QR request payload.
 * No side effects — all functions return a ValidationResult.
 */

import type { DynamicQRRequest, ValidationFail, ValidationResult } from './types'
import { QR_TRANSACTION_CODES } from './types'

// Re-export so consumers only need to import from validators, not types.
export { QR_TRANSACTION_CODES } from './types'

// ── Field constraints ─────────────────────────────────────────────────────────

/** Minimum amount Daraja accepts (whole KES). */
export const MIN_AMOUNT = 1

/** Maximum allowable QR size in pixels (sanity guard — Daraja has no documented limit). */
export const MAX_QR_SIZE = 1_000

/** Minimum QR size in pixels. */
export const MIN_QR_SIZE = 1

/** Default QR size when `size` is omitted from the request. */
export const DEFAULT_QR_SIZE = 300

// ── Individual field validators ───────────────────────────────────────────────

/**
 * Validates `merchantName`.
 * @returns Error message string, or `null` if valid.
 */
export function validateMerchantName(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return 'merchantName is required and must be a non-empty string'
  }
  return null
}

/**
 * Validates `refNo`.
 * @returns Error message string, or `null` if valid.
 */
export function validateRefNo(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return 'refNo (transaction reference) is required and must be a non-empty string'
  }
  return null
}

/**
 * Validates `amount`.
 * @returns Error message string, or `null` if valid.
 */
export function validateAmount(value: unknown): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 'amount must be a finite number'
  }
  const rounded = Math.round(value)
  if (rounded < MIN_AMOUNT) {
    return `amount must be at least ${MIN_AMOUNT} KES (got ${value})`
  }
  return null
}

/**
 * Validates `trxCode`.
 * @returns Error message string, or `null` if valid.
 */
export function validateTrxCode(value: unknown): string | null {
  if (!QR_TRANSACTION_CODES.includes(value as never)) {
    return (
      `trxCode must be one of: ${QR_TRANSACTION_CODES.join(', ')} ` +
      `(BG=Buy Goods, WA=Withdraw Cash, PB=Paybill, SM=Send Money, SB=Send to Business)`
    )
  }
  return null
}

/**
 * Validates `cpi` (Credit Party Identifier).
 * @returns Error message string, or `null` if valid.
 */
export function validateCpi(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return 'cpi (Credit Party Identifier) is required and must be a non-empty string'
  }
  return null
}

/**
 * Validates `size` (optional).
 * @returns Error message string, or `null` if valid.
 */
export function validateSize(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null // optional — will default to DEFAULT_QR_SIZE
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 'size must be a finite number when provided'
  }
  if (!Number.isInteger(value) || value < MIN_QR_SIZE) {
    return `size must be a positive integer (minimum ${MIN_QR_SIZE})`
  }
  if (value > MAX_QR_SIZE) {
    return `size must not exceed ${MAX_QR_SIZE} pixels (got ${value})`
  }
  return null
}

// ── Full request validator ────────────────────────────────────────────────────

/**
 * Validates a full {@link DynamicQRRequest} payload.
 *
 * Runs all field validators and collects every error so callers receive a
 * complete picture rather than failing on the first error only.
 *
 * Accepts `null`, `undefined`, or any non-object — returns `{ valid: false }`
 * with an appropriate error rather than throwing.
 *
 * @example
 * const result = validateDynamicQRRequest(payload)
 * if (!result.valid) {
 *   console.error(result.errors)
 * }
 */
export function validateDynamicQRRequest(payload: unknown): ValidationResult {
  // Guard null / undefined / primitives before any property access.
  if (payload === null || payload === undefined || typeof payload !== 'object') {
    return {
      valid: false,
      errors: { payload: 'request payload must be a non-null object' },
    } satisfies ValidationFail
  }

  // Cast to a partial shape — every individual validator handles unknown values.
  const p = payload as Partial<DynamicQRRequest>
  const errors: Record<string, string> = {}

  const merchantNameError = validateMerchantName(p.merchantName)
  if (merchantNameError) errors['merchantName'] = merchantNameError

  const refNoError = validateRefNo(p.refNo)
  if (refNoError) errors['refNo'] = refNoError

  const amountError = validateAmount(p.amount)
  if (amountError) errors['amount'] = amountError

  const trxCodeError = validateTrxCode(p.trxCode)
  if (trxCodeError) errors['trxCode'] = trxCodeError

  const cpiError = validateCpi(p.cpi)
  if (cpiError) errors['cpi'] = cpiError

  const sizeError = validateSize(p.size)
  if (sizeError) errors['size'] = sizeError

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors } satisfies ValidationFail
  }

  return { valid: true }
}

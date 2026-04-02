/**
 * src/mpesa/dynamic-qr/index.ts
 *
 * Public surface for the Dynamic QR module.
 * Re-exports everything consumers need — nothing internal leaks out.
 */

// ── Core function ──────────────────────────────────────────────────────────────
export { generateDynamicQR } from './generate'

// ── Types ──────────────────────────────────────────────────────────────────────
export type {
  DynamicQRDarajaPayload,
  DynamicQRErrorResponse,
  DynamicQRRequest,
  DynamicQRResponse,
  QRTransactionCode,
  ValidationFail,
  ValidationOk,
  ValidationResult,
} from './types'
export { QR_TRANSACTION_CODES } from './types'

// ── Validators (public — useful for server-side pre-validation in adapters) ───
export {
  DEFAULT_QR_SIZE,
  MAX_QR_SIZE,
  MIN_AMOUNT,
  MIN_QR_SIZE,
  validateAmount,
  validateCpi,
  validateDynamicQRRequest,
  validateMerchantName,
  validateRefNo,
  validateSize,
  validateTrxCode,
} from './validators'

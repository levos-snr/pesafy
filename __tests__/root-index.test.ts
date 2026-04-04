/**
 * __tests__/root-index.test.ts
 *
 * Comprehensive test suite for src/index.ts (root package entry point).
 *
 * Verifies:
 *   1.  Mpesa class
 *   2.  Core types & DARAJA_BASE_URLS
 *   3.  Auth (TokenManager, AUTH_ERROR_CODES)
 *   4.  Branded type helpers (ok, err, toKesAmount, toMsisdn, etc.)
 *   5.  Errors (PesafyError, createError, isPesafyError)
 *   6.  Encryption (encryptSecurityCredential)
 *   7.  Phone utilities (formatSafaricomPhone)
 *   8.  STK Push — including STK_PUSH_LIMITS, STK_RESULT_CODES, isKnownStkResultCode (were missing)
 *   9.  C2B
 *   10. B2C Account Top Up
 *   11. B2B Express Checkout
 *   12. B2B Buy Goods
 *   13. B2B Pay Bill
 *   14. Tax Remittance
 *   15. Transaction Status
 *   16. Account Balance
 *   17. Reversal
 *   18. Bill Manager
 *   19. Dynamic QR — including generateDynamicQR + all validators (were missing)
 *   20. B2C Disbursement — entire module was missing before this fix
 *   21. Webhooks
 *   22. HTTP (httpRequest)
 *
 * Run: pnpm test
 */

import { describe, expect, it, vi } from 'vitest'

// ── Mock HTTP layer ────────────────────────────────────────────────────────────
vi.mock('../src/utils/http', () => ({ httpRequest: vi.fn() }))

// ── Import everything from the ROOT package entry ─────────────────────────────
import {
  // 1. Mpesa class
  Mpesa,

  // 2. Core
  DARAJA_BASE_URLS,

  // 3. Auth
  AUTH_ERROR_CODES,
  TokenManager,

  // 4. Branded types
  ok,
  err,
  toKesAmount,
  toMsisdn,
  toNonEmpty,
  toPaybill,
  toShortCode,
  toTill,

  // 5. Errors
  PesafyError,
  createError,
  isPesafyError,

  // 6. Encryption
  encryptSecurityCredential,

  // 7. Phone
  formatSafaricomPhone,

  // 8. STK Push
  STK_PUSH_LIMITS,
  STK_RESULT_CODES,
  isKnownStkResultCode,
  isStkCallbackSuccess,
  getCallbackValue,
  formatPhoneNumber,
  getTimestamp,

  // 9. C2B
  registerC2BUrls,
  simulateC2B,
  C2B_REGISTER_URL_ERROR_CODES,
  C2B_VALIDATION_RESULT_CODES,
  acceptC2BValidation,
  acknowledgeC2BConfirmation,
  rejectC2BValidation,
  isC2BPayload,
  isPaybillPayment,
  isBuyGoodsPayment,
  getC2BAmount,
  getC2BAccountRef,
  getC2BCustomerName,
  getC2BTransactionId,

  // 10. B2C Account Top Up
  initiateB2CPayment,
  B2C_ERROR_CODES,
  B2C_RESULT_CODES,
  isB2CResult,
  isB2CSuccess,
  isB2CFailure,
  isKnownB2CResultCode,
  getB2CAmount,
  getB2CCurrency,
  getB2CDebitAccountBalance,
  getB2CDebitPartyCharges,
  getB2CConversationId,
  getB2COriginatorConversationId,
  getB2CReceiverPublicName,
  getB2CResultDesc,
  getB2CResultParam,
  getB2CTransactionCompletedTime,
  getB2CTransactionId,

  // 11. B2B Express Checkout
  initiateB2BExpressCheckout,
  B2B_RESULT_CODES,
  isB2BCheckoutCallback,
  isB2BCheckoutCancelled,
  isB2BCheckoutSuccess,
  getB2BAmount,
  getB2BConversationId,
  getB2BRequestId,
  getB2BTransactionId,

  // 12. B2B Buy Goods
  initiateB2BBuyGoods,
  B2B_BUY_GOODS_ERROR_CODES,
  B2B_BUY_GOODS_RESULT_CODES,
  isB2BBuyGoodsResult,
  isB2BBuyGoodsSuccess,
  isB2BBuyGoodsFailure,
  isKnownB2BBuyGoodsResultCode,
  getB2BBuyGoodsAmount,
  getB2BBuyGoodsBillReferenceNumber,
  getB2BBuyGoodsCompletedTime,
  getB2BBuyGoodsConversationId,
  getB2BBuyGoodsCurrency,
  getB2BBuyGoodsDebitAccountBalance,
  getB2BBuyGoodsDebitPartyAffectedBalance,
  getB2BBuyGoodsDebitPartyCharges,
  getB2BBuyGoodsInitiatorBalance,
  getB2BBuyGoodsOriginatorConversationId,
  getB2BBuyGoodsQueueTimeoutUrl,
  getB2BBuyGoodsReceiverName,
  getB2BBuyGoodsResultCode,
  getB2BBuyGoodsResultDesc,
  getB2BBuyGoodsResultParam,
  getB2BBuyGoodsTransactionId,

  // 13. B2B Pay Bill
  initiateB2BPayBill,
  B2B_PAY_BILL_ERROR_CODES,
  B2B_PAY_BILL_RESULT_CODES,
  isB2BPayBillResult,
  isB2BPayBillSuccess,
  isB2BPayBillFailure,
  isKnownB2BPayBillResultCode,
  getB2BPayBillAmount,
  getB2BPayBillBillReferenceNumber,
  getB2BPayBillCompletedTime,
  getB2BPayBillConversationId,
  getB2BPayBillCurrency,
  getB2BPayBillDebitAccountBalance,
  getB2BPayBillDebitPartyAffectedBalance,
  getB2BPayBillDebitPartyCharges,
  getB2BPayBillInitiatorBalance,
  getB2BPayBillOriginatorConversationId,
  getB2BPayBillReceiverName,
  getB2BPayBillResultCode,
  getB2BPayBillResultDesc,
  getB2BPayBillResultParam,
  getB2BPayBillTransactionId,

  // 14. Tax Remittance
  KRA_SHORTCODE,
  remitTax,
  TAX_COMMAND_ID,
  isTaxRemittanceResult,
  isTaxRemittanceSuccess,
  isTaxRemittanceFailure,
  getTaxAmount,
  getTaxCompletedTime,
  getTaxConversationId,
  getTaxOriginatorConversationId,
  getTaxReceiverName,
  getTaxResultCode,
  getTaxResultDesc,
  getTaxResultParam,
  getTaxTransactionId,

  // 15. Transaction Status
  queryTransactionStatus,
  TRANSACTION_STATUS_ERROR_CODES,
  TRANSACTION_STATUS_RESULT_CODES,
  isTransactionStatusResult,
  isTransactionStatusSuccess,
  isTransactionStatusFailure,
  isKnownTransactionStatusResultCode,
  getTransactionStatusConversationId,
  getTransactionStatusOriginatorConversationId,
  getTransactionStatusResultCode,
  getTransactionStatusResultDesc,
  getTransactionStatusTransactionId,
  getTransactionStatusAmount,
  getTransactionStatusCreditPartyName,
  getTransactionStatusDebitAccountBalance,
  getTransactionStatusDebitPartyName,
  getTransactionStatusReceiptNo,
  getTransactionStatusResultParam,
  getTransactionStatusStatus,
  getTransactionStatusTransactionDate,

  // 16. Account Balance
  queryAccountBalance,
  ACCOUNT_BALANCE_ERROR_CODES,
  isAccountBalanceSuccess,
  parseAccountBalance,
  getAccountBalanceParam,
  getAccountBalanceTransactionId,
  getAccountBalanceConversationId,
  getAccountBalanceOriginatorConversationId,
  getAccountBalanceCompletedTime,
  getAccountBalanceRawBalance,
  getAccountBalanceReferenceItem,

  // 17. Reversal
  requestReversal,
  REVERSAL_COMMAND_ID,
  REVERSAL_ERROR_CODES,
  REVERSAL_RECEIVER_IDENTIFIER_TYPE,
  REVERSAL_RESULT_CODES,
  isKnownReversalResultCode,
  isReversalFailure,
  isReversalResult,
  isReversalSuccess,
  getReversalAmount,
  getReversalCharge,
  getReversalCompletedTime,
  getReversalConversationId,
  getReversalCreditPartyPublicName,
  getReversalDebitAccountBalance,
  getReversalDebitPartyPublicName,
  getReversalOriginalTransactionId,
  getReversalOriginatorConversationId,
  getReversalResultCode,
  getReversalResultDesc,
  getReversalResultParam,
  getReversalTransactionId,

  // 18. Bill Manager
  billManagerOptIn,
  updateOptIn,
  sendSingleInvoice,
  sendBulkInvoices,
  cancelInvoice,
  cancelBulkInvoices,
  reconcilePayment,

  // 19. Dynamic QR — generateDynamicQR + validators were missing before fix
  generateDynamicQR,
  QR_TRANSACTION_CODES,
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

  // 20. B2C Disbursement — entire module was missing before fix
  initiateB2CDisbursement,
  B2C_DISBURSEMENT_RESULT_CODES,
  isB2CDisbursementResult,
  isB2CDisbursementSuccess,
  isB2CDisbursementFailure,
  isKnownB2CDisbursementResultCode,
  isB2CDisbursementRecipientRegistered,
  getB2CDisbursementAmount,
  getB2CDisbursementCompletedTime,
  getB2CDisbursementConversationId,
  getB2CDisbursementOriginatorConversationId,
  getB2CDisbursementReceiptNumber,
  getB2CDisbursementReceiverName,
  getB2CDisbursementResultCode,
  getB2CDisbursementResultDesc,
  getB2CDisbursementResultParam,
  getB2CDisbursementTransactionId,
  getB2CDisbursementUtilityBalance,
  getB2CDisbursementWorkingBalance,

  // 21. Webhooks
  retryWithBackoff,
  parseStkPushWebhook,
  SAFARICOM_IPS,
  verifyWebhookIP,
  extractAmount,
  extractPhoneNumber,
  extractTransactionId,
  handleWebhook,
  isSuccessfulCallback,

  // 22. HTTP
  httpRequest,
} from '../src'

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function fn(name: string, value: unknown) {
  it(`exports ${name} as a function`, () => {
    expect(typeof value).toBe('function')
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Mpesa CLASS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Mpesa class (root index)', () => {
  it('is exported and is a constructor', () => {
    expect(typeof Mpesa).toBe('function')
  })

  it('can be instantiated from the root package entry', () => {
    const client = new Mpesa({
      consumerKey: 'k',
      consumerSecret: 's',
      environment: 'sandbox',
    })
    expect(client).toBeInstanceOf(Mpesa)
    expect(client.environment).toBe('sandbox')
  })

  it('throws when credentials are missing', () => {
    expect(
      () => new Mpesa({ consumerKey: '', consumerSecret: '', environment: 'sandbox' }),
    ).toThrow()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 2. CORE
// ═══════════════════════════════════════════════════════════════════════════════

describe('Core (root index)', () => {
  it('exports DARAJA_BASE_URLS with both environments', () => {
    expect(DARAJA_BASE_URLS.sandbox).toBe('https://sandbox.safaricom.co.ke')
    expect(DARAJA_BASE_URLS.production).toBe('https://api.safaricom.co.ke')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 3. AUTH
// ═══════════════════════════════════════════════════════════════════════════════

describe('Auth exports (root index)', () => {
  it('exports TokenManager as a class', () => {
    expect(typeof TokenManager).toBe('function')
  })

  it('exports AUTH_ERROR_CODES with documented codes', () => {
    expect(AUTH_ERROR_CODES.INVALID_AUTH_TYPE).toBe('400.008.01')
    expect(AUTH_ERROR_CODES.INVALID_GRANT_TYPE).toBe('400.008.02')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 4. BRANDED TYPES & RESULT HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Branded type helpers (root index)', () => {
  fn('ok', ok)
  fn('err', err)
  fn('toKesAmount', toKesAmount)
  fn('toMsisdn', toMsisdn)
  fn('toNonEmpty', toNonEmpty)
  fn('toPaybill', toPaybill)
  fn('toShortCode', toShortCode)
  fn('toTill', toTill)

  it('ok() wraps a value in { ok: true, data }', () => {
    const result = ok('hello')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toBe('hello')
  })

  it('err() wraps an error in { ok: false, error }', () => {
    const e = new Error('boom')
    const result = err(e)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe(e)
  })

  it('toKesAmount returns the rounded integer for valid amounts', () => {
    expect(toKesAmount(100)).toBe(100)
    expect(toKesAmount(99.6)).toBe(100)
  })

  it('toKesAmount throws for amounts < 1', () => {
    expect(() => toKesAmount(0)).toThrow()
    expect(() => toKesAmount(-5)).toThrow()
  })

  it('toMsisdn normalises 07XXXXXXXX format', () => {
    expect(toMsisdn('0712345678')).toBe('254712345678')
  })

  it('toMsisdn normalises +2547XXXXXXXX format', () => {
    expect(toMsisdn('+254712345678')).toBe('254712345678')
  })

  it('toMsisdn normalises 2547XXXXXXXX format unchanged', () => {
    expect(toMsisdn('254712345678')).toBe('254712345678')
  })

  it('toPaybill coerces a number to a branded string', () => {
    const code = toPaybill(600984)
    expect(typeof code).toBe('string')
    expect(code).toBe('600984')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 5. ERRORS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Error utilities (root index)', () => {
  it('exports PesafyError as a class', () => {
    expect(typeof PesafyError).toBe('function')
  })

  it('PesafyError can be instantiated', () => {
    const e = new PesafyError({ code: 'VALIDATION_ERROR', message: 'bad input' })
    expect(e).toBeInstanceOf(PesafyError)
    expect(e.code).toBe('VALIDATION_ERROR')
    expect(e.message).toBe('bad input')
    expect(e.name).toBe('PesafyError')
  })

  it('PesafyError.isValidation is true for VALIDATION_ERROR', () => {
    const e = new PesafyError({ code: 'VALIDATION_ERROR', message: 'x' })
    expect(e.isValidation).toBe(true)
  })

  it('PesafyError.isAuth is true for AUTH_FAILED', () => {
    const e = new PesafyError({ code: 'AUTH_FAILED', message: 'x' })
    expect(e.isAuth).toBe(true)
  })

  fn('createError', createError)
  fn('isPesafyError', isPesafyError)

  it('isPesafyError returns true for PesafyError instances', () => {
    const e = new PesafyError({ code: 'NETWORK_ERROR', message: 'x' })
    expect(isPesafyError(e)).toBe(true)
  })

  it('isPesafyError returns false for generic Error', () => {
    expect(isPesafyError(new Error('x'))).toBe(false)
  })

  it('createError returns a PesafyError', () => {
    const e = createError({ code: 'TIMEOUT', message: 'timed out' })
    expect(e).toBeInstanceOf(PesafyError)
    expect(e.code).toBe('TIMEOUT')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 6. ENCRYPTION
// ═══════════════════════════════════════════════════════════════════════════════

describe('Encryption exports (root index)', () => {
  fn('encryptSecurityCredential', encryptSecurityCredential)
})

// ═══════════════════════════════════════════════════════════════════════════════
// 7. PHONE UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

describe('Phone utilities (root index)', () => {
  fn('formatSafaricomPhone', formatSafaricomPhone)

  it('formatSafaricomPhone normalises 07XXXXXXXX to 2547XXXXXXXX', () => {
    expect(formatSafaricomPhone('0712345678')).toBe('254712345678')
  })

  it('formatSafaricomPhone normalises 9-digit number', () => {
    expect(formatSafaricomPhone('712345678')).toBe('254712345678')
  })

  it('formatSafaricomPhone throws for an invalid number', () => {
    expect(() => formatSafaricomPhone('123')).toThrow()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 8. STK PUSH  (critical: STK_PUSH_LIMITS, STK_RESULT_CODES, isKnownStkResultCode
//               were missing from the original src/index.ts)
// ═══════════════════════════════════════════════════════════════════════════════

describe('STK Push exports (root index)', () => {
  it('exports STK_PUSH_LIMITS with MIN_AMOUNT and MAX_AMOUNT', () => {
    expect(STK_PUSH_LIMITS).toBeDefined()
    expect(STK_PUSH_LIMITS.MIN_AMOUNT).toBe(1)
    expect(STK_PUSH_LIMITS.MAX_AMOUNT).toBe(250_000)
  })

  it('exports STK_RESULT_CODES with all 5 documented codes', () => {
    expect(STK_RESULT_CODES).toBeDefined()
    expect(STK_RESULT_CODES.SUCCESS).toBe(0)
    expect(STK_RESULT_CODES.INSUFFICIENT_BALANCE).toBe(1)
    expect(STK_RESULT_CODES.CANCELLED_BY_USER).toBe(1032)
    expect(STK_RESULT_CODES.PHONE_UNREACHABLE).toBe(1037)
    expect(STK_RESULT_CODES.INVALID_PIN).toBe(2001)
  })

  fn('isKnownStkResultCode', isKnownStkResultCode)

  it('isKnownStkResultCode identifies documented codes correctly', () => {
    expect(isKnownStkResultCode(0)).toBe(true)
    expect(isKnownStkResultCode(1)).toBe(true)
    expect(isKnownStkResultCode(1032)).toBe(true)
    expect(isKnownStkResultCode(1037)).toBe(true)
    expect(isKnownStkResultCode(2001)).toBe(true)
    expect(isKnownStkResultCode(9999)).toBe(false)
  })

  fn('isStkCallbackSuccess', isStkCallbackSuccess)
  fn('getCallbackValue', getCallbackValue)
  fn('formatPhoneNumber', formatPhoneNumber)
  fn('getTimestamp', getTimestamp)

  it('getTimestamp returns a 14-character YYYYMMDDHHmmss string', () => {
    const ts = getTimestamp()
    expect(/^\d{14}$/.test(ts)).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 9. C2B
// ═══════════════════════════════════════════════════════════════════════════════

describe('C2B exports (root index)', () => {
  fn('registerC2BUrls', registerC2BUrls)
  fn('simulateC2B', simulateC2B)

  it('C2B_REGISTER_URL_ERROR_CODES has 8 codes', () => {
    expect(Object.keys(C2B_REGISTER_URL_ERROR_CODES)).toHaveLength(8)
  })

  it('C2B_VALIDATION_RESULT_CODES.ACCEPT = "0"', () => {
    expect(C2B_VALIDATION_RESULT_CODES.ACCEPT).toBe('0')
  })

  fn('acceptC2BValidation', acceptC2BValidation)
  fn('acknowledgeC2BConfirmation', acknowledgeC2BConfirmation)
  fn('rejectC2BValidation', rejectC2BValidation)
  fn('isC2BPayload', isC2BPayload)
  fn('isPaybillPayment', isPaybillPayment)
  fn('isBuyGoodsPayment', isBuyGoodsPayment)
  fn('getC2BAmount', getC2BAmount)
  fn('getC2BAccountRef', getC2BAccountRef)
  fn('getC2BCustomerName', getC2BCustomerName)
  fn('getC2BTransactionId', getC2BTransactionId)
})

// ═══════════════════════════════════════════════════════════════════════════════
// 10. B2C ACCOUNT TOP UP
// ═══════════════════════════════════════════════════════════════════════════════

describe('B2C Account Top Up exports (root index)', () => {
  fn('initiateB2CPayment', initiateB2CPayment)
  it('B2C_RESULT_CODES.SUCCESS = 0', () => expect(B2C_RESULT_CODES.SUCCESS).toBe(0))
  it('B2C_ERROR_CODES.INVALID_ACCESS_TOKEN = "400.003.01"', () => {
    expect(B2C_ERROR_CODES.INVALID_ACCESS_TOKEN).toBe('400.003.01')
  })
  fn('isB2CResult', isB2CResult)
  fn('isB2CSuccess', isB2CSuccess)
  fn('isB2CFailure', isB2CFailure)
  fn('isKnownB2CResultCode', isKnownB2CResultCode)
  fn('getB2CAmount', getB2CAmount)
  fn('getB2CCurrency', getB2CCurrency)
  fn('getB2CDebitAccountBalance', getB2CDebitAccountBalance)
  fn('getB2CDebitPartyCharges', getB2CDebitPartyCharges)
  fn('getB2CConversationId', getB2CConversationId)
  fn('getB2COriginatorConversationId', getB2COriginatorConversationId)
  fn('getB2CReceiverPublicName', getB2CReceiverPublicName)
  fn('getB2CResultDesc', getB2CResultDesc)
  fn('getB2CResultParam', getB2CResultParam)
  fn('getB2CTransactionCompletedTime', getB2CTransactionCompletedTime)
  fn('getB2CTransactionId', getB2CTransactionId)
})

// ═══════════════════════════════════════════════════════════════════════════════
// 11. B2B EXPRESS CHECKOUT
// ═══════════════════════════════════════════════════════════════════════════════

describe('B2B Express Checkout exports (root index)', () => {
  fn('initiateB2BExpressCheckout', initiateB2BExpressCheckout)
  it('B2B_RESULT_CODES.SUCCESS = "0"', () => expect(B2B_RESULT_CODES.SUCCESS).toBe('0'))
  it('B2B_RESULT_CODES.CANCELLED = "4001"', () => expect(B2B_RESULT_CODES.CANCELLED).toBe('4001'))
  fn('isB2BCheckoutCallback', isB2BCheckoutCallback)
  fn('isB2BCheckoutCancelled', isB2BCheckoutCancelled)
  fn('isB2BCheckoutSuccess', isB2BCheckoutSuccess)
  fn('getB2BAmount', getB2BAmount)
  fn('getB2BConversationId', getB2BConversationId)
  fn('getB2BRequestId', getB2BRequestId)
  fn('getB2BTransactionId', getB2BTransactionId)
})

// ═══════════════════════════════════════════════════════════════════════════════
// 12. B2B BUY GOODS
// ═══════════════════════════════════════════════════════════════════════════════

describe('B2B Buy Goods exports (root index)', () => {
  fn('initiateB2BBuyGoods', initiateB2BBuyGoods)
  it('B2B_BUY_GOODS_RESULT_CODES.SUCCESS = 0', () =>
    expect(B2B_BUY_GOODS_RESULT_CODES.SUCCESS).toBe(0))
  fn('isB2BBuyGoodsResult', isB2BBuyGoodsResult)
  fn('isB2BBuyGoodsSuccess', isB2BBuyGoodsSuccess)
  fn('isB2BBuyGoodsFailure', isB2BBuyGoodsFailure)
  fn('isKnownB2BBuyGoodsResultCode', isKnownB2BBuyGoodsResultCode)
  fn('getB2BBuyGoodsAmount', getB2BBuyGoodsAmount)
  fn('getB2BBuyGoodsBillReferenceNumber', getB2BBuyGoodsBillReferenceNumber)
  fn('getB2BBuyGoodsCompletedTime', getB2BBuyGoodsCompletedTime)
  fn('getB2BBuyGoodsConversationId', getB2BBuyGoodsConversationId)
  fn('getB2BBuyGoodsCurrency', getB2BBuyGoodsCurrency)
  fn('getB2BBuyGoodsDebitAccountBalance', getB2BBuyGoodsDebitAccountBalance)
  fn('getB2BBuyGoodsDebitPartyAffectedBalance', getB2BBuyGoodsDebitPartyAffectedBalance)
  fn('getB2BBuyGoodsDebitPartyCharges', getB2BBuyGoodsDebitPartyCharges)
  fn('getB2BBuyGoodsInitiatorBalance', getB2BBuyGoodsInitiatorBalance)
  fn('getB2BBuyGoodsOriginatorConversationId', getB2BBuyGoodsOriginatorConversationId)
  fn('getB2BBuyGoodsQueueTimeoutUrl', getB2BBuyGoodsQueueTimeoutUrl)
  fn('getB2BBuyGoodsReceiverName', getB2BBuyGoodsReceiverName)
  fn('getB2BBuyGoodsResultCode', getB2BBuyGoodsResultCode)
  fn('getB2BBuyGoodsResultDesc', getB2BBuyGoodsResultDesc)
  fn('getB2BBuyGoodsResultParam', getB2BBuyGoodsResultParam)
  fn('getB2BBuyGoodsTransactionId', getB2BBuyGoodsTransactionId)
  it('B2B_BUY_GOODS_ERROR_CODES.INVALID_AUTH_HEADER = "404.001.04"', () => {
    expect(B2B_BUY_GOODS_ERROR_CODES.INVALID_AUTH_HEADER).toBe('404.001.04')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 13. B2B PAY BILL
// ═══════════════════════════════════════════════════════════════════════════════

describe('B2B Pay Bill exports (root index)', () => {
  fn('initiateB2BPayBill', initiateB2BPayBill)
  it('B2B_PAY_BILL_RESULT_CODES.SUCCESS = 0', () =>
    expect(B2B_PAY_BILL_RESULT_CODES.SUCCESS).toBe(0))
  fn('isB2BPayBillResult', isB2BPayBillResult)
  fn('isB2BPayBillSuccess', isB2BPayBillSuccess)
  fn('isB2BPayBillFailure', isB2BPayBillFailure)
  fn('isKnownB2BPayBillResultCode', isKnownB2BPayBillResultCode)
  fn('getB2BPayBillAmount', getB2BPayBillAmount)
  fn('getB2BPayBillBillReferenceNumber', getB2BPayBillBillReferenceNumber)
  fn('getB2BPayBillCompletedTime', getB2BPayBillCompletedTime)
  fn('getB2BPayBillConversationId', getB2BPayBillConversationId)
  fn('getB2BPayBillCurrency', getB2BPayBillCurrency)
  fn('getB2BPayBillDebitAccountBalance', getB2BPayBillDebitAccountBalance)
  fn('getB2BPayBillDebitPartyAffectedBalance', getB2BPayBillDebitPartyAffectedBalance)
  fn('getB2BPayBillDebitPartyCharges', getB2BPayBillDebitPartyCharges)
  fn('getB2BPayBillInitiatorBalance', getB2BPayBillInitiatorBalance)
  fn('getB2BPayBillOriginatorConversationId', getB2BPayBillOriginatorConversationId)
  fn('getB2BPayBillReceiverName', getB2BPayBillReceiverName)
  fn('getB2BPayBillResultCode', getB2BPayBillResultCode)
  fn('getB2BPayBillResultDesc', getB2BPayBillResultDesc)
  fn('getB2BPayBillResultParam', getB2BPayBillResultParam)
  fn('getB2BPayBillTransactionId', getB2BPayBillTransactionId)
  it('B2B_PAY_BILL_ERROR_CODES.INVALID_ACCESS_TOKEN = "400.003.01"', () => {
    expect(B2B_PAY_BILL_ERROR_CODES.INVALID_ACCESS_TOKEN).toBe('400.003.01')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 14. TAX REMITTANCE
// ═══════════════════════════════════════════════════════════════════════════════

describe('Tax Remittance exports (root index)', () => {
  it('KRA_SHORTCODE = "572572"', () => expect(KRA_SHORTCODE).toBe('572572'))
  it('TAX_COMMAND_ID = "PayTaxToKRA"', () => expect(TAX_COMMAND_ID).toBe('PayTaxToKRA'))
  fn('remitTax', remitTax)
  fn('isTaxRemittanceResult', isTaxRemittanceResult)
  fn('isTaxRemittanceSuccess', isTaxRemittanceSuccess)
  fn('isTaxRemittanceFailure', isTaxRemittanceFailure)
  fn('getTaxAmount', getTaxAmount)
  fn('getTaxCompletedTime', getTaxCompletedTime)
  fn('getTaxConversationId', getTaxConversationId)
  fn('getTaxOriginatorConversationId', getTaxOriginatorConversationId)
  fn('getTaxReceiverName', getTaxReceiverName)
  fn('getTaxResultCode', getTaxResultCode)
  fn('getTaxResultDesc', getTaxResultDesc)
  fn('getTaxResultParam', getTaxResultParam)
  fn('getTaxTransactionId', getTaxTransactionId)
})

// ═══════════════════════════════════════════════════════════════════════════════
// 15. TRANSACTION STATUS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Transaction Status exports (root index)', () => {
  fn('queryTransactionStatus', queryTransactionStatus)
  it('TRANSACTION_STATUS_RESULT_CODES.SUCCESS = 0', () => {
    expect(TRANSACTION_STATUS_RESULT_CODES.SUCCESS).toBe(0)
  })
  it('TRANSACTION_STATUS_ERROR_CODES has 8 codes', () => {
    expect(Object.keys(TRANSACTION_STATUS_ERROR_CODES)).toHaveLength(8)
  })
  fn('isTransactionStatusResult', isTransactionStatusResult)
  fn('isTransactionStatusSuccess', isTransactionStatusSuccess)
  fn('isTransactionStatusFailure', isTransactionStatusFailure)
  fn('isKnownTransactionStatusResultCode', isKnownTransactionStatusResultCode)
  fn('getTransactionStatusConversationId', getTransactionStatusConversationId)
  fn('getTransactionStatusOriginatorConversationId', getTransactionStatusOriginatorConversationId)
  fn('getTransactionStatusResultCode', getTransactionStatusResultCode)
  fn('getTransactionStatusResultDesc', getTransactionStatusResultDesc)
  fn('getTransactionStatusTransactionId', getTransactionStatusTransactionId)
  fn('getTransactionStatusAmount', getTransactionStatusAmount)
  fn('getTransactionStatusCreditPartyName', getTransactionStatusCreditPartyName)
  fn('getTransactionStatusDebitAccountBalance', getTransactionStatusDebitAccountBalance)
  fn('getTransactionStatusDebitPartyName', getTransactionStatusDebitPartyName)
  fn('getTransactionStatusReceiptNo', getTransactionStatusReceiptNo)
  fn('getTransactionStatusResultParam', getTransactionStatusResultParam)
  fn('getTransactionStatusStatus', getTransactionStatusStatus)
  fn('getTransactionStatusTransactionDate', getTransactionStatusTransactionDate)
})

// ═══════════════════════════════════════════════════════════════════════════════
// 16. ACCOUNT BALANCE
// ═══════════════════════════════════════════════════════════════════════════════

describe('Account Balance exports (root index)', () => {
  fn('queryAccountBalance', queryAccountBalance)

  it('ACCOUNT_BALANCE_ERROR_CODES has documented codes', () => {
    expect(ACCOUNT_BALANCE_ERROR_CODES.DUPLICATE_DETECTED).toBe(15)
    expect(ACCOUNT_BALANCE_ERROR_CODES.UNRESOLVED_INITIATOR).toBe(20)
  })

  fn('isAccountBalanceSuccess', isAccountBalanceSuccess)
  fn('parseAccountBalance', parseAccountBalance)
  fn('getAccountBalanceParam', getAccountBalanceParam)
  fn('getAccountBalanceTransactionId', getAccountBalanceTransactionId)
  fn('getAccountBalanceConversationId', getAccountBalanceConversationId)
  fn('getAccountBalanceOriginatorConversationId', getAccountBalanceOriginatorConversationId)
  fn('getAccountBalanceCompletedTime', getAccountBalanceCompletedTime)
  fn('getAccountBalanceRawBalance', getAccountBalanceRawBalance)
  fn('getAccountBalanceReferenceItem', getAccountBalanceReferenceItem)

  it('parseAccountBalance parses a Daraja balance string correctly', () => {
    const raw = 'Utility Account|KES|228037.00|KES|0.00'
    const accounts = parseAccountBalance(raw)
    expect(accounts.length).toBeGreaterThan(0)
    expect(accounts[0]?.name).toBe('Utility Account')
    expect(accounts[0]?.currency).toBe('KES')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 17. REVERSAL
// ═══════════════════════════════════════════════════════════════════════════════

describe('Reversal exports (root index)', () => {
  fn('requestReversal', requestReversal)
  it('REVERSAL_COMMAND_ID = "TransactionReversal"', () =>
    expect(REVERSAL_COMMAND_ID).toBe('TransactionReversal'))
  it('REVERSAL_RECEIVER_IDENTIFIER_TYPE = "11"', () =>
    expect(REVERSAL_RECEIVER_IDENTIFIER_TYPE).toBe('11'))
  it('REVERSAL_RESULT_CODES.SUCCESS = 0', () => expect(REVERSAL_RESULT_CODES.SUCCESS).toBe(0))
  it('REVERSAL_RESULT_CODES.ALREADY_REVERSED = "R000001"', () =>
    expect(REVERSAL_RESULT_CODES.ALREADY_REVERSED).toBe('R000001'))
  fn('isKnownReversalResultCode', isKnownReversalResultCode)
  fn('isReversalFailure', isReversalFailure)
  fn('isReversalResult', isReversalResult)
  fn('isReversalSuccess', isReversalSuccess)
  fn('getReversalAmount', getReversalAmount)
  fn('getReversalCharge', getReversalCharge)
  fn('getReversalCompletedTime', getReversalCompletedTime)
  fn('getReversalConversationId', getReversalConversationId)
  fn('getReversalCreditPartyPublicName', getReversalCreditPartyPublicName)
  fn('getReversalDebitAccountBalance', getReversalDebitAccountBalance)
  fn('getReversalDebitPartyPublicName', getReversalDebitPartyPublicName)
  fn('getReversalOriginalTransactionId', getReversalOriginalTransactionId)
  fn('getReversalOriginatorConversationId', getReversalOriginatorConversationId)
  fn('getReversalResultCode', getReversalResultCode)
  fn('getReversalResultDesc', getReversalResultDesc)
  fn('getReversalResultParam', getReversalResultParam)
  fn('getReversalTransactionId', getReversalTransactionId)
  it('REVERSAL_ERROR_CODES.BAD_REQUEST = "400.002.02"', () =>
    expect(REVERSAL_ERROR_CODES.BAD_REQUEST).toBe('400.002.02'))
})

// ═══════════════════════════════════════════════════════════════════════════════
// 18. BILL MANAGER
// ═══════════════════════════════════════════════════════════════════════════════

describe('Bill Manager exports (root index)', () => {
  fn('billManagerOptIn', billManagerOptIn)
  fn('updateOptIn', updateOptIn)
  fn('sendSingleInvoice', sendSingleInvoice)
  fn('sendBulkInvoices', sendBulkInvoices)
  fn('cancelInvoice', cancelInvoice)
  fn('cancelBulkInvoices', cancelBulkInvoices)
  fn('reconcilePayment', reconcilePayment)
})

// ═══════════════════════════════════════════════════════════════════════════════
// 19. DYNAMIC QR  (generateDynamicQR + all validators were missing)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Dynamic QR exports (root index)', () => {
  fn('generateDynamicQR', generateDynamicQR)

  it('QR_TRANSACTION_CODES contains exactly the 5 Daraja codes', () => {
    expect(QR_TRANSACTION_CODES).toStrictEqual(['BG', 'WA', 'PB', 'SM', 'SB'])
  })

  it('DEFAULT_QR_SIZE = 300', () => expect(DEFAULT_QR_SIZE).toBe(300))
  it('MAX_QR_SIZE = 1000', () => expect(MAX_QR_SIZE).toBe(1000))
  it('MIN_AMOUNT = 1', () => expect(MIN_AMOUNT).toBe(1))
  it('MIN_QR_SIZE = 1', () => expect(MIN_QR_SIZE).toBe(1))

  fn('validateAmount', validateAmount)
  fn('validateCpi', validateCpi)
  fn('validateDynamicQRRequest', validateDynamicQRRequest)
  fn('validateMerchantName', validateMerchantName)
  fn('validateRefNo', validateRefNo)
  fn('validateSize', validateSize)
  fn('validateTrxCode', validateTrxCode)

  it('validateDynamicQRRequest returns valid for a complete payload', () => {
    const result = validateDynamicQRRequest({
      merchantName: 'My Store',
      refNo: 'REF-42',
      amount: 500,
      trxCode: 'PB',
      cpi: '174379',
      size: 400,
    })
    expect(result.valid).toBe(true)
  })

  it('validateDynamicQRRequest returns invalid for empty merchantName', () => {
    const result = validateDynamicQRRequest({
      merchantName: '',
      refNo: 'REF',
      amount: 100,
      trxCode: 'BG',
      cpi: '1234',
    })
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.errors).toHaveProperty('merchantName')
  })

  it('validateSize returns null for valid size 500', () => {
    expect(validateSize(500)).toBeNull()
  })

  it('validateSize returns error string for size > MAX_QR_SIZE', () => {
    expect(validateSize(9999)).toBeTypeOf('string')
  })

  it('validateTrxCode returns null for each of the 5 documented codes', () => {
    for (const code of ['BG', 'WA', 'PB', 'SM', 'SB']) {
      expect(validateTrxCode(code)).toBeNull()
    }
  })

  it('validateTrxCode returns error for unknown code', () => {
    expect(validateTrxCode('XX')).toBeTypeOf('string')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 20. B2C DISBURSEMENT  (entire module was missing from original src/index.ts)
// ═══════════════════════════════════════════════════════════════════════════════

describe('B2C Disbursement exports (root index)', () => {
  fn('initiateB2CDisbursement', initiateB2CDisbursement)

  it('B2C_DISBURSEMENT_RESULT_CODES has 14 documented codes', () => {
    expect(B2C_DISBURSEMENT_RESULT_CODES).toBeDefined()
    expect(B2C_DISBURSEMENT_RESULT_CODES.SUCCESS).toBe(0)
    expect(B2C_DISBURSEMENT_RESULT_CODES.INSUFFICIENT_BALANCE).toBe(1)
    expect(B2C_DISBURSEMENT_RESULT_CODES.AMOUNT_TOO_SMALL).toBe(2)
    expect(B2C_DISBURSEMENT_RESULT_CODES.AMOUNT_TOO_LARGE).toBe(3)
    expect(B2C_DISBURSEMENT_RESULT_CODES.DAILY_LIMIT_EXCEEDED).toBe(4)
    expect(B2C_DISBURSEMENT_RESULT_CODES.MAX_BALANCE_EXCEEDED).toBe(8)
    expect(B2C_DISBURSEMENT_RESULT_CODES.DEBIT_PARTY_INVALID).toBe(11)
    expect(B2C_DISBURSEMENT_RESULT_CODES.INITIATOR_NOT_ALLOWED).toBe(21)
    expect(B2C_DISBURSEMENT_RESULT_CODES.INVALID_INITIATOR_INFO).toBe(2001)
    expect(B2C_DISBURSEMENT_RESULT_CODES.ACCOUNT_INACTIVE).toBe(2006)
    expect(B2C_DISBURSEMENT_RESULT_CODES.PRODUCT_NOT_PERMITTED).toBe(2028)
    expect(B2C_DISBURSEMENT_RESULT_CODES.CUSTOMER_NOT_REGISTERED).toBe(2040)
    expect(B2C_DISBURSEMENT_RESULT_CODES.SECURITY_CREDENTIAL_LOCKED).toBe(8006)
    expect(B2C_DISBURSEMENT_RESULT_CODES.OPERATOR_DOES_NOT_EXIST).toBe('SFC_IC0003')
  })

  fn('isB2CDisbursementResult', isB2CDisbursementResult)
  fn('isB2CDisbursementSuccess', isB2CDisbursementSuccess)
  fn('isB2CDisbursementFailure', isB2CDisbursementFailure)
  fn('isKnownB2CDisbursementResultCode', isKnownB2CDisbursementResultCode)
  fn('isB2CDisbursementRecipientRegistered', isB2CDisbursementRecipientRegistered)
  fn('getB2CDisbursementAmount', getB2CDisbursementAmount)
  fn('getB2CDisbursementCompletedTime', getB2CDisbursementCompletedTime)
  fn('getB2CDisbursementConversationId', getB2CDisbursementConversationId)
  fn('getB2CDisbursementOriginatorConversationId', getB2CDisbursementOriginatorConversationId)
  fn('getB2CDisbursementReceiptNumber', getB2CDisbursementReceiptNumber)
  fn('getB2CDisbursementReceiverName', getB2CDisbursementReceiverName)
  fn('getB2CDisbursementResultCode', getB2CDisbursementResultCode)
  fn('getB2CDisbursementResultDesc', getB2CDisbursementResultDesc)
  fn('getB2CDisbursementResultParam', getB2CDisbursementResultParam)
  fn('getB2CDisbursementTransactionId', getB2CDisbursementTransactionId)
  fn('getB2CDisbursementUtilityBalance', getB2CDisbursementUtilityBalance)
  fn('getB2CDisbursementWorkingBalance', getB2CDisbursementWorkingBalance)

  it('isB2CDisbursementResult validates the minimum documented shape', () => {
    const validPayload = {
      Result: {
        ResultType: 0,
        ResultCode: 0,
        ResultDesc: 'Success',
        OriginatorConversationID: 'oc-abc',
        ConversationID: 'c-abc',
        TransactionID: 'TX1',
      },
    }
    expect(isB2CDisbursementResult(validPayload)).toBe(true)
    expect(isB2CDisbursementResult(null)).toBe(false)
    expect(isB2CDisbursementResult({})).toBe(false)
    expect(isB2CDisbursementResult({ Result: {} })).toBe(false)
  })

  it('isKnownB2CDisbursementResultCode handles the unique string code SFC_IC0003', () => {
    expect(isKnownB2CDisbursementResultCode('SFC_IC0003')).toBe(true)
    expect(isKnownB2CDisbursementResultCode(0)).toBe(true)
    expect(isKnownB2CDisbursementResultCode(8006)).toBe(true)
    expect(isKnownB2CDisbursementResultCode('')).toBe(false)
    expect(isKnownB2CDisbursementResultCode(null)).toBe(false)
    expect(isKnownB2CDisbursementResultCode(99999)).toBe(false)
  })

  it('isB2CDisbursementSuccess returns true for ResultCode 0', () => {
    const result = {
      Result: {
        ResultType: 0,
        ResultCode: 0,
        ResultDesc: 'Success',
        OriginatorConversationID: 'oc',
        ConversationID: 'c',
        TransactionID: 'T',
      },
    }
    expect(isB2CDisbursementSuccess(result)).toBe(true)
    expect(isB2CDisbursementFailure(result)).toBe(false)
  })

  it('isB2CDisbursementSuccess returns false for non-zero ResultCode', () => {
    const result = {
      Result: {
        ResultType: 0,
        ResultCode: 2001,
        ResultDesc: 'Failed',
        OriginatorConversationID: 'oc',
        ConversationID: 'c',
        TransactionID: 'T',
      },
    }
    expect(isB2CDisbursementSuccess(result)).toBe(false)
    expect(isB2CDisbursementFailure(result)).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 21. WEBHOOKS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Webhooks exports (root index)', () => {
  fn('retryWithBackoff', retryWithBackoff)
  fn('parseStkPushWebhook', parseStkPushWebhook)
  fn('verifyWebhookIP', verifyWebhookIP)
  fn('extractAmount', extractAmount)
  fn('extractPhoneNumber', extractPhoneNumber)
  fn('extractTransactionId', extractTransactionId)
  fn('handleWebhook', handleWebhook)
  fn('isSuccessfulCallback', isSuccessfulCallback)

  it('SAFARICOM_IPS is a non-empty array containing 196.201.214.200', () => {
    expect(Array.isArray(SAFARICOM_IPS)).toBe(true)
    expect(SAFARICOM_IPS.length).toBeGreaterThan(0)
    expect(SAFARICOM_IPS).toContain('196.201.214.200')
  })

  it('verifyWebhookIP returns true for a known Safaricom IP', () => {
    expect(verifyWebhookIP('196.201.214.206')).toBe(true)
  })

  it('verifyWebhookIP returns false for a random IP', () => {
    expect(verifyWebhookIP('10.0.0.1')).toBe(false)
  })

  it('parseStkPushWebhook returns null for invalid body', () => {
    expect(parseStkPushWebhook(null)).toBeNull()
    expect(parseStkPushWebhook({})).toBeNull()
    expect(parseStkPushWebhook({ Body: {} })).toBeNull()
  })

  it('parseStkPushWebhook returns payload for a valid STK body', () => {
    const body = {
      Body: {
        stkCallback: {
          MerchantRequestID: 'MR-1',
          CheckoutRequestID: 'CR-1',
          ResultCode: 0,
          ResultDesc: 'Success',
        },
      },
    }
    const parsed = parseStkPushWebhook(body)
    expect(parsed).not.toBeNull()
    expect(parsed?.Body.stkCallback.ResultCode).toBe(0)
  })

  it('handleWebhook rejects a non-Safaricom IP when skipIPCheck is false', () => {
    const result = handleWebhook({ Body: { stkCallback: {} } }, { requestIP: '1.2.3.4' })
    expect(result.success).toBe(false)
    expect(result.error).toContain('whitelist')
  })

  it('handleWebhook accepts any IP when skipIPCheck is true', () => {
    const body = {
      Body: {
        stkCallback: {
          MerchantRequestID: 'MR-1',
          CheckoutRequestID: 'CR-1',
          ResultCode: 0,
          ResultDesc: 'Success',
        },
      },
    }
    const result = handleWebhook(body, { skipIPCheck: true })
    expect(result.success).toBe(true)
    expect(result.eventType).toBe('stk_push')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 22. HTTP
// ═══════════════════════════════════════════════════════════════════════════════

describe('HTTP export (root index)', () => {
  fn('httpRequest', httpRequest)
})

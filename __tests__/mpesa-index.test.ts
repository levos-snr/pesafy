/**
 * __tests__/mpesa-index.test.ts
 *
 * Comprehensive test suite for src/mpesa/index.ts
 *
 * Verifies:
 *   1.  Mpesa class export — instantiation, methods, and getter
 *   2.  Core type exports  — DARAJA_BASE_URLS, Environment
 *   3.  Account Balance module re-exports
 *   4.  B2B Buy Goods module re-exports
 *   5.  B2B Express Checkout module re-exports
 *   6.  B2B Pay Bill module re-exports
 *   7.  B2C Account Top Up module re-exports
 *   8.  B2C Disbursement module re-exports
 *   9.  Bill Manager module re-exports
 *   10. C2B module re-exports
 *   11. Dynamic QR module re-exports (including validators)
 *   12. Reversal module re-exports
 *   13. STK Push module re-exports (including constants)
 *   14. Tax Remittance module re-exports
 *   15. Transaction Status module re-exports
 *   16. Webhooks module re-exports
 *
 * Run: pnpm test
 */

import { describe, expect, it, vi } from 'vitest'

// ── Mock HTTP so the Mpesa constructor can be exercised without network ────────
vi.mock('../src/utils/http', () => ({ httpRequest: vi.fn() }))

// ── Import everything from the mpesa module entry point ───────────────────────
import {
  // ── Mpesa class ─────────────────────────────────────────────────────────────
  Mpesa,

  // ── Core ────────────────────────────────────────────────────────────────────
  DARAJA_BASE_URLS,

  // ── Account Balance ──────────────────────────────────────────────────────────
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

  // ── B2B Buy Goods ────────────────────────────────────────────────────────────
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

  // ── B2B Express Checkout ─────────────────────────────────────────────────────
  initiateB2BExpressCheckout,
  B2B_RESULT_CODES,
  isB2BCheckoutCallback,
  isB2BCheckoutCancelled,
  isB2BCheckoutFailed,
  isB2BCheckoutSuccess,
  isB2BStatusSuccess,
  isKnownB2BResultCode,
  getB2BAmount,
  getB2BConversationId,
  getB2BPaymentReference,
  getB2BRequestId,
  getB2BResultCode,
  getB2BResultDesc,
  getB2BTransactionId,

  // ── B2B Pay Bill ─────────────────────────────────────────────────────────────
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

  // ── B2C Account Top Up ───────────────────────────────────────────────────────
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

  // ── B2C Disbursement ─────────────────────────────────────────────────────────
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

  // ── Bill Manager ─────────────────────────────────────────────────────────────
  billManagerOptIn,
  updateOptIn,
  sendSingleInvoice,
  sendBulkInvoices,
  cancelInvoice,
  cancelBulkInvoices,
  reconcilePayment,

  // ── C2B ──────────────────────────────────────────────────────────────────────
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

  // ── Dynamic QR ───────────────────────────────────────────────────────────────
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

  // ── Reversal ─────────────────────────────────────────────────────────────────
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

  // ── STK Push ─────────────────────────────────────────────────────────────────
  processStkPush,
  queryStkPush,
  STK_PUSH_LIMITS,
  STK_RESULT_CODES,
  isKnownStkResultCode,
  isStkCallbackSuccess,
  getCallbackValue,
  formatPhoneNumber,
  getTimestamp,

  // ── Tax Remittance ───────────────────────────────────────────────────────────
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

  // ── Transaction Status ───────────────────────────────────────────────────────
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

  // ── Webhooks ─────────────────────────────────────────────────────────────────
  retryWithBackoff,
  parseStkPushWebhook,
  SAFARICOM_IPS,
  verifyWebhookIP,
  extractAmount,
  extractPhoneNumber,
  extractTransactionId,
  handleWebhook,
  isSuccessfulCallback,
} from '../src/mpesa'

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function fn(name: string, value: unknown) {
  it(`exports ${name} as a function`, () => {
    expect(typeof value).toBe('function')
  })
}

function constant(name: string, value: unknown) {
  it(`exports ${name} as an object/constant`, () => {
    expect(value).toBeDefined()
    expect(typeof value).toBe('object')
    expect(value).not.toBeNull()
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Mpesa CLASS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Mpesa class', () => {
  it('is exported and is a constructor function', () => {
    expect(typeof Mpesa).toBe('function')
  })

  it('can be instantiated with minimum config', () => {
    const client = new Mpesa({
      consumerKey: 'key',
      consumerSecret: 'secret',
      environment: 'sandbox',
    })
    expect(client).toBeInstanceOf(Mpesa)
  })

  it('exposes environment getter', () => {
    const client = new Mpesa({
      consumerKey: 'key',
      consumerSecret: 'secret',
      environment: 'production',
    })
    expect(client.environment).toBe('production')
  })

  it('throws INVALID_CREDENTIALS when consumerKey is missing', () => {
    expect(
      () =>
        new Mpesa({
          consumerKey: '',
          consumerSecret: 'secret',
          environment: 'sandbox',
        }),
    ).toThrow()
  })

  it('throws INVALID_CREDENTIALS when consumerSecret is missing', () => {
    expect(
      () =>
        new Mpesa({
          consumerKey: 'key',
          consumerSecret: '',
          environment: 'sandbox',
        }),
    ).toThrow()
  })

  it('exposes clearTokenCache as a method', () => {
    const client = new Mpesa({
      consumerKey: 'key',
      consumerSecret: 'secret',
      environment: 'sandbox',
    })
    expect(typeof client.clearTokenCache).toBe('function')
    expect(() => client.clearTokenCache()).not.toThrow()
  })

  const CLIENT = new Mpesa({
    consumerKey: 'key',
    consumerSecret: 'secret',
    environment: 'sandbox',
    lipaNaMpesaShortCode: '174379',
    lipaNaMpesaPassKey: 'passkey',
    initiatorName: 'initiator',
    securityCredential: 'cred==',
  })

  const METHOD_NAMES = [
    'stkPush',
    'stkPushSafe',
    'stkQuery',
    'transactionStatus',
    'accountBalance',
    'accountBalanceSafe',
    'reverseTransaction',
    'generateDynamicQR',
    'registerC2BUrls',
    'simulateC2B',
    'remitTax',
    'b2bExpressCheckout',
    'b2bBuyGoods',
    'b2bPayBill',
    'b2cPayment',
    'b2cDisbursement',
    'billManagerOptIn',
    'updateOptIn',
    'sendInvoice',
    'sendBulkInvoices',
    'cancelInvoice',
    'cancelBulkInvoices',
    'reconcilePayment',
  ] as const

  for (const method of METHOD_NAMES) {
    it(`has method ${method}`, () => {
      expect(typeof (CLIENT as unknown as Record<string, unknown>)[method]).toBe('function')
    })
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// 2. CORE TYPES & CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Core exports', () => {
  it('exports DARAJA_BASE_URLS with sandbox and production keys', () => {
    expect(DARAJA_BASE_URLS).toBeDefined()
    expect(DARAJA_BASE_URLS.sandbox).toBe('https://sandbox.safaricom.co.ke')
    expect(DARAJA_BASE_URLS.production).toBe('https://api.safaricom.co.ke')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 3. ACCOUNT BALANCE
// ═══════════════════════════════════════════════════════════════════════════════

describe('Account Balance exports', () => {
  fn('queryAccountBalance', queryAccountBalance)

  it('exports ACCOUNT_BALANCE_ERROR_CODES with documented codes', () => {
    expect(ACCOUNT_BALANCE_ERROR_CODES).toBeDefined()
    expect(ACCOUNT_BALANCE_ERROR_CODES.DUPLICATE_DETECTED).toBe(15)
    expect(ACCOUNT_BALANCE_ERROR_CODES.INITIATOR_CREDENTIAL_CHECK_FAILURE).toBe(18)
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

  it('isAccountBalanceSuccess returns true for ResultCode 0', () => {
    const result = {
      Result: {
        ResultType: 0,
        ResultCode: 0,
        ResultDesc: 'Success',
        OriginatorConversationID: 'x',
        ConversationID: 'y',
        TransactionID: 'z',
      },
    }
    expect(isAccountBalanceSuccess(result)).toBe(true)
  })

  it('parseAccountBalance parses a real Daraja balance string', () => {
    const raw = 'Working Account|KES|700000.00|KES|0.00|Utility Account|KES|228037.00|'
    const accounts = parseAccountBalance(raw)
    expect(accounts.length).toBeGreaterThan(0)
    expect(accounts[0]?.name).toBe('Working Account')
    expect(accounts[0]?.currency).toBe('KES')
    expect(accounts[0]?.amount).toBe('700000.00')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 4. B2B BUY GOODS
// ═══════════════════════════════════════════════════════════════════════════════

describe('B2B Buy Goods exports', () => {
  fn('initiateB2BBuyGoods', initiateB2BBuyGoods)

  it('exports B2B_BUY_GOODS_RESULT_CODES with SUCCESS = 0', () => {
    expect(B2B_BUY_GOODS_RESULT_CODES.SUCCESS).toBe(0)
    expect(B2B_BUY_GOODS_RESULT_CODES.INVALID_INITIATOR_INFO).toBe(2001)
  })

  it('exports B2B_BUY_GOODS_ERROR_CODES with documented codes', () => {
    expect(B2B_BUY_GOODS_ERROR_CODES.INVALID_ACCESS_TOKEN).toBe('400.003.01')
    expect(B2B_BUY_GOODS_ERROR_CODES.INVALID_AUTH_HEADER).toBe('404.001.04')
  })

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
})

// ═══════════════════════════════════════════════════════════════════════════════
// 5. B2B EXPRESS CHECKOUT
// ═══════════════════════════════════════════════════════════════════════════════

describe('B2B Express Checkout exports', () => {
  fn('initiateB2BExpressCheckout', initiateB2BExpressCheckout)

  it('exports B2B_RESULT_CODES with documented codes', () => {
    expect(B2B_RESULT_CODES.SUCCESS).toBe('0')
    expect(B2B_RESULT_CODES.CANCELLED).toBe('4001')
    expect(B2B_RESULT_CODES.KYC_FAIL).toBe('4102')
    expect(B2B_RESULT_CODES.NO_NOMINATED_NUMBER).toBe('4104')
    expect(B2B_RESULT_CODES.USSD_NETWORK_ERROR).toBe('4201')
    expect(B2B_RESULT_CODES.USSD_EXCEPTION_ERROR).toBe('4203')
  })

  fn('isB2BCheckoutCallback', isB2BCheckoutCallback)
  fn('isB2BCheckoutCancelled', isB2BCheckoutCancelled)
  fn('isB2BCheckoutFailed', isB2BCheckoutFailed)
  fn('isB2BCheckoutSuccess', isB2BCheckoutSuccess)
  fn('isB2BStatusSuccess', isB2BStatusSuccess)
  fn('isKnownB2BResultCode', isKnownB2BResultCode)
  fn('getB2BAmount', getB2BAmount)
  fn('getB2BConversationId', getB2BConversationId)
  fn('getB2BPaymentReference', getB2BPaymentReference)
  fn('getB2BRequestId', getB2BRequestId)
  fn('getB2BResultCode', getB2BResultCode)
  fn('getB2BResultDesc', getB2BResultDesc)
  fn('getB2BTransactionId', getB2BTransactionId)
})

// ═══════════════════════════════════════════════════════════════════════════════
// 6. B2B PAY BILL
// ═══════════════════════════════════════════════════════════════════════════════

describe('B2B Pay Bill exports', () => {
  fn('initiateB2BPayBill', initiateB2BPayBill)

  it('exports B2B_PAY_BILL_RESULT_CODES with SUCCESS = 0', () => {
    expect(B2B_PAY_BILL_RESULT_CODES.SUCCESS).toBe(0)
    expect(B2B_PAY_BILL_RESULT_CODES.INVALID_INITIATOR_INFO).toBe(2001)
  })

  it('exports B2B_PAY_BILL_ERROR_CODES with documented codes', () => {
    expect(B2B_PAY_BILL_ERROR_CODES.INVALID_ACCESS_TOKEN).toBe('400.003.01')
    expect(B2B_PAY_BILL_ERROR_CODES.BAD_REQUEST).toBe('400.003.02')
  })

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
})

// ═══════════════════════════════════════════════════════════════════════════════
// 7. B2C ACCOUNT TOP UP
// ═══════════════════════════════════════════════════════════════════════════════

describe('B2C Account Top Up exports', () => {
  fn('initiateB2CPayment', initiateB2CPayment)

  it('exports B2C_RESULT_CODES with SUCCESS = 0', () => {
    expect(B2C_RESULT_CODES.SUCCESS).toBe(0)
    expect(B2C_RESULT_CODES.INVALID_INITIATOR).toBe(2001)
  })

  it('exports B2C_ERROR_CODES with documented codes', () => {
    expect(B2C_ERROR_CODES.INVALID_ACCESS_TOKEN).toBe('400.003.01')
    expect(B2C_ERROR_CODES.INTERNAL_SERVER_ERROR).toBe('500.003.1001')
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
// 8. B2C DISBURSEMENT  (was entirely missing — critical fix)
// ═══════════════════════════════════════════════════════════════════════════════

describe('B2C Disbursement exports', () => {
  fn('initiateB2CDisbursement', initiateB2CDisbursement)

  it('exports B2C_DISBURSEMENT_RESULT_CODES with all 14 documented codes', () => {
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

  it('isB2CDisbursementResult returns true for a valid payload', () => {
    const body = {
      Result: {
        ResultType: 0,
        ResultCode: 0,
        ResultDesc: 'Success',
        OriginatorConversationID: 'oc-1',
        ConversationID: 'c-1',
        TransactionID: 'T1',
      },
    }
    expect(isB2CDisbursementResult(body)).toBe(true)
  })

  it('isKnownB2CDisbursementResultCode handles the string code SFC_IC0003', () => {
    expect(isKnownB2CDisbursementResultCode('SFC_IC0003')).toBe(true)
    expect(isKnownB2CDisbursementResultCode(0)).toBe(true)
    expect(isKnownB2CDisbursementResultCode(99999)).toBe(false)
    expect(isKnownB2CDisbursementResultCode('')).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 9. BILL MANAGER
// ═══════════════════════════════════════════════════════════════════════════════

describe('Bill Manager exports', () => {
  fn('billManagerOptIn', billManagerOptIn)
  fn('updateOptIn', updateOptIn)
  fn('sendSingleInvoice', sendSingleInvoice)
  fn('sendBulkInvoices', sendBulkInvoices)
  fn('cancelInvoice', cancelInvoice)
  fn('cancelBulkInvoices', cancelBulkInvoices)
  fn('reconcilePayment', reconcilePayment)
})

// ═══════════════════════════════════════════════════════════════════════════════
// 10. C2B
// ═══════════════════════════════════════════════════════════════════════════════

describe('C2B exports', () => {
  fn('registerC2BUrls', registerC2BUrls)
  fn('simulateC2B', simulateC2B)

  it('exports C2B_REGISTER_URL_ERROR_CODES with 8 documented codes', () => {
    expect(Object.keys(C2B_REGISTER_URL_ERROR_CODES)).toHaveLength(8)
    expect(C2B_REGISTER_URL_ERROR_CODES.INTERNAL_SERVER_ERROR).toBe('500.003.1001')
    expect(C2B_REGISTER_URL_ERROR_CODES.INVALID_ACCESS_TOKEN).toBe('400.003.01')
  })

  it('exports C2B_VALIDATION_RESULT_CODES with 7 documented codes', () => {
    expect(Object.keys(C2B_VALIDATION_RESULT_CODES)).toHaveLength(7)
    expect(C2B_VALIDATION_RESULT_CODES.ACCEPT).toBe('0')
    expect(C2B_VALIDATION_RESULT_CODES.OTHER_ERROR).toBe('C2B00016')
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

  it('acceptC2BValidation() returns the correct shape', () => {
    const res = acceptC2BValidation()
    expect(res.ResultCode).toBe('0')
    expect(res.ResultDesc).toBe('Accepted')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 11. DYNAMIC QR  (was missing generateDynamicQR, validators, and extra types)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Dynamic QR exports', () => {
  fn('generateDynamicQR', generateDynamicQR)

  it('exports QR_TRANSACTION_CODES with the 5 Daraja codes', () => {
    expect(QR_TRANSACTION_CODES).toStrictEqual(['BG', 'WA', 'PB', 'SM', 'SB'])
  })

  it('exports DEFAULT_QR_SIZE = 300', () => {
    expect(DEFAULT_QR_SIZE).toBe(300)
  })

  it('exports MAX_QR_SIZE = 1000', () => {
    expect(MAX_QR_SIZE).toBe(1000)
  })

  it('exports MIN_AMOUNT = 1', () => {
    expect(MIN_AMOUNT).toBe(1)
  })

  it('exports MIN_QR_SIZE = 1', () => {
    expect(MIN_QR_SIZE).toBe(1)
  })

  fn('validateAmount', validateAmount)
  fn('validateCpi', validateCpi)
  fn('validateDynamicQRRequest', validateDynamicQRRequest)
  fn('validateMerchantName', validateMerchantName)
  fn('validateRefNo', validateRefNo)
  fn('validateSize', validateSize)
  fn('validateTrxCode', validateTrxCode)

  it('validateMerchantName returns null for a valid name', () => {
    expect(validateMerchantName('Acme Corp')).toBeNull()
  })

  it('validateAmount returns null for amount = 1', () => {
    expect(validateAmount(1)).toBeNull()
  })

  it('validateTrxCode returns null for each documented code', () => {
    for (const code of ['BG', 'WA', 'PB', 'SM', 'SB'] as const) {
      expect(validateTrxCode(code)).toBeNull()
    }
  })

  it('validateDynamicQRRequest returns { valid: true } for a complete payload', () => {
    const result = validateDynamicQRRequest({
      merchantName: 'Shop',
      refNo: 'INV-1',
      amount: 100,
      trxCode: 'BG',
      cpi: '373132',
      size: 300,
    })
    expect(result.valid).toBe(true)
  })

  it('validateDynamicQRRequest collects errors for an empty object', () => {
    const result = validateDynamicQRRequest({})
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(Object.keys(result.errors).length).toBeGreaterThan(0)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 12. REVERSAL
// ═══════════════════════════════════════════════════════════════════════════════

describe('Reversal exports', () => {
  fn('requestReversal', requestReversal)

  it('exports REVERSAL_COMMAND_ID = "TransactionReversal"', () => {
    expect(REVERSAL_COMMAND_ID).toBe('TransactionReversal')
  })

  it('exports REVERSAL_RECEIVER_IDENTIFIER_TYPE = "11"', () => {
    expect(REVERSAL_RECEIVER_IDENTIFIER_TYPE).toBe('11')
  })

  it('exports REVERSAL_RESULT_CODES with documented codes', () => {
    expect(REVERSAL_RESULT_CODES.SUCCESS).toBe(0)
    expect(REVERSAL_RESULT_CODES.ALREADY_REVERSED).toBe('R000001')
    expect(REVERSAL_RESULT_CODES.INVALID_TRANSACTION_ID).toBe('R000002')
  })

  it('exports REVERSAL_ERROR_CODES with documented codes', () => {
    expect(REVERSAL_ERROR_CODES.INVALID_ACCESS_TOKEN).toBe('404.001.03')
    expect(REVERSAL_ERROR_CODES.BAD_REQUEST).toBe('400.002.02')
  })

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

  it('isKnownReversalResultCode handles string codes', () => {
    expect(isKnownReversalResultCode('R000001')).toBe(true)
    expect(isKnownReversalResultCode('R000002')).toBe(true)
    expect(isKnownReversalResultCode(0)).toBe(true)
    expect(isKnownReversalResultCode(99999)).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 13. STK PUSH  (STK_PUSH_LIMITS, STK_RESULT_CODES, isKnownStkResultCode were missing)
// ═══════════════════════════════════════════════════════════════════════════════

describe('STK Push exports', () => {
  fn('processStkPush', processStkPush)
  fn('queryStkPush', queryStkPush)

  it('exports STK_PUSH_LIMITS with MIN_AMOUNT = 1 and MAX_AMOUNT = 250000', () => {
    expect(STK_PUSH_LIMITS.MIN_AMOUNT).toBe(1)
    expect(STK_PUSH_LIMITS.MAX_AMOUNT).toBe(250_000)
  })

  it('exports STK_RESULT_CODES with all 5 documented codes', () => {
    expect(STK_RESULT_CODES.SUCCESS).toBe(0)
    expect(STK_RESULT_CODES.INSUFFICIENT_BALANCE).toBe(1)
    expect(STK_RESULT_CODES.CANCELLED_BY_USER).toBe(1032)
    expect(STK_RESULT_CODES.PHONE_UNREACHABLE).toBe(1037)
    expect(STK_RESULT_CODES.INVALID_PIN).toBe(2001)
  })

  fn('isKnownStkResultCode', isKnownStkResultCode)

  it('isKnownStkResultCode returns true for documented codes', () => {
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

  it('getTimestamp returns a 14-digit YYYYMMDDHHmmss string', () => {
    const ts = getTimestamp()
    expect(typeof ts).toBe('string')
    expect(/^\d{14}$/.test(ts)).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 14. TAX REMITTANCE
// ═══════════════════════════════════════════════════════════════════════════════

describe('Tax Remittance exports', () => {
  it('exports KRA_SHORTCODE = "572572"', () => {
    expect(KRA_SHORTCODE).toBe('572572')
  })

  it('exports TAX_COMMAND_ID = "PayTaxToKRA"', () => {
    expect(TAX_COMMAND_ID).toBe('PayTaxToKRA')
  })

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

describe('Transaction Status exports', () => {
  fn('queryTransactionStatus', queryTransactionStatus)

  it('exports TRANSACTION_STATUS_ERROR_CODES with 8 documented codes', () => {
    expect(Object.keys(TRANSACTION_STATUS_ERROR_CODES)).toHaveLength(8)
    expect(TRANSACTION_STATUS_ERROR_CODES.INVALID_ACCESS_TOKEN).toBe('400.003.01')
    expect(TRANSACTION_STATUS_ERROR_CODES.INVALID_AUTH_HEADER).toBe('404.001.04')
  })

  it('exports TRANSACTION_STATUS_RESULT_CODES with SUCCESS = 0', () => {
    expect(TRANSACTION_STATUS_RESULT_CODES.SUCCESS).toBe(0)
    expect(TRANSACTION_STATUS_RESULT_CODES.INVALID_INITIATOR).toBe(2001)
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
// 16. WEBHOOKS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Webhooks exports', () => {
  fn('retryWithBackoff', retryWithBackoff)
  fn('parseStkPushWebhook', parseStkPushWebhook)
  fn('verifyWebhookIP', verifyWebhookIP)
  fn('extractAmount', extractAmount)
  fn('extractPhoneNumber', extractPhoneNumber)
  fn('extractTransactionId', extractTransactionId)
  fn('handleWebhook', handleWebhook)
  fn('isSuccessfulCallback', isSuccessfulCallback)

  it('exports SAFARICOM_IPS as a non-empty readonly array', () => {
    expect(Array.isArray(SAFARICOM_IPS)).toBe(true)
    expect(SAFARICOM_IPS.length).toBeGreaterThan(0)
    expect(SAFARICOM_IPS).toContain('196.201.214.200')
  })

  it('verifyWebhookIP returns true for a known Safaricom IP', () => {
    expect(verifyWebhookIP('196.201.214.200')).toBe(true)
  })

  it('verifyWebhookIP returns false for an unknown IP', () => {
    expect(verifyWebhookIP('1.2.3.4')).toBe(false)
  })
})

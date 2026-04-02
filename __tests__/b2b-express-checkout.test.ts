/**
 * __tests__/b2b-express-checkout.test.ts
 *
 * Complete test suite for the B2B Express Checkout (USSD Push to Till) module:
 *   - initiateB2BExpressCheckout() — USSD push initiation
 *   - B2B_RESULT_CODES             — documented result code constants
 *   - isKnownB2BResultCode()       — result code validation helper
 *   - isB2BCheckoutCallback()      — runtime payload type guard
 *   - isB2BCheckoutSuccess()       — success type guard
 *   - isB2BCheckoutCancelled()     — cancellation type guard
 *   - isB2BCheckoutFailed()        — general failure type guard
 *   - isB2BStatusSuccess()         — status field helper
 *   - getB2BResultCode()           — result code extractor
 *   - getB2BResultDesc()           — result description extractor
 *   - getB2BRequestId()            — requestId extractor
 *   - getB2BAmount()               — amount extractor
 *   - getB2BTransactionId()        — M-PESA receipt extractor (success only)
 *   - getB2BConversationId()       — conversationID extractor (success only)
 *   - getB2BPaymentReference()     — paymentReference extractor (cancelled only)
 *
 * Strictly covers only what is documented in the Safaricom Daraja
 * B2B Express Checkout API documentation.
 *
 * Run: pnpm test
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

// ── Mocks (must come before imports that use them) ────────────────────────────

vi.mock('../src/utils/http', () => ({
  httpRequest: vi.fn(),
}))

// ── Imports ───────────────────────────────────────────────────────────────────

import { httpRequest } from '../src/utils/http'
import { initiateB2BExpressCheckout } from '../src/mpesa/b2b-express-checkout/initiate'
import {
  getB2BAmount,
  getB2BConversationId,
  getB2BPaymentReference,
  getB2BRequestId,
  getB2BResultCode,
  getB2BResultDesc,
  getB2BTransactionId,
  isB2BCheckoutCallback,
  isB2BCheckoutCancelled,
  isB2BCheckoutFailed,
  isB2BCheckoutSuccess,
  isB2BStatusSuccess,
  isKnownB2BResultCode,
} from '../src/mpesa/b2b-express-checkout/webhooks'
import { B2B_RESULT_CODES } from '../src/mpesa/b2b-express-checkout/types'
import type {
  B2BExpressCheckoutCallback,
  B2BExpressCheckoutCallbackCancelled,
  B2BExpressCheckoutCallbackFailed,
  B2BExpressCheckoutCallbackSuccess,
  B2BExpressCheckoutRequest,
} from '../src/mpesa/b2b-express-checkout/types'

// ── Typed mock ────────────────────────────────────────────────────────────────

const mockHttpRequest = vi.mocked(httpRequest)

// ── Shared fixtures ───────────────────────────────────────────────────────────

const SANDBOX_URL = 'https://sandbox.safaricom.co.ke'
const PROD_URL = 'https://api.safaricom.co.ke'
const ACCESS_TOKEN = 'test-bearer-token-b2b'

// ── Request fixtures ──────────────────────────────────────────────────────────

const BASE_REQUEST: B2BExpressCheckoutRequest = {
  primaryShortCode: '000001',
  receiverShortCode: '000002',
  amount: 100,
  paymentRef: 'INV-20240101',
  callbackUrl: 'https://mydomain.com/b2b/callback',
  partnerName: 'MyVendor',
}

// ── Response fixtures ─────────────────────────────────────────────────────────

const INITIATE_RESPONSE = {
  code: '0',
  status: 'USSD Initiated Successfully',
}

// ── Callback payload fixtures (from Daraja docs) ──────────────────────────────

const SUCCESS_CALLBACK: B2BExpressCheckoutCallbackSuccess = {
  resultCode: '0',
  resultDesc: 'The service request is processed successfully.',
  amount: '71.0',
  requestId: '404e1aec-19e0-4ce3-973d-bd92e94c8021',
  resultType: '0',
  conversationID: 'AG_20230426_2010434680d9f5a73766',
  transactionId: 'RDQ01NFT1Q',
  status: 'SUCCESS',
}

const CANCELLED_CALLBACK: B2BExpressCheckoutCallbackCancelled = {
  resultCode: '4001',
  resultDesc: 'User cancelled transaction',
  requestId: 'c2a9ba32-9e11-4b90-892c-7bc54944609a',
  amount: '71.0',
  paymentReference: 'MAndbubry3hi',
}

const KYC_FAIL_CALLBACK: B2BExpressCheckoutCallbackFailed = {
  resultCode: '4102',
  resultDesc: 'Merchant KYC failure',
  requestId: 'aa11bb22-cc33-dd44-ee55-ff6677889900',
  amount: '71.0',
}

const NO_NUMBER_CALLBACK: B2BExpressCheckoutCallbackFailed = {
  resultCode: '4104',
  resultDesc: 'Missing nominated number',
  requestId: 'bb22cc33-dd44-ee55-ff66-778899001122',
  amount: '100.0',
}

const NET_ERROR_CALLBACK: B2BExpressCheckoutCallbackFailed = {
  resultCode: '4201',
  resultDesc: 'USSD network error',
  requestId: 'cc33dd44-ee55-ff66-7788-990011223344',
  amount: '50.0',
}

const USSD_ERR_CALLBACK: B2BExpressCheckoutCallbackFailed = {
  resultCode: '4203',
  resultDesc: 'USSD exception error',
  requestId: 'dd44ee55-ff66-7788-9900-112233445566',
  amount: '200.0',
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. B2B_RESULT_CODES CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('B2B_RESULT_CODES (documented by Daraja)', () => {
  it('SUCCESS is "0"', () => {
    expect(B2B_RESULT_CODES.SUCCESS).toBe('0')
  })

  it('CANCELLED is "4001"', () => {
    expect(B2B_RESULT_CODES.CANCELLED).toBe('4001')
  })

  it('KYC_FAIL is "4102"', () => {
    expect(B2B_RESULT_CODES.KYC_FAIL).toBe('4102')
  })

  it('NO_NOMINATED_NUMBER is "4104"', () => {
    expect(B2B_RESULT_CODES.NO_NOMINATED_NUMBER).toBe('4104')
  })

  it('USSD_NETWORK_ERROR is "4201"', () => {
    expect(B2B_RESULT_CODES.USSD_NETWORK_ERROR).toBe('4201')
  })

  it('USSD_EXCEPTION_ERROR is "4203"', () => {
    expect(B2B_RESULT_CODES.USSD_EXCEPTION_ERROR).toBe('4203')
  })

  it('contains exactly 6 documented codes', () => {
    expect(Object.keys(B2B_RESULT_CODES)).toHaveLength(6)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 2. isKnownB2BResultCode()
// ═══════════════════════════════════════════════════════════════════════════════

describe('isKnownB2BResultCode()', () => {
  it('returns true for "0" (success)', () => {
    expect(isKnownB2BResultCode('0')).toBe(true)
  })

  it('returns true for "4001" (cancelled)', () => {
    expect(isKnownB2BResultCode('4001')).toBe(true)
  })

  it('returns true for "4102" (KYC fail)', () => {
    expect(isKnownB2BResultCode('4102')).toBe(true)
  })

  it('returns true for "4104" (missing nominated number)', () => {
    expect(isKnownB2BResultCode('4104')).toBe(true)
  })

  it('returns true for "4201" (USSD network error)', () => {
    expect(isKnownB2BResultCode('4201')).toBe(true)
  })

  it('returns true for "4203" (USSD exception error)', () => {
    expect(isKnownB2BResultCode('4203')).toBe(true)
  })

  it('returns false for an undocumented code', () => {
    expect(isKnownB2BResultCode('9999')).toBe(false)
  })

  it('returns false for an empty string', () => {
    expect(isKnownB2BResultCode('')).toBe(false)
  })

  it('returns false for a numeric string not in docs', () => {
    expect(isKnownB2BResultCode('1')).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 3. initiateB2BExpressCheckout() — SUCCESS
// ═══════════════════════════════════════════════════════════════════════════════

describe('initiateB2BExpressCheckout() — success', () => {
  beforeEach(() => {
    mockHttpRequest.mockResolvedValue({ data: INITIATE_RESPONSE } as never)
  })

  it('returns the Daraja acknowledgement on success', async () => {
    const result = await initiateB2BExpressCheckout(SANDBOX_URL, ACCESS_TOKEN, BASE_REQUEST)
    expect(result).toStrictEqual(INITIATE_RESPONSE)
  })

  it('calls the correct Daraja B2B endpoint', async () => {
    await initiateB2BExpressCheckout(SANDBOX_URL, ACCESS_TOKEN, BASE_REQUEST)
    expect(mockHttpRequest).toHaveBeenCalledWith(
      `${SANDBOX_URL}/v1/ussdpush/get-msisdn`,
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('uses the production endpoint URL', async () => {
    await initiateB2BExpressCheckout(PROD_URL, ACCESS_TOKEN, BASE_REQUEST)
    expect(mockHttpRequest).toHaveBeenCalledWith(
      `${PROD_URL}/v1/ussdpush/get-msisdn`,
      expect.any(Object),
    )
  })

  it('sends Authorization header with Bearer token', async () => {
    await initiateB2BExpressCheckout(SANDBOX_URL, ACCESS_TOKEN, BASE_REQUEST)
    expect(mockHttpRequest).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${ACCESS_TOKEN}` }),
      }),
    )
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 4. initiateB2BExpressCheckout() — REQUEST BODY SHAPE (Daraja spec)
// ═══════════════════════════════════════════════════════════════════════════════

describe('initiateB2BExpressCheckout() — request body shape (Daraja spec)', () => {
  beforeEach(() => {
    mockHttpRequest.mockResolvedValue({ data: INITIATE_RESPONSE } as never)
  })

  function getBody(): Record<string, unknown> {
    const call = mockHttpRequest.mock.calls[0]
    return (call?.[1] as { body: Record<string, unknown> }).body
  }

  it('sends primaryShortCode as a string', async () => {
    await initiateB2BExpressCheckout(SANDBOX_URL, ACCESS_TOKEN, BASE_REQUEST)
    expect(typeof getBody()['primaryShortCode']).toBe('string')
    expect(getBody()['primaryShortCode']).toBe('000001')
  })

  it('sends receiverShortCode as a string', async () => {
    await initiateB2BExpressCheckout(SANDBOX_URL, ACCESS_TOKEN, BASE_REQUEST)
    expect(typeof getBody()['receiverShortCode']).toBe('string')
    expect(getBody()['receiverShortCode']).toBe('000002')
  })

  it('sends amount as a STRING (not a number) per Daraja spec', async () => {
    await initiateB2BExpressCheckout(SANDBOX_URL, ACCESS_TOKEN, BASE_REQUEST)
    expect(typeof getBody()['amount']).toBe('string')
    expect(getBody()['amount']).toBe('100')
  })

  it('rounds fractional amounts (e.g. 99.7 → "100")', async () => {
    await initiateB2BExpressCheckout(SANDBOX_URL, ACCESS_TOKEN, { ...BASE_REQUEST, amount: 99.7 })
    expect(getBody()['amount']).toBe('100')
  })

  it('sends paymentRef exactly as provided', async () => {
    await initiateB2BExpressCheckout(SANDBOX_URL, ACCESS_TOKEN, BASE_REQUEST)
    expect(getBody()['paymentRef']).toBe('INV-20240101')
  })

  it('sends callbackUrl exactly as provided', async () => {
    await initiateB2BExpressCheckout(SANDBOX_URL, ACCESS_TOKEN, BASE_REQUEST)
    expect(getBody()['callbackUrl']).toBe('https://mydomain.com/b2b/callback')
  })

  it('sends partnerName exactly as provided', async () => {
    await initiateB2BExpressCheckout(SANDBOX_URL, ACCESS_TOKEN, BASE_REQUEST)
    expect(getBody()['partnerName']).toBe('MyVendor')
  })

  it('sends RequestRefID as PascalCase (per Daraja spec)', async () => {
    await initiateB2BExpressCheckout(SANDBOX_URL, ACCESS_TOKEN, BASE_REQUEST)
    expect(getBody()).toHaveProperty('RequestRefID')
    expect(typeof getBody()['RequestRefID']).toBe('string')
    expect((getBody()['RequestRefID'] as string).length).toBeGreaterThan(0)
  })

  it('uses provided requestRefId as RequestRefID', async () => {
    const myId = 'my-unique-id-12345'
    await initiateB2BExpressCheckout(SANDBOX_URL, ACCESS_TOKEN, {
      ...BASE_REQUEST,
      requestRefId: myId,
    })
    expect(getBody()['RequestRefID']).toBe(myId)
  })

  it('auto-generates RequestRefID when requestRefId is not provided', async () => {
    await initiateB2BExpressCheckout(SANDBOX_URL, ACCESS_TOKEN, BASE_REQUEST)
    const id1 = getBody()['RequestRefID']

    mockHttpRequest.mockResolvedValue({ data: INITIATE_RESPONSE } as never)
    await initiateB2BExpressCheckout(SANDBOX_URL, ACCESS_TOKEN, BASE_REQUEST)
    const id2 = mockHttpRequest.mock.calls[1]?.[1] as { body: Record<string, unknown> }
    // Both should be non-empty strings (uniqueness cannot be guaranteed in unit tests)
    expect(typeof id1).toBe('string')
    expect((id1 as string).length).toBeGreaterThan(0)
    expect(typeof id2?.body['RequestRefID']).toBe('string')
  })

  it('sends exactly 7 fields in the request body (all Daraja-documented fields)', async () => {
    await initiateB2BExpressCheckout(SANDBOX_URL, ACCESS_TOKEN, BASE_REQUEST)
    const body = getBody()
    const expectedFields = [
      'primaryShortCode',
      'receiverShortCode',
      'amount',
      'paymentRef',
      'callbackUrl',
      'partnerName',
      'RequestRefID',
    ]
    for (const field of expectedFields) {
      expect(body).toHaveProperty(field)
    }
    expect(Object.keys(body)).toHaveLength(7)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 5. initiateB2BExpressCheckout() — VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('initiateB2BExpressCheckout() — validation', () => {
  it('throws VALIDATION_ERROR when primaryShortCode is empty', async () => {
    await expect(
      initiateB2BExpressCheckout(SANDBOX_URL, ACCESS_TOKEN, {
        ...BASE_REQUEST,
        primaryShortCode: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when receiverShortCode is empty', async () => {
    await expect(
      initiateB2BExpressCheckout(SANDBOX_URL, ACCESS_TOKEN, {
        ...BASE_REQUEST,
        receiverShortCode: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR for amount 0', async () => {
    await expect(
      initiateB2BExpressCheckout(SANDBOX_URL, ACCESS_TOKEN, { ...BASE_REQUEST, amount: 0 }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR for negative amount', async () => {
    await expect(
      initiateB2BExpressCheckout(SANDBOX_URL, ACCESS_TOKEN, { ...BASE_REQUEST, amount: -50 }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR for amount that rounds to 0 (0.4)', async () => {
    await expect(
      initiateB2BExpressCheckout(SANDBOX_URL, ACCESS_TOKEN, { ...BASE_REQUEST, amount: 0.4 }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when paymentRef is empty', async () => {
    await expect(
      initiateB2BExpressCheckout(SANDBOX_URL, ACCESS_TOKEN, {
        ...BASE_REQUEST,
        paymentRef: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when callbackUrl is empty', async () => {
    await expect(
      initiateB2BExpressCheckout(SANDBOX_URL, ACCESS_TOKEN, {
        ...BASE_REQUEST,
        callbackUrl: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when partnerName is empty', async () => {
    await expect(
      initiateB2BExpressCheckout(SANDBOX_URL, ACCESS_TOKEN, {
        ...BASE_REQUEST,
        partnerName: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('accepts amount 1 (minimum)', async () => {
    mockHttpRequest.mockResolvedValue({ data: INITIATE_RESPONSE } as never)
    await expect(
      initiateB2BExpressCheckout(SANDBOX_URL, ACCESS_TOKEN, { ...BASE_REQUEST, amount: 1 }),
    ).resolves.toBeDefined()
  })

  it('does not call httpRequest when validation fails', async () => {
    await initiateB2BExpressCheckout(SANDBOX_URL, ACCESS_TOKEN, {
      ...BASE_REQUEST,
      primaryShortCode: '',
    }).catch(() => {})
    expect(mockHttpRequest).not.toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 6. initiateB2BExpressCheckout() — RESPONSE FIELDS
// ═══════════════════════════════════════════════════════════════════════════════

describe('initiateB2BExpressCheckout() — response fields (Daraja spec)', () => {
  beforeEach(() => {
    mockHttpRequest.mockResolvedValue({ data: INITIATE_RESPONSE } as never)
  })

  it('response includes code', async () => {
    const res = await initiateB2BExpressCheckout(SANDBOX_URL, ACCESS_TOKEN, BASE_REQUEST)
    expect(typeof res.code).toBe('string')
  })

  it('response includes status', async () => {
    const res = await initiateB2BExpressCheckout(SANDBOX_URL, ACCESS_TOKEN, BASE_REQUEST)
    expect(typeof res.status).toBe('string')
  })

  it('code "0" indicates USSD was initiated successfully', async () => {
    const res = await initiateB2BExpressCheckout(SANDBOX_URL, ACCESS_TOKEN, BASE_REQUEST)
    expect(res.code).toBe('0')
  })

  it('status matches Daraja documented value', async () => {
    const res = await initiateB2BExpressCheckout(SANDBOX_URL, ACCESS_TOKEN, BASE_REQUEST)
    expect(res.status).toBe('USSD Initiated Successfully')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 7. initiateB2BExpressCheckout() — ERROR PROPAGATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('initiateB2BExpressCheckout() — error propagation', () => {
  it('propagates a generic Error from httpRequest', async () => {
    mockHttpRequest.mockRejectedValue(new Error('ECONNRESET'))
    await expect(
      initiateB2BExpressCheckout(SANDBOX_URL, ACCESS_TOKEN, BASE_REQUEST),
    ).rejects.toThrow('ECONNRESET')
  })

  it('propagates a network timeout Error from httpRequest', async () => {
    mockHttpRequest.mockRejectedValue(new Error('ETIMEDOUT'))
    await expect(
      initiateB2BExpressCheckout(SANDBOX_URL, ACCESS_TOKEN, BASE_REQUEST),
    ).rejects.toThrow('ETIMEDOUT')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 8. isB2BCheckoutCallback() — RUNTIME TYPE GUARD
// ═══════════════════════════════════════════════════════════════════════════════

describe('isB2BCheckoutCallback() — runtime type guard', () => {
  it('returns true for a valid success callback', () => {
    expect(isB2BCheckoutCallback(SUCCESS_CALLBACK)).toBe(true)
  })

  it('returns true for a valid cancelled callback', () => {
    expect(isB2BCheckoutCallback(CANCELLED_CALLBACK)).toBe(true)
  })

  it('returns true for a valid failed callback (KYC)', () => {
    expect(isB2BCheckoutCallback(KYC_FAIL_CALLBACK)).toBe(true)
  })

  it('returns false for null', () => {
    expect(isB2BCheckoutCallback(null)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(isB2BCheckoutCallback(undefined)).toBe(false)
  })

  it('returns false for an empty object', () => {
    expect(isB2BCheckoutCallback({})).toBe(false)
  })

  it('returns false when resultCode is missing', () => {
    const { resultCode: _omit, ...rest } = SUCCESS_CALLBACK
    expect(isB2BCheckoutCallback(rest)).toBe(false)
  })

  it('returns false when requestId is missing', () => {
    const { requestId: _omit, ...rest } = SUCCESS_CALLBACK
    expect(isB2BCheckoutCallback(rest)).toBe(false)
  })

  it('returns false when amount is missing', () => {
    const { amount: _omit, ...rest } = SUCCESS_CALLBACK
    expect(isB2BCheckoutCallback(rest)).toBe(false)
  })

  it('returns false for a non-object value', () => {
    expect(isB2BCheckoutCallback('string')).toBe(false)
    expect(isB2BCheckoutCallback(42)).toBe(false)
    expect(isB2BCheckoutCallback([])).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 9. isB2BCheckoutSuccess() — SUCCESS TYPE GUARD
// ═══════════════════════════════════════════════════════════════════════════════

describe('isB2BCheckoutSuccess() — success type guard', () => {
  it('returns true when resultCode is "0"', () => {
    expect(isB2BCheckoutSuccess(SUCCESS_CALLBACK)).toBe(true)
  })

  it('returns false for cancelled callback (resultCode "4001")', () => {
    expect(isB2BCheckoutSuccess(CANCELLED_CALLBACK)).toBe(false)
  })

  it('returns false for KYC fail callback (resultCode "4102")', () => {
    expect(isB2BCheckoutSuccess(KYC_FAIL_CALLBACK)).toBe(false)
  })

  it('returns false for missing nominated number (resultCode "4104")', () => {
    expect(isB2BCheckoutSuccess(NO_NUMBER_CALLBACK)).toBe(false)
  })

  it('returns false for USSD network error (resultCode "4201")', () => {
    expect(isB2BCheckoutSuccess(NET_ERROR_CALLBACK)).toBe(false)
  })

  it('returns false for USSD exception error (resultCode "4203")', () => {
    expect(isB2BCheckoutSuccess(USSD_ERR_CALLBACK)).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 10. isB2BCheckoutCancelled() — CANCELLATION TYPE GUARD
// ═══════════════════════════════════════════════════════════════════════════════

describe('isB2BCheckoutCancelled() — cancellation type guard', () => {
  it('returns true when resultCode is "4001" (user cancelled)', () => {
    expect(isB2BCheckoutCancelled(CANCELLED_CALLBACK)).toBe(true)
  })

  it('returns false for success callback (resultCode "0")', () => {
    expect(isB2BCheckoutCancelled(SUCCESS_CALLBACK)).toBe(false)
  })

  it('returns false for KYC fail callback (resultCode "4102")', () => {
    expect(isB2BCheckoutCancelled(KYC_FAIL_CALLBACK)).toBe(false)
  })

  it('returns false for missing nominated number (resultCode "4104")', () => {
    expect(isB2BCheckoutCancelled(NO_NUMBER_CALLBACK)).toBe(false)
  })

  it('returns false for USSD network error (resultCode "4201")', () => {
    expect(isB2BCheckoutCancelled(NET_ERROR_CALLBACK)).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 11. isB2BCheckoutFailed() — GENERAL FAILURE TYPE GUARD
// ═══════════════════════════════════════════════════════════════════════════════

describe('isB2BCheckoutFailed() — general failure type guard', () => {
  it('returns false for success callback (resultCode "0")', () => {
    expect(isB2BCheckoutFailed(SUCCESS_CALLBACK)).toBe(false)
  })

  it('returns true for cancelled callback (resultCode "4001")', () => {
    expect(isB2BCheckoutFailed(CANCELLED_CALLBACK)).toBe(true)
  })

  it('returns true for KYC fail callback (resultCode "4102")', () => {
    expect(isB2BCheckoutFailed(KYC_FAIL_CALLBACK)).toBe(true)
  })

  it('returns true for missing nominated number (resultCode "4104")', () => {
    expect(isB2BCheckoutFailed(NO_NUMBER_CALLBACK)).toBe(true)
  })

  it('returns true for USSD network error (resultCode "4201")', () => {
    expect(isB2BCheckoutFailed(NET_ERROR_CALLBACK)).toBe(true)
  })

  it('returns true for USSD exception error (resultCode "4203")', () => {
    expect(isB2BCheckoutFailed(USSD_ERR_CALLBACK)).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 12. isB2BStatusSuccess()
// ═══════════════════════════════════════════════════════════════════════════════

describe('isB2BStatusSuccess()', () => {
  it('returns true when status is "SUCCESS" on a success callback', () => {
    expect(isB2BStatusSuccess(SUCCESS_CALLBACK)).toBe(true)
  })

  it('returns false for cancelled callback', () => {
    expect(isB2BStatusSuccess(CANCELLED_CALLBACK)).toBe(false)
  })

  it('returns false for failed callback', () => {
    expect(isB2BStatusSuccess(KYC_FAIL_CALLBACK)).toBe(false)
  })

  it('returns false when resultCode is "0" but status is not "SUCCESS"', () => {
    const cb: B2BExpressCheckoutCallbackSuccess = {
      ...SUCCESS_CALLBACK,
      status: 'PENDING',
    }
    expect(isB2BStatusSuccess(cb)).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 13. PAYLOAD EXTRACTORS
// ═══════════════════════════════════════════════════════════════════════════════

describe('getB2BResultCode()', () => {
  it('returns resultCode from success callback', () => {
    expect(getB2BResultCode(SUCCESS_CALLBACK)).toBe('0')
  })

  it('returns resultCode from cancelled callback', () => {
    expect(getB2BResultCode(CANCELLED_CALLBACK)).toBe('4001')
  })

  it('returns resultCode from failed callback', () => {
    expect(getB2BResultCode(KYC_FAIL_CALLBACK)).toBe('4102')
  })

  it('returns resultCode matching B2B_RESULT_CODES.SUCCESS for success', () => {
    expect(getB2BResultCode(SUCCESS_CALLBACK)).toBe(B2B_RESULT_CODES.SUCCESS)
  })

  it('returns resultCode matching B2B_RESULT_CODES.CANCELLED for cancellation', () => {
    expect(getB2BResultCode(CANCELLED_CALLBACK)).toBe(B2B_RESULT_CODES.CANCELLED)
  })
})

describe('getB2BResultDesc()', () => {
  it('returns resultDesc from success callback', () => {
    expect(getB2BResultDesc(SUCCESS_CALLBACK)).toBe(
      'The service request is processed successfully.',
    )
  })

  it('returns resultDesc from cancelled callback', () => {
    expect(getB2BResultDesc(CANCELLED_CALLBACK)).toBe('User cancelled transaction')
  })

  it('returns resultDesc from failed callback', () => {
    expect(getB2BResultDesc(KYC_FAIL_CALLBACK)).toBe('Merchant KYC failure')
  })
})

describe('getB2BRequestId()', () => {
  it('returns requestId from success callback', () => {
    expect(getB2BRequestId(SUCCESS_CALLBACK)).toBe('404e1aec-19e0-4ce3-973d-bd92e94c8021')
  })

  it('returns requestId from cancelled callback', () => {
    expect(getB2BRequestId(CANCELLED_CALLBACK)).toBe('c2a9ba32-9e11-4b90-892c-7bc54944609a')
  })

  it('returns requestId from failed callback', () => {
    expect(getB2BRequestId(KYC_FAIL_CALLBACK)).toBe('aa11bb22-cc33-dd44-ee55-ff6677889900')
  })
})

describe('getB2BAmount()', () => {
  it('returns amount as a number from success callback', () => {
    expect(getB2BAmount(SUCCESS_CALLBACK)).toBe(71)
    expect(typeof getB2BAmount(SUCCESS_CALLBACK)).toBe('number')
  })

  it('returns amount as a number from cancelled callback', () => {
    expect(getB2BAmount(CANCELLED_CALLBACK)).toBe(71)
  })

  it('returns amount as a number from failed callback', () => {
    expect(getB2BAmount(KYC_FAIL_CALLBACK)).toBe(71)
  })

  it('handles whole amount strings (e.g. "100.0" → 100)', () => {
    const cb: B2BExpressCheckoutCallbackFailed = {
      ...NO_NUMBER_CALLBACK,
      amount: '100.0',
    }
    expect(getB2BAmount(cb)).toBe(100)
  })
})

describe('getB2BTransactionId()', () => {
  it('returns transactionId (M-PESA receipt) from success callback', () => {
    expect(getB2BTransactionId(SUCCESS_CALLBACK)).toBe('RDQ01NFT1Q')
  })

  it('returns null for cancelled callback', () => {
    expect(getB2BTransactionId(CANCELLED_CALLBACK)).toBeNull()
  })

  it('returns null for failed callback', () => {
    expect(getB2BTransactionId(KYC_FAIL_CALLBACK)).toBeNull()
  })

  it('returns null for USSD network error callback', () => {
    expect(getB2BTransactionId(NET_ERROR_CALLBACK)).toBeNull()
  })
})

describe('getB2BConversationId()', () => {
  it('returns conversationID from success callback', () => {
    expect(getB2BConversationId(SUCCESS_CALLBACK)).toBe('AG_20230426_2010434680d9f5a73766')
  })

  it('returns null for cancelled callback', () => {
    expect(getB2BConversationId(CANCELLED_CALLBACK)).toBeNull()
  })

  it('returns null for failed callback', () => {
    expect(getB2BConversationId(KYC_FAIL_CALLBACK)).toBeNull()
  })
})

describe('getB2BPaymentReference()', () => {
  it('returns paymentReference from cancelled callback', () => {
    expect(getB2BPaymentReference(CANCELLED_CALLBACK)).toBe('MAndbubry3hi')
  })

  it('returns null for success callback', () => {
    expect(getB2BPaymentReference(SUCCESS_CALLBACK)).toBeNull()
  })

  it('returns null for failed callback', () => {
    expect(getB2BPaymentReference(KYC_FAIL_CALLBACK)).toBeNull()
  })

  it('returns null for USSD error callback', () => {
    expect(getB2BPaymentReference(NET_ERROR_CALLBACK)).toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 14. CALLBACK PAYLOAD STRUCTURE (Daraja spec)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Success callback structure (Daraja spec)', () => {
  it('has resultCode "0"', () => {
    expect(SUCCESS_CALLBACK.resultCode).toBe('0')
  })

  it('has resultDesc as a non-empty string', () => {
    expect(typeof SUCCESS_CALLBACK.resultDesc).toBe('string')
    expect(SUCCESS_CALLBACK.resultDesc.length).toBeGreaterThan(0)
  })

  it('has amount as a string', () => {
    expect(typeof SUCCESS_CALLBACK.amount).toBe('string')
  })

  it('has requestId as a non-empty string', () => {
    expect(typeof SUCCESS_CALLBACK.requestId).toBe('string')
    expect(SUCCESS_CALLBACK.requestId.length).toBeGreaterThan(0)
  })

  it('has resultType as a string', () => {
    expect(typeof SUCCESS_CALLBACK.resultType).toBe('string')
  })

  it('has conversationID as a non-empty string', () => {
    expect(typeof SUCCESS_CALLBACK.conversationID).toBe('string')
    expect(SUCCESS_CALLBACK.conversationID.length).toBeGreaterThan(0)
  })

  it('has transactionId (M-PESA receipt) as a non-empty string', () => {
    expect(typeof SUCCESS_CALLBACK.transactionId).toBe('string')
    expect(SUCCESS_CALLBACK.transactionId.length).toBeGreaterThan(0)
  })

  it('has status "SUCCESS"', () => {
    expect(SUCCESS_CALLBACK.status).toBe('SUCCESS')
  })
})

describe('Cancelled callback structure (Daraja spec)', () => {
  it('has resultCode "4001"', () => {
    expect(CANCELLED_CALLBACK.resultCode).toBe('4001')
  })

  it('has resultDesc as a non-empty string', () => {
    expect(typeof CANCELLED_CALLBACK.resultDesc).toBe('string')
    expect(CANCELLED_CALLBACK.resultDesc.length).toBeGreaterThan(0)
  })

  it('has requestId as a non-empty string', () => {
    expect(typeof CANCELLED_CALLBACK.requestId).toBe('string')
    expect(CANCELLED_CALLBACK.requestId.length).toBeGreaterThan(0)
  })

  it('has amount as a string', () => {
    expect(typeof CANCELLED_CALLBACK.amount).toBe('string')
  })

  it('has paymentReference as a non-empty string', () => {
    expect(typeof CANCELLED_CALLBACK.paymentReference).toBe('string')
    expect(CANCELLED_CALLBACK.paymentReference.length).toBeGreaterThan(0)
  })

  it('does NOT have transactionId (M-PESA receipt)', () => {
    expect(
      (CANCELLED_CALLBACK as unknown as Record<string, unknown>)['transactionId'],
    ).toBeUndefined()
  })

  it('does NOT have conversationID', () => {
    expect(
      (CANCELLED_CALLBACK as unknown as Record<string, unknown>)['conversationID'],
    ).toBeUndefined()
  })
})

describe('Failed callback structure (Daraja spec error codes)', () => {
  const allFailedCallbacks: Array<[string, B2BExpressCheckoutCallback]> = [
    ['KYC fail (4102)', KYC_FAIL_CALLBACK],
    ['missing nominated number (4104)', NO_NUMBER_CALLBACK],
    ['USSD network error (4201)', NET_ERROR_CALLBACK],
    ['USSD exception error (4203)', USSD_ERR_CALLBACK],
  ]

  for (const [label, callback] of allFailedCallbacks) {
    it(`${label} has a non-zero resultCode`, () => {
      expect(callback.resultCode).not.toBe('0')
    })

    it(`${label} has resultDesc as a non-empty string`, () => {
      expect(typeof callback.resultDesc).toBe('string')
      expect(callback.resultDesc.length).toBeGreaterThan(0)
    })

    it(`${label} has requestId as a non-empty string`, () => {
      expect(typeof callback.requestId).toBe('string')
      expect(callback.requestId.length).toBeGreaterThan(0)
    })

    it(`${label} has amount as a string`, () => {
      expect(typeof callback.amount).toBe('string')
    })

    it(`${label} isKnownB2BResultCode returns true`, () => {
      expect(isKnownB2BResultCode(callback.resultCode)).toBe(true)
    })
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// 15. DISCRIMINATED UNION — EXHAUSTIVE DISPATCH PATTERN
// ═══════════════════════════════════════════════════════════════════════════════

describe('Discriminated union dispatch pattern', () => {
  /**
   * Simulates a real callback handler using the type guards.
   * Returns what branch was taken.
   */
  function handleCallback(callback: B2BExpressCheckoutCallback): string {
    if (isB2BCheckoutSuccess(callback)) return 'success'
    if (isB2BCheckoutCancelled(callback)) return 'cancelled'
    return 'failed'
  }

  it('routes success callback to success branch', () => {
    expect(handleCallback(SUCCESS_CALLBACK)).toBe('success')
  })

  it('routes cancelled callback to cancelled branch', () => {
    expect(handleCallback(CANCELLED_CALLBACK)).toBe('cancelled')
  })

  it('routes KYC fail callback to failed branch', () => {
    expect(handleCallback(KYC_FAIL_CALLBACK)).toBe('failed')
  })

  it('routes missing nominated number callback to failed branch', () => {
    expect(handleCallback(NO_NUMBER_CALLBACK)).toBe('failed')
  })

  it('routes USSD network error callback to failed branch', () => {
    expect(handleCallback(NET_ERROR_CALLBACK)).toBe('failed')
  })

  it('routes USSD exception error callback to failed branch', () => {
    expect(handleCallback(USSD_ERR_CALLBACK)).toBe('failed')
  })
})

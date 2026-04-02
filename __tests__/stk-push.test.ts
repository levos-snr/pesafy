/**
 * __tests__/stk-push.test.ts
 *
 * Complete test suite for:
 *   - STK Push   (POST /mpesa/stkpush/v1/processrequest)
 *   - STK Query  (POST /mpesa/stkpushquery/v1/query)
 *   - Callback   handling (Body.stkCallback)
 *   - Result codes, limits, and type helpers
 *
 * Strictly covers only what is documented in the Safaricom Daraja API docs.
 *
 * Run:  pnpm test
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

// ── Mocks (must be before imports that use them) ──────────────────────────────

vi.mock('../src/utils/http', () => ({
  httpRequest: vi.fn(),
}))

vi.mock('../src/utils/phone', () => ({
  formatSafaricomPhone: vi.fn((phone: string) => {
    // Minimal normaliser: 07XX → 2547XX, already 254XX → pass through
    const digits = phone.replace(/\D/g, '')
    if (digits.startsWith('254') && digits.length === 12) return digits
    if (digits.startsWith('0') && digits.length === 10) return `254${digits.slice(1)}`
    return digits
  }),
}))

// ── Imports ───────────────────────────────────────────────────────────────────

import { httpRequest } from '../src/utils/http'
import { processStkPush } from '../src/mpesa/stk-push/stk-push'
import { queryStkPush } from '../src/mpesa/stk-push/stk-query'
import {
  getCallbackValue,
  isKnownStkResultCode,
  isStkCallbackSuccess,
  STK_PUSH_LIMITS,
  STK_RESULT_CODES,
} from '../src/mpesa/stk-push/types'
import type {
  StkCallbackFailure,
  StkCallbackSuccess,
  StkPushCallback,
  StkPushRequest,
  StkPushResponse,
  StkQueryRequest,
  StkQueryResponse,
} from '../src/mpesa/stk-push/types'
import { PesafyError } from '../src/utils/errors'

// ── Typed mock ────────────────────────────────────────────────────────────────

const mockHttpRequest = vi.mocked(httpRequest)

// ── Shared fixtures ───────────────────────────────────────────────────────────

const SANDBOX_URL = 'https://sandbox.safaricom.co.ke'
const PROD_URL = 'https://api.safaricom.co.ke'
const ACCESS_TOKEN = 'test-bearer-token-xyz'

const BASE_STK_REQUEST: StkPushRequest = {
  amount: 100,
  phoneNumber: '254712345678',
  callbackUrl: 'https://mydomain.com/path',
  accountReference: 'TestAccount',
  transactionDesc: 'Test payment',
  shortCode: '174379',
  passKey: 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919',
}

const STK_PUSH_RESPONSE: StkPushResponse = {
  MerchantRequestID: '2654-4b64-1',
  CheckoutRequestID: 'ws_CO_123456789',
  ResponseCode: '0',
  ResponseDescription: 'Success. Request accepted for processing',
  CustomerMessage: 'Success. Request accepted for processing',
}

const BASE_QUERY_REQUEST: StkQueryRequest = {
  checkoutRequestId: 'ws_CO_123456789',
  shortCode: '174379',
  passKey: 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919',
}

const QUERY_RESPONSE_SUCCESS: StkQueryResponse = {
  ResponseCode: '0',
  ResponseDescription: 'The service request has been accepted successfully',
  MerchantRequestID: '22205-34066-1',
  CheckoutRequestID: 'ws_CO_13012021093521236557',
  ResultCode: 0,
  ResultDesc: 'The service request is processed successfully.',
}

const QUERY_RESPONSE_CANCELLED: StkQueryResponse = {
  ResponseCode: '0',
  ResponseDescription: 'The service request has been accepted successfully',
  MerchantRequestID: '22205-34066-2',
  CheckoutRequestID: 'ws_CO_13012021093521236558',
  ResultCode: 1032,
  ResultDesc: 'Request cancelled by user',
}

// Successful STK callback as documented by Daraja
const CALLBACK_SUCCESS: StkPushCallback = {
  Body: {
    stkCallback: {
      MerchantRequestID: '29115',
      CheckoutRequestID: 'ws_CO_191220191020363925',
      ResultCode: 0,
      ResultDesc: 'The service request is processed successfully.',
      CallbackMetadata: {
        Item: [
          { Name: 'Amount', Value: 1.0 },
          { Name: 'MpesaReceiptNumber', Value: 'NLJ7RT61SV' },
          { Name: 'TransactionDate', Value: 20191219102115 },
          { Name: 'PhoneNumber', Value: 254708374149 },
        ],
      },
    } as StkCallbackSuccess,
  },
}

// Failed STK callback (cancelled by user)
const CALLBACK_FAILURE: StkPushCallback = {
  Body: {
    stkCallback: {
      MerchantRequestID: '29116',
      CheckoutRequestID: 'ws_CO_191220191020363926',
      ResultCode: 1032,
      ResultDesc: 'Request cancelled by user',
    } as StkCallbackFailure,
  },
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. CONSTANTS & LIMITS
// ═══════════════════════════════════════════════════════════════════════════════

describe('STK_PUSH_LIMITS (Daraja transaction limits)', () => {
  it('MIN_AMOUNT is 1 KES', () => {
    expect(STK_PUSH_LIMITS.MIN_AMOUNT).toBe(1)
  })

  it('MAX_AMOUNT is 250 000 KES', () => {
    expect(STK_PUSH_LIMITS.MAX_AMOUNT).toBe(250_000)
  })
})

describe('STK_RESULT_CODES (documented by Daraja)', () => {
  it('SUCCESS is 0', () => {
    expect(STK_RESULT_CODES.SUCCESS).toBe(0)
  })

  it('INSUFFICIENT_BALANCE is 1', () => {
    expect(STK_RESULT_CODES.INSUFFICIENT_BALANCE).toBe(1)
  })

  it('CANCELLED_BY_USER is 1032', () => {
    expect(STK_RESULT_CODES.CANCELLED_BY_USER).toBe(1032)
  })

  it('PHONE_UNREACHABLE is 1037', () => {
    expect(STK_RESULT_CODES.PHONE_UNREACHABLE).toBe(1037)
  })

  it('INVALID_PIN is 2001', () => {
    expect(STK_RESULT_CODES.INVALID_PIN).toBe(2001)
  })

  it('contains exactly 5 documented codes', () => {
    expect(Object.keys(STK_RESULT_CODES)).toHaveLength(5)
  })
})

describe('isKnownStkResultCode()', () => {
  it('returns true for 0 (success)', () => {
    expect(isKnownStkResultCode(0)).toBe(true)
  })

  it('returns true for 1 (insufficient balance)', () => {
    expect(isKnownStkResultCode(1)).toBe(true)
  })

  it('returns true for 1032 (cancelled)', () => {
    expect(isKnownStkResultCode(1032)).toBe(true)
  })

  it('returns true for 1037 (unreachable)', () => {
    expect(isKnownStkResultCode(1037)).toBe(true)
  })

  it('returns true for 2001 (invalid PIN)', () => {
    expect(isKnownStkResultCode(2001)).toBe(true)
  })

  it('returns false for an undocumented code', () => {
    expect(isKnownStkResultCode(9999)).toBe(false)
  })

  it('returns false for a negative number', () => {
    expect(isKnownStkResultCode(-1)).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 2. STK PUSH — processStkPush()
// ═══════════════════════════════════════════════════════════════════════════════

describe('processStkPush() — success', () => {
  beforeEach(() => {
    mockHttpRequest.mockResolvedValue({ data: STK_PUSH_RESPONSE } as never)
  })

  it('returns the Daraja acknowledgement on success', async () => {
    const result = await processStkPush(SANDBOX_URL, ACCESS_TOKEN, BASE_STK_REQUEST)
    expect(result).toStrictEqual(STK_PUSH_RESPONSE)
  })

  it('calls the correct Daraja STK Push endpoint', async () => {
    await processStkPush(SANDBOX_URL, ACCESS_TOKEN, BASE_STK_REQUEST)
    expect(mockHttpRequest).toHaveBeenCalledWith(
      `${SANDBOX_URL}/mpesa/stkpush/v1/processrequest`,
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('uses the production endpoint URL', async () => {
    await processStkPush(PROD_URL, ACCESS_TOKEN, BASE_STK_REQUEST)
    expect(mockHttpRequest).toHaveBeenCalledWith(
      `${PROD_URL}/mpesa/stkpush/v1/processrequest`,
      expect.any(Object),
    )
  })

  it('sends Authorization header with Bearer token', async () => {
    await processStkPush(SANDBOX_URL, ACCESS_TOKEN, BASE_STK_REQUEST)
    expect(mockHttpRequest).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${ACCESS_TOKEN}` }),
      }),
    )
  })
})

describe('processStkPush() — request body shape (Daraja spec)', () => {
  beforeEach(() => {
    mockHttpRequest.mockResolvedValue({ data: STK_PUSH_RESPONSE } as never)
  })

  function getBody(): Record<string, unknown> {
    const call = mockHttpRequest.mock.calls[0]
    return (call?.[1] as { body: Record<string, unknown> }).body
  }

  it('sends BusinessShortCode', async () => {
    await processStkPush(SANDBOX_URL, ACCESS_TOKEN, BASE_STK_REQUEST)
    expect(getBody()['BusinessShortCode']).toBe('174379')
  })

  it('sends Password as a non-empty base64 string', async () => {
    await processStkPush(SANDBOX_URL, ACCESS_TOKEN, BASE_STK_REQUEST)
    const password = getBody()['Password']
    expect(typeof password).toBe('string')
    expect((password as string).length).toBeGreaterThan(0)
  })

  it('sends Timestamp in YYYYMMDDHHmmss format (14 digits)', async () => {
    await processStkPush(SANDBOX_URL, ACCESS_TOKEN, BASE_STK_REQUEST)
    const ts = getBody()['Timestamp']
    expect(typeof ts).toBe('string')
    expect(/^\d{14}$/.test(ts as string)).toBe(true)
  })

  it('Password and Timestamp use the same timestamp value', async () => {
    await processStkPush(SANDBOX_URL, ACCESS_TOKEN, BASE_STK_REQUEST)
    const body = getBody()
    const ts = body['Timestamp'] as string
    // The password is Base64(shortCode + passKey + timestamp)
    const decoded = Buffer.from(body['Password'] as string, 'base64').toString('utf-8')
    expect(decoded.endsWith(ts)).toBe(true)
  })

  it('sends TransactionType defaulting to CustomerPayBillOnline', async () => {
    await processStkPush(SANDBOX_URL, ACCESS_TOKEN, BASE_STK_REQUEST)
    expect(getBody()['TransactionType']).toBe('CustomerPayBillOnline')
  })

  it('sends TransactionType as CustomerBuyGoodsOnline when specified', async () => {
    await processStkPush(SANDBOX_URL, ACCESS_TOKEN, {
      ...BASE_STK_REQUEST,
      transactionType: 'CustomerBuyGoodsOnline',
    })
    expect(getBody()['TransactionType']).toBe('CustomerBuyGoodsOnline')
  })

  it('sends Amount as a whole number', async () => {
    await processStkPush(SANDBOX_URL, ACCESS_TOKEN, BASE_STK_REQUEST)
    const amount = getBody()['Amount']
    expect(typeof amount).toBe('number')
    expect(Number.isInteger(amount)).toBe(true)
    expect(amount).toBe(100)
  })

  it('rounds fractional amounts (e.g. 99.7 → 100)', async () => {
    await processStkPush(SANDBOX_URL, ACCESS_TOKEN, { ...BASE_STK_REQUEST, amount: 99.7 })
    expect(getBody()['Amount']).toBe(100)
  })

  it('sends PartyA as the normalised phone number (254...)', async () => {
    await processStkPush(SANDBOX_URL, ACCESS_TOKEN, BASE_STK_REQUEST)
    expect(getBody()['PartyA']).toBe('254712345678')
  })

  it('sends PhoneNumber as the normalised phone number (254...)', async () => {
    await processStkPush(SANDBOX_URL, ACCESS_TOKEN, BASE_STK_REQUEST)
    expect(getBody()['PhoneNumber']).toBe('254712345678')
  })

  it('PhoneNumber and PartyA are always identical', async () => {
    await processStkPush(SANDBOX_URL, ACCESS_TOKEN, BASE_STK_REQUEST)
    const body = getBody()
    expect(body['PhoneNumber']).toBe(body['PartyA'])
  })

  it('sends CallBackURL exactly as provided', async () => {
    await processStkPush(SANDBOX_URL, ACCESS_TOKEN, BASE_STK_REQUEST)
    expect(getBody()['CallBackURL']).toBe('https://mydomain.com/path')
  })

  it('sends AccountReference truncated to 12 chars', async () => {
    await processStkPush(SANDBOX_URL, ACCESS_TOKEN, {
      ...BASE_STK_REQUEST,
      accountReference: 'A'.repeat(20), // 20 chars — should be truncated
    })
    const ref = getBody()['AccountReference'] as string
    expect(ref.length).toBeLessThanOrEqual(12)
    expect(ref).toBe('A'.repeat(12))
  })

  it('sends TransactionDesc truncated to 13 chars', async () => {
    await processStkPush(SANDBOX_URL, ACCESS_TOKEN, {
      ...BASE_STK_REQUEST,
      transactionDesc: 'D'.repeat(20), // 20 chars — should be truncated
    })
    const desc = getBody()['TransactionDesc'] as string
    expect(desc.length).toBeLessThanOrEqual(13)
    expect(desc).toBe('D'.repeat(13))
  })

  it('PartyB defaults to shortCode for Paybill (CustomerPayBillOnline)', async () => {
    await processStkPush(SANDBOX_URL, ACCESS_TOKEN, BASE_STK_REQUEST)
    expect(getBody()['PartyB']).toBe('174379')
  })

  it('PartyB uses provided value for Till (CustomerBuyGoodsOnline)', async () => {
    await processStkPush(SANDBOX_URL, ACCESS_TOKEN, {
      ...BASE_STK_REQUEST,
      transactionType: 'CustomerBuyGoodsOnline',
      partyB: '800100',
    })
    expect(getBody()['PartyB']).toBe('800100')
  })

  it('sends exactly 11 fields in the request body (all Daraja-documented fields)', async () => {
    await processStkPush(SANDBOX_URL, ACCESS_TOKEN, BASE_STK_REQUEST)
    const body = getBody()
    const expectedFields = [
      'BusinessShortCode',
      'Password',
      'Timestamp',
      'TransactionType',
      'Amount',
      'PartyA',
      'PartyB',
      'PhoneNumber',
      'CallBackURL',
      'AccountReference',
      'TransactionDesc',
    ]
    for (const field of expectedFields) {
      expect(body).toHaveProperty(field)
    }
    expect(Object.keys(body)).toHaveLength(11)
  })
})

describe('processStkPush() — amount validation (Daraja limits)', () => {
  it('throws VALIDATION_ERROR for amount < 1 (below minimum)', async () => {
    await expect(
      processStkPush(SANDBOX_URL, ACCESS_TOKEN, { ...BASE_STK_REQUEST, amount: 0 }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR for negative amount', async () => {
    await expect(
      processStkPush(SANDBOX_URL, ACCESS_TOKEN, { ...BASE_STK_REQUEST, amount: -50 }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR for 0.4 (rounds to 0, below minimum)', async () => {
    await expect(
      processStkPush(SANDBOX_URL, ACCESS_TOKEN, { ...BASE_STK_REQUEST, amount: 0.4 }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('accepts 1 (minimum allowed amount)', async () => {
    mockHttpRequest.mockResolvedValue({ data: STK_PUSH_RESPONSE } as never)
    await expect(
      processStkPush(SANDBOX_URL, ACCESS_TOKEN, { ...BASE_STK_REQUEST, amount: 1 }),
    ).resolves.toBeDefined()
  })

  it('accepts 0.6 (rounds to 1, meets minimum)', async () => {
    mockHttpRequest.mockResolvedValue({ data: STK_PUSH_RESPONSE } as never)
    await expect(
      processStkPush(SANDBOX_URL, ACCESS_TOKEN, { ...BASE_STK_REQUEST, amount: 0.6 }),
    ).resolves.toBeDefined()
  })

  it('accepts 250 000 (maximum allowed amount)', async () => {
    mockHttpRequest.mockResolvedValue({ data: STK_PUSH_RESPONSE } as never)
    await expect(
      processStkPush(SANDBOX_URL, ACCESS_TOKEN, { ...BASE_STK_REQUEST, amount: 250_000 }),
    ).resolves.toBeDefined()
  })

  it('throws VALIDATION_ERROR for 250 001 (exceeds maximum)', async () => {
    await expect(
      processStkPush(SANDBOX_URL, ACCESS_TOKEN, { ...BASE_STK_REQUEST, amount: 250_001 }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('error message mentions the KES max limit for over-limit amounts', async () => {
    const err = await processStkPush(SANDBOX_URL, ACCESS_TOKEN, {
      ...BASE_STK_REQUEST,
      amount: 300_000,
    }).catch((e: unknown) => e as PesafyError)
    expect(err.message).toContain('250')
  })

  it('does NOT call httpRequest when amount validation fails', async () => {
    await processStkPush(SANDBOX_URL, ACCESS_TOKEN, { ...BASE_STK_REQUEST, amount: 0 }).catch(
      () => {},
    )
    expect(mockHttpRequest).not.toHaveBeenCalled()
  })
})

describe('processStkPush() — response fields', () => {
  beforeEach(() => {
    mockHttpRequest.mockResolvedValue({ data: STK_PUSH_RESPONSE } as never)
  })

  it('response includes MerchantRequestID', async () => {
    const res = await processStkPush(SANDBOX_URL, ACCESS_TOKEN, BASE_STK_REQUEST)
    expect(typeof res.MerchantRequestID).toBe('string')
    expect(res.MerchantRequestID.length).toBeGreaterThan(0)
  })

  it('response includes CheckoutRequestID', async () => {
    const res = await processStkPush(SANDBOX_URL, ACCESS_TOKEN, BASE_STK_REQUEST)
    expect(typeof res.CheckoutRequestID).toBe('string')
    expect(res.CheckoutRequestID.length).toBeGreaterThan(0)
  })

  it('response includes ResponseCode', async () => {
    const res = await processStkPush(SANDBOX_URL, ACCESS_TOKEN, BASE_STK_REQUEST)
    expect(typeof res.ResponseCode).toBe('string')
  })

  it('response includes ResponseDescription', async () => {
    const res = await processStkPush(SANDBOX_URL, ACCESS_TOKEN, BASE_STK_REQUEST)
    expect(typeof res.ResponseDescription).toBe('string')
  })

  it('response includes CustomerMessage', async () => {
    const res = await processStkPush(SANDBOX_URL, ACCESS_TOKEN, BASE_STK_REQUEST)
    expect(typeof res.CustomerMessage).toBe('string')
  })

  it('ResponseCode "0" indicates the request was accepted', async () => {
    const res = await processStkPush(SANDBOX_URL, ACCESS_TOKEN, BASE_STK_REQUEST)
    expect(res.ResponseCode).toBe('0')
  })
})

describe('processStkPush() — error propagation', () => {
  it('re-throws a PesafyError from httpRequest', async () => {
    const networkError = new PesafyError({ code: 'NETWORK_ERROR', message: 'Connection refused' })
    mockHttpRequest.mockRejectedValue(networkError)
    await expect(processStkPush(SANDBOX_URL, ACCESS_TOKEN, BASE_STK_REQUEST)).rejects.toThrow(
      'Connection refused',
    )
  })

  it('propagates a generic Error from httpRequest', async () => {
    mockHttpRequest.mockRejectedValue(new Error('ETIMEDOUT'))
    await expect(processStkPush(SANDBOX_URL, ACCESS_TOKEN, BASE_STK_REQUEST)).rejects.toThrow(
      'ETIMEDOUT',
    )
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 3. STK QUERY — queryStkPush()
// ═══════════════════════════════════════════════════════════════════════════════

describe('queryStkPush() — success', () => {
  beforeEach(() => {
    mockHttpRequest.mockResolvedValue({ data: QUERY_RESPONSE_SUCCESS } as never)
  })

  it('returns the Daraja query response', async () => {
    const result = await queryStkPush(SANDBOX_URL, ACCESS_TOKEN, BASE_QUERY_REQUEST)
    expect(result).toStrictEqual(QUERY_RESPONSE_SUCCESS)
  })

  it('calls the correct Daraja STK Query endpoint', async () => {
    await queryStkPush(SANDBOX_URL, ACCESS_TOKEN, BASE_QUERY_REQUEST)
    expect(mockHttpRequest).toHaveBeenCalledWith(
      `${SANDBOX_URL}/mpesa/stkpushquery/v1/query`,
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('uses the production endpoint URL', async () => {
    await queryStkPush(PROD_URL, ACCESS_TOKEN, BASE_QUERY_REQUEST)
    expect(mockHttpRequest).toHaveBeenCalledWith(
      `${PROD_URL}/mpesa/stkpushquery/v1/query`,
      expect.any(Object),
    )
  })

  it('sends Authorization header with Bearer token', async () => {
    await queryStkPush(SANDBOX_URL, ACCESS_TOKEN, BASE_QUERY_REQUEST)
    expect(mockHttpRequest).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${ACCESS_TOKEN}` }),
      }),
    )
  })
})

describe('queryStkPush() — request body shape (Daraja spec)', () => {
  beforeEach(() => {
    mockHttpRequest.mockResolvedValue({ data: QUERY_RESPONSE_SUCCESS } as never)
  })

  function getBody(): Record<string, unknown> {
    const call = mockHttpRequest.mock.calls[0]
    return (call?.[1] as { body: Record<string, unknown> }).body
  }

  it('sends BusinessShortCode', async () => {
    await queryStkPush(SANDBOX_URL, ACCESS_TOKEN, BASE_QUERY_REQUEST)
    expect(getBody()['BusinessShortCode']).toBe('174379')
  })

  it('sends Password as a non-empty base64 string', async () => {
    await queryStkPush(SANDBOX_URL, ACCESS_TOKEN, BASE_QUERY_REQUEST)
    const password = getBody()['Password']
    expect(typeof password).toBe('string')
    expect((password as string).length).toBeGreaterThan(0)
  })

  it('sends Timestamp in YYYYMMDDHHmmss format (14 digits)', async () => {
    await queryStkPush(SANDBOX_URL, ACCESS_TOKEN, BASE_QUERY_REQUEST)
    const ts = getBody()['Timestamp']
    expect(typeof ts).toBe('string')
    expect(/^\d{14}$/.test(ts as string)).toBe(true)
  })

  it('Password and Timestamp use the same timestamp value', async () => {
    await queryStkPush(SANDBOX_URL, ACCESS_TOKEN, BASE_QUERY_REQUEST)
    const body = getBody()
    const ts = body['Timestamp'] as string
    const decoded = Buffer.from(body['Password'] as string, 'base64').toString('utf-8')
    expect(decoded.endsWith(ts)).toBe(true)
  })

  it('sends CheckoutRequestID', async () => {
    await queryStkPush(SANDBOX_URL, ACCESS_TOKEN, BASE_QUERY_REQUEST)
    expect(getBody()['CheckoutRequestID']).toBe('ws_CO_123456789')
  })

  it('sends exactly 4 fields (all Daraja-documented query fields)', async () => {
    await queryStkPush(SANDBOX_URL, ACCESS_TOKEN, BASE_QUERY_REQUEST)
    const body = getBody()
    const expectedFields = ['BusinessShortCode', 'Password', 'Timestamp', 'CheckoutRequestID']
    for (const field of expectedFields) {
      expect(body).toHaveProperty(field)
    }
    expect(Object.keys(body)).toHaveLength(4)
  })
})

describe('queryStkPush() — response fields', () => {
  it('response includes ResponseCode', async () => {
    mockHttpRequest.mockResolvedValue({ data: QUERY_RESPONSE_SUCCESS } as never)
    const res = await queryStkPush(SANDBOX_URL, ACCESS_TOKEN, BASE_QUERY_REQUEST)
    expect(typeof res.ResponseCode).toBe('string')
  })

  it('response includes ResponseDescription', async () => {
    mockHttpRequest.mockResolvedValue({ data: QUERY_RESPONSE_SUCCESS } as never)
    const res = await queryStkPush(SANDBOX_URL, ACCESS_TOKEN, BASE_QUERY_REQUEST)
    expect(typeof res.ResponseDescription).toBe('string')
  })

  it('response includes MerchantRequestID', async () => {
    mockHttpRequest.mockResolvedValue({ data: QUERY_RESPONSE_SUCCESS } as never)
    const res = await queryStkPush(SANDBOX_URL, ACCESS_TOKEN, BASE_QUERY_REQUEST)
    expect(typeof res.MerchantRequestID).toBe('string')
  })

  it('response includes CheckoutRequestID', async () => {
    mockHttpRequest.mockResolvedValue({ data: QUERY_RESPONSE_SUCCESS } as never)
    const res = await queryStkPush(SANDBOX_URL, ACCESS_TOKEN, BASE_QUERY_REQUEST)
    expect(typeof res.CheckoutRequestID).toBe('string')
  })

  it('response includes ResultCode as number', async () => {
    mockHttpRequest.mockResolvedValue({ data: QUERY_RESPONSE_SUCCESS } as never)
    const res = await queryStkPush(SANDBOX_URL, ACCESS_TOKEN, BASE_QUERY_REQUEST)
    expect(typeof res.ResultCode).toBe('number')
  })

  it('response includes ResultDesc', async () => {
    mockHttpRequest.mockResolvedValue({ data: QUERY_RESPONSE_SUCCESS } as never)
    const res = await queryStkPush(SANDBOX_URL, ACCESS_TOKEN, BASE_QUERY_REQUEST)
    expect(typeof res.ResultDesc).toBe('string')
  })
})

describe('queryStkPush() — result codes (documented by Daraja)', () => {
  it('ResultCode 0 means transaction successful', async () => {
    mockHttpRequest.mockResolvedValue({ data: QUERY_RESPONSE_SUCCESS } as never)
    const res = await queryStkPush(SANDBOX_URL, ACCESS_TOKEN, BASE_QUERY_REQUEST)
    expect(res.ResultCode).toBe(STK_RESULT_CODES.SUCCESS)
  })

  it('ResultCode 1032 means cancelled by user', async () => {
    mockHttpRequest.mockResolvedValue({ data: QUERY_RESPONSE_CANCELLED } as never)
    const res = await queryStkPush(SANDBOX_URL, ACCESS_TOKEN, BASE_QUERY_REQUEST)
    expect(res.ResultCode).toBe(STK_RESULT_CODES.CANCELLED_BY_USER)
  })

  it('ResultCode 1 means insufficient balance', async () => {
    const insufficientResponse: StkQueryResponse = {
      ...QUERY_RESPONSE_SUCCESS,
      ResultCode: 1,
      ResultDesc: 'The initiator information is invalid.',
    }
    mockHttpRequest.mockResolvedValue({ data: insufficientResponse } as never)
    const res = await queryStkPush(SANDBOX_URL, ACCESS_TOKEN, BASE_QUERY_REQUEST)
    expect(res.ResultCode).toBe(STK_RESULT_CODES.INSUFFICIENT_BALANCE)
  })

  it('ResultCode 1037 means phone unreachable', async () => {
    const unreachableResponse: StkQueryResponse = {
      ...QUERY_RESPONSE_SUCCESS,
      ResultCode: 1037,
      ResultDesc: 'DS timeout user cannot be reached',
    }
    mockHttpRequest.mockResolvedValue({ data: unreachableResponse } as never)
    const res = await queryStkPush(SANDBOX_URL, ACCESS_TOKEN, BASE_QUERY_REQUEST)
    expect(res.ResultCode).toBe(STK_RESULT_CODES.PHONE_UNREACHABLE)
  })

  it('ResultCode 2001 means invalid PIN', async () => {
    const invalidPinResponse: StkQueryResponse = {
      ...QUERY_RESPONSE_SUCCESS,
      ResultCode: 2001,
      ResultDesc: 'The initiator information is invalid.',
    }
    mockHttpRequest.mockResolvedValue({ data: invalidPinResponse } as never)
    const res = await queryStkPush(SANDBOX_URL, ACCESS_TOKEN, BASE_QUERY_REQUEST)
    expect(res.ResultCode).toBe(STK_RESULT_CODES.INVALID_PIN)
  })
})

describe('queryStkPush() — error propagation', () => {
  it('re-throws a PesafyError from httpRequest', async () => {
    mockHttpRequest.mockRejectedValue(
      new PesafyError({ code: 'REQUEST_FAILED', message: 'Gateway timeout' }),
    )
    await expect(queryStkPush(SANDBOX_URL, ACCESS_TOKEN, BASE_QUERY_REQUEST)).rejects.toThrow(
      'Gateway timeout',
    )
  })

  it('propagates a generic Error from httpRequest', async () => {
    mockHttpRequest.mockRejectedValue(new Error('ECONNRESET'))
    await expect(queryStkPush(SANDBOX_URL, ACCESS_TOKEN, BASE_QUERY_REQUEST)).rejects.toThrow(
      'ECONNRESET',
    )
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 4. CALLBACK HANDLING
// ═══════════════════════════════════════════════════════════════════════════════

describe('isStkCallbackSuccess() — type guard', () => {
  it('returns true when ResultCode is 0', () => {
    expect(isStkCallbackSuccess(CALLBACK_SUCCESS.Body.stkCallback)).toBe(true)
  })

  it('returns false when ResultCode is 1032 (cancelled)', () => {
    expect(isStkCallbackSuccess(CALLBACK_FAILURE.Body.stkCallback)).toBe(false)
  })

  it('returns false when ResultCode is 1 (insufficient balance)', () => {
    const cb: StkCallbackFailure = {
      MerchantRequestID: 'x',
      CheckoutRequestID: 'y',
      ResultCode: 1,
      ResultDesc: 'Insufficient balance',
    }
    expect(isStkCallbackSuccess(cb)).toBe(false)
  })

  it('returns false when ResultCode is 1037 (unreachable)', () => {
    const cb: StkCallbackFailure = {
      MerchantRequestID: 'x',
      CheckoutRequestID: 'y',
      ResultCode: 1037,
      ResultDesc: 'DS timeout user cannot be reached',
    }
    expect(isStkCallbackSuccess(cb)).toBe(false)
  })

  it('returns false when ResultCode is 2001 (wrong PIN)', () => {
    const cb: StkCallbackFailure = {
      MerchantRequestID: 'x',
      CheckoutRequestID: 'y',
      ResultCode: 2001,
      ResultDesc: 'Wrong PIN',
    }
    expect(isStkCallbackSuccess(cb)).toBe(false)
  })
})

describe('getCallbackValue() — metadata extraction', () => {
  it('extracts Amount from a successful callback', () => {
    expect(getCallbackValue(CALLBACK_SUCCESS, 'Amount')).toBe(1.0)
  })

  it('extracts MpesaReceiptNumber from a successful callback', () => {
    expect(getCallbackValue(CALLBACK_SUCCESS, 'MpesaReceiptNumber')).toBe('NLJ7RT61SV')
  })

  it('extracts TransactionDate from a successful callback (returns number)', () => {
    const date = getCallbackValue(CALLBACK_SUCCESS, 'TransactionDate')
    expect(date).toBe(20191219102115)
    expect(typeof date).toBe('number')
  })

  it('extracts PhoneNumber from a successful callback (returns number)', () => {
    const phone = getCallbackValue(CALLBACK_SUCCESS, 'PhoneNumber')
    expect(phone).toBe(254708374149)
    expect(typeof phone).toBe('number')
  })

  it('returns undefined for a failed callback (no metadata)', () => {
    expect(getCallbackValue(CALLBACK_FAILURE, 'Amount')).toBeUndefined()
    expect(getCallbackValue(CALLBACK_FAILURE, 'MpesaReceiptNumber')).toBeUndefined()
    expect(getCallbackValue(CALLBACK_FAILURE, 'TransactionDate')).toBeUndefined()
    expect(getCallbackValue(CALLBACK_FAILURE, 'PhoneNumber')).toBeUndefined()
  })

  it('returns undefined when a requested item is not in the metadata', () => {
    // Balance is documented but not always present — test absence gracefully
    const cb: StkPushCallback = {
      Body: {
        stkCallback: {
          MerchantRequestID: '29115',
          CheckoutRequestID: 'ws_CO_191220',
          ResultCode: 0,
          ResultDesc: 'Success',
          CallbackMetadata: {
            Item: [
              { Name: 'Amount', Value: 100 },
              { Name: 'MpesaReceiptNumber', Value: 'ABC123' },
              { Name: 'TransactionDate', Value: 20240101120000 },
              { Name: 'PhoneNumber', Value: 254712345678 },
              // Balance intentionally absent
            ],
          },
        } as StkCallbackSuccess,
      },
    }
    expect(getCallbackValue(cb, 'Balance')).toBeUndefined()
  })
})

describe('Callback structure (Daraja spec)', () => {
  it('successful callback has Body.stkCallback wrapper', () => {
    expect(CALLBACK_SUCCESS).toHaveProperty('Body')
    expect(CALLBACK_SUCCESS.Body).toHaveProperty('stkCallback')
  })

  it('successful callback has MerchantRequestID', () => {
    expect(CALLBACK_SUCCESS.Body.stkCallback).toHaveProperty('MerchantRequestID')
    expect(typeof CALLBACK_SUCCESS.Body.stkCallback.MerchantRequestID).toBe('string')
  })

  it('successful callback has CheckoutRequestID', () => {
    expect(CALLBACK_SUCCESS.Body.stkCallback).toHaveProperty('CheckoutRequestID')
    expect(typeof CALLBACK_SUCCESS.Body.stkCallback.CheckoutRequestID).toBe('string')
  })

  it('successful callback has ResultCode === 0', () => {
    expect(CALLBACK_SUCCESS.Body.stkCallback.ResultCode).toBe(0)
  })

  it('successful callback has ResultDesc', () => {
    expect(typeof CALLBACK_SUCCESS.Body.stkCallback.ResultDesc).toBe('string')
  })

  it('successful callback has CallbackMetadata with Item array', () => {
    const inner = CALLBACK_SUCCESS.Body.stkCallback as StkCallbackSuccess
    expect(inner.CallbackMetadata).toHaveProperty('Item')
    expect(Array.isArray(inner.CallbackMetadata.Item)).toBe(true)
  })

  it('successful callback Item array contains Amount', () => {
    const inner = CALLBACK_SUCCESS.Body.stkCallback as StkCallbackSuccess
    const item = inner.CallbackMetadata.Item.find((i) => i.Name === 'Amount')
    expect(item).toBeDefined()
  })

  it('successful callback Item array contains MpesaReceiptNumber', () => {
    const inner = CALLBACK_SUCCESS.Body.stkCallback as StkCallbackSuccess
    const item = inner.CallbackMetadata.Item.find((i) => i.Name === 'MpesaReceiptNumber')
    expect(item).toBeDefined()
  })

  it('successful callback Item array contains TransactionDate', () => {
    const inner = CALLBACK_SUCCESS.Body.stkCallback as StkCallbackSuccess
    const item = inner.CallbackMetadata.Item.find((i) => i.Name === 'TransactionDate')
    expect(item).toBeDefined()
  })

  it('successful callback Item array contains PhoneNumber', () => {
    const inner = CALLBACK_SUCCESS.Body.stkCallback as StkCallbackSuccess
    const item = inner.CallbackMetadata.Item.find((i) => i.Name === 'PhoneNumber')
    expect(item).toBeDefined()
  })

  it('failed callback does NOT have CallbackMetadata', () => {
    const inner = CALLBACK_FAILURE.Body.stkCallback as StkCallbackFailure
    expect(inner.CallbackMetadata).toBeUndefined()
  })

  it('failed callback ResultCode is non-zero', () => {
    expect(CALLBACK_FAILURE.Body.stkCallback.ResultCode).not.toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 5. PASSWORD GENERATION (Daraja spec: Base64(Shortcode + Passkey + Timestamp))
// ═══════════════════════════════════════════════════════════════════════════════

describe('Password generation (Base64 encoding)', () => {
  it('password is valid base64', async () => {
    mockHttpRequest.mockResolvedValue({ data: STK_PUSH_RESPONSE } as never)
    await processStkPush(SANDBOX_URL, ACCESS_TOKEN, BASE_STK_REQUEST)

    const call = mockHttpRequest.mock.calls[0]
    const body = (call?.[1] as { body: Record<string, unknown> }).body
    const password = body['Password'] as string

    // Valid base64 only contains A-Z, a-z, 0-9, +, /, =
    expect(/^[A-Za-z0-9+/=]+$/.test(password)).toBe(true)
  })

  it('decoded password contains shortCode + passKey + timestamp concatenated', async () => {
    mockHttpRequest.mockResolvedValue({ data: STK_PUSH_RESPONSE } as never)
    await processStkPush(SANDBOX_URL, ACCESS_TOKEN, BASE_STK_REQUEST)

    const call = mockHttpRequest.mock.calls[0]
    const body = (call?.[1] as { body: Record<string, unknown> }).body
    const password = body['Password'] as string
    const timestamp = body['Timestamp'] as string

    const decoded = Buffer.from(password, 'base64').toString('utf-8')
    expect(decoded).toBe(`${BASE_STK_REQUEST.shortCode}${BASE_STK_REQUEST.passKey}${timestamp}`)
  })

  it('query password uses the same formula as push password', async () => {
    mockHttpRequest.mockResolvedValue({ data: QUERY_RESPONSE_SUCCESS } as never)
    await queryStkPush(SANDBOX_URL, ACCESS_TOKEN, BASE_QUERY_REQUEST)

    const call = mockHttpRequest.mock.calls[0]
    const body = (call?.[1] as { body: Record<string, unknown> }).body
    const password = body['Password'] as string
    const timestamp = body['Timestamp'] as string

    const decoded = Buffer.from(password, 'base64').toString('utf-8')
    expect(decoded).toBe(`${BASE_QUERY_REQUEST.shortCode}${BASE_QUERY_REQUEST.passKey}${timestamp}`)
  })
})

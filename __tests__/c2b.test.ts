/**
 * __tests__/c2b.test.ts
 *
 * Complete test suite for the C2B (Customer to Business) module:
 *   - registerC2BUrls()   — Register Confirmation + Validation URLs
 *   - simulateC2B()       — Sandbox-only payment simulation
 *   - Webhook helpers     — acceptC2BValidation, rejectC2BValidation,
 *                           acknowledgeC2BConfirmation
 *   - Payload helpers     — isC2BPayload, getC2BAmount, getC2BTransactionId,
 *                           getC2BAccountRef, getC2BCustomerName,
 *                           isPaybillPayment, isBuyGoodsPayment
 *
 * Strictly covers only what is documented in the Safaricom Daraja C2B docs.
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
import { registerC2BUrls } from '../src/mpesa/c2b/register-url'
import { simulateC2B } from '../src/mpesa/c2b/simulate'
import {
  acceptC2BValidation,
  acknowledgeC2BConfirmation,
  getC2BAccountRef,
  getC2BAmount,
  getC2BCustomerName,
  getC2BTransactionId,
  isBuyGoodsPayment,
  isC2BPayload,
  isPaybillPayment,
  rejectC2BValidation,
} from '../src/mpesa/c2b/webhooks'
import type {
  C2BConfirmationPayload,
  C2BRegisterUrlRequest,
  C2BSimulateRequest,
  C2BValidationPayload,
} from '../src/mpesa/c2b/types'

// ── Typed mock ────────────────────────────────────────────────────────────────

const mockHttpRequest = vi.mocked(httpRequest)

// ── Shared fixtures ───────────────────────────────────────────────────────────

const SANDBOX_URL = 'https://sandbox.safaricom.co.ke'
const PROD_URL = 'https://api.safaricom.co.ke'
const ACCESS_TOKEN = 'test-bearer-token-abc'

// ── Register URL fixtures ─────────────────────────────────────────────────────

const BASE_REGISTER_REQUEST: C2BRegisterUrlRequest = {
  shortCode: '600984',
  responseType: 'Completed',
  confirmationUrl: 'https://mydomain.com/confirm',
  validationUrl: 'https://mydomain.com/validate',
}

const REGISTER_URL_RESPONSE = {
  OriginatorCoversationID: '6e86-45dd-91ac-fd5d4178ab523408729',
  ResponseCode: '0',
  ResponseDescription: 'Success',
}

// ── Simulate fixtures ─────────────────────────────────────────────────────────

const BASE_SIMULATE_PAYBILL: C2BSimulateRequest = {
  shortCode: '600984',
  commandId: 'CustomerPayBillOnline',
  amount: 100,
  msisdn: 254708374149,
  billRefNumber: 'TestRef001',
}

const BASE_SIMULATE_BUYGOODS: C2BSimulateRequest = {
  shortCode: '600984',
  commandId: 'CustomerBuyGoodsOnline',
  amount: 50,
  msisdn: 254708374149,
  // billRefNumber intentionally absent for Buy Goods
}

const SIMULATE_RESPONSE = {
  OriginatorCoversationID: '53e3-4aa8-9fe0-8fb5e4092cdd3405976',
  ResponseCode: '0',
  ResponseDescription: 'Accept the service request successfully.',
}

// ── Callback payload fixtures (v2 masked MSISDN) ──────────────────────────────

const PAYBILL_VALIDATION_PAYLOAD: C2BValidationPayload = {
  TransactionType: 'Pay Bill',
  TransID: 'RKL51ZDR4F',
  TransTime: '20231121121325',
  TransAmount: '5.00',
  BusinessShortCode: '600984',
  BillRefNumber: 'Sample Transaction',
  InvoiceNumber: '',
  OrgAccountBalance: '', // blank for validation requests per docs
  ThirdPartyTransID: '',
  MSISDN: '2547 ***** 126', // masked v2 format
  FirstName: 'NICHOLAS',
  MiddleName: '',
  LastName: '',
}

const BUYGOODS_CONFIRMATION_PAYLOAD: C2BConfirmationPayload = {
  TransactionType: 'Buy Goods',
  TransID: 'RKL51ZDR5G',
  TransTime: '20231121121500',
  TransAmount: '50.00',
  BusinessShortCode: '600984',
  BillRefNumber: '',
  InvoiceNumber: '',
  OrgAccountBalance: '25.00', // new balance after payment, in confirmation
  ThirdPartyTransID: '',
  MSISDN: '2547 ***** 126',
  FirstName: 'JOHN',
  MiddleName: 'DOE',
  LastName: 'SMITH',
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. REGISTER URL
// ═══════════════════════════════════════════════════════════════════════════════

describe('registerC2BUrls() — success', () => {
  beforeEach(() => {
    mockHttpRequest.mockResolvedValue({ data: REGISTER_URL_RESPONSE } as never)
  })

  it('returns the Daraja register URL response on success', async () => {
    const result = await registerC2BUrls(SANDBOX_URL, ACCESS_TOKEN, BASE_REGISTER_REQUEST)
    expect(result).toStrictEqual(REGISTER_URL_RESPONSE)
  })

  it('calls the correct sandbox register URL endpoint (v2)', async () => {
    await registerC2BUrls(SANDBOX_URL, ACCESS_TOKEN, BASE_REGISTER_REQUEST)
    expect(mockHttpRequest).toHaveBeenCalledWith(
      `${SANDBOX_URL}/mpesa/c2b/v2/registerurl`,
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('calls the correct production register URL endpoint (v2)', async () => {
    await registerC2BUrls(PROD_URL, ACCESS_TOKEN, BASE_REGISTER_REQUEST)
    expect(mockHttpRequest).toHaveBeenCalledWith(
      `${PROD_URL}/mpesa/c2b/v2/registerurl`,
      expect.any(Object),
    )
  })

  it('uses v1 endpoint when apiVersion is "v1"', async () => {
    await registerC2BUrls(SANDBOX_URL, ACCESS_TOKEN, {
      ...BASE_REGISTER_REQUEST,
      apiVersion: 'v1',
    })
    expect(mockHttpRequest).toHaveBeenCalledWith(
      `${SANDBOX_URL}/mpesa/c2b/v1/registerurl`,
      expect.any(Object),
    )
  })

  it('sends Authorization header with Bearer token', async () => {
    await registerC2BUrls(SANDBOX_URL, ACCESS_TOKEN, BASE_REGISTER_REQUEST)
    expect(mockHttpRequest).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${ACCESS_TOKEN}` }),
      }),
    )
  })
})

describe('registerC2BUrls() — request body shape (Daraja spec)', () => {
  beforeEach(() => {
    mockHttpRequest.mockResolvedValue({ data: REGISTER_URL_RESPONSE } as never)
  })

  function getBody(): Record<string, unknown> {
    const call = mockHttpRequest.mock.calls[0]
    return (call?.[1] as { body: Record<string, unknown> }).body
  }

  it('sends ShortCode as a string', async () => {
    await registerC2BUrls(SANDBOX_URL, ACCESS_TOKEN, BASE_REGISTER_REQUEST)
    expect(getBody()['ShortCode']).toBe('600984')
    expect(typeof getBody()['ShortCode']).toBe('string')
  })

  it('sends ResponseType exactly as provided ("Completed")', async () => {
    await registerC2BUrls(SANDBOX_URL, ACCESS_TOKEN, BASE_REGISTER_REQUEST)
    expect(getBody()['ResponseType']).toBe('Completed')
  })

  it('sends ResponseType "Cancelled" correctly', async () => {
    await registerC2BUrls(SANDBOX_URL, ACCESS_TOKEN, {
      ...BASE_REGISTER_REQUEST,
      responseType: 'Cancelled',
    })
    expect(getBody()['ResponseType']).toBe('Cancelled')
  })

  it('sends ConfirmationURL exactly as provided', async () => {
    await registerC2BUrls(SANDBOX_URL, ACCESS_TOKEN, BASE_REGISTER_REQUEST)
    expect(getBody()['ConfirmationURL']).toBe('https://mydomain.com/confirm')
  })

  it('sends ValidationURL exactly as provided', async () => {
    await registerC2BUrls(SANDBOX_URL, ACCESS_TOKEN, BASE_REGISTER_REQUEST)
    expect(getBody()['ValidationURL']).toBe('https://mydomain.com/validate')
  })

  it('sends exactly 4 fields in the request body (Daraja-documented fields)', async () => {
    await registerC2BUrls(SANDBOX_URL, ACCESS_TOKEN, BASE_REGISTER_REQUEST)
    const body = getBody()
    const expectedFields = ['ShortCode', 'ResponseType', 'ConfirmationURL', 'ValidationURL']
    for (const field of expectedFields) {
      expect(body).toHaveProperty(field)
    }
    expect(Object.keys(body)).toHaveLength(4)
  })
})

describe('registerC2BUrls() — response fields', () => {
  beforeEach(() => {
    mockHttpRequest.mockResolvedValue({ data: REGISTER_URL_RESPONSE } as never)
  })

  it('response includes OriginatorCoversationID (Daraja spelling)', async () => {
    const res = await registerC2BUrls(SANDBOX_URL, ACCESS_TOKEN, BASE_REGISTER_REQUEST)
    expect(typeof res.OriginatorCoversationID).toBe('string')
    expect(res.OriginatorCoversationID.length).toBeGreaterThan(0)
  })

  it('response includes ResponseCode', async () => {
    const res = await registerC2BUrls(SANDBOX_URL, ACCESS_TOKEN, BASE_REGISTER_REQUEST)
    expect(typeof res.ResponseCode).toBe('string')
  })

  it('response includes ResponseDescription', async () => {
    const res = await registerC2BUrls(SANDBOX_URL, ACCESS_TOKEN, BASE_REGISTER_REQUEST)
    expect(typeof res.ResponseDescription).toBe('string')
  })

  it('ResponseCode "0" indicates success', async () => {
    const res = await registerC2BUrls(SANDBOX_URL, ACCESS_TOKEN, BASE_REGISTER_REQUEST)
    expect(res.ResponseCode).toBe('0')
  })
})

describe('registerC2BUrls() — shortCode validation', () => {
  it('throws VALIDATION_ERROR when shortCode is empty string', async () => {
    await expect(
      registerC2BUrls(SANDBOX_URL, ACCESS_TOKEN, { ...BASE_REGISTER_REQUEST, shortCode: '' }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('does not call httpRequest when shortCode is missing', async () => {
    await registerC2BUrls(SANDBOX_URL, ACCESS_TOKEN, {
      ...BASE_REGISTER_REQUEST,
      shortCode: '',
    }).catch(() => {})
    expect(mockHttpRequest).not.toHaveBeenCalled()
  })
})

describe('registerC2BUrls() — responseType validation', () => {
  it('throws VALIDATION_ERROR for wrong casing "completed"', async () => {
    await expect(
      registerC2BUrls(SANDBOX_URL, ACCESS_TOKEN, {
        ...BASE_REGISTER_REQUEST,
        responseType: 'completed' as never,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR for wrong casing "COMPLETED"', async () => {
    await expect(
      registerC2BUrls(SANDBOX_URL, ACCESS_TOKEN, {
        ...BASE_REGISTER_REQUEST,
        responseType: 'COMPLETED' as never,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR for wrong casing "cancelled"', async () => {
    await expect(
      registerC2BUrls(SANDBOX_URL, ACCESS_TOKEN, {
        ...BASE_REGISTER_REQUEST,
        responseType: 'cancelled' as never,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR for unknown responseType', async () => {
    await expect(
      registerC2BUrls(SANDBOX_URL, ACCESS_TOKEN, {
        ...BASE_REGISTER_REQUEST,
        responseType: 'Complete' as never,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('accepts "Completed" (correct sentence case)', async () => {
    mockHttpRequest.mockResolvedValue({ data: REGISTER_URL_RESPONSE } as never)
    await expect(
      registerC2BUrls(SANDBOX_URL, ACCESS_TOKEN, {
        ...BASE_REGISTER_REQUEST,
        responseType: 'Completed',
      }),
    ).resolves.toBeDefined()
  })

  it('accepts "Cancelled" (correct sentence case)', async () => {
    mockHttpRequest.mockResolvedValue({ data: REGISTER_URL_RESPONSE } as never)
    await expect(
      registerC2BUrls(SANDBOX_URL, ACCESS_TOKEN, {
        ...BASE_REGISTER_REQUEST,
        responseType: 'Cancelled',
      }),
    ).resolves.toBeDefined()
  })

  it('error message mentions sentence case requirement', async () => {
    const error = await registerC2BUrls(SANDBOX_URL, ACCESS_TOKEN, {
      ...BASE_REGISTER_REQUEST,
      responseType: 'completed' as never,
    }).catch((e: unknown) => e as { message: string })
    expect(error.message).toMatch(/[Cc]ompleted|[Cc]ancelled|sentence/i)
  })
})

describe('registerC2BUrls() — URL validation (forbidden keywords per docs)', () => {
  const forbiddenCases: Array<[string, string]> = [
    ['mpesa', 'https://mydomain.com/mpesa/confirm'],
    ['safaricom', 'https://safaricom.mydomain.com/confirm'],
    ['exec', 'https://mydomain.com/exec/confirm'],
    ['exe', 'https://mydomain.com/file.exe/confirm'],
    ['cmd', 'https://mydomain.com/cmd/confirm'],
    ['sql', 'https://mydomain.com/sql/confirm'],
    ['query', 'https://mydomain.com/query/confirm'],
  ]

  for (const [keyword, url] of forbiddenCases) {
    it(`throws VALIDATION_ERROR when confirmationUrl contains "${keyword}"`, async () => {
      await expect(
        registerC2BUrls(SANDBOX_URL, ACCESS_TOKEN, {
          ...BASE_REGISTER_REQUEST,
          confirmationUrl: url,
        }),
      ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
    })

    it(`throws VALIDATION_ERROR when validationUrl contains "${keyword}"`, async () => {
      await expect(
        registerC2BUrls(SANDBOX_URL, ACCESS_TOKEN, {
          ...BASE_REGISTER_REQUEST,
          validationUrl: url,
        }),
      ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
    })
  }

  it('throws VALIDATION_ERROR for empty confirmationUrl', async () => {
    await expect(
      registerC2BUrls(SANDBOX_URL, ACCESS_TOKEN, {
        ...BASE_REGISTER_REQUEST,
        confirmationUrl: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR for empty validationUrl', async () => {
    await expect(
      registerC2BUrls(SANDBOX_URL, ACCESS_TOKEN, {
        ...BASE_REGISTER_REQUEST,
        validationUrl: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('forbidden keyword check is case-insensitive (MPESA blocked)', async () => {
    await expect(
      registerC2BUrls(SANDBOX_URL, ACCESS_TOKEN, {
        ...BASE_REGISTER_REQUEST,
        confirmationUrl: 'https://mydomain.com/MPESA/confirm',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('accepts clean URLs without forbidden keywords', async () => {
    mockHttpRequest.mockResolvedValue({ data: REGISTER_URL_RESPONSE } as never)
    await expect(
      registerC2BUrls(SANDBOX_URL, ACCESS_TOKEN, BASE_REGISTER_REQUEST),
    ).resolves.toBeDefined()
  })
})

describe('registerC2BUrls() — error propagation', () => {
  it('propagates a generic Error from httpRequest', async () => {
    mockHttpRequest.mockRejectedValue(new Error('ECONNRESET'))
    await expect(registerC2BUrls(SANDBOX_URL, ACCESS_TOKEN, BASE_REGISTER_REQUEST)).rejects.toThrow(
      'ECONNRESET',
    )
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 2. SIMULATE C2B
// ═══════════════════════════════════════════════════════════════════════════════

describe('simulateC2B() — success', () => {
  beforeEach(() => {
    mockHttpRequest.mockResolvedValue({ data: SIMULATE_RESPONSE } as never)
  })

  it('returns the Daraja simulate response on success', async () => {
    const result = await simulateC2B(SANDBOX_URL, ACCESS_TOKEN, BASE_SIMULATE_PAYBILL)
    expect(result).toStrictEqual(SIMULATE_RESPONSE)
  })

  it('calls the correct sandbox simulate endpoint (v2)', async () => {
    await simulateC2B(SANDBOX_URL, ACCESS_TOKEN, BASE_SIMULATE_PAYBILL)
    expect(mockHttpRequest).toHaveBeenCalledWith(
      `${SANDBOX_URL}/mpesa/c2b/v2/simulate`,
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('uses v1 endpoint when apiVersion is "v1"', async () => {
    await simulateC2B(SANDBOX_URL, ACCESS_TOKEN, {
      ...BASE_SIMULATE_PAYBILL,
      apiVersion: 'v1',
    })
    expect(mockHttpRequest).toHaveBeenCalledWith(
      `${SANDBOX_URL}/mpesa/c2b/v1/simulate`,
      expect.any(Object),
    )
  })

  it('sends Authorization header with Bearer token', async () => {
    await simulateC2B(SANDBOX_URL, ACCESS_TOKEN, BASE_SIMULATE_PAYBILL)
    expect(mockHttpRequest).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${ACCESS_TOKEN}` }),
      }),
    )
  })
})

describe('simulateC2B() — sandbox guard (production is not supported per docs)', () => {
  it('throws VALIDATION_ERROR when baseUrl is production', async () => {
    await expect(simulateC2B(PROD_URL, ACCESS_TOKEN, BASE_SIMULATE_PAYBILL)).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    })
  })

  it('error message mentions sandbox', async () => {
    const error = await simulateC2B(PROD_URL, ACCESS_TOKEN, BASE_SIMULATE_PAYBILL).catch(
      (e: unknown) => e as { message: string },
    )
    expect(error.message.toLowerCase()).toContain('sandbox')
  })

  it('does not call httpRequest for production URL', async () => {
    await simulateC2B(PROD_URL, ACCESS_TOKEN, BASE_SIMULATE_PAYBILL).catch(() => {})
    expect(mockHttpRequest).not.toHaveBeenCalled()
  })
})

describe('simulateC2B() — request body shape: CustomerPayBillOnline (Daraja spec)', () => {
  beforeEach(() => {
    mockHttpRequest.mockResolvedValue({ data: SIMULATE_RESPONSE } as never)
  })

  function getBody(): Record<string, unknown> {
    const call = mockHttpRequest.mock.calls[0]
    return (call?.[1] as { body: Record<string, unknown> }).body
  }

  it('sends ShortCode as a number', async () => {
    await simulateC2B(SANDBOX_URL, ACCESS_TOKEN, BASE_SIMULATE_PAYBILL)
    expect(typeof getBody()['ShortCode']).toBe('number')
    expect(getBody()['ShortCode']).toBe(600984)
  })

  it('sends CommandID as "CustomerPayBillOnline"', async () => {
    await simulateC2B(SANDBOX_URL, ACCESS_TOKEN, BASE_SIMULATE_PAYBILL)
    expect(getBody()['CommandID']).toBe('CustomerPayBillOnline')
  })

  it('sends Amount as a whole number', async () => {
    await simulateC2B(SANDBOX_URL, ACCESS_TOKEN, BASE_SIMULATE_PAYBILL)
    const amount = getBody()['Amount']
    expect(typeof amount).toBe('number')
    expect(Number.isInteger(amount)).toBe(true)
    expect(amount).toBe(100)
  })

  it('sends Msisdn as a number', async () => {
    await simulateC2B(SANDBOX_URL, ACCESS_TOKEN, BASE_SIMULATE_PAYBILL)
    expect(typeof getBody()['Msisdn']).toBe('number')
    expect(getBody()['Msisdn']).toBe(254708374149)
  })

  it('sends BillRefNumber for CustomerPayBillOnline', async () => {
    await simulateC2B(SANDBOX_URL, ACCESS_TOKEN, BASE_SIMULATE_PAYBILL)
    expect(getBody()).toHaveProperty('BillRefNumber')
    expect(getBody()['BillRefNumber']).toBe('TestRef001')
  })

  it('sends exactly 5 fields for CustomerPayBillOnline', async () => {
    await simulateC2B(SANDBOX_URL, ACCESS_TOKEN, BASE_SIMULATE_PAYBILL)
    const expectedFields = ['ShortCode', 'CommandID', 'Amount', 'Msisdn', 'BillRefNumber']
    const body = getBody()
    for (const field of expectedFields) {
      expect(body).toHaveProperty(field)
    }
    expect(Object.keys(body)).toHaveLength(5)
  })
})

describe('simulateC2B() — request body shape: CustomerBuyGoodsOnline (Daraja spec)', () => {
  beforeEach(() => {
    mockHttpRequest.mockResolvedValue({ data: SIMULATE_RESPONSE } as never)
  })

  function getBody(): Record<string, unknown> {
    const call = mockHttpRequest.mock.calls[0]
    return (call?.[1] as { body: Record<string, unknown> }).body
  }

  it('sends CommandID as "CustomerBuyGoodsOnline"', async () => {
    await simulateC2B(SANDBOX_URL, ACCESS_TOKEN, BASE_SIMULATE_BUYGOODS)
    expect(getBody()['CommandID']).toBe('CustomerBuyGoodsOnline')
  })

  it('does NOT include BillRefNumber for CustomerBuyGoodsOnline', async () => {
    await simulateC2B(SANDBOX_URL, ACCESS_TOKEN, BASE_SIMULATE_BUYGOODS)
    expect(getBody()).not.toHaveProperty('BillRefNumber')
  })

  it('omits BillRefNumber even when caller passes null for BuyGoods', async () => {
    await simulateC2B(SANDBOX_URL, ACCESS_TOKEN, {
      ...BASE_SIMULATE_BUYGOODS,
      billRefNumber: null,
    })
    expect(getBody()).not.toHaveProperty('BillRefNumber')
  })

  it('sends exactly 4 fields for CustomerBuyGoodsOnline', async () => {
    await simulateC2B(SANDBOX_URL, ACCESS_TOKEN, BASE_SIMULATE_BUYGOODS)
    const body = getBody()
    const expectedFields = ['ShortCode', 'CommandID', 'Amount', 'Msisdn']
    for (const field of expectedFields) {
      expect(body).toHaveProperty(field)
    }
    expect(Object.keys(body)).toHaveLength(4)
  })
})

describe('simulateC2B() — amount validation', () => {
  it('rounds fractional amounts (e.g. 99.7 → 100)', async () => {
    mockHttpRequest.mockResolvedValue({ data: SIMULATE_RESPONSE } as never)
    await simulateC2B(SANDBOX_URL, ACCESS_TOKEN, { ...BASE_SIMULATE_PAYBILL, amount: 99.7 })
    const call = mockHttpRequest.mock.calls[0]
    const body = (call?.[1] as { body: Record<string, unknown> }).body
    expect(body['Amount']).toBe(100)
  })

  it('throws VALIDATION_ERROR for amount 0', async () => {
    await expect(
      simulateC2B(SANDBOX_URL, ACCESS_TOKEN, { ...BASE_SIMULATE_PAYBILL, amount: 0 }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR for negative amount', async () => {
    await expect(
      simulateC2B(SANDBOX_URL, ACCESS_TOKEN, { ...BASE_SIMULATE_PAYBILL, amount: -50 }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR for amount that rounds to 0 (e.g. 0.4)', async () => {
    await expect(
      simulateC2B(SANDBOX_URL, ACCESS_TOKEN, { ...BASE_SIMULATE_PAYBILL, amount: 0.4 }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('accepts amount 1 (minimum)', async () => {
    mockHttpRequest.mockResolvedValue({ data: SIMULATE_RESPONSE } as never)
    await expect(
      simulateC2B(SANDBOX_URL, ACCESS_TOKEN, { ...BASE_SIMULATE_PAYBILL, amount: 1 }),
    ).resolves.toBeDefined()
  })

  it('does not call httpRequest when amount validation fails', async () => {
    await simulateC2B(SANDBOX_URL, ACCESS_TOKEN, { ...BASE_SIMULATE_PAYBILL, amount: 0 }).catch(
      () => {},
    )
    expect(mockHttpRequest).not.toHaveBeenCalled()
  })
})

describe('simulateC2B() — input validation', () => {
  it('throws VALIDATION_ERROR when shortCode is empty', async () => {
    await expect(
      simulateC2B(SANDBOX_URL, ACCESS_TOKEN, { ...BASE_SIMULATE_PAYBILL, shortCode: '' }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR for invalid commandId', async () => {
    await expect(
      simulateC2B(SANDBOX_URL, ACCESS_TOKEN, {
        ...BASE_SIMULATE_PAYBILL,
        commandId: 'InvalidCommand' as never,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when msisdn is empty', async () => {
    await expect(
      simulateC2B(SANDBOX_URL, ACCESS_TOKEN, {
        ...BASE_SIMULATE_PAYBILL,
        msisdn: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })
})

describe('simulateC2B() — response fields', () => {
  beforeEach(() => {
    mockHttpRequest.mockResolvedValue({ data: SIMULATE_RESPONSE } as never)
  })

  it('response includes OriginatorCoversationID', async () => {
    const res = await simulateC2B(SANDBOX_URL, ACCESS_TOKEN, BASE_SIMULATE_PAYBILL)
    expect(typeof res.OriginatorCoversationID).toBe('string')
    expect(res.OriginatorCoversationID.length).toBeGreaterThan(0)
  })

  it('response includes ResponseCode', async () => {
    const res = await simulateC2B(SANDBOX_URL, ACCESS_TOKEN, BASE_SIMULATE_PAYBILL)
    expect(typeof res.ResponseCode).toBe('string')
  })

  it('response includes ResponseDescription', async () => {
    const res = await simulateC2B(SANDBOX_URL, ACCESS_TOKEN, BASE_SIMULATE_PAYBILL)
    expect(typeof res.ResponseDescription).toBe('string')
  })

  it('ResponseCode "0" indicates request was accepted', async () => {
    const res = await simulateC2B(SANDBOX_URL, ACCESS_TOKEN, BASE_SIMULATE_PAYBILL)
    expect(res.ResponseCode).toBe('0')
  })
})

describe('simulateC2B() — error propagation', () => {
  it('propagates a generic Error from httpRequest', async () => {
    mockHttpRequest.mockRejectedValue(new Error('ECONNRESET'))
    await expect(simulateC2B(SANDBOX_URL, ACCESS_TOKEN, BASE_SIMULATE_PAYBILL)).rejects.toThrow(
      'ECONNRESET',
    )
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 3. VALIDATION RESPONSE HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

describe('acceptC2BValidation() — response shape', () => {
  it('returns ResultCode "0"', () => {
    const res = acceptC2BValidation()
    expect(res.ResultCode).toBe('0')
  })

  it('returns ResultDesc "Accepted"', () => {
    const res = acceptC2BValidation()
    expect(res.ResultDesc).toBe('Accepted')
  })

  it('includes ThirdPartyTransID when provided', () => {
    const res = acceptC2BValidation('TXN-12345')
    expect(res.ThirdPartyTransID).toBe('TXN-12345')
  })

  it('does not include ThirdPartyTransID when not provided', () => {
    const res = acceptC2BValidation()
    expect(res.ThirdPartyTransID).toBeUndefined()
  })

  it('matches the exact shape documented by Daraja (no ThirdPartyTransID)', () => {
    expect(acceptC2BValidation()).toStrictEqual({
      ResultCode: '0',
      ResultDesc: 'Accepted',
    })
  })
})

describe('rejectC2BValidation() — response shape', () => {
  it('defaults to ResultCode "C2B00016" (Other Error)', () => {
    const res = rejectC2BValidation()
    expect(res.ResultCode).toBe('C2B00016')
  })

  it('returns ResultDesc "Rejected"', () => {
    const res = rejectC2BValidation()
    expect(res.ResultDesc).toBe('Rejected')
  })

  it('accepts C2B00011 (Invalid MSISDN)', () => {
    const res = rejectC2BValidation('C2B00011')
    expect(res.ResultCode).toBe('C2B00011')
    expect(res.ResultDesc).toBe('Rejected')
  })

  it('accepts C2B00012 (Invalid Account Number)', () => {
    expect(rejectC2BValidation('C2B00012').ResultCode).toBe('C2B00012')
  })

  it('accepts C2B00013 (Invalid Amount)', () => {
    expect(rejectC2BValidation('C2B00013').ResultCode).toBe('C2B00013')
  })

  it('accepts C2B00014 (Invalid KYC Details)', () => {
    expect(rejectC2BValidation('C2B00014').ResultCode).toBe('C2B00014')
  })

  it('accepts C2B00015 (Invalid Short code)', () => {
    expect(rejectC2BValidation('C2B00015').ResultCode).toBe('C2B00015')
  })

  it('accepts C2B00016 (Other Error)', () => {
    expect(rejectC2BValidation('C2B00016').ResultCode).toBe('C2B00016')
  })

  it('matches the exact shape documented by Daraja', () => {
    expect(rejectC2BValidation('C2B00011')).toStrictEqual({
      ResultCode: 'C2B00011',
      ResultDesc: 'Rejected',
    })
  })
})

describe('acknowledgeC2BConfirmation() — response shape', () => {
  it('returns ResultCode 0 (number)', () => {
    const ack = acknowledgeC2BConfirmation()
    expect(ack.ResultCode).toBe(0)
    expect(typeof ack.ResultCode).toBe('number')
  })

  it('returns a ResultDesc string', () => {
    const ack = acknowledgeC2BConfirmation()
    expect(typeof ack.ResultDesc).toBe('string')
    expect(ack.ResultDesc.length).toBeGreaterThan(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 4. isC2BPayload() TYPE GUARD
// ═══════════════════════════════════════════════════════════════════════════════

describe('isC2BPayload() — type guard', () => {
  it('returns true for a valid Paybill validation payload', () => {
    expect(isC2BPayload(PAYBILL_VALIDATION_PAYLOAD)).toBe(true)
  })

  it('returns true for a valid Buy Goods confirmation payload', () => {
    expect(isC2BPayload(BUYGOODS_CONFIRMATION_PAYLOAD)).toBe(true)
  })

  it('returns false for null', () => {
    expect(isC2BPayload(null)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(isC2BPayload(undefined)).toBe(false)
  })

  it('returns false for an empty object', () => {
    expect(isC2BPayload({})).toBe(false)
  })

  it('returns false when TransID is missing', () => {
    const { TransID: _omit, ...rest } = PAYBILL_VALIDATION_PAYLOAD
    expect(isC2BPayload(rest)).toBe(false)
  })

  it('returns false when BusinessShortCode is missing', () => {
    const { BusinessShortCode: _omit, ...rest } = PAYBILL_VALIDATION_PAYLOAD
    expect(isC2BPayload(rest)).toBe(false)
  })

  it('returns false when TransAmount is missing', () => {
    const { TransAmount: _omit, ...rest } = PAYBILL_VALIDATION_PAYLOAD
    expect(isC2BPayload(rest)).toBe(false)
  })

  it('returns false for a non-object value', () => {
    expect(isC2BPayload('string')).toBe(false)
    expect(isC2BPayload(42)).toBe(false)
    expect(isC2BPayload([])).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 5. PAYLOAD EXTRACTORS
// ═══════════════════════════════════════════════════════════════════════════════

describe('getC2BAmount()', () => {
  it('parses TransAmount string to a number for Paybill payload', () => {
    expect(getC2BAmount(PAYBILL_VALIDATION_PAYLOAD)).toBe(5)
    expect(typeof getC2BAmount(PAYBILL_VALIDATION_PAYLOAD)).toBe('number')
  })

  it('parses TransAmount string to a number for BuyGoods payload', () => {
    expect(getC2BAmount(BUYGOODS_CONFIRMATION_PAYLOAD)).toBe(50)
  })
})

describe('getC2BTransactionId()', () => {
  it('returns TransID from Paybill validation payload', () => {
    expect(getC2BTransactionId(PAYBILL_VALIDATION_PAYLOAD)).toBe('RKL51ZDR4F')
  })

  it('returns TransID from BuyGoods confirmation payload', () => {
    expect(getC2BTransactionId(BUYGOODS_CONFIRMATION_PAYLOAD)).toBe('RKL51ZDR5G')
  })
})

describe('getC2BAccountRef()', () => {
  it('returns BillRefNumber from Paybill payload', () => {
    expect(getC2BAccountRef(PAYBILL_VALIDATION_PAYLOAD)).toBe('Sample Transaction')
  })

  it('returns empty string from Buy Goods payload (no BillRefNumber)', () => {
    expect(getC2BAccountRef(BUYGOODS_CONFIRMATION_PAYLOAD)).toBe('')
  })
})

describe('getC2BCustomerName()', () => {
  it('returns FirstName only when MiddleName and LastName are empty', () => {
    expect(getC2BCustomerName(PAYBILL_VALIDATION_PAYLOAD)).toBe('NICHOLAS')
  })

  it('joins FirstName, MiddleName, LastName when all present', () => {
    expect(getC2BCustomerName(BUYGOODS_CONFIRMATION_PAYLOAD)).toBe('JOHN DOE SMITH')
  })

  it('skips blank name parts', () => {
    const payload: C2BValidationPayload = {
      ...PAYBILL_VALIDATION_PAYLOAD,
      FirstName: 'ALICE',
      MiddleName: '',
      LastName: 'WANJIRU',
    }
    expect(getC2BCustomerName(payload)).toBe('ALICE WANJIRU')
  })

  it('returns empty string when all name fields are empty', () => {
    const payload: C2BValidationPayload = {
      ...PAYBILL_VALIDATION_PAYLOAD,
      FirstName: '',
      MiddleName: '',
      LastName: '',
    }
    expect(getC2BCustomerName(payload)).toBe('')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 6. TRANSACTION TYPE HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

describe('isPaybillPayment() — TransactionType per Daraja callback docs', () => {
  it('returns true when TransactionType is "Pay Bill" (per Daraja docs)', () => {
    expect(isPaybillPayment(PAYBILL_VALIDATION_PAYLOAD)).toBe(true)
  })

  it('returns false when TransactionType is "Buy Goods"', () => {
    expect(isPaybillPayment(BUYGOODS_CONFIRMATION_PAYLOAD)).toBe(false)
  })

  it('returns false for an unrecognised TransactionType', () => {
    const payload: C2BValidationPayload = {
      ...PAYBILL_VALIDATION_PAYLOAD,
      TransactionType: 'Unknown',
    }
    expect(isPaybillPayment(payload)).toBe(false)
  })
})

describe('isBuyGoodsPayment() — TransactionType per Daraja callback docs', () => {
  it('returns true when TransactionType is "Buy Goods" (per Daraja docs)', () => {
    expect(isBuyGoodsPayment(BUYGOODS_CONFIRMATION_PAYLOAD)).toBe(true)
  })

  it('returns false when TransactionType is "Pay Bill"', () => {
    expect(isBuyGoodsPayment(PAYBILL_VALIDATION_PAYLOAD)).toBe(false)
  })

  it('returns false for an unrecognised TransactionType', () => {
    const payload: C2BConfirmationPayload = {
      ...BUYGOODS_CONFIRMATION_PAYLOAD,
      TransactionType: 'Unknown',
    }
    expect(isBuyGoodsPayment(payload)).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 7. CALLBACK PAYLOAD STRUCTURE (Daraja spec)
// ═══════════════════════════════════════════════════════════════════════════════

describe('C2B callback payload structure (Daraja spec)', () => {
  it('Paybill validation payload has all documented fields', () => {
    const requiredFields = [
      'TransactionType',
      'TransID',
      'TransTime',
      'TransAmount',
      'BusinessShortCode',
      'BillRefNumber',
      'InvoiceNumber',
      'OrgAccountBalance',
      'ThirdPartyTransID',
      'MSISDN',
      'FirstName',
      'MiddleName',
      'LastName',
    ]
    for (const field of requiredFields) {
      expect(PAYBILL_VALIDATION_PAYLOAD).toHaveProperty(field)
    }
  })

  it('TransactionType for Paybill callback is "Pay Bill"', () => {
    expect(PAYBILL_VALIDATION_PAYLOAD.TransactionType).toBe('Pay Bill')
  })

  it('TransactionType for BuyGoods callback is "Buy Goods"', () => {
    expect(BUYGOODS_CONFIRMATION_PAYLOAD.TransactionType).toBe('Buy Goods')
  })

  it('OrgAccountBalance is blank in validation request (per docs)', () => {
    expect(PAYBILL_VALIDATION_PAYLOAD.OrgAccountBalance).toBe('')
  })

  it('OrgAccountBalance is non-empty in confirmation (new balance after payment)', () => {
    expect(BUYGOODS_CONFIRMATION_PAYLOAD.OrgAccountBalance).not.toBe('')
    expect(BUYGOODS_CONFIRMATION_PAYLOAD.OrgAccountBalance).toBe('25.00')
  })

  it('MSISDN in v2 is masked (e.g. "2547 ***** 126")', () => {
    expect(PAYBILL_VALIDATION_PAYLOAD.MSISDN).toBe('2547 ***** 126')
  })

  it('TransTime follows YYYYMMDDHHmmss format (14 digits)', () => {
    expect(/^\d{14}$/.test(PAYBILL_VALIDATION_PAYLOAD.TransTime)).toBe(true)
  })

  it('TransID is a non-empty alphanumeric string', () => {
    expect(typeof PAYBILL_VALIDATION_PAYLOAD.TransID).toBe('string')
    expect(PAYBILL_VALIDATION_PAYLOAD.TransID.length).toBeGreaterThan(0)
  })

  it('BusinessShortCode is a 5-6 digit string', () => {
    const code = PAYBILL_VALIDATION_PAYLOAD.BusinessShortCode
    expect(typeof code).toBe('string')
    expect(/^\d{5,6}$/.test(code)).toBe(true)
  })
})

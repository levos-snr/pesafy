/**
 * __tests__/c2b.test.ts
 *
 * Complete test suite for the C2B (Customer to Business) module.
 * Strictly aligned with Safaricom Daraja C2B Register URL API documentation.
 *
 * Covers:
 *   Constants
 *   - C2B_REGISTER_URL_ERROR_CODES  — API registration error codes
 *   - C2B_VALIDATION_RESULT_CODES   — Validation result code constants
 *
 *   Initiation
 *   - registerC2BUrls()             — Register Confirmation + Validation URLs
 *   - simulateC2B()                 — Sandbox-only payment simulation
 *
 *   Webhook helpers
 *   - acceptC2BValidation()         — Build accept response
 *   - rejectC2BValidation()         — Build reject response
 *   - acknowledgeC2BConfirmation()  — Build confirmation acknowledgement
 *
 *   Payload helpers
 *   - isC2BPayload()
 *   - getC2BAmount()
 *   - getC2BTransactionId()
 *   - getC2BAccountRef()
 *   - getC2BCustomerName()
 *   - isPaybillPayment()
 *   - isBuyGoodsPayment()
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
import { C2B_REGISTER_URL_ERROR_CODES, C2B_VALIDATION_RESULT_CODES } from '../src/mpesa/c2b/types'
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

// ── Callback payload fixtures (per Daraja docs sample) ───────────────────────

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
  MSISDN: '2547 ***** 126', // masked format per docs
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
  OrgAccountBalance: '25.00', // new balance after payment in confirmation
  ThirdPartyTransID: '',
  MSISDN: '2547 ***** 126',
  FirstName: 'JOHN',
  MiddleName: 'DOE',
  LastName: 'SMITH',
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. C2B_REGISTER_URL_ERROR_CODES CONSTANTS (from Daraja troubleshooting docs)
// ═══════════════════════════════════════════════════════════════════════════════

describe('C2B_REGISTER_URL_ERROR_CODES (documented by Daraja)', () => {
  it('INTERNAL_SERVER_ERROR is "500.003.1001"', () => {
    expect(C2B_REGISTER_URL_ERROR_CODES.INTERNAL_SERVER_ERROR).toBe('500.003.1001')
  })

  it('INVALID_ACCESS_TOKEN is "400.003.01"', () => {
    expect(C2B_REGISTER_URL_ERROR_CODES.INVALID_ACCESS_TOKEN).toBe('400.003.01')
  })

  it('BAD_REQUEST is "400.003.02"', () => {
    expect(C2B_REGISTER_URL_ERROR_CODES.BAD_REQUEST).toBe('400.003.02')
  })

  it('QUOTA_VIOLATION is "500.003.03"', () => {
    expect(C2B_REGISTER_URL_ERROR_CODES.QUOTA_VIOLATION).toBe('500.003.03')
  })

  it('SPIKE_ARREST is "500.003.02"', () => {
    expect(C2B_REGISTER_URL_ERROR_CODES.SPIKE_ARREST).toBe('500.003.02')
  })

  it('RESOURCE_NOT_FOUND is "404.003.01"', () => {
    expect(C2B_REGISTER_URL_ERROR_CODES.RESOURCE_NOT_FOUND).toBe('404.003.01')
  })

  it('INVALID_AUTH_HEADER is "404.001.04"', () => {
    expect(C2B_REGISTER_URL_ERROR_CODES.INVALID_AUTH_HEADER).toBe('404.001.04')
  })

  it('INVALID_REQUEST_PAYLOAD is "400.002.05"', () => {
    expect(C2B_REGISTER_URL_ERROR_CODES.INVALID_REQUEST_PAYLOAD).toBe('400.002.05')
  })

  it('contains exactly 8 documented error codes', () => {
    expect(Object.keys(C2B_REGISTER_URL_ERROR_CODES)).toHaveLength(8)
  })

  it('INTERNAL_SERVER_ERROR code "500.003.1001" covers multiple error conditions per docs', () => {
    // Per docs: this single code covers Internal Server Error, URLs Already Registered,
    // and Duplicate Notification Info scenarios — distinguished by errorMessage.
    expect(C2B_REGISTER_URL_ERROR_CODES.INTERNAL_SERVER_ERROR).toBe('500.003.1001')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 2. C2B_VALIDATION_RESULT_CODES CONSTANTS (from Daraja validation docs)
// ═══════════════════════════════════════════════════════════════════════════════

describe('C2B_VALIDATION_RESULT_CODES (documented by Daraja)', () => {
  it('ACCEPT is "0"', () => {
    expect(C2B_VALIDATION_RESULT_CODES.ACCEPT).toBe('0')
  })

  it('INVALID_MSISDN is "C2B00011"', () => {
    expect(C2B_VALIDATION_RESULT_CODES.INVALID_MSISDN).toBe('C2B00011')
  })

  it('INVALID_ACCOUNT_NUMBER is "C2B00012"', () => {
    expect(C2B_VALIDATION_RESULT_CODES.INVALID_ACCOUNT_NUMBER).toBe('C2B00012')
  })

  it('INVALID_AMOUNT is "C2B00013"', () => {
    expect(C2B_VALIDATION_RESULT_CODES.INVALID_AMOUNT).toBe('C2B00013')
  })

  it('INVALID_KYC_DETAILS is "C2B00014"', () => {
    expect(C2B_VALIDATION_RESULT_CODES.INVALID_KYC_DETAILS).toBe('C2B00014')
  })

  it('INVALID_SHORTCODE is "C2B00015"', () => {
    expect(C2B_VALIDATION_RESULT_CODES.INVALID_SHORTCODE).toBe('C2B00015')
  })

  it('OTHER_ERROR is "C2B00016"', () => {
    expect(C2B_VALIDATION_RESULT_CODES.OTHER_ERROR).toBe('C2B00016')
  })

  it('contains exactly 7 documented result codes (including ACCEPT)', () => {
    expect(Object.keys(C2B_VALIDATION_RESULT_CODES)).toHaveLength(7)
  })

  it('all rejection codes begin with "C2B" per Daraja naming convention', () => {
    const rejectionCodes = Object.entries(C2B_VALIDATION_RESULT_CODES)
      .filter(([key]) => key !== 'ACCEPT')
      .map(([, value]) => value)
    for (const code of rejectionCodes) {
      expect(code).toMatch(/^C2B\d{5}$/)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 3. REGISTER URL — SUCCESS
// ═══════════════════════════════════════════════════════════════════════════════

describe('registerC2BUrls() — success', () => {
  beforeEach(() => {
    mockHttpRequest.mockResolvedValue({ data: REGISTER_URL_RESPONSE } as never)
  })

  it('returns the Daraja register URL response on success', async () => {
    const result = await registerC2BUrls(SANDBOX_URL, ACCESS_TOKEN, BASE_REGISTER_REQUEST)
    expect(result).toStrictEqual(REGISTER_URL_RESPONSE)
  })

  it('calls the correct sandbox register URL endpoint (v2 default)', async () => {
    await registerC2BUrls(SANDBOX_URL, ACCESS_TOKEN, BASE_REGISTER_REQUEST)
    expect(mockHttpRequest).toHaveBeenCalledWith(
      `${SANDBOX_URL}/mpesa/c2b/v2/registerurl`,
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('calls the correct production register URL endpoint (v2 default)', async () => {
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

  it('uses v2 endpoint when apiVersion is "v2"', async () => {
    await registerC2BUrls(SANDBOX_URL, ACCESS_TOKEN, {
      ...BASE_REGISTER_REQUEST,
      apiVersion: 'v2',
    })
    expect(mockHttpRequest).toHaveBeenCalledWith(
      `${SANDBOX_URL}/mpesa/c2b/v2/registerurl`,
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

// ═══════════════════════════════════════════════════════════════════════════════
// 4. REGISTER URL — REQUEST BODY SHAPE (Daraja spec)
// ═══════════════════════════════════════════════════════════════════════════════

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

  it('sends exactly 4 fields in the request body (all Daraja-documented fields)', async () => {
    await registerC2BUrls(SANDBOX_URL, ACCESS_TOKEN, BASE_REGISTER_REQUEST)
    const body = getBody()
    const expectedFields = ['ShortCode', 'ResponseType', 'ConfirmationURL', 'ValidationURL']
    for (const field of expectedFields) {
      expect(body).toHaveProperty(field)
    }
    expect(Object.keys(body)).toHaveLength(4)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 5. REGISTER URL — RESPONSE FIELDS
// ═══════════════════════════════════════════════════════════════════════════════

describe('registerC2BUrls() — response fields (Daraja spec)', () => {
  beforeEach(() => {
    mockHttpRequest.mockResolvedValue({ data: REGISTER_URL_RESPONSE } as never)
  })

  it('response includes OriginatorCoversationID (Daraja typo preserved)', async () => {
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

  it('response matches exact Daraja documented shape', async () => {
    const res = await registerC2BUrls(SANDBOX_URL, ACCESS_TOKEN, BASE_REGISTER_REQUEST)
    expect(res).toStrictEqual(REGISTER_URL_RESPONSE)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 6. REGISTER URL — shortCode VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════════
// 7. REGISTER URL — responseType VALIDATION (sentence case per docs)
// ═══════════════════════════════════════════════════════════════════════════════

describe('registerC2BUrls() — responseType validation (sentence case per docs)', () => {
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

  it('throws VALIDATION_ERROR for wrong casing "CANCELLED"', async () => {
    await expect(
      registerC2BUrls(SANDBOX_URL, ACCESS_TOKEN, {
        ...BASE_REGISTER_REQUEST,
        responseType: 'CANCELLED' as never,
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

  it('accepts "Completed" (correct sentence case per docs)', async () => {
    mockHttpRequest.mockResolvedValue({ data: REGISTER_URL_RESPONSE } as never)
    await expect(
      registerC2BUrls(SANDBOX_URL, ACCESS_TOKEN, {
        ...BASE_REGISTER_REQUEST,
        responseType: 'Completed',
      }),
    ).resolves.toBeDefined()
  })

  it('accepts "Cancelled" (correct sentence case per docs)', async () => {
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

// ═══════════════════════════════════════════════════════════════════════════════
// 8. REGISTER URL — URL VALIDATION (forbidden keywords per docs)
// ═══════════════════════════════════════════════════════════════════════════════

describe('registerC2BUrls() — URL validation (forbidden keywords per Daraja docs)', () => {
  // Per docs: "Avoid keywords such as M-PESA, M-Pesa, Safaricom, exe, exec, cme, or variants"
  const forbiddenCases: Array<[string, string]> = [
    ['mpesa', 'https://mydomain.com/mpesa/confirm'],
    ['safaricom', 'https://safaricom.mydomain.com/confirm'],
    ['exec', 'https://mydomain.com/exec/confirm'],
    ['exe', 'https://mydomain.com/file.exe/confirm'],
    ['cme', 'https://mydomain.com/cme/confirm'], // documented by Daraja
    ['cmd', 'https://mydomain.com/cmd/confirm'], // documented variant
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

  it('forbidden keyword "cme" is case-insensitive (CME blocked)', async () => {
    await expect(
      registerC2BUrls(SANDBOX_URL, ACCESS_TOKEN, {
        ...BASE_REGISTER_REQUEST,
        confirmationUrl: 'https://mydomain.com/CME/confirm',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('forbidden keyword "SAFARICOM" is case-insensitive', async () => {
    await expect(
      registerC2BUrls(SANDBOX_URL, ACCESS_TOKEN, {
        ...BASE_REGISTER_REQUEST,
        validationUrl: 'https://SAFARICOM.com/validate',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('accepts clean URLs without forbidden keywords', async () => {
    mockHttpRequest.mockResolvedValue({ data: REGISTER_URL_RESPONSE } as never)
    await expect(
      registerC2BUrls(SANDBOX_URL, ACCESS_TOKEN, BASE_REGISTER_REQUEST),
    ).resolves.toBeDefined()
  })

  it('does not call httpRequest when URL contains forbidden keyword', async () => {
    await registerC2BUrls(SANDBOX_URL, ACCESS_TOKEN, {
      ...BASE_REGISTER_REQUEST,
      confirmationUrl: 'https://mydomain.com/cme/confirm',
    }).catch(() => {})
    expect(mockHttpRequest).not.toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 9. REGISTER URL — ERROR PROPAGATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('registerC2BUrls() — error propagation', () => {
  it('propagates a generic Error from httpRequest', async () => {
    mockHttpRequest.mockRejectedValue(new Error('ECONNRESET'))
    await expect(registerC2BUrls(SANDBOX_URL, ACCESS_TOKEN, BASE_REGISTER_REQUEST)).rejects.toThrow(
      'ECONNRESET',
    )
  })

  it('propagates a network timeout Error from httpRequest', async () => {
    mockHttpRequest.mockRejectedValue(new Error('ETIMEDOUT'))
    await expect(registerC2BUrls(SANDBOX_URL, ACCESS_TOKEN, BASE_REGISTER_REQUEST)).rejects.toThrow(
      'ETIMEDOUT',
    )
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 10. SIMULATE C2B — SUCCESS
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

// ═══════════════════════════════════════════════════════════════════════════════
// 11. SIMULATE C2B — SANDBOX GUARD (production not supported per docs)
// ═══════════════════════════════════════════════════════════════════════════════

describe('simulateC2B() — sandbox guard (production not supported per docs)', () => {
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

// ═══════════════════════════════════════════════════════════════════════════════
// 12. SIMULATE C2B — REQUEST BODY: CustomerPayBillOnline (Daraja spec)
// ═══════════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════════
// 13. SIMULATE C2B — REQUEST BODY: CustomerBuyGoodsOnline (Daraja spec)
// ═══════════════════════════════════════════════════════════════════════════════

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

  it('does NOT include BillRefNumber for CustomerBuyGoodsOnline (key must be absent)', async () => {
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

// ═══════════════════════════════════════════════════════════════════════════════
// 14. SIMULATE C2B — AMOUNT VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

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

  it('accepts amount 1 (minimum per docs)', async () => {
    mockHttpRequest.mockResolvedValue({ data: SIMULATE_RESPONSE } as never)
    await expect(
      simulateC2B(SANDBOX_URL, ACCESS_TOKEN, { ...BASE_SIMULATE_PAYBILL, amount: 1 }),
    ).resolves.toBeDefined()
  })

  it('does not call httpRequest when amount validation fails', async () => {
    await simulateC2B(SANDBOX_URL, ACCESS_TOKEN, {
      ...BASE_SIMULATE_PAYBILL,
      amount: 0,
    }).catch(() => {})
    expect(mockHttpRequest).not.toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 15. SIMULATE C2B — INPUT VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

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

  it('throws VALIDATION_ERROR when msisdn is empty string', async () => {
    await expect(
      simulateC2B(SANDBOX_URL, ACCESS_TOKEN, {
        ...BASE_SIMULATE_PAYBILL,
        msisdn: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 16. SIMULATE C2B — RESPONSE FIELDS
// ═══════════════════════════════════════════════════════════════════════════════

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
// 17. VALIDATION RESPONSE HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

describe('acceptC2BValidation() — response shape (Daraja spec)', () => {
  it('returns ResultCode "0" (accept per docs)', () => {
    const res = acceptC2BValidation()
    expect(res.ResultCode).toBe('0')
  })

  it('returns ResultDesc "Accepted" (per docs)', () => {
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

  it('matches exact documented accept shape (no ThirdPartyTransID)', () => {
    expect(acceptC2BValidation()).toStrictEqual({
      ResultCode: '0',
      ResultDesc: 'Accepted',
    })
  })

  it('matches exact documented accept shape with ThirdPartyTransID', () => {
    expect(acceptC2BValidation('TXNREF-001')).toStrictEqual({
      ResultCode: '0',
      ResultDesc: 'Accepted',
      ThirdPartyTransID: 'TXNREF-001',
    })
  })
})

describe('rejectC2BValidation() — response shape (Daraja spec)', () => {
  it('defaults to ResultCode "C2B00016" (Other Error per docs)', () => {
    const res = rejectC2BValidation()
    expect(res.ResultCode).toBe('C2B00016')
  })

  it('returns ResultDesc "Rejected" per docs', () => {
    const res = rejectC2BValidation()
    expect(res.ResultDesc).toBe('Rejected')
  })

  it('accepts C2B00011 (Invalid MSISDN per docs)', () => {
    const res = rejectC2BValidation('C2B00011')
    expect(res.ResultCode).toBe('C2B00011')
    expect(res.ResultDesc).toBe('Rejected')
  })

  it('accepts C2B00012 (Invalid Account Number per docs)', () => {
    expect(rejectC2BValidation('C2B00012').ResultCode).toBe('C2B00012')
  })

  it('accepts C2B00013 (Invalid Amount per docs)', () => {
    expect(rejectC2BValidation('C2B00013').ResultCode).toBe('C2B00013')
  })

  it('accepts C2B00014 (Invalid KYC Details per docs)', () => {
    expect(rejectC2BValidation('C2B00014').ResultCode).toBe('C2B00014')
  })

  it('accepts C2B00015 (Invalid Shortcode per docs)', () => {
    expect(rejectC2BValidation('C2B00015').ResultCode).toBe('C2B00015')
  })

  it('accepts C2B00016 (Other Error per docs)', () => {
    expect(rejectC2BValidation('C2B00016').ResultCode).toBe('C2B00016')
  })

  it('matches exact documented reject shape', () => {
    expect(rejectC2BValidation('C2B00011')).toStrictEqual({
      ResultCode: 'C2B00011',
      ResultDesc: 'Rejected',
    })
  })

  it('can be built using C2B_VALIDATION_RESULT_CODES constant', () => {
    const res = rejectC2BValidation(C2B_VALIDATION_RESULT_CODES.INVALID_MSISDN)
    expect(res.ResultCode).toBe('C2B00011')
  })

  it('all rejection code constants produce valid rejectC2BValidation responses', () => {
    const rejectionCodes = [
      C2B_VALIDATION_RESULT_CODES.INVALID_MSISDN,
      C2B_VALIDATION_RESULT_CODES.INVALID_ACCOUNT_NUMBER,
      C2B_VALIDATION_RESULT_CODES.INVALID_AMOUNT,
      C2B_VALIDATION_RESULT_CODES.INVALID_KYC_DETAILS,
      C2B_VALIDATION_RESULT_CODES.INVALID_SHORTCODE,
      C2B_VALIDATION_RESULT_CODES.OTHER_ERROR,
    ] as const

    for (const code of rejectionCodes) {
      const res = rejectC2BValidation(code)
      expect(res.ResultCode).toBe(code)
      expect(res.ResultDesc).toBe('Rejected')
    }
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
// 18. isC2BPayload() TYPE GUARD
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

  it('returns false for non-object values', () => {
    expect(isC2BPayload('string')).toBe(false)
    expect(isC2BPayload(42)).toBe(false)
    expect(isC2BPayload([])).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 19. PAYLOAD EXTRACTORS
// ═══════════════════════════════════════════════════════════════════════════════

describe('getC2BAmount()', () => {
  it('parses TransAmount string to a number for Paybill payload', () => {
    expect(getC2BAmount(PAYBILL_VALIDATION_PAYLOAD)).toBe(5)
    expect(typeof getC2BAmount(PAYBILL_VALIDATION_PAYLOAD)).toBe('number')
  })

  it('parses TransAmount string to a number for BuyGoods payload', () => {
    expect(getC2BAmount(BUYGOODS_CONFIRMATION_PAYLOAD)).toBe(50)
  })

  it('handles whole-number TransAmount strings (e.g. "10" per docs sample)', () => {
    const payload: C2BValidationPayload = { ...PAYBILL_VALIDATION_PAYLOAD, TransAmount: '10' }
    expect(getC2BAmount(payload)).toBe(10)
  })
})

describe('getC2BTransactionId()', () => {
  it('returns TransID from Paybill validation payload', () => {
    expect(getC2BTransactionId(PAYBILL_VALIDATION_PAYLOAD)).toBe('RKL51ZDR4F')
  })

  it('returns TransID from BuyGoods confirmation payload', () => {
    expect(getC2BTransactionId(BUYGOODS_CONFIRMATION_PAYLOAD)).toBe('RKL51ZDR5G')
  })

  it('returns TransID matching the docs sample format (e.g. "RKTQDM7W6S")', () => {
    const payload: C2BValidationPayload = {
      ...PAYBILL_VALIDATION_PAYLOAD,
      TransID: 'RKTQDM7W6S',
    }
    expect(getC2BTransactionId(payload)).toBe('RKTQDM7W6S')
  })
})

describe('getC2BAccountRef()', () => {
  it('returns BillRefNumber from Paybill payload', () => {
    expect(getC2BAccountRef(PAYBILL_VALIDATION_PAYLOAD)).toBe('Sample Transaction')
  })

  it('returns empty string from Buy Goods payload (no BillRefNumber)', () => {
    expect(getC2BAccountRef(BUYGOODS_CONFIRMATION_PAYLOAD)).toBe('')
  })

  it('returns BillRefNumber matching the docs sample (e.g. "invoice008")', () => {
    const payload: C2BValidationPayload = {
      ...PAYBILL_VALIDATION_PAYLOAD,
      BillRefNumber: 'invoice008',
    }
    expect(getC2BAccountRef(payload)).toBe('invoice008')
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

  it('returns empty string when all name fields are empty (per docs: "can be empty")', () => {
    const payload: C2BValidationPayload = {
      ...PAYBILL_VALIDATION_PAYLOAD,
      FirstName: '',
      MiddleName: '',
      LastName: '',
    }
    expect(getC2BCustomerName(payload)).toBe('')
  })

  it('handles docs sample names (John, empty, Doe)', () => {
    const payload: C2BValidationPayload = {
      ...PAYBILL_VALIDATION_PAYLOAD,
      FirstName: 'John',
      MiddleName: '',
      LastName: 'Doe',
    }
    expect(getC2BCustomerName(payload)).toBe('John Doe')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 20. TRANSACTION TYPE HELPERS
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

  it('is case-sensitive — "pay bill" (lowercase) returns false', () => {
    const payload: C2BValidationPayload = {
      ...PAYBILL_VALIDATION_PAYLOAD,
      TransactionType: 'pay bill',
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

  it('is case-sensitive — "buy goods" (lowercase) returns false', () => {
    const payload: C2BConfirmationPayload = {
      ...BUYGOODS_CONFIRMATION_PAYLOAD,
      TransactionType: 'buy goods',
    }
    expect(isBuyGoodsPayment(payload)).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 21. CALLBACK PAYLOAD STRUCTURE (Daraja spec)
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

  it('TransactionType for Paybill callback is "Pay Bill" (per docs)', () => {
    expect(PAYBILL_VALIDATION_PAYLOAD.TransactionType).toBe('Pay Bill')
  })

  it('TransactionType for BuyGoods callback is "Buy Goods" (per docs)', () => {
    expect(BUYGOODS_CONFIRMATION_PAYLOAD.TransactionType).toBe('Buy Goods')
  })

  it('OrgAccountBalance is blank in validation request (per docs)', () => {
    expect(PAYBILL_VALIDATION_PAYLOAD.OrgAccountBalance).toBe('')
  })

  it('OrgAccountBalance is non-empty in confirmation (new balance after payment per docs)', () => {
    expect(BUYGOODS_CONFIRMATION_PAYLOAD.OrgAccountBalance).not.toBe('')
    expect(BUYGOODS_CONFIRMATION_PAYLOAD.OrgAccountBalance).toBe('25.00')
  })

  it('MSISDN is masked (format per docs: "25470****149")', () => {
    expect(PAYBILL_VALIDATION_PAYLOAD.MSISDN).toContain('*')
  })

  it('TransTime follows YYYYMMDDHHmmss format (14 digits) per docs', () => {
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

// ═══════════════════════════════════════════════════════════════════════════════
// 22. INTEGRATION — CONSTANTS + HELPERS INTEROP
// ═══════════════════════════════════════════════════════════════════════════════

describe('Constants and helpers work together (integration)', () => {
  it('C2B_VALIDATION_RESULT_CODES.ACCEPT matches acceptC2BValidation ResultCode', () => {
    expect(acceptC2BValidation().ResultCode).toBe(C2B_VALIDATION_RESULT_CODES.ACCEPT)
  })

  it('C2B_VALIDATION_RESULT_CODES.OTHER_ERROR matches rejectC2BValidation default', () => {
    expect(rejectC2BValidation().ResultCode).toBe(C2B_VALIDATION_RESULT_CODES.OTHER_ERROR)
  })

  it('can dispatch validation response using constants', () => {
    function validatePayment(
      payload: C2BValidationPayload,
    ): typeof acceptC2BValidation | typeof rejectC2BValidation {
      return isC2BPayload(payload) ? acceptC2BValidation : rejectC2BValidation
    }
    // This validates that the function compiles and returns the right shape
    const result = acceptC2BValidation()
    expect(result.ResultCode).toBe('0')
  })

  it('C2B_REGISTER_URL_ERROR_CODES are all non-empty strings', () => {
    for (const code of Object.values(C2B_REGISTER_URL_ERROR_CODES)) {
      expect(typeof code).toBe('string')
      expect(code.length).toBeGreaterThan(0)
    }
  })

  it('C2B_VALIDATION_RESULT_CODES are all non-empty strings', () => {
    for (const code of Object.values(C2B_VALIDATION_RESULT_CODES)) {
      expect(typeof code).toBe('string')
      expect(code.length).toBeGreaterThan(0)
    }
  })
})

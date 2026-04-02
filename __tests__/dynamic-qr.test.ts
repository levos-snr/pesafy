/**
 * __tests__/dynamic-qr.test.ts
 *
 * Comprehensive test suite for the Dynamic QR module.
 * Covers: types, validators, generate function, error mapping, and edge cases.
 *
 * Run: pnpm test
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

// ── Module under test ─────────────────────────────────────────────────────────
// Validators are pure — no mocking needed.
import {
  DEFAULT_QR_SIZE,
  MAX_QR_SIZE,
  MIN_AMOUNT,
  QR_TRANSACTION_CODES,
  validateAmount,
  validateCpi,
  validateDynamicQRRequest,
  validateMerchantName,
  validateRefNo,
  validateSize,
  validateTrxCode,
} from '../src/mpesa/dynamic-qr/validators'

// generateDynamicQR depends on httpRequest — mock the HTTP layer.
import { generateDynamicQR } from '../src/mpesa/dynamic-qr/generate'
import { PesafyError } from '../src/utils/errors'
import type { DynamicQRRequest, DynamicQRResponse } from '../src/mpesa/dynamic-qr/types'

// ── Mock ──────────────────────────────────────────────────────────────────────

vi.mock('../src/utils/http', () => ({
  httpRequest: vi.fn(),
}))

import { httpRequest } from '../src/utils/http'
const mockHttpRequest = vi.mocked(httpRequest)

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SANDBOX_URL = 'https://sandbox.safaricom.co.ke'
const VALID_TOKEN = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.valid-token'

const VALID_REQUEST: DynamicQRRequest = {
  merchantName: 'Test Supermarket',
  refNo: 'INV-2024-001',
  amount: 500,
  trxCode: 'BG',
  cpi: '373132',
  size: 300,
}

const VALID_RESPONSE: DynamicQRResponse = {
  ResponseCode: 'AG_20191219_000043fdf61864fe9ff5',
  RequestID: '16738-27456357-1',
  ResponseDescription: 'QR Code Successfully Generated.',
  QRCode: 'iVBORw0KGgoAAAANSUhEUgAAASwAAAEsCAYAAAB5fY51AAAA', // fake but valid base64
}

// ── Constants ─────────────────────────────────────────────────────────────────

describe('Module constants', () => {
  it('QR_TRANSACTION_CODES contains exactly the 5 Daraja-documented codes', () => {
    expect(QR_TRANSACTION_CODES).toStrictEqual(['BG', 'WA', 'PB', 'SM', 'SB'])
    expect(QR_TRANSACTION_CODES).toHaveLength(5)
  })

  it('DEFAULT_QR_SIZE is 300', () => {
    expect(DEFAULT_QR_SIZE).toBe(300)
  })

  it('MIN_AMOUNT is 1', () => {
    expect(MIN_AMOUNT).toBe(1)
  })

  it('MAX_QR_SIZE is 1000', () => {
    expect(MAX_QR_SIZE).toBe(1_000)
  })
})

// ── Individual field validators ───────────────────────────────────────────────

describe('validateMerchantName()', () => {
  it('returns null for a valid name', () => {
    expect(validateMerchantName('Test Supermarket')).toBeNull()
  })

  it('returns null for a name with surrounding whitespace (trimmed)', () => {
    expect(validateMerchantName('  Shop  ')).toBeNull()
  })

  it('returns an error for an empty string', () => {
    expect(validateMerchantName('')).toBeTypeOf('string')
  })

  it('returns an error for a whitespace-only string', () => {
    expect(validateMerchantName('   ')).toBeTypeOf('string')
  })

  it('returns an error for undefined', () => {
    expect(validateMerchantName(undefined)).toBeTypeOf('string')
  })

  it('returns an error for null', () => {
    expect(validateMerchantName(null)).toBeTypeOf('string')
  })

  it('returns an error for a number', () => {
    expect(validateMerchantName(42)).toBeTypeOf('string')
  })
})

describe('validateRefNo()', () => {
  it('returns null for a valid reference', () => {
    expect(validateRefNo('INV-001')).toBeNull()
  })

  it('returns an error for an empty string', () => {
    expect(validateRefNo('')).toBeTypeOf('string')
  })

  it('returns an error for whitespace only', () => {
    expect(validateRefNo('  ')).toBeTypeOf('string')
  })

  it('returns an error for undefined', () => {
    expect(validateRefNo(undefined)).toBeTypeOf('string')
  })
})

describe('validateAmount()', () => {
  it('returns null for amount = 1 (minimum)', () => {
    expect(validateAmount(1)).toBeNull()
  })

  it('returns null for a large valid amount', () => {
    expect(validateAmount(150_000)).toBeNull()
  })

  it('returns null for a decimal amount that rounds to >= 1 (e.g. 1.4 → 1)', () => {
    expect(validateAmount(1.4)).toBeNull()
  })

  it('returns an error for amount = 0', () => {
    expect(validateAmount(0)).toBeTypeOf('string')
  })

  it('returns an error for a negative amount', () => {
    expect(validateAmount(-100)).toBeTypeOf('string')
  })

  it('returns an error for 0.4 (rounds to 0)', () => {
    expect(validateAmount(0.4)).toBeTypeOf('string')
  })

  it('returns an error for NaN', () => {
    expect(validateAmount(NaN)).toBeTypeOf('string')
  })

  it('returns an error for Infinity', () => {
    expect(validateAmount(Infinity)).toBeTypeOf('string')
  })

  it('returns an error for a string', () => {
    expect(validateAmount('500')).toBeTypeOf('string')
  })

  it('returns an error for undefined', () => {
    expect(validateAmount(undefined)).toBeTypeOf('string')
  })
})

describe('validateTrxCode()', () => {
  it.each(['BG', 'WA', 'PB', 'SM', 'SB'] as const)('returns null for valid code "%s"', (code) => {
    expect(validateTrxCode(code)).toBeNull()
  })

  it('returns an error for an unknown code', () => {
    expect(validateTrxCode('XX')).toBeTypeOf('string')
  })

  it('returns an error for a lowercase valid code', () => {
    expect(validateTrxCode('bg')).toBeTypeOf('string')
  })

  it('returns an error for an empty string', () => {
    expect(validateTrxCode('')).toBeTypeOf('string')
  })

  it('returns an error for undefined', () => {
    expect(validateTrxCode(undefined)).toBeTypeOf('string')
  })

  it('returns an error for null', () => {
    expect(validateTrxCode(null)).toBeTypeOf('string')
  })

  it('returns an error for a number', () => {
    expect(validateTrxCode(1)).toBeTypeOf('string')
  })
})

describe('validateCpi()', () => {
  it('returns null for a valid till number', () => {
    expect(validateCpi('373132')).toBeNull()
  })

  it('returns null for a valid MSISDN', () => {
    expect(validateCpi('254712345678')).toBeNull()
  })

  it('returns an error for an empty string', () => {
    expect(validateCpi('')).toBeTypeOf('string')
  })

  it('returns an error for whitespace only', () => {
    expect(validateCpi('  ')).toBeTypeOf('string')
  })

  it('returns an error for undefined', () => {
    expect(validateCpi(undefined)).toBeTypeOf('string')
  })
})

describe('validateSize()', () => {
  it('returns null when size is omitted (undefined)', () => {
    expect(validateSize(undefined)).toBeNull()
  })

  it('returns null when size is null', () => {
    expect(validateSize(null)).toBeNull()
  })

  it('returns null for the minimum valid size (1)', () => {
    expect(validateSize(1)).toBeNull()
  })

  it('returns null for the maximum valid size (1000)', () => {
    expect(validateSize(1000)).toBeNull()
  })

  it('returns null for the default size (300)', () => {
    expect(validateSize(300)).toBeNull()
  })

  it('returns an error for size = 0', () => {
    expect(validateSize(0)).toBeTypeOf('string')
  })

  it('returns an error for a negative size', () => {
    expect(validateSize(-1)).toBeTypeOf('string')
  })

  it('returns an error for size > 1000', () => {
    expect(validateSize(1001)).toBeTypeOf('string')
  })

  it('returns an error for a non-integer size', () => {
    expect(validateSize(150.5)).toBeTypeOf('string')
  })

  it('returns an error for NaN', () => {
    expect(validateSize(NaN)).toBeTypeOf('string')
  })

  it('returns an error for a string', () => {
    expect(validateSize('300')).toBeTypeOf('string')
  })
})

// ── Full request validator ────────────────────────────────────────────────────

describe('validateDynamicQRRequest()', () => {
  it('returns { valid: true } for a complete valid payload', () => {
    const result = validateDynamicQRRequest(VALID_REQUEST)
    expect(result.valid).toBe(true)
  })

  it('returns { valid: true } when size is omitted (optional field)', () => {
    const { size: _size, ...withoutSize } = VALID_REQUEST
    const result = validateDynamicQRRequest(withoutSize)
    expect(result.valid).toBe(true)
  })

  it('returns { valid: false } with an error for merchantName when omitted', () => {
    const result = validateDynamicQRRequest({ ...VALID_REQUEST, merchantName: '' })
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.errors).toHaveProperty('merchantName')
    }
  })

  it('returns { valid: false } with an error for refNo when omitted', () => {
    const result = validateDynamicQRRequest({ ...VALID_REQUEST, refNo: '' })
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.errors).toHaveProperty('refNo')
    }
  })

  it('returns { valid: false } with an error for amount = 0', () => {
    const result = validateDynamicQRRequest({ ...VALID_REQUEST, amount: 0 })
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.errors).toHaveProperty('amount')
    }
  })

  it('returns { valid: false } with an error for invalid trxCode', () => {
    const result = validateDynamicQRRequest({ ...VALID_REQUEST, trxCode: 'ZZ' as never })
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.errors).toHaveProperty('trxCode')
    }
  })

  it('returns { valid: false } with an error for missing cpi', () => {
    const result = validateDynamicQRRequest({ ...VALID_REQUEST, cpi: '' })
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.errors).toHaveProperty('cpi')
    }
  })

  it('returns { valid: false } with an error for size > MAX_QR_SIZE', () => {
    const result = validateDynamicQRRequest({ ...VALID_REQUEST, size: 9999 })
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.errors).toHaveProperty('size')
    }
  })

  it('collects ALL field errors at once (no fail-fast)', () => {
    const result = validateDynamicQRRequest({
      merchantName: '',
      refNo: '',
      amount: 0,
      trxCode: 'INVALID',
      cpi: '',
      size: -1,
    })
    expect(result.valid).toBe(false)
    if (!result.valid) {
      const errorKeys = Object.keys(result.errors)
      expect(errorKeys).toContain('merchantName')
      expect(errorKeys).toContain('refNo')
      expect(errorKeys).toContain('amount')
      expect(errorKeys).toContain('trxCode')
      expect(errorKeys).toContain('cpi')
      expect(errorKeys).toContain('size')
    }
  })

  it('handles a completely empty object gracefully', () => {
    const result = validateDynamicQRRequest({})
    expect(result.valid).toBe(false)
  })

  it('handles null input gracefully', () => {
    const result = validateDynamicQRRequest(null)
    expect(result.valid).toBe(false)
  })

  it('handles undefined input gracefully', () => {
    const result = validateDynamicQRRequest(undefined)
    expect(result.valid).toBe(false)
  })
})

// ── generateDynamicQR() — happy path ─────────────────────────────────────────

describe('generateDynamicQR() — success', () => {
  beforeEach(() => {
    mockHttpRequest.mockResolvedValue({ data: VALID_RESPONSE } as never)
  })

  it('returns the Daraja response on success', async () => {
    const result = await generateDynamicQR(SANDBOX_URL, VALID_TOKEN, VALID_REQUEST)
    expect(result).toStrictEqual(VALID_RESPONSE)
  })

  it('calls the correct Daraja endpoint URL', async () => {
    await generateDynamicQR(SANDBOX_URL, VALID_TOKEN, VALID_REQUEST)
    expect(mockHttpRequest).toHaveBeenCalledWith(
      `${SANDBOX_URL}/mpesa/qrcode/v1/generate`,
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('sends the Authorization header with Bearer token', async () => {
    await generateDynamicQR(SANDBOX_URL, VALID_TOKEN, VALID_REQUEST)
    expect(mockHttpRequest).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${VALID_TOKEN}`,
        }),
      }),
    )
  })

  it('converts camelCase request fields to Daraja PascalCase in the body', async () => {
    await generateDynamicQR(SANDBOX_URL, VALID_TOKEN, VALID_REQUEST)
    expect(mockHttpRequest).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: {
          MerchantName: 'Test Supermarket',
          RefNo: 'INV-2024-001',
          Amount: 500,
          TrxCode: 'BG',
          CPI: '373132',
          Size: '300',
        },
      }),
    )
  })

  it('sends Size as a string (Daraja requirement)', async () => {
    await generateDynamicQR(SANDBOX_URL, VALID_TOKEN, VALID_REQUEST)
    const call = mockHttpRequest.mock.calls[0]
    const body = (call?.[1] as { body: Record<string, unknown> }).body
    expect(typeof body['Size']).toBe('string')
  })

  it('uses DEFAULT_QR_SIZE (300) when size is not provided', async () => {
    const { size: _size, ...withoutSize } = VALID_REQUEST
    await generateDynamicQR(SANDBOX_URL, VALID_TOKEN, withoutSize)
    const call = mockHttpRequest.mock.calls[0]
    const body = (call?.[1] as { body: Record<string, unknown> }).body
    expect(body['Size']).toBe('300')
  })

  it('rounds fractional amounts before sending (e.g. 500.7 → 501)', async () => {
    await generateDynamicQR(SANDBOX_URL, VALID_TOKEN, { ...VALID_REQUEST, amount: 500.7 })
    const call = mockHttpRequest.mock.calls[0]
    const body = (call?.[1] as { body: Record<string, unknown> }).body
    expect(body['Amount']).toBe(501)
  })

  it('trims whitespace from merchantName before sending', async () => {
    await generateDynamicQR(SANDBOX_URL, VALID_TOKEN, {
      ...VALID_REQUEST,
      merchantName: '  Test Supermarket  ',
    })
    const call = mockHttpRequest.mock.calls[0]
    const body = (call?.[1] as { body: Record<string, unknown> }).body
    expect(body['MerchantName']).toBe('Test Supermarket')
  })

  it('trims whitespace from refNo before sending', async () => {
    await generateDynamicQR(SANDBOX_URL, VALID_TOKEN, {
      ...VALID_REQUEST,
      refNo: '  INV-001  ',
    })
    const call = mockHttpRequest.mock.calls[0]
    const body = (call?.[1] as { body: Record<string, unknown> }).body
    expect(body['RefNo']).toBe('INV-001')
  })

  it.each(['BG', 'WA', 'PB', 'SM', 'SB'] as const)(
    'sends trxCode "%s" unchanged to Daraja',
    async (code) => {
      await generateDynamicQR(SANDBOX_URL, VALID_TOKEN, { ...VALID_REQUEST, trxCode: code })
      const call = mockHttpRequest.mock.calls[0]
      const body = (call?.[1] as { body: Record<string, unknown> }).body
      expect(body['TrxCode']).toBe(code)
    },
  )

  it('works with production base URL', async () => {
    await generateDynamicQR('https://api.safaricom.co.ke', VALID_TOKEN, VALID_REQUEST)
    expect(mockHttpRequest).toHaveBeenCalledWith(
      'https://api.safaricom.co.ke/mpesa/qrcode/v1/generate',
      expect.any(Object),
    )
  })
})

// ── generateDynamicQR() — validation failures ─────────────────────────────────

describe('generateDynamicQR() — validation errors (pre-flight)', () => {
  it('throws PesafyError VALIDATION_ERROR for an empty merchantName', async () => {
    await expect(
      generateDynamicQR(SANDBOX_URL, VALID_TOKEN, { ...VALID_REQUEST, merchantName: '' }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws PesafyError VALIDATION_ERROR for an empty refNo', async () => {
    await expect(
      generateDynamicQR(SANDBOX_URL, VALID_TOKEN, { ...VALID_REQUEST, refNo: '' }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws PesafyError VALIDATION_ERROR for amount = 0', async () => {
    await expect(
      generateDynamicQR(SANDBOX_URL, VALID_TOKEN, { ...VALID_REQUEST, amount: 0 }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws PesafyError VALIDATION_ERROR for negative amount', async () => {
    await expect(
      generateDynamicQR(SANDBOX_URL, VALID_TOKEN, { ...VALID_REQUEST, amount: -50 }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws PesafyError VALIDATION_ERROR for an invalid trxCode', async () => {
    await expect(
      generateDynamicQR(SANDBOX_URL, VALID_TOKEN, { ...VALID_REQUEST, trxCode: 'XX' as never }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws PesafyError VALIDATION_ERROR for an empty cpi', async () => {
    await expect(
      generateDynamicQR(SANDBOX_URL, VALID_TOKEN, { ...VALID_REQUEST, cpi: '' }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws PesafyError VALIDATION_ERROR for size > MAX_QR_SIZE', async () => {
    await expect(
      generateDynamicQR(SANDBOX_URL, VALID_TOKEN, { ...VALID_REQUEST, size: 9999 }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws PesafyError VALIDATION_ERROR for size = 0', async () => {
    await expect(
      generateDynamicQR(SANDBOX_URL, VALID_TOKEN, { ...VALID_REQUEST, size: 0 }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('does NOT call httpRequest when validation fails', async () => {
    await generateDynamicQR(SANDBOX_URL, VALID_TOKEN, { ...VALID_REQUEST, merchantName: '' }).catch(
      () => {},
    )
    expect(mockHttpRequest).not.toHaveBeenCalled()
  })

  it('error message lists all failing fields', async () => {
    const err = await generateDynamicQR(SANDBOX_URL, VALID_TOKEN, {
      ...VALID_REQUEST,
      merchantName: '',
      amount: 0,
    }).catch((e: unknown) => e as PesafyError)

    expect(err.message).toContain('merchantName')
    expect(err.message).toContain('amount')
  })
})

// ── generateDynamicQR() — empty/missing token ─────────────────────────────────

describe('generateDynamicQR() — access token guard', () => {
  it('throws AUTH_FAILED for an empty token string', async () => {
    await expect(generateDynamicQR(SANDBOX_URL, '', VALID_REQUEST)).rejects.toMatchObject({
      code: 'AUTH_FAILED',
    })
  })

  it('throws AUTH_FAILED for a whitespace-only token', async () => {
    await expect(generateDynamicQR(SANDBOX_URL, '   ', VALID_REQUEST)).rejects.toMatchObject({
      code: 'AUTH_FAILED',
    })
  })

  it('does NOT call httpRequest when the token is empty', async () => {
    await generateDynamicQR(SANDBOX_URL, '', VALID_REQUEST).catch(() => {})
    expect(mockHttpRequest).not.toHaveBeenCalled()
  })
})

// ── generateDynamicQR() — Daraja API error responses ─────────────────────────

describe('generateDynamicQR() — Daraja error mapping', () => {
  it('maps 404.001.04 → AUTH_FAILED with statusCode 404', async () => {
    mockHttpRequest.mockResolvedValue({
      data: { errorCode: '404.001.04', errorMessage: 'Invalid Authentication Header' },
    } as never)

    const err = await generateDynamicQR(SANDBOX_URL, VALID_TOKEN, VALID_REQUEST).catch(
      (e: unknown) => e as PesafyError,
    )
    expect(err).toBeInstanceOf(PesafyError)
    expect(err.code).toBe('AUTH_FAILED')
    expect(err.statusCode).toBe(404)
    expect(err.message).toContain('authentication header')
  })

  it('maps 400.003.01 → AUTH_FAILED with statusCode 401', async () => {
    mockHttpRequest.mockResolvedValue({
      data: { errorCode: '400.003.01', errorMessage: 'Invalid Access Token' },
    } as never)

    const err = await generateDynamicQR(SANDBOX_URL, VALID_TOKEN, VALID_REQUEST).catch(
      (e: unknown) => e as PesafyError,
    )
    expect(err).toBeInstanceOf(PesafyError)
    expect(err.code).toBe('AUTH_FAILED')
    expect(err.statusCode).toBe(401)
    expect(err.message).toContain('clearTokenCache')
  })

  it('maps 400.002.05 → VALIDATION_ERROR with statusCode 400', async () => {
    mockHttpRequest.mockResolvedValue({
      data: { errorCode: '400.002.05', errorMessage: 'Invalid Request Payload' },
    } as never)

    const err = await generateDynamicQR(SANDBOX_URL, VALID_TOKEN, VALID_REQUEST).catch(
      (e: unknown) => e as PesafyError,
    )
    expect(err).toBeInstanceOf(PesafyError)
    expect(err.code).toBe('VALIDATION_ERROR')
    expect(err.statusCode).toBe(400)
  })

  it('maps an unknown Daraja error code → REQUEST_FAILED', async () => {
    mockHttpRequest.mockResolvedValue({
      data: { errorCode: '999.999.99', errorMessage: 'Unknown server error' },
    } as never)

    const err = await generateDynamicQR(SANDBOX_URL, VALID_TOKEN, VALID_REQUEST).catch(
      (e: unknown) => e as PesafyError,
    )
    expect(err).toBeInstanceOf(PesafyError)
    expect(err.code).toBe('REQUEST_FAILED')
  })

  it('includes the Daraja error message in the thrown error', async () => {
    mockHttpRequest.mockResolvedValue({
      data: {
        errorCode: '400.003.01',
        errorMessage: 'The token you provided is expired or invalid.',
      },
    } as never)

    const err = await generateDynamicQR(SANDBOX_URL, VALID_TOKEN, VALID_REQUEST).catch(
      (e: unknown) => e as PesafyError,
    )
    expect(err.message).toContain('The token you provided is expired or invalid.')
  })
})

// ── generateDynamicQR() — malformed success responses ────────────────────────

describe('generateDynamicQR() — malformed / unexpected response shapes', () => {
  it('throws REQUEST_FAILED when QRCode field is missing', async () => {
    mockHttpRequest.mockResolvedValue({
      data: {
        ResponseCode: 'AG_12345',
        RequestID: '1',
        ResponseDescription: 'OK',
        // QRCode intentionally omitted
      },
    } as never)

    const err = await generateDynamicQR(SANDBOX_URL, VALID_TOKEN, VALID_REQUEST).catch(
      (e: unknown) => e as PesafyError,
    )
    expect(err).toBeInstanceOf(PesafyError)
    expect(err.code).toBe('REQUEST_FAILED')
  })

  it('throws REQUEST_FAILED when QRCode is an empty string', async () => {
    mockHttpRequest.mockResolvedValue({
      data: { ...VALID_RESPONSE, QRCode: '' },
    } as never)

    const err = await generateDynamicQR(SANDBOX_URL, VALID_TOKEN, VALID_REQUEST).catch(
      (e: unknown) => e as PesafyError,
    )
    expect(err).toBeInstanceOf(PesafyError)
    expect(err.code).toBe('REQUEST_FAILED')
  })

  it('throws REQUEST_FAILED for an entirely empty response body', async () => {
    mockHttpRequest.mockResolvedValue({ data: {} } as never)

    const err = await generateDynamicQR(SANDBOX_URL, VALID_TOKEN, VALID_REQUEST).catch(
      (e: unknown) => e as PesafyError,
    )
    expect(err).toBeInstanceOf(PesafyError)
    expect(err.code).toBe('REQUEST_FAILED')
  })

  it('throws REQUEST_FAILED for a null response body', async () => {
    mockHttpRequest.mockResolvedValue({ data: null } as never)

    const err = await generateDynamicQR(SANDBOX_URL, VALID_TOKEN, VALID_REQUEST).catch(
      (e: unknown) => e as PesafyError,
    )
    expect(err).toBeInstanceOf(PesafyError)
    expect(err.code).toBe('REQUEST_FAILED')
  })

  it('includes partial raw response in the REQUEST_FAILED message for debugging', async () => {
    mockHttpRequest.mockResolvedValue({ data: { weird: 'body' } } as never)

    const err = await generateDynamicQR(SANDBOX_URL, VALID_TOKEN, VALID_REQUEST).catch(
      (e: unknown) => e as PesafyError,
    )
    expect(err.message).toContain('weird')
  })
})

// ── generateDynamicQR() — network / transport failures ───────────────────────

describe('generateDynamicQR() — network errors', () => {
  it('re-throws a network error from httpRequest without wrapping twice', async () => {
    const networkError = new PesafyError({
      code: 'REQUEST_FAILED',
      message: 'Connection refused',
    })
    mockHttpRequest.mockRejectedValue(networkError)

    await expect(generateDynamicQR(SANDBOX_URL, VALID_TOKEN, VALID_REQUEST)).rejects.toThrow(
      'Connection refused',
    )
  })

  it('propagates generic Error from httpRequest', async () => {
    mockHttpRequest.mockRejectedValue(new Error('ETIMEDOUT'))

    await expect(generateDynamicQR(SANDBOX_URL, VALID_TOKEN, VALID_REQUEST)).rejects.toThrow(
      'ETIMEDOUT',
    )
  })
})

// ── generateDynamicQR() — response field integrity ───────────────────────────

describe('generateDynamicQR() — response field integrity', () => {
  beforeEach(() => {
    mockHttpRequest.mockResolvedValue({ data: VALID_RESPONSE } as never)
  })

  it('response includes ResponseCode', async () => {
    const res = await generateDynamicQR(SANDBOX_URL, VALID_TOKEN, VALID_REQUEST)
    expect(res).toHaveProperty('ResponseCode')
    expect(typeof res.ResponseCode).toBe('string')
  })

  it('response includes RequestID', async () => {
    const res = await generateDynamicQR(SANDBOX_URL, VALID_TOKEN, VALID_REQUEST)
    expect(res).toHaveProperty('RequestID')
    expect(typeof res.RequestID).toBe('string')
  })

  it('response includes ResponseDescription', async () => {
    const res = await generateDynamicQR(SANDBOX_URL, VALID_TOKEN, VALID_REQUEST)
    expect(res).toHaveProperty('ResponseDescription')
    expect(typeof res.ResponseDescription).toBe('string')
  })

  it('response includes QRCode as a non-empty string', async () => {
    const res = await generateDynamicQR(SANDBOX_URL, VALID_TOKEN, VALID_REQUEST)
    expect(res).toHaveProperty('QRCode')
    expect(typeof res.QRCode).toBe('string')
    expect(res.QRCode.length).toBeGreaterThan(0)
  })
})

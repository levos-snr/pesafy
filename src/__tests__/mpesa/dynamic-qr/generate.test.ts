// 📁 PATH: src/__tests__/mpesa/dynamic-qr/generate.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../utils/http', () => ({ httpRequest: vi.fn() }))

import { httpRequest } from '../../../utils/http'
import { generateDynamicQR } from '../../../mpesa/dynamic-qr/generate'

const mockHttp = vi.mocked(httpRequest)

const BASE_REQUEST = {
  merchantName: 'TEST SUPERMARKET',
  refNo: 'Invoice Test',
  amount: 1,
  trxCode: 'BG' as const,
  cpi: '373132',
  size: 300,
}

const OK_RESP = {
  ResponseCode: 'AG_20191219_000043fdf61864fe9ff5',
  RequestID: '16738-27456357-1',
  ResponseDescription: 'QR Code Successfully Generated.',
  QRCode: 'iVBORw0KGgoAAAANSUhEUgAAASwAAAE=',
}

describe('generateDynamicQR', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns QR code response on success', async () => {
    mockHttp.mockResolvedValueOnce({ data: OK_RESP, status: 200, headers: {} })
    const result = await generateDynamicQR(
      'https://sandbox.safaricom.co.ke',
      'token',
      BASE_REQUEST,
    )
    expect(result).toEqual(OK_RESP)
  })

  it('calls the correct QR endpoint', async () => {
    mockHttp.mockResolvedValueOnce({ data: OK_RESP, status: 200, headers: {} })
    await generateDynamicQR(
      'https://sandbox.safaricom.co.ke',
      'token',
      BASE_REQUEST,
    )
    expect(mockHttp).toHaveBeenCalledWith(
      'https://sandbox.safaricom.co.ke/mpesa/qrcode/v1/generate',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('includes all required fields in request body', async () => {
    mockHttp.mockResolvedValueOnce({ data: OK_RESP, status: 200, headers: {} })
    await generateDynamicQR(
      'https://sandbox.safaricom.co.ke',
      'token',
      BASE_REQUEST,
    )
    // Use non-null assertion (!): mock was just called so calls[0] is defined
    const body = (
      mockHttp.mock.calls[0]![1] as { body: Record<string, unknown> }
    ).body
    expect(body['MerchantName']).toBe('TEST SUPERMARKET')
    expect(body['TrxCode']).toBe('BG')
    expect(body['CPI']).toBe('373132')
  })

  it('defaults size to 300 when not provided', async () => {
    mockHttp.mockResolvedValueOnce({ data: OK_RESP, status: 200, headers: {} })
    const { size: _, ...withoutSize } = BASE_REQUEST
    await generateDynamicQR(
      'https://sandbox.safaricom.co.ke',
      'token',
      withoutSize,
    )
    const body = (
      mockHttp.mock.calls[0]![1] as { body: Record<string, unknown> }
    ).body
    expect(body['Size']).toBe('300')
  })

  it('throws VALIDATION_ERROR when merchantName is missing', async () => {
    await expect(
      generateDynamicQR('https://sandbox.safaricom.co.ke', 'token', {
        ...BASE_REQUEST,
        merchantName: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when refNo is missing', async () => {
    await expect(
      generateDynamicQR('https://sandbox.safaricom.co.ke', 'token', {
        ...BASE_REQUEST,
        refNo: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when amount < 1', async () => {
    await expect(
      generateDynamicQR('https://sandbox.safaricom.co.ke', 'token', {
        ...BASE_REQUEST,
        amount: 0,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when trxCode is missing', async () => {
    await expect(
      generateDynamicQR('https://sandbox.safaricom.co.ke', 'token', {
        ...BASE_REQUEST,
        trxCode: '' as 'BG',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when cpi is missing', async () => {
    await expect(
      generateDynamicQR('https://sandbox.safaricom.co.ke', 'token', {
        ...BASE_REQUEST,
        cpi: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('sends Size as a string to Daraja', async () => {
    mockHttp.mockResolvedValueOnce({ data: OK_RESP, status: 200, headers: {} })
    await generateDynamicQR(
      'https://sandbox.safaricom.co.ke',
      'token',
      BASE_REQUEST,
    )
    const body = (
      mockHttp.mock.calls[0]![1] as { body: Record<string, unknown> }
    ).body
    expect(typeof body['Size']).toBe('string')
  })
})

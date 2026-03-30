// 📁 PATH: src/__tests__/mpesa/c2b/simulate.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../utils/http', () => ({ httpRequest: vi.fn() }))

import { httpRequest } from '../../../utils/http'
import { simulateC2B } from '../../../mpesa/c2b/simulate'

const mockHttp = vi.mocked(httpRequest)

const SANDBOX_URL = 'https://sandbox.safaricom.co.ke'

const OK_RESP = {
  OriginatorCoversationID: '1234-56789-1',
  ResponseCode: '0',
  ResponseDescription: 'Accept the service request successfully.',
}

describe('simulateC2B', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns Daraja response for Paybill simulation', async () => {
    mockHttp.mockResolvedValueOnce({ data: OK_RESP, status: 200, headers: {} })
    const result = await simulateC2B(SANDBOX_URL, 'token', {
      shortCode: '600977',
      commandId: 'CustomerPayBillOnline',
      amount: 100,
      msisdn: '254708374149',
      billRefNumber: 'account123',
    })
    expect(result).toEqual(OK_RESP)
  })

  it('includes BillRefNumber for CustomerPayBillOnline', async () => {
    mockHttp.mockResolvedValueOnce({ data: OK_RESP, status: 200, headers: {} })
    await simulateC2B(SANDBOX_URL, 'token', {
      shortCode: '600977',
      commandId: 'CustomerPayBillOnline',
      amount: 100,
      msisdn: '254708374149',
      billRefNumber: 'account123',
    })
    // Use non-null assertion (!): mock was just called so calls[0] is defined
    const body = (
      mockHttp.mock.calls[0]![1] as { body: Record<string, unknown> }
    ).body
    expect(body['BillRefNumber']).toBe('account123')
  })

  it('omits BillRefNumber for CustomerBuyGoodsOnline', async () => {
    mockHttp.mockResolvedValueOnce({ data: OK_RESP, status: 200, headers: {} })
    await simulateC2B(SANDBOX_URL, 'token', {
      shortCode: '600000',
      commandId: 'CustomerBuyGoodsOnline',
      amount: 50,
      msisdn: '254708374149',
    })
    const body = (
      mockHttp.mock.calls[0]![1] as { body: Record<string, unknown> }
    ).body
    expect(Object.keys(body)).not.toContain('BillRefNumber')
  })

  it('throws VALIDATION_ERROR when called with production URL', async () => {
    await expect(
      simulateC2B('https://api.safaricom.co.ke', 'token', {
        shortCode: '600977',
        commandId: 'CustomerPayBillOnline',
        amount: 100,
        msisdn: '254708374149',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when shortCode is missing', async () => {
    await expect(
      simulateC2B(SANDBOX_URL, 'token', {
        shortCode: '',
        commandId: 'CustomerPayBillOnline',
        amount: 100,
        msisdn: '254708374149',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR for amount < 1', async () => {
    await expect(
      simulateC2B(SANDBOX_URL, 'token', {
        shortCode: '600977',
        commandId: 'CustomerPayBillOnline',
        amount: 0,
        msisdn: '254708374149',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR for missing msisdn', async () => {
    await expect(
      simulateC2B(SANDBOX_URL, 'token', {
        shortCode: '600977',
        commandId: 'CustomerPayBillOnline',
        amount: 100,
        msisdn: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR for invalid commandId', async () => {
    await expect(
      simulateC2B(SANDBOX_URL, 'token', {
        shortCode: '600977',
        commandId: 'InvalidCommand' as 'CustomerPayBillOnline',
        amount: 100,
        msisdn: '254708374149',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })
})

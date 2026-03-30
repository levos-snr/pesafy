// 📁 PATH: src/__tests__/mpesa/stk-push/stk-query.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../utils/http', () => ({ httpRequest: vi.fn() }))

import { httpRequest } from '../../../utils/http'
import { queryStkPush } from '../../../mpesa/stk-push/stk-query'

const mockHttpRequest = vi.mocked(httpRequest)

const BASE_QUERY = {
  checkoutRequestId: 'ws_CO_001',
  shortCode: '174379',
  passKey: 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919',
}

const MOCK_RESPONSE = {
  ResponseCode: '0',
  ResponseDescription: 'The service request has been accepted successfully',
  MerchantRequestID: '22205-34066-1',
  CheckoutRequestID: 'ws_CO_001',
  ResultCode: 0,
  ResultDesc: 'The service request is processed successfully.',
}

describe('queryStkPush', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns the Daraja query response on success', async () => {
    mockHttpRequest.mockResolvedValueOnce({
      data: MOCK_RESPONSE,
      status: 200,
      headers: {},
    })
    const result = await queryStkPush(
      'https://sandbox.safaricom.co.ke',
      'token123',
      BASE_QUERY,
    )
    expect(result).toEqual(MOCK_RESPONSE)
  })

  it('calls the correct query endpoint', async () => {
    mockHttpRequest.mockResolvedValueOnce({
      data: MOCK_RESPONSE,
      status: 200,
      headers: {},
    })
    await queryStkPush(
      'https://sandbox.safaricom.co.ke',
      'token123',
      BASE_QUERY,
    )
    expect(mockHttpRequest).toHaveBeenCalledWith(
      'https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('includes CheckoutRequestID in request body', async () => {
    mockHttpRequest.mockResolvedValueOnce({
      data: MOCK_RESPONSE,
      status: 200,
      headers: {},
    })
    await queryStkPush(
      'https://sandbox.safaricom.co.ke',
      'token123',
      BASE_QUERY,
    )
    // Use non-null assertion (!): mock was just called so calls[0] is defined
    const callBody = (
      mockHttpRequest.mock.calls[0]![1] as { body: Record<string, unknown> }
    ).body
    expect(callBody['CheckoutRequestID']).toBe('ws_CO_001')
  })

  it('includes BusinessShortCode in request body', async () => {
    mockHttpRequest.mockResolvedValueOnce({
      data: MOCK_RESPONSE,
      status: 200,
      headers: {},
    })
    await queryStkPush(
      'https://sandbox.safaricom.co.ke',
      'token123',
      BASE_QUERY,
    )
    const callBody = (
      mockHttpRequest.mock.calls[0]![1] as { body: Record<string, unknown> }
    ).body
    expect(callBody['BusinessShortCode']).toBe('174379')
  })

  it('passes Bearer token in Authorization header', async () => {
    mockHttpRequest.mockResolvedValueOnce({
      data: MOCK_RESPONSE,
      status: 200,
      headers: {},
    })
    await queryStkPush('https://sandbox.safaricom.co.ke', 'mytoken', BASE_QUERY)
    expect(mockHttpRequest).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer mytoken' }),
      }),
    )
  })
})

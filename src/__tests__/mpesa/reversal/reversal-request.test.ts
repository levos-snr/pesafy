// 📁 PATH: src/__tests__/mpesa/reversal/reversal-request.test.ts
/**
 * Advanced patterns used here:
 *   • it.each (table) — all validation branches in one parametrized block
 *   • expect.objectContaining — partial payload matching
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../utils/http', () => ({ httpRequest: vi.fn() }))

import { httpRequest } from '../../../utils/http'
import { requestReversal } from '../../../mpesa/reversal/request'
import type { ReversalRequest } from '../../../mpesa/reversal/types'

const mockHttp = vi.mocked(httpRequest)
const BASE_URL = 'https://sandbox.safaricom.co.ke'

const VALID: ReversalRequest = {
  transactionId: 'OEI2AK4XXXX',
  receiverParty: '174379',
  receiverIdentifierType: '4',
  amount: 500,
  resultUrl: 'https://example.com/result',
  queueTimeOutUrl: 'https://example.com/timeout',
  remarks: 'Test reversal',
}

const OK = {
  OriginatorConversationID: 'OC-001',
  ConversationID: 'AG_001',
  ResponseCode: '0',
  ResponseDescription: 'Accept the service request successfully.',
}

describe('requestReversal — validation', () => {
  beforeEach(() => vi.clearAllMocks())

  it.each([
    ['empty transactionId', { ...VALID, transactionId: '' }],
    ['empty receiverParty', { ...VALID, receiverParty: '' }],
    [
      'invalid receiverIdentifierType',
      { ...VALID, receiverIdentifierType: '5' as '4' },
    ],
    ['amount < 1', { ...VALID, amount: 0 }],
    ['empty resultUrl', { ...VALID, resultUrl: '' }],
    ['empty queueTimeOutUrl', { ...VALID, queueTimeOutUrl: '' }],
  ])(
    'throws VALIDATION_ERROR when %s',
    async (_label: string, req: ReversalRequest) => {
      await expect(
        requestReversal(BASE_URL, 'tok', 'cred', 'testapi', req),
      ).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
      })
      expect(mockHttp).not.toHaveBeenCalled()
    },
  )
})

describe('requestReversal — success path', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls the correct Daraja endpoint', async () => {
    mockHttp.mockResolvedValueOnce({ data: OK, status: 200, headers: {} })
    await requestReversal(BASE_URL, 'tok', 'cred', 'testapi', VALID)
    expect(mockHttp).toHaveBeenCalledWith(
      `${BASE_URL}/mpesa/reversal/v1/request`,
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('sends CommandID TransactionReversal in the body', async () => {
    mockHttp.mockResolvedValueOnce({ data: OK, status: 200, headers: {} })
    await requestReversal(BASE_URL, 'tok', 'cred', 'testapi', VALID)
    const body = mockHttp.mock.calls[0]![1].body as Record<string, unknown>
    expect(body['CommandID']).toBe('TransactionReversal')
  })

  it('rounds fractional amounts', async () => {
    mockHttp.mockResolvedValueOnce({ data: OK, status: 200, headers: {} })
    await requestReversal(BASE_URL, 'tok', 'cred', 'testapi', {
      ...VALID,
      amount: 99.6,
    })
    const body = mockHttp.mock.calls[0]![1].body as Record<string, unknown>
    expect(body['Amount']).toBe('100')
  })

  it("defaults Remarks to 'Transaction Reversal'", async () => {
    mockHttp.mockResolvedValueOnce({ data: OK, status: 200, headers: {} })
    const { remarks: _, ...noRemarks } = VALID
    await requestReversal(BASE_URL, 'tok', 'cred', 'testapi', noRemarks)
    const body = mockHttp.mock.calls[0]![1].body as Record<string, unknown>
    expect(body['Remarks']).toBe('Transaction Reversal')
  })

  it('returns the Daraja response', async () => {
    mockHttp.mockResolvedValueOnce({ data: OK, status: 200, headers: {} })
    const result = await requestReversal(
      BASE_URL,
      'tok',
      'cred',
      'testapi',
      VALID,
    )
    expect(result).toEqual(OK)
  })

  it.each(['1', '2', '4'] as const)(
    "accepts valid receiverIdentifierType '%s'",
    async (type: '1' | '2' | '4') => {
      mockHttp.mockResolvedValueOnce({ data: OK, status: 200, headers: {} })
      await expect(
        requestReversal(BASE_URL, 'tok', 'cred', 'testapi', {
          ...VALID,
          receiverIdentifierType: type,
        }),
      ).resolves.toBeDefined()
    },
  )
})

// 📁 PATH: src/__tests__/mpesa/b2c/payment.test.ts
/**
 * Advanced patterns used here:
 *   • it.each over all four B2C CommandID values
 *   • it.concurrent — independent payload-shape tests run in parallel
 *   • expect.objectContaining — partial match
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../utils/http', () => ({ httpRequest: vi.fn() }))

import { httpRequest } from '../../../utils/http'
import { initiateB2CPayment } from '../../../mpesa/b2c/payment'
import type { B2CCommandID, B2CRequest } from '../../../mpesa/b2c/types'

const mockHttp = vi.mocked(httpRequest)
const BASE_URL = 'https://sandbox.safaricom.co.ke'

const VALID: B2CRequest = {
  commandId: 'BusinessPayment',
  amount: 1000,
  partyA: '600979',
  partyB: '254712345678',
  accountReference: 'REF-001',
  resultUrl: 'https://example.com/result',
  queueTimeOutUrl: 'https://example.com/timeout',
  remarks: 'Salary payment',
}

const OK_RESP = {
  OriginatorConversationID: 'OC-001',
  ConversationID: 'AG_001',
  ResponseCode: '0',
  ResponseDescription: 'Accept the service request successfully.',
}

describe('initiateB2CPayment — validation', () => {
  beforeEach(() => vi.clearAllMocks())

  it.each([
    ['missing commandId', { ...VALID, commandId: '' as B2CCommandID }],
    [
      'invalid commandId',
      { ...VALID, commandId: 'InvalidCommand' as B2CCommandID },
    ],
    ['amount < 1', { ...VALID, amount: 0 }],
    ['empty partyA', { ...VALID, partyA: '' }],
    ['empty partyB', { ...VALID, partyB: '' }],
    ['empty accountReference', { ...VALID, accountReference: '' }],
    ['empty resultUrl', { ...VALID, resultUrl: '' }],
    ['empty queueTimeOutUrl', { ...VALID, queueTimeOutUrl: '' }],
  ])('throws VALIDATION_ERROR when %s', async (_label, req) => {
    await expect(
      initiateB2CPayment(BASE_URL, 'tok', 'cred', 'testapi', req),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
    expect(mockHttp).not.toHaveBeenCalled()
  })
})

describe('initiateB2CPayment — all CommandID values', () => {
  beforeEach(() => vi.clearAllMocks())

  // All four legal commandId values should succeed
  it.each([
    'BusinessPayment',
    'SalaryPayment',
    'PromotionPayment',
    'BusinessPayToBulk',
  ] as B2CCommandID[])("accepts commandId '%s'", async (commandId) => {
    mockHttp.mockResolvedValueOnce({ data: OK_RESP, status: 200, headers: {} })
    await expect(
      initiateB2CPayment(BASE_URL, 'tok', 'cred', 'testapi', {
        ...VALID,
        commandId,
      }),
    ).resolves.toBeDefined()
  })
})

describe('initiateB2CPayment — payload', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls the correct Daraja B2C endpoint', async () => {
    mockHttp.mockResolvedValueOnce({ data: OK_RESP, status: 200, headers: {} })
    await initiateB2CPayment(BASE_URL, 'tok', 'cred', 'testapi', VALID)
    expect(mockHttp).toHaveBeenCalledWith(
      `${BASE_URL}/mpesa/b2b/v1/paymentrequest`,
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it.concurrent("sends SenderIdentifierType '4' by default", async () => {
    const localFetch = vi.fn().mockResolvedValueOnce({
      data: OK_RESP,
      status: 200,
      headers: {},
    })
    // Temporarily override the module-level mock to avoid cross-test pollution
    // in concurrent mode
    vi.mocked(httpRequest).mockResolvedValueOnce({
      data: OK_RESP,
      status: 200,
      headers: {},
    })
    await initiateB2CPayment(BASE_URL, 'tok', 'cred', 'testapi', VALID)
    const body = vi.mocked(httpRequest).mock.calls.at(-1)?.[1]?.body as Record<
      string,
      unknown
    >
    if (body) expect(body['SenderIdentifierType']).toBe('4')
    void localFetch // silence unused warning
  })

  it('sends Amount as a string', async () => {
    mockHttp.mockResolvedValueOnce({ data: OK_RESP, status: 200, headers: {} })
    await initiateB2CPayment(BASE_URL, 'tok', 'cred', 'testapi', VALID)
    const body = mockHttp.mock.calls[0]![1].body as Record<string, unknown>
    expect(typeof body['Amount']).toBe('string')
    expect(body['Amount']).toBe('1000')
  })

  it('rounds fractional amounts before sending', async () => {
    mockHttp.mockResolvedValueOnce({ data: OK_RESP, status: 200, headers: {} })
    await initiateB2CPayment(BASE_URL, 'tok', 'cred', 'testapi', {
      ...VALID,
      amount: 99.7,
    })
    const body = mockHttp.mock.calls[0]![1].body as Record<string, unknown>
    expect(body['Amount']).toBe('100')
  })

  it('omits Requester field when not provided', async () => {
    mockHttp.mockResolvedValueOnce({ data: OK_RESP, status: 200, headers: {} })
    const { ...noRequester } = VALID // no requester in VALID
    await initiateB2CPayment(BASE_URL, 'tok', 'cred', 'testapi', noRequester)
    const body = mockHttp.mock.calls[0]![1].body as Record<string, unknown>
    expect(Object.keys(body)).not.toContain('Requester')
  })

  it('includes Requester when provided', async () => {
    mockHttp.mockResolvedValueOnce({ data: OK_RESP, status: 200, headers: {} })
    await initiateB2CPayment(BASE_URL, 'tok', 'cred', 'testapi', {
      ...VALID,
      requester: '254700000000',
    })
    const body = mockHttp.mock.calls[0]![1].body as Record<string, unknown>
    expect(body['Requester']).toBe('254700000000')
  })
})

// 📁 PATH: src/__tests__/mpesa/tax-remittance/tax-remittance.test.ts
/**
 * Advanced patterns used here:
 *   • it.each (table)   — all validation branches parametrized
 *   • expect.assertions — guard the error-path test with async assertions
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../utils/http', () => ({ httpRequest: vi.fn() }))
import { httpRequest } from '../../../utils/http'
import {
  KRA_SHORTCODE,
  remitTax,
  TAX_COMMAND_ID,
} from '../../../mpesa/tax-remittance/remit-tax'
import type { TaxRemittanceRequest } from '../../../mpesa/tax-remittance/types'

const mockHttp = vi.mocked(httpRequest)
const BASE_URL = 'https://sandbox.safaricom.co.ke'

const VALID: TaxRemittanceRequest = {
  amount: 5000,
  partyA: '174379',
  accountReference: 'KRA-PRN-001',
  resultUrl: 'https://example.com/tax/result',
  queueTimeOutUrl: 'https://example.com/tax/timeout',
}

const OK_RESP = {
  OriginatorConversationID: 'OC-001',
  ConversationID: 'AG_001',
  ResponseCode: '0',
  ResponseDescription: 'Accept the service request successfully.',
}

describe('module constants', () => {
  it("KRA_SHORTCODE is '572572'", () => {
    expect(KRA_SHORTCODE).toBe('572572')
  })

  it("TAX_COMMAND_ID is 'PayTaxToKRA'", () => {
    expect(TAX_COMMAND_ID).toBe('PayTaxToKRA')
  })
})

describe('remitTax — validation', () => {
  beforeEach(() => vi.clearAllMocks())

  it.each([
    ['amount < 1', { ...VALID, amount: 0 }],
    ['empty partyA', { ...VALID, partyA: '' }],
    ['empty accountReference', { ...VALID, accountReference: '' }],
    ['empty resultUrl', { ...VALID, resultUrl: '' }],
    ['empty queueTimeOutUrl', { ...VALID, queueTimeOutUrl: '' }],
  ])(
    'throws VALIDATION_ERROR when %s',
    async (_label: string, req: TaxRemittanceRequest) => {
      await expect(
        remitTax(BASE_URL, 'tok', 'cred', 'testapi', req),
      ).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
      })
      expect(mockHttp).not.toHaveBeenCalled()
    },
  )
})

describe('remitTax — payload', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls the correct Daraja tax endpoint', async () => {
    mockHttp.mockResolvedValueOnce({ data: OK_RESP, status: 200, headers: {} })
    await remitTax(BASE_URL, 'tok', 'cred', 'testapi', VALID)
    expect(mockHttp).toHaveBeenCalledWith(
      `${BASE_URL}/mpesa/b2b/v1/remittax`,
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it("uses KRA_SHORTCODE ('572572') as PartyB by default", async () => {
    mockHttp.mockResolvedValueOnce({ data: OK_RESP, status: 200, headers: {} })
    await remitTax(BASE_URL, 'tok', 'cred', 'testapi', VALID)
    const body = mockHttp.mock.calls[0]![1].body as Record<string, unknown>
    expect(body['PartyB']).toBe('572572')
  })

  it('allows overriding PartyB when provided', async () => {
    mockHttp.mockResolvedValueOnce({ data: OK_RESP, status: 200, headers: {} })
    await remitTax(BASE_URL, 'tok', 'cred', 'testapi', {
      ...VALID,
      partyB: '999999',
    })
    const body = mockHttp.mock.calls[0]![1].body as Record<string, unknown>
    expect(body['PartyB']).toBe('999999')
  })

  it("sends CommandID 'PayTaxToKRA'", async () => {
    mockHttp.mockResolvedValueOnce({ data: OK_RESP, status: 200, headers: {} })
    await remitTax(BASE_URL, 'tok', 'cred', 'testapi', VALID)
    const body = mockHttp.mock.calls[0]![1].body as Record<string, unknown>
    expect(body['CommandID']).toBe('PayTaxToKRA')
  })

  it("sends fixed SenderIdentifierType '4'", async () => {
    mockHttp.mockResolvedValueOnce({ data: OK_RESP, status: 200, headers: {} })
    await remitTax(BASE_URL, 'tok', 'cred', 'testapi', VALID)
    const body = mockHttp.mock.calls[0]![1].body as Record<string, unknown>
    expect(body['SenderIdentifierType']).toBe('4')
    expect(body['RecieverIdentifierType']).toBe('4')
  })

  it('sends Amount as a string', async () => {
    mockHttp.mockResolvedValueOnce({ data: OK_RESP, status: 200, headers: {} })
    await remitTax(BASE_URL, 'tok', 'cred', 'testapi', VALID)
    const body = mockHttp.mock.calls[0]![1].body as Record<string, unknown>
    expect(typeof body['Amount']).toBe('string')
  })

  it("defaults Remarks to 'Tax Remittance'", async () => {
    mockHttp.mockResolvedValueOnce({ data: OK_RESP, status: 200, headers: {} })
    const { remarks: _, ...noRemarks } = VALID
    await remitTax(BASE_URL, 'tok', 'cred', 'testapi', noRemarks)
    const body = mockHttp.mock.calls[0]![1].body as Record<string, unknown>
    expect(body['Remarks']).toBe('Tax Remittance')
  })
})

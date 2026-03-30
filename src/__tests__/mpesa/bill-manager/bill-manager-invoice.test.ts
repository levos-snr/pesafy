// 📁 PATH: src/__tests__/mpesa/bill-manager/invoice.test.ts
/**
 * Advanced patterns used here:
 *   • beforeAll            — build shared fixture data once (1001-item array)
 *   • it.each (table)      — all per-function validation branches
 *   • Array constructor    — generate large fixture for the bulk-limit test
 *   • toMatchObject        — partial response matching across all four functions
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../utils/http', () => ({ httpRequest: vi.fn() }))
import { httpRequest } from '../../../utils/http'
import {
  billManagerOptIn,
  cancelInvoice,
  sendBulkInvoices,
  sendSingleInvoice,
} from '../../../mpesa/bill-manager/invoice'
import type { BillManagerSingleInvoiceRequest } from '../../../mpesa/bill-manager/types'

const mockHttp = vi.mocked(httpRequest)
const BASE_URL = 'https://sandbox.safaricom.co.ke'

const OK_RESP = { rescode: '0', resmsg: 'Success' }

// ── Fixtures ──────────────────────────────────────────────────────────────────
// Built once in beforeAll — generating 1001 invoices is cheap but non-trivial
let oversizedInvoiceList: BillManagerSingleInvoiceRequest[]

const SINGLE_INVOICE: BillManagerSingleInvoiceRequest = {
  externalReference: 'INV-001',
  billingPeriod: '2024-01',
  invoiceName: 'January Subscription',
  dueDate: '2024-01-31 23:59:00',
  accountReference: 'ACC-12345',
  amount: 2500,
  partyA: '254712345678',
}

beforeAll(() => {
  oversizedInvoiceList = Array.from({ length: 1001 }, (_, i) => ({
    ...SINGLE_INVOICE,
    externalReference: `INV-${i + 1}`,
  }))
})

// ── billManagerOptIn ──────────────────────────────────────────────────────────
describe('billManagerOptIn', () => {
  beforeEach(() => vi.clearAllMocks())

  it.each([
    [
      'missing shortcode',
      {
        shortcode: '',
        email: 'a@b.com',
        officialContact: '07x',
        sendReminders: '1' as const,
        callbackUrl: 'https://x.com',
      },
    ],
    [
      'missing email',
      {
        shortcode: '600984',
        email: '',
        officialContact: '07x',
        sendReminders: '1' as const,
        callbackUrl: 'https://x.com',
      },
    ],
    [
      'missing callbackUrl',
      {
        shortcode: '600984',
        email: 'a@b.com',
        officialContact: '07x',
        sendReminders: '1' as const,
        callbackUrl: '',
      },
    ],
  ])('throws VALIDATION_ERROR when %s', async (_label, req) => {
    await expect(billManagerOptIn(BASE_URL, 'tok', req)).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    })
    expect(mockHttp).not.toHaveBeenCalled()
  })

  it('calls the opt-in endpoint on success', async () => {
    mockHttp.mockResolvedValueOnce({ data: OK_RESP, status: 200, headers: {} })
    await billManagerOptIn(BASE_URL, 'tok', {
      shortcode: '600984',
      email: 'billing@company.com',
      officialContact: '0700000000',
      sendReminders: '1',
      callbackUrl: 'https://example.com/callback',
    })
    expect(mockHttp).toHaveBeenCalledWith(
      `${BASE_URL}/v1/billmanager-invoice/optin`,
      expect.objectContaining({ method: 'POST' }),
    )
  })
})

// ── sendSingleInvoice ─────────────────────────────────────────────────────────
describe('sendSingleInvoice', () => {
  beforeEach(() => vi.clearAllMocks())

  it.each([
    ['missing externalReference', { ...SINGLE_INVOICE, externalReference: '' }],
    ['missing partyA', { ...SINGLE_INVOICE, partyA: '' }],
    ['amount < 1', { ...SINGLE_INVOICE, amount: 0 }],
  ])('throws VALIDATION_ERROR when %s', async (_label, req) => {
    await expect(sendSingleInvoice(BASE_URL, 'tok', req)).rejects.toMatchObject(
      {
        code: 'VALIDATION_ERROR',
      },
    )
    expect(mockHttp).not.toHaveBeenCalled()
  })

  it('sends amount as a string to the API', async () => {
    mockHttp.mockResolvedValueOnce({ data: OK_RESP, status: 200, headers: {} })
    await sendSingleInvoice(BASE_URL, 'tok', SINGLE_INVOICE)
    const body = mockHttp.mock.calls[0]![1].body as Record<string, unknown>
    expect(typeof body['amount']).toBe('string')
    expect(body['amount']).toBe('2500')
  })

  it('calls the single-invoicing endpoint', async () => {
    mockHttp.mockResolvedValueOnce({ data: OK_RESP, status: 200, headers: {} })
    await sendSingleInvoice(BASE_URL, 'tok', SINGLE_INVOICE)
    expect(mockHttp).toHaveBeenCalledWith(
      `${BASE_URL}/v1/billmanager-invoice/single-invoicing`,
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('converts invoiceItem amounts to strings', async () => {
    mockHttp.mockResolvedValueOnce({ data: OK_RESP, status: 200, headers: {} })
    await sendSingleInvoice(BASE_URL, 'tok', {
      ...SINGLE_INVOICE,
      invoiceItems: [{ itemName: 'Service Fee', amount: 500 }],
    })
    const body = mockHttp.mock.calls[0]![1].body as Record<string, unknown>
    const items = body['invoiceItems'] as Array<Record<string, unknown>>
    expect(typeof items[0]!['amount']).toBe('string')
    expect(items[0]!['amount']).toBe('500')
  })
})

// ── sendBulkInvoices ──────────────────────────────────────────────────────────
describe('sendBulkInvoices', () => {
  beforeEach(() => vi.clearAllMocks())

  it('throws VALIDATION_ERROR for an empty invoices array', async () => {
    await expect(
      sendBulkInvoices(BASE_URL, 'tok', { invoices: [] }),
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    })
    expect(mockHttp).not.toHaveBeenCalled()
  })

  it('throws VALIDATION_ERROR when invoices.length exceeds 1000', async () => {
    // Uses the oversized fixture built in beforeAll
    await expect(
      sendBulkInvoices(BASE_URL, 'tok', { invoices: oversizedInvoiceList }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
    expect(mockHttp).not.toHaveBeenCalled()
  })

  it('accepts exactly 1000 invoices', async () => {
    mockHttp.mockResolvedValueOnce({ data: OK_RESP, status: 200, headers: {} })
    const exactly1000 = oversizedInvoiceList.slice(0, 1000)
    await expect(
      sendBulkInvoices(BASE_URL, 'tok', { invoices: exactly1000 }),
    ).resolves.toMatchObject({ rescode: '0' })
  })

  it('calls the bulk-invoicing endpoint', async () => {
    mockHttp.mockResolvedValueOnce({ data: OK_RESP, status: 200, headers: {} })
    await sendBulkInvoices(BASE_URL, 'tok', { invoices: [SINGLE_INVOICE] })
    expect(mockHttp).toHaveBeenCalledWith(
      `${BASE_URL}/v1/billmanager-invoice/bulk-invoicing`,
      expect.objectContaining({ method: 'POST' }),
    )
  })
})

// ── cancelInvoice ─────────────────────────────────────────────────────────────
describe('cancelInvoice', () => {
  beforeEach(() => vi.clearAllMocks())

  it('throws VALIDATION_ERROR when externalReference is empty', async () => {
    await expect(
      cancelInvoice(BASE_URL, 'tok', { externalReference: '' }),
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    })
    expect(mockHttp).not.toHaveBeenCalled()
  })

  it('calls the cancel-single-invoice endpoint', async () => {
    mockHttp.mockResolvedValueOnce({ data: OK_RESP, status: 200, headers: {} })
    await cancelInvoice(BASE_URL, 'tok', { externalReference: 'INV-001' })
    expect(mockHttp).toHaveBeenCalledWith(
      `${BASE_URL}/v1/billmanager-invoice/cancel-single-invoice`,
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('wraps the reference in an array in the request body', async () => {
    mockHttp.mockResolvedValueOnce({ data: OK_RESP, status: 200, headers: {} })
    await cancelInvoice(BASE_URL, 'tok', { externalReference: 'INV-XYZ' })
    const [, options] = mockHttp.mock.calls[0]!
    const body = options.body as Array<Record<string, string>>
    expect(Array.isArray(body)).toBe(true)
    expect(body[0]!['externalReference']).toBe('INV-XYZ')
  })
})

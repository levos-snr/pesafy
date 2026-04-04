// __tests__/bill-manager.test.ts

/**
 * __tests__/bill-manager.test.ts
 *
 * Complete test suite for the Bill Manager module.
 * Strictly aligned with Safaricom Daraja Bill Manager API documentation.
 *
 * Covers:
 *   Opt-in
 *   - billManagerOptIn()         — POST /v1/billmanager-invoice/optin
 *
 *   Update Opt-in
 *   - updateOptIn()              — POST /v1/billmanager-invoice/change-optin-details
 *
 *   Single Invoicing
 *   - sendSingleInvoice()        — POST /v1/billmanager-invoice/single-invoicing
 *
 *   Bulk Invoicing
 *   - sendBulkInvoices()         — POST /v1/billmanager-invoice/bulk-invoicing
 *
 *   Cancel Single Invoice
 *   - cancelInvoice()            — POST /v1/billmanager-invoice/cancel-single-invoice
 *
 *   Cancel Bulk Invoices
 *   - cancelBulkInvoices()       — POST /v1/billmanager-invoice/cancel-bulk-invoices
 *
 *   Reconciliation / Acknowledgment
 *   - reconcilePayment()         — POST /v1/billmanager-invoice/reconciliation
 *
 *   Type / payload structure validation
 *   - BillManagerPaymentNotification shape (per Daraja docs)
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
import {
  billManagerOptIn,
  cancelBulkInvoices,
  cancelInvoice,
  reconcilePayment,
  sendBulkInvoices,
  sendSingleInvoice,
  updateOptIn,
} from '../src/mpesa/bill-manager/invoice'
import type {
  BillManagerBulkInvoiceRequest,
  BillManagerCancelBulkInvoiceRequest,
  BillManagerCancelInvoiceRequest,
  BillManagerOptInRequest,
  BillManagerPaymentNotification,
  BillManagerReconciliationRequest,
  BillManagerSingleInvoiceRequest,
  BillManagerUpdateOptInRequest,
} from '../src/mpesa/bill-manager/types'

// ── Typed mock ────────────────────────────────────────────────────────────────

const mockHttpRequest = vi.mocked(httpRequest)

// ── Shared fixtures ───────────────────────────────────────────────────────────

const SANDBOX_URL = 'https://sandbox.safaricom.co.ke'
const PROD_URL = 'https://api.safaricom.co.ke'
const ACCESS_TOKEN = 'test-bearer-token-bill-manager'

// ── Opt-in fixtures (from Daraja docs) ───────────────────────────────────────

const BASE_OPT_IN_REQUEST: BillManagerOptInRequest = {
  shortcode: '718003',
  email: 'youremail@gmail.com',
  officialContact: '0710000000',
  sendReminders: '1',
  logo: 'https://example.com/logo.jpg',
  callbackUrl: 'http://my.server.com/bar/callback',
}

const OPT_IN_RESPONSE = {
  app_key: 'AG_2376487236_126732989KJ',
  resmsg: 'Success',
  rescode: '200',
}

// ── Single invoice fixtures (from Daraja docs) ────────────────────────────────

const BASE_SINGLE_INVOICE_REQUEST: BillManagerSingleInvoiceRequest = {
  externalReference: '#9932340',
  billedFullName: 'John Doe',
  billedPhoneNumber: '0722000000',
  billedPeriod: 'August 2021',
  invoiceName: 'Jentrys',
  dueDate: '2021-10-12',
  accountReference: '1ASD678H',
  amount: 800,
  invoiceItems: [
    { itemName: 'food', amount: 700 },
    { itemName: 'water', amount: 100 },
  ],
}

const SINGLE_INVOICE_RESPONSE = {
  Status_Message: 'Invoice sent successfully',
  resmsg: 'Success',
  rescode: '200',
}

// ── Bulk invoice fixtures ─────────────────────────────────────────────────────

const BASE_BULK_INVOICE_REQUEST: BillManagerBulkInvoiceRequest = {
  invoices: [
    {
      externalReference: '1107',
      billedFullName: 'John Doe',
      billedPhoneNumber: '0722000000',
      billedPeriod: 'August 2021',
      invoiceName: 'Jentrys',
      dueDate: '2021-09-15 00:00:00.00',
      accountReference: 'A1',
      amount: 2000,
      invoiceItems: [
        { itemName: 'food', amount: 1000 },
        { itemName: 'water', amount: 1000 },
      ],
    },
    {
      externalReference: '967',
      billedFullName: 'Jane Smith',
      billedPhoneNumber: '0711000000',
      billedPeriod: 'August 2021',
      invoiceName: 'Jentrys',
      dueDate: '2021-09-15 00:00:00.00',
      accountReference: 'Balboa45',
      amount: 2000,
    },
  ],
}

const BULK_INVOICE_RESPONSE = {
  Status_Message: 'Invoice sent successfully',
  resmsg: 'Success',
  rescode: '200',
}

// ── Cancel fixtures ───────────────────────────────────────────────────────────

const CANCEL_INVOICE_REQUEST: BillManagerCancelInvoiceRequest = {
  externalReference: '113',
}

const CANCEL_RESPONSE = {
  Status_Message: 'Invoice cancelled successfuly.',
  resmsg: 'Success',
  rescode: '200',
  errors: [],
}

const CANCEL_BULK_REQUEST: BillManagerCancelBulkInvoiceRequest = {
  externalReferences: ['113', '114'],
}

// ── Reconciliation fixtures ───────────────────────────────────────────────────

const BASE_RECONCILIATION_REQUEST: BillManagerReconciliationRequest = {
  paymentDate: '2021-10-01',
  paidAmount: '800',
  accountReference: 'Balboa95',
  transactionId: 'PJB53MYR1N',
  phoneNumber: '0710000000',
  fullName: 'John Doe',
  invoiceName: 'School Fees',
  externalReference: '955',
}

const RECONCILIATION_RESPONSE = {
  resmsg: 'Success',
  rescode: '200',
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. billManagerOptIn() — OPT-IN
// ═══════════════════════════════════════════════════════════════════════════════

describe('billManagerOptIn() — success', () => {
  beforeEach(() => {
    mockHttpRequest.mockResolvedValue({ data: OPT_IN_RESPONSE } as never)
  })

  it('returns the Daraja opt-in response on success', async () => {
    const result = await billManagerOptIn(SANDBOX_URL, ACCESS_TOKEN, BASE_OPT_IN_REQUEST)
    expect(result).toStrictEqual(OPT_IN_RESPONSE)
  })

  it('calls the correct sandbox endpoint', async () => {
    await billManagerOptIn(SANDBOX_URL, ACCESS_TOKEN, BASE_OPT_IN_REQUEST)
    expect(mockHttpRequest).toHaveBeenCalledWith(
      `${SANDBOX_URL}/v1/billmanager-invoice/optin`,
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('calls the correct production endpoint', async () => {
    await billManagerOptIn(PROD_URL, ACCESS_TOKEN, BASE_OPT_IN_REQUEST)
    expect(mockHttpRequest).toHaveBeenCalledWith(
      `${PROD_URL}/v1/billmanager-invoice/optin`,
      expect.any(Object),
    )
  })

  it('sends Authorization header with Bearer token', async () => {
    await billManagerOptIn(SANDBOX_URL, ACCESS_TOKEN, BASE_OPT_IN_REQUEST)
    expect(mockHttpRequest).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${ACCESS_TOKEN}` }),
      }),
    )
  })
})

describe('billManagerOptIn() — request body shape (Daraja spec)', () => {
  beforeEach(() => {
    mockHttpRequest.mockResolvedValue({ data: OPT_IN_RESPONSE } as never)
  })

  function getBody(): Record<string, unknown> {
    const call = mockHttpRequest.mock.calls[0]
    return (call?.[1] as { body: Record<string, unknown> }).body
  }

  it('sends shortcode as provided', async () => {
    await billManagerOptIn(SANDBOX_URL, ACCESS_TOKEN, BASE_OPT_IN_REQUEST)
    expect(getBody()['shortcode']).toBe('718003')
  })

  it('sends email as provided', async () => {
    await billManagerOptIn(SANDBOX_URL, ACCESS_TOKEN, BASE_OPT_IN_REQUEST)
    expect(getBody()['email']).toBe('youremail@gmail.com')
  })

  it('sends officialContact as provided', async () => {
    await billManagerOptIn(SANDBOX_URL, ACCESS_TOKEN, BASE_OPT_IN_REQUEST)
    expect(getBody()['officialContact']).toBe('0710000000')
  })

  it('sends sendReminders as provided', async () => {
    await billManagerOptIn(SANDBOX_URL, ACCESS_TOKEN, BASE_OPT_IN_REQUEST)
    expect(getBody()['sendReminders']).toBe('1')
  })

  it('sends logo as provided', async () => {
    await billManagerOptIn(SANDBOX_URL, ACCESS_TOKEN, BASE_OPT_IN_REQUEST)
    expect(getBody()['logo']).toBe('https://example.com/logo.jpg')
  })

  it('sends logo as empty string when not provided (per docs)', async () => {
    const req: BillManagerOptInRequest = { ...BASE_OPT_IN_REQUEST }
    delete req.logo
    await billManagerOptIn(SANDBOX_URL, ACCESS_TOKEN, req)
    expect(getBody()['logo']).toBe('')
  })

  it('sends callbackurl as lowercase (per Daraja docs) mapped from callbackUrl', async () => {
    await billManagerOptIn(SANDBOX_URL, ACCESS_TOKEN, BASE_OPT_IN_REQUEST)
    // Daraja field name is "callbackurl" (all lowercase)
    expect(getBody()['callbackurl']).toBe('http://my.server.com/bar/callback')
    expect(getBody()).not.toHaveProperty('callbackUrl')
  })

  it('response includes app_key (per Daraja docs)', async () => {
    const result = await billManagerOptIn(SANDBOX_URL, ACCESS_TOKEN, BASE_OPT_IN_REQUEST)
    expect(result.app_key).toBe('AG_2376487236_126732989KJ')
  })

  it('response includes resmsg and rescode', async () => {
    const result = await billManagerOptIn(SANDBOX_URL, ACCESS_TOKEN, BASE_OPT_IN_REQUEST)
    expect(result.resmsg).toBe('Success')
    expect(result.rescode).toBe('200')
  })
})

describe('billManagerOptIn() — validation', () => {
  it('throws VALIDATION_ERROR when shortcode is empty', async () => {
    await expect(
      billManagerOptIn(SANDBOX_URL, ACCESS_TOKEN, { ...BASE_OPT_IN_REQUEST, shortcode: '' }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when shortcode is whitespace only', async () => {
    await expect(
      billManagerOptIn(SANDBOX_URL, ACCESS_TOKEN, { ...BASE_OPT_IN_REQUEST, shortcode: '   ' }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when email is empty', async () => {
    await expect(
      billManagerOptIn(SANDBOX_URL, ACCESS_TOKEN, { ...BASE_OPT_IN_REQUEST, email: '' }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when officialContact is empty', async () => {
    await expect(
      billManagerOptIn(SANDBOX_URL, ACCESS_TOKEN, {
        ...BASE_OPT_IN_REQUEST,
        officialContact: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when sendReminders is not "0" or "1"', async () => {
    await expect(
      billManagerOptIn(SANDBOX_URL, ACCESS_TOKEN, {
        ...BASE_OPT_IN_REQUEST,
        sendReminders: '2' as never,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('accepts sendReminders "0" (disable reminders)', async () => {
    mockHttpRequest.mockResolvedValue({ data: OPT_IN_RESPONSE } as never)
    await expect(
      billManagerOptIn(SANDBOX_URL, ACCESS_TOKEN, {
        ...BASE_OPT_IN_REQUEST,
        sendReminders: '0',
      }),
    ).resolves.toBeDefined()
  })

  it('accepts sendReminders "1" (enable reminders)', async () => {
    mockHttpRequest.mockResolvedValue({ data: OPT_IN_RESPONSE } as never)
    await expect(
      billManagerOptIn(SANDBOX_URL, ACCESS_TOKEN, {
        ...BASE_OPT_IN_REQUEST,
        sendReminders: '1',
      }),
    ).resolves.toBeDefined()
  })

  it('throws VALIDATION_ERROR when callbackUrl is empty', async () => {
    await expect(
      billManagerOptIn(SANDBOX_URL, ACCESS_TOKEN, { ...BASE_OPT_IN_REQUEST, callbackUrl: '' }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('does not call httpRequest when validation fails', async () => {
    await billManagerOptIn(SANDBOX_URL, ACCESS_TOKEN, {
      ...BASE_OPT_IN_REQUEST,
      shortcode: '',
    }).catch(() => {})
    expect(mockHttpRequest).not.toHaveBeenCalled()
  })
})

describe('billManagerOptIn() — error propagation', () => {
  it('propagates a generic Error from httpRequest', async () => {
    mockHttpRequest.mockRejectedValue(new Error('ECONNRESET'))
    await expect(billManagerOptIn(SANDBOX_URL, ACCESS_TOKEN, BASE_OPT_IN_REQUEST)).rejects.toThrow(
      'ECONNRESET',
    )
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 2. updateOptIn() — UPDATE OPT-IN DETAILS
// ═══════════════════════════════════════════════════════════════════════════════

describe('updateOptIn() — success', () => {
  beforeEach(() => {
    mockHttpRequest.mockResolvedValue({ data: { resmsg: 'Success', rescode: '200' } } as never)
  })

  it('returns the Daraja update opt-in response', async () => {
    const result = await updateOptIn(SANDBOX_URL, ACCESS_TOKEN, BASE_OPT_IN_REQUEST)
    expect(result.resmsg).toBe('Success')
    expect(result.rescode).toBe('200')
  })

  it('calls the correct update opt-in endpoint', async () => {
    await updateOptIn(SANDBOX_URL, ACCESS_TOKEN, BASE_OPT_IN_REQUEST)
    expect(mockHttpRequest).toHaveBeenCalledWith(
      `${SANDBOX_URL}/v1/billmanager-invoice/change-optin-details`,
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('does NOT call the optin endpoint', async () => {
    await updateOptIn(SANDBOX_URL, ACCESS_TOKEN, BASE_OPT_IN_REQUEST)
    const url = (mockHttpRequest.mock.calls[0]?.[0] as string) ?? ''
    expect(url).not.toContain('/optin')
    expect(url).toContain('/change-optin-details')
  })

  it('sends callbackurl as lowercase in the body', async () => {
    await updateOptIn(SANDBOX_URL, ACCESS_TOKEN, BASE_OPT_IN_REQUEST)
    const call = mockHttpRequest.mock.calls[0]
    const body = (call?.[1] as { body: Record<string, unknown> }).body
    expect(body['callbackurl']).toBe('http://my.server.com/bar/callback')
    expect(body).not.toHaveProperty('callbackUrl')
  })
})

describe('updateOptIn() — validation', () => {
  it('throws VALIDATION_ERROR when shortcode is empty', async () => {
    await expect(
      updateOptIn(SANDBOX_URL, ACCESS_TOKEN, { ...BASE_OPT_IN_REQUEST, shortcode: '' }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when email is empty', async () => {
    await expect(
      updateOptIn(SANDBOX_URL, ACCESS_TOKEN, { ...BASE_OPT_IN_REQUEST, email: '' }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when callbackUrl is empty', async () => {
    await expect(
      updateOptIn(SANDBOX_URL, ACCESS_TOKEN, { ...BASE_OPT_IN_REQUEST, callbackUrl: '' }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('does not call httpRequest when validation fails', async () => {
    await updateOptIn(SANDBOX_URL, ACCESS_TOKEN, {
      ...BASE_OPT_IN_REQUEST,
      email: '',
    }).catch(() => {})
    expect(mockHttpRequest).not.toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 3. sendSingleInvoice() — SINGLE INVOICING
// ═══════════════════════════════════════════════════════════════════════════════

describe('sendSingleInvoice() — success', () => {
  beforeEach(() => {
    mockHttpRequest.mockResolvedValue({ data: SINGLE_INVOICE_RESPONSE } as never)
  })

  it('returns the Daraja response on success', async () => {
    const result = await sendSingleInvoice(SANDBOX_URL, ACCESS_TOKEN, BASE_SINGLE_INVOICE_REQUEST)
    expect(result).toStrictEqual(SINGLE_INVOICE_RESPONSE)
  })

  it('calls the correct single-invoicing endpoint', async () => {
    await sendSingleInvoice(SANDBOX_URL, ACCESS_TOKEN, BASE_SINGLE_INVOICE_REQUEST)
    expect(mockHttpRequest).toHaveBeenCalledWith(
      `${SANDBOX_URL}/v1/billmanager-invoice/single-invoicing`,
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('sends Authorization header with Bearer token', async () => {
    await sendSingleInvoice(SANDBOX_URL, ACCESS_TOKEN, BASE_SINGLE_INVOICE_REQUEST)
    expect(mockHttpRequest).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${ACCESS_TOKEN}` }),
      }),
    )
  })
})

describe('sendSingleInvoice() — request body shape (Daraja spec)', () => {
  beforeEach(() => {
    mockHttpRequest.mockResolvedValue({ data: SINGLE_INVOICE_RESPONSE } as never)
  })

  function getBody(): Record<string, unknown> {
    const call = mockHttpRequest.mock.calls[0]
    return (call?.[1] as { body: Record<string, unknown> }).body
  }

  it('sends externalReference as provided', async () => {
    await sendSingleInvoice(SANDBOX_URL, ACCESS_TOKEN, BASE_SINGLE_INVOICE_REQUEST)
    expect(getBody()['externalReference']).toBe('#9932340')
  })

  it('sends billedFullName as provided (required per Daraja docs)', async () => {
    await sendSingleInvoice(SANDBOX_URL, ACCESS_TOKEN, BASE_SINGLE_INVOICE_REQUEST)
    expect(getBody()['billedFullName']).toBe('John Doe')
  })

  it('sends billedPhoneNumber as provided (required per Daraja docs)', async () => {
    await sendSingleInvoice(SANDBOX_URL, ACCESS_TOKEN, BASE_SINGLE_INVOICE_REQUEST)
    expect(getBody()['billedPhoneNumber']).toBe('0722000000')
  })

  it('sends billedPeriod as provided (per Daraja docs field name)', async () => {
    await sendSingleInvoice(SANDBOX_URL, ACCESS_TOKEN, BASE_SINGLE_INVOICE_REQUEST)
    expect(getBody()['billedPeriod']).toBe('August 2021')
  })

  it('sends invoiceName as provided', async () => {
    await sendSingleInvoice(SANDBOX_URL, ACCESS_TOKEN, BASE_SINGLE_INVOICE_REQUEST)
    expect(getBody()['invoiceName']).toBe('Jentrys')
  })

  it('sends dueDate as provided', async () => {
    await sendSingleInvoice(SANDBOX_URL, ACCESS_TOKEN, BASE_SINGLE_INVOICE_REQUEST)
    expect(getBody()['dueDate']).toBe('2021-10-12')
  })

  it('sends accountReference as provided', async () => {
    await sendSingleInvoice(SANDBOX_URL, ACCESS_TOKEN, BASE_SINGLE_INVOICE_REQUEST)
    expect(getBody()['accountReference']).toBe('1ASD678H')
  })

  it('sends amount as a string (per Daraja docs)', async () => {
    await sendSingleInvoice(SANDBOX_URL, ACCESS_TOKEN, BASE_SINGLE_INVOICE_REQUEST)
    const amount = getBody()['amount']
    expect(typeof amount).toBe('string')
    expect(amount).toBe('800')
  })

  it('rounds fractional amounts before stringifying (799.7 → "800")', async () => {
    await sendSingleInvoice(SANDBOX_URL, ACCESS_TOKEN, {
      ...BASE_SINGLE_INVOICE_REQUEST,
      amount: 799.7,
    })
    expect(getBody()['amount']).toBe('800')
  })

  it('includes invoiceItems when provided', async () => {
    await sendSingleInvoice(SANDBOX_URL, ACCESS_TOKEN, BASE_SINGLE_INVOICE_REQUEST)
    const items = getBody()['invoiceItems'] as Array<{ itemName: string; amount: string }>
    expect(Array.isArray(items)).toBe(true)
    expect(items).toHaveLength(2)
    expect(items[0]).toStrictEqual({ itemName: 'food', amount: '700' })
    expect(items[1]).toStrictEqual({ itemName: 'water', amount: '100' })
  })

  it('invoiceItems amounts are sent as strings', async () => {
    await sendSingleInvoice(SANDBOX_URL, ACCESS_TOKEN, BASE_SINGLE_INVOICE_REQUEST)
    const items = getBody()['invoiceItems'] as Array<{ itemName: string; amount: string }>
    for (const item of items) {
      expect(typeof item.amount).toBe('string')
    }
  })

  it('sends empty invoiceItems array when not provided', async () => {
    const req: BillManagerSingleInvoiceRequest = { ...BASE_SINGLE_INVOICE_REQUEST }
    delete req.invoiceItems
    await sendSingleInvoice(SANDBOX_URL, ACCESS_TOKEN, req)
    expect(getBody()['invoiceItems']).toStrictEqual([])
  })

  it('does NOT send partyA (wrong legacy field) — uses billedPhoneNumber', async () => {
    await sendSingleInvoice(SANDBOX_URL, ACCESS_TOKEN, BASE_SINGLE_INVOICE_REQUEST)
    expect(getBody()).not.toHaveProperty('partyA')
    expect(getBody()).toHaveProperty('billedPhoneNumber')
  })

  it('does NOT send billingPeriod (wrong legacy field) — uses billedPeriod', async () => {
    await sendSingleInvoice(SANDBOX_URL, ACCESS_TOKEN, BASE_SINGLE_INVOICE_REQUEST)
    expect(getBody()).not.toHaveProperty('billingPeriod')
    expect(getBody()).toHaveProperty('billedPeriod')
  })
})

describe('sendSingleInvoice() — validation', () => {
  it('throws VALIDATION_ERROR when externalReference is empty', async () => {
    await expect(
      sendSingleInvoice(SANDBOX_URL, ACCESS_TOKEN, {
        ...BASE_SINGLE_INVOICE_REQUEST,
        externalReference: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when billedFullName is empty', async () => {
    await expect(
      sendSingleInvoice(SANDBOX_URL, ACCESS_TOKEN, {
        ...BASE_SINGLE_INVOICE_REQUEST,
        billedFullName: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when billedPhoneNumber is empty', async () => {
    await expect(
      sendSingleInvoice(SANDBOX_URL, ACCESS_TOKEN, {
        ...BASE_SINGLE_INVOICE_REQUEST,
        billedPhoneNumber: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when billedPeriod is empty', async () => {
    await expect(
      sendSingleInvoice(SANDBOX_URL, ACCESS_TOKEN, {
        ...BASE_SINGLE_INVOICE_REQUEST,
        billedPeriod: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when invoiceName is empty', async () => {
    await expect(
      sendSingleInvoice(SANDBOX_URL, ACCESS_TOKEN, {
        ...BASE_SINGLE_INVOICE_REQUEST,
        invoiceName: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when dueDate is empty', async () => {
    await expect(
      sendSingleInvoice(SANDBOX_URL, ACCESS_TOKEN, {
        ...BASE_SINGLE_INVOICE_REQUEST,
        dueDate: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when accountReference is empty', async () => {
    await expect(
      sendSingleInvoice(SANDBOX_URL, ACCESS_TOKEN, {
        ...BASE_SINGLE_INVOICE_REQUEST,
        accountReference: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR for amount 0', async () => {
    await expect(
      sendSingleInvoice(SANDBOX_URL, ACCESS_TOKEN, {
        ...BASE_SINGLE_INVOICE_REQUEST,
        amount: 0,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR for negative amount', async () => {
    await expect(
      sendSingleInvoice(SANDBOX_URL, ACCESS_TOKEN, {
        ...BASE_SINGLE_INVOICE_REQUEST,
        amount: -500,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR for amount that rounds to 0 (e.g. 0.4)', async () => {
    await expect(
      sendSingleInvoice(SANDBOX_URL, ACCESS_TOKEN, {
        ...BASE_SINGLE_INVOICE_REQUEST,
        amount: 0.4,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('accepts amount 1 (minimum)', async () => {
    mockHttpRequest.mockResolvedValue({ data: SINGLE_INVOICE_RESPONSE } as never)
    await expect(
      sendSingleInvoice(SANDBOX_URL, ACCESS_TOKEN, {
        ...BASE_SINGLE_INVOICE_REQUEST,
        amount: 1,
      }),
    ).resolves.toBeDefined()
  })

  it('does not call httpRequest when validation fails', async () => {
    await sendSingleInvoice(SANDBOX_URL, ACCESS_TOKEN, {
      ...BASE_SINGLE_INVOICE_REQUEST,
      billedFullName: '',
    }).catch(() => {})
    expect(mockHttpRequest).not.toHaveBeenCalled()
  })
})

describe('sendSingleInvoice() — error propagation', () => {
  it('propagates a generic Error from httpRequest', async () => {
    mockHttpRequest.mockRejectedValue(new Error('ETIMEDOUT'))
    await expect(
      sendSingleInvoice(SANDBOX_URL, ACCESS_TOKEN, BASE_SINGLE_INVOICE_REQUEST),
    ).rejects.toThrow('ETIMEDOUT')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 4. sendBulkInvoices() — BULK INVOICING
// ═══════════════════════════════════════════════════════════════════════════════

describe('sendBulkInvoices() — success', () => {
  beforeEach(() => {
    mockHttpRequest.mockResolvedValue({ data: BULK_INVOICE_RESPONSE } as never)
  })

  it('returns the Daraja bulk invoice response on success', async () => {
    const result = await sendBulkInvoices(SANDBOX_URL, ACCESS_TOKEN, BASE_BULK_INVOICE_REQUEST)
    expect(result).toStrictEqual(BULK_INVOICE_RESPONSE)
  })

  it('calls the correct bulk-invoicing endpoint', async () => {
    await sendBulkInvoices(SANDBOX_URL, ACCESS_TOKEN, BASE_BULK_INVOICE_REQUEST)
    expect(mockHttpRequest).toHaveBeenCalledWith(
      `${SANDBOX_URL}/v1/billmanager-invoice/bulk-invoicing`,
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('sends Authorization header with Bearer token', async () => {
    await sendBulkInvoices(SANDBOX_URL, ACCESS_TOKEN, BASE_BULK_INVOICE_REQUEST)
    expect(mockHttpRequest).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${ACCESS_TOKEN}` }),
      }),
    )
  })
})

describe('sendBulkInvoices() — request body shape (Daraja spec)', () => {
  beforeEach(() => {
    mockHttpRequest.mockResolvedValue({ data: BULK_INVOICE_RESPONSE } as never)
  })

  function getBody(): unknown {
    const call = mockHttpRequest.mock.calls[0]
    return (call?.[1] as { body: unknown }).body
  }

  it('sends the invoices as a raw array (not wrapped in an object)', async () => {
    await sendBulkInvoices(SANDBOX_URL, ACCESS_TOKEN, BASE_BULK_INVOICE_REQUEST)
    const body = getBody()
    expect(Array.isArray(body)).toBe(true)
  })

  it('sends the correct number of invoices', async () => {
    await sendBulkInvoices(SANDBOX_URL, ACCESS_TOKEN, BASE_BULK_INVOICE_REQUEST)
    const body = getBody() as unknown[]
    expect(body).toHaveLength(2)
  })

  it('each invoice in the array has billedFullName (per docs)', async () => {
    await sendBulkInvoices(SANDBOX_URL, ACCESS_TOKEN, BASE_BULK_INVOICE_REQUEST)
    const body = getBody() as Array<Record<string, unknown>>
    expect(body[0]?.['billedFullName']).toBe('John Doe')
    expect(body[1]?.['billedFullName']).toBe('Jane Smith')
  })

  it('each invoice in the array has billedPhoneNumber (per docs)', async () => {
    await sendBulkInvoices(SANDBOX_URL, ACCESS_TOKEN, BASE_BULK_INVOICE_REQUEST)
    const body = getBody() as Array<Record<string, unknown>>
    expect(body[0]?.['billedPhoneNumber']).toBe('0722000000')
    expect(body[1]?.['billedPhoneNumber']).toBe('0711000000')
  })

  it('each invoice amount is sent as a string', async () => {
    await sendBulkInvoices(SANDBOX_URL, ACCESS_TOKEN, BASE_BULK_INVOICE_REQUEST)
    const body = getBody() as Array<Record<string, unknown>>
    for (const inv of body) {
      expect(typeof inv['amount']).toBe('string')
    }
    expect(body[0]?.['amount']).toBe('2000')
  })

  it('invoices without invoiceItems get empty array', async () => {
    await sendBulkInvoices(SANDBOX_URL, ACCESS_TOKEN, BASE_BULK_INVOICE_REQUEST)
    const body = getBody() as Array<Record<string, unknown>>
    // Second invoice has no invoiceItems
    expect(body[1]?.['invoiceItems']).toStrictEqual([])
  })
})

describe('sendBulkInvoices() — validation', () => {
  it('throws VALIDATION_ERROR when invoices array is empty', async () => {
    await expect(
      sendBulkInvoices(SANDBOX_URL, ACCESS_TOKEN, { invoices: [] }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when invoices exceed 1000 (per Daraja docs limit)', async () => {
    const manyInvoices: BillManagerSingleInvoiceRequest[] = Array.from(
      { length: 1001 },
      (_, i) => ({
        ...BASE_SINGLE_INVOICE_REQUEST,
        externalReference: `REF-${i}`,
      }),
    )
    await expect(
      sendBulkInvoices(SANDBOX_URL, ACCESS_TOKEN, { invoices: manyInvoices }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('accepts exactly 1000 invoices (maximum per docs)', async () => {
    mockHttpRequest.mockResolvedValue({ data: BULK_INVOICE_RESPONSE } as never)
    const invoices: BillManagerSingleInvoiceRequest[] = Array.from({ length: 1000 }, (_, i) => ({
      ...BASE_SINGLE_INVOICE_REQUEST,
      externalReference: `REF-${i}`,
    }))
    await expect(sendBulkInvoices(SANDBOX_URL, ACCESS_TOKEN, { invoices })).resolves.toBeDefined()
  })

  it('throws VALIDATION_ERROR when an invoice has empty externalReference', async () => {
    await expect(
      sendBulkInvoices(SANDBOX_URL, ACCESS_TOKEN, {
        invoices: [{ ...BASE_SINGLE_INVOICE_REQUEST, externalReference: '' }],
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when an invoice has empty billedFullName', async () => {
    await expect(
      sendBulkInvoices(SANDBOX_URL, ACCESS_TOKEN, {
        invoices: [{ ...BASE_SINGLE_INVOICE_REQUEST, billedFullName: '' }],
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when an invoice has empty billedPhoneNumber', async () => {
    await expect(
      sendBulkInvoices(SANDBOX_URL, ACCESS_TOKEN, {
        invoices: [{ ...BASE_SINGLE_INVOICE_REQUEST, billedPhoneNumber: '' }],
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when an invoice has amount 0', async () => {
    await expect(
      sendBulkInvoices(SANDBOX_URL, ACCESS_TOKEN, {
        invoices: [{ ...BASE_SINGLE_INVOICE_REQUEST, amount: 0 }],
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('does not call httpRequest when validation fails', async () => {
    await sendBulkInvoices(SANDBOX_URL, ACCESS_TOKEN, { invoices: [] }).catch(() => {})
    expect(mockHttpRequest).not.toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 5. cancelInvoice() — CANCEL SINGLE INVOICE
// ═══════════════════════════════════════════════════════════════════════════════

describe('cancelInvoice() — success', () => {
  beforeEach(() => {
    mockHttpRequest.mockResolvedValue({ data: CANCEL_RESPONSE } as never)
  })

  it('returns the Daraja cancel response', async () => {
    const result = await cancelInvoice(SANDBOX_URL, ACCESS_TOKEN, CANCEL_INVOICE_REQUEST)
    expect(result).toStrictEqual(CANCEL_RESPONSE)
  })

  it('calls the correct cancel-single-invoice endpoint', async () => {
    await cancelInvoice(SANDBOX_URL, ACCESS_TOKEN, CANCEL_INVOICE_REQUEST)
    expect(mockHttpRequest).toHaveBeenCalledWith(
      `${SANDBOX_URL}/v1/billmanager-invoice/cancel-single-invoice`,
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('sends the externalReference in the request body', async () => {
    await cancelInvoice(SANDBOX_URL, ACCESS_TOKEN, CANCEL_INVOICE_REQUEST)
    const call = mockHttpRequest.mock.calls[0]
    const body = (call?.[1] as { body: Record<string, unknown> }).body
    expect(body['externalReference']).toBe('113')
  })

  it('response rescode "200" indicates success', async () => {
    const result = await cancelInvoice(SANDBOX_URL, ACCESS_TOKEN, CANCEL_INVOICE_REQUEST)
    expect(result.rescode).toBe('200')
  })
})

describe('cancelInvoice() — validation', () => {
  it('throws VALIDATION_ERROR when externalReference is empty', async () => {
    await expect(
      cancelInvoice(SANDBOX_URL, ACCESS_TOKEN, { externalReference: '' }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when externalReference is whitespace only', async () => {
    await expect(
      cancelInvoice(SANDBOX_URL, ACCESS_TOKEN, { externalReference: '   ' }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('does not call httpRequest when validation fails', async () => {
    await cancelInvoice(SANDBOX_URL, ACCESS_TOKEN, { externalReference: '' }).catch(() => {})
    expect(mockHttpRequest).not.toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 6. cancelBulkInvoices() — CANCEL BULK INVOICES
// ═══════════════════════════════════════════════════════════════════════════════

describe('cancelBulkInvoices() — success', () => {
  beforeEach(() => {
    mockHttpRequest.mockResolvedValue({ data: CANCEL_RESPONSE } as never)
  })

  it('returns the Daraja cancel bulk response', async () => {
    const result = await cancelBulkInvoices(SANDBOX_URL, ACCESS_TOKEN, CANCEL_BULK_REQUEST)
    expect(result).toStrictEqual(CANCEL_RESPONSE)
  })

  it('calls the correct cancel-bulk-invoices endpoint', async () => {
    await cancelBulkInvoices(SANDBOX_URL, ACCESS_TOKEN, CANCEL_BULK_REQUEST)
    expect(mockHttpRequest).toHaveBeenCalledWith(
      `${SANDBOX_URL}/v1/billmanager-invoice/cancel-bulk-invoices`,
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('sends a raw array of { externalReference } objects (per Daraja docs)', async () => {
    await cancelBulkInvoices(SANDBOX_URL, ACCESS_TOKEN, CANCEL_BULK_REQUEST)
    const call = mockHttpRequest.mock.calls[0]
    const body = (call?.[1] as { body: unknown }).body
    expect(Array.isArray(body)).toBe(true)
    const arr = body as Array<{ externalReference: string }>
    expect(arr).toHaveLength(2)
    expect(arr[0]).toStrictEqual({ externalReference: '113' })
    expect(arr[1]).toStrictEqual({ externalReference: '114' })
  })
})

describe('cancelBulkInvoices() — validation', () => {
  it('throws VALIDATION_ERROR when externalReferences array is empty', async () => {
    await expect(
      cancelBulkInvoices(SANDBOX_URL, ACCESS_TOKEN, { externalReferences: [] }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when any reference is empty string', async () => {
    await expect(
      cancelBulkInvoices(SANDBOX_URL, ACCESS_TOKEN, {
        externalReferences: ['113', '', '114'],
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when any reference is whitespace only', async () => {
    await expect(
      cancelBulkInvoices(SANDBOX_URL, ACCESS_TOKEN, {
        externalReferences: ['   '],
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('does not call httpRequest when validation fails', async () => {
    await cancelBulkInvoices(SANDBOX_URL, ACCESS_TOKEN, {
      externalReferences: [],
    }).catch(() => {})
    expect(mockHttpRequest).not.toHaveBeenCalled()
  })

  it('accepts a single reference', async () => {
    mockHttpRequest.mockResolvedValue({ data: CANCEL_RESPONSE } as never)
    await expect(
      cancelBulkInvoices(SANDBOX_URL, ACCESS_TOKEN, { externalReferences: ['113'] }),
    ).resolves.toBeDefined()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 7. reconcilePayment() — RECONCILIATION / ACKNOWLEDGMENT
// ═══════════════════════════════════════════════════════════════════════════════

describe('reconcilePayment() — success', () => {
  beforeEach(() => {
    mockHttpRequest.mockResolvedValue({ data: RECONCILIATION_RESPONSE } as never)
  })

  it('returns the Daraja reconciliation response', async () => {
    const result = await reconcilePayment(SANDBOX_URL, ACCESS_TOKEN, BASE_RECONCILIATION_REQUEST)
    expect(result).toStrictEqual(RECONCILIATION_RESPONSE)
  })

  it('calls the correct reconciliation endpoint', async () => {
    await reconcilePayment(SANDBOX_URL, ACCESS_TOKEN, BASE_RECONCILIATION_REQUEST)
    expect(mockHttpRequest).toHaveBeenCalledWith(
      `${SANDBOX_URL}/v1/billmanager-invoice/reconciliation`,
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('sends Authorization header with Bearer token', async () => {
    await reconcilePayment(SANDBOX_URL, ACCESS_TOKEN, BASE_RECONCILIATION_REQUEST)
    expect(mockHttpRequest).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${ACCESS_TOKEN}` }),
      }),
    )
  })
})

describe('reconcilePayment() — request body shape (Daraja spec)', () => {
  beforeEach(() => {
    mockHttpRequest.mockResolvedValue({ data: RECONCILIATION_RESPONSE } as never)
  })

  function getBody(): Record<string, unknown> {
    const call = mockHttpRequest.mock.calls[0]
    return (call?.[1] as { body: Record<string, unknown> }).body
  }

  it('sends paymentDate as provided', async () => {
    await reconcilePayment(SANDBOX_URL, ACCESS_TOKEN, BASE_RECONCILIATION_REQUEST)
    expect(getBody()['paymentDate']).toBe('2021-10-01')
  })

  it('sends paidAmount as provided', async () => {
    await reconcilePayment(SANDBOX_URL, ACCESS_TOKEN, BASE_RECONCILIATION_REQUEST)
    expect(getBody()['paidAmount']).toBe('800')
  })

  it('sends accountReference as provided', async () => {
    await reconcilePayment(SANDBOX_URL, ACCESS_TOKEN, BASE_RECONCILIATION_REQUEST)
    expect(getBody()['accountReference']).toBe('Balboa95')
  })

  it('sends transactionId as provided', async () => {
    await reconcilePayment(SANDBOX_URL, ACCESS_TOKEN, BASE_RECONCILIATION_REQUEST)
    expect(getBody()['transactionId']).toBe('PJB53MYR1N')
  })

  it('sends phoneNumber as provided', async () => {
    await reconcilePayment(SANDBOX_URL, ACCESS_TOKEN, BASE_RECONCILIATION_REQUEST)
    expect(getBody()['phoneNumber']).toBe('0710000000')
  })

  it('sends fullName as provided', async () => {
    await reconcilePayment(SANDBOX_URL, ACCESS_TOKEN, BASE_RECONCILIATION_REQUEST)
    expect(getBody()['fullName']).toBe('John Doe')
  })

  it('sends invoiceName as provided', async () => {
    await reconcilePayment(SANDBOX_URL, ACCESS_TOKEN, BASE_RECONCILIATION_REQUEST)
    expect(getBody()['invoiceName']).toBe('School Fees')
  })

  it('sends externalReference as provided', async () => {
    await reconcilePayment(SANDBOX_URL, ACCESS_TOKEN, BASE_RECONCILIATION_REQUEST)
    expect(getBody()['externalReference']).toBe('955')
  })

  it('sends exactly 8 documented fields', async () => {
    await reconcilePayment(SANDBOX_URL, ACCESS_TOKEN, BASE_RECONCILIATION_REQUEST)
    const body = getBody()
    const expectedFields = [
      'paymentDate',
      'paidAmount',
      'accountReference',
      'transactionId',
      'phoneNumber',
      'fullName',
      'invoiceName',
      'externalReference',
    ]
    for (const field of expectedFields) {
      expect(body).toHaveProperty(field)
    }
    expect(Object.keys(body)).toHaveLength(8)
  })
})

describe('reconcilePayment() — validation', () => {
  it('throws VALIDATION_ERROR when transactionId is empty', async () => {
    await expect(
      reconcilePayment(SANDBOX_URL, ACCESS_TOKEN, {
        ...BASE_RECONCILIATION_REQUEST,
        transactionId: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when externalReference is empty', async () => {
    await expect(
      reconcilePayment(SANDBOX_URL, ACCESS_TOKEN, {
        ...BASE_RECONCILIATION_REQUEST,
        externalReference: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when accountReference is empty', async () => {
    await expect(
      reconcilePayment(SANDBOX_URL, ACCESS_TOKEN, {
        ...BASE_RECONCILIATION_REQUEST,
        accountReference: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when paidAmount is empty', async () => {
    await expect(
      reconcilePayment(SANDBOX_URL, ACCESS_TOKEN, {
        ...BASE_RECONCILIATION_REQUEST,
        paidAmount: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when paymentDate is empty', async () => {
    await expect(
      reconcilePayment(SANDBOX_URL, ACCESS_TOKEN, {
        ...BASE_RECONCILIATION_REQUEST,
        paymentDate: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when phoneNumber is empty', async () => {
    await expect(
      reconcilePayment(SANDBOX_URL, ACCESS_TOKEN, {
        ...BASE_RECONCILIATION_REQUEST,
        phoneNumber: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when fullName is empty', async () => {
    await expect(
      reconcilePayment(SANDBOX_URL, ACCESS_TOKEN, {
        ...BASE_RECONCILIATION_REQUEST,
        fullName: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when invoiceName is empty', async () => {
    await expect(
      reconcilePayment(SANDBOX_URL, ACCESS_TOKEN, {
        ...BASE_RECONCILIATION_REQUEST,
        invoiceName: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('does not call httpRequest when validation fails', async () => {
    await reconcilePayment(SANDBOX_URL, ACCESS_TOKEN, {
      ...BASE_RECONCILIATION_REQUEST,
      transactionId: '',
    }).catch(() => {})
    expect(mockHttpRequest).not.toHaveBeenCalled()
  })
})

describe('reconcilePayment() — error propagation', () => {
  it('propagates a generic Error from httpRequest', async () => {
    mockHttpRequest.mockRejectedValue(new Error('ECONNRESET'))
    await expect(
      reconcilePayment(SANDBOX_URL, ACCESS_TOKEN, BASE_RECONCILIATION_REQUEST),
    ).rejects.toThrow('ECONNRESET')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 8. BillManagerPaymentNotification — TYPE STRUCTURE (Daraja spec)
// ═══════════════════════════════════════════════════════════════════════════════

describe('BillManagerPaymentNotification structure (Daraja spec)', () => {
  /**
   * Per Daraja docs, when a customer pays your paybill Bill Manager POSTs:
   * {
   *   "transactionId":"RJB53MYR1N",
   *   "paidAmount":"5000",
   *   "msisdn":"254710119383",
   *   "dateCreated":"2021-09-15",
   *   "accountReference":"LGHJIO789",
   *   "shortCode":"349350555"
   * }
   */
  const PAYMENT_NOTIFICATION: BillManagerPaymentNotification = {
    transactionId: 'RJB53MYR1N',
    paidAmount: '5000',
    msisdn: '254710119383',
    dateCreated: '2021-09-15',
    accountReference: 'LGHJIO789',
    shortCode: '349350555',
  }

  it('has transactionId as a string (M-PESA receipt number)', () => {
    expect(typeof PAYMENT_NOTIFICATION.transactionId).toBe('string')
    expect(PAYMENT_NOTIFICATION.transactionId).toBe('RJB53MYR1N')
  })

  it('has paidAmount as a string', () => {
    expect(typeof PAYMENT_NOTIFICATION.paidAmount).toBe('string')
    expect(PAYMENT_NOTIFICATION.paidAmount).toBe('5000')
  })

  it('has msisdn as a string (customer phone number)', () => {
    expect(typeof PAYMENT_NOTIFICATION.msisdn).toBe('string')
    expect(PAYMENT_NOTIFICATION.msisdn).toBe('254710119383')
  })

  it('has dateCreated as a string', () => {
    expect(typeof PAYMENT_NOTIFICATION.dateCreated).toBe('string')
    expect(PAYMENT_NOTIFICATION.dateCreated).toBe('2021-09-15')
  })

  it('has accountReference as a string', () => {
    expect(typeof PAYMENT_NOTIFICATION.accountReference).toBe('string')
    expect(PAYMENT_NOTIFICATION.accountReference).toBe('LGHJIO789')
  })

  it('has shortCode as a string', () => {
    expect(typeof PAYMENT_NOTIFICATION.shortCode).toBe('string')
    expect(PAYMENT_NOTIFICATION.shortCode).toBe('349350555')
  })

  it('uses msisdn (not phoneNumber) per Daraja docs', () => {
    // The notification field is "msisdn" not "phoneNumber"
    expect(PAYMENT_NOTIFICATION).toHaveProperty('msisdn')
    expect(PAYMENT_NOTIFICATION).not.toHaveProperty('phoneNumber')
  })

  it('uses dateCreated (not paymentDate) per Daraja docs', () => {
    // The notification field is "dateCreated" not "paymentDate"
    expect(PAYMENT_NOTIFICATION).toHaveProperty('dateCreated')
    expect(PAYMENT_NOTIFICATION).not.toHaveProperty('paymentDate')
  })

  it('uses shortCode (not shortcode) per Daraja docs', () => {
    expect(PAYMENT_NOTIFICATION).toHaveProperty('shortCode')
    expect(PAYMENT_NOTIFICATION).not.toHaveProperty('shortcode')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 9. INTEGRATION — All Bill Manager functions target correct endpoints
// ═══════════════════════════════════════════════════════════════════════════════

describe('Bill Manager — endpoint URL correctness (integration)', () => {
  beforeEach(() => {
    mockHttpRequest.mockResolvedValue({ data: { resmsg: 'Success', rescode: '200' } } as never)
  })

  it('billManagerOptIn → /v1/billmanager-invoice/optin', async () => {
    await billManagerOptIn(SANDBOX_URL, ACCESS_TOKEN, BASE_OPT_IN_REQUEST)
    const url = mockHttpRequest.mock.calls[0]?.[0] as string
    expect(url).toBe(`${SANDBOX_URL}/v1/billmanager-invoice/optin`)
  })

  it('updateOptIn → /v1/billmanager-invoice/change-optin-details', async () => {
    await updateOptIn(
      SANDBOX_URL,
      ACCESS_TOKEN,
      BASE_OPT_IN_REQUEST as BillManagerUpdateOptInRequest,
    )
    const url = mockHttpRequest.mock.calls[0]?.[0] as string
    expect(url).toBe(`${SANDBOX_URL}/v1/billmanager-invoice/change-optin-details`)
  })

  it('sendSingleInvoice → /v1/billmanager-invoice/single-invoicing', async () => {
    await sendSingleInvoice(SANDBOX_URL, ACCESS_TOKEN, BASE_SINGLE_INVOICE_REQUEST)
    const url = mockHttpRequest.mock.calls[0]?.[0] as string
    expect(url).toBe(`${SANDBOX_URL}/v1/billmanager-invoice/single-invoicing`)
  })

  it('sendBulkInvoices → /v1/billmanager-invoice/bulk-invoicing', async () => {
    await sendBulkInvoices(SANDBOX_URL, ACCESS_TOKEN, BASE_BULK_INVOICE_REQUEST)
    const url = mockHttpRequest.mock.calls[0]?.[0] as string
    expect(url).toBe(`${SANDBOX_URL}/v1/billmanager-invoice/bulk-invoicing`)
  })

  it('cancelInvoice → /v1/billmanager-invoice/cancel-single-invoice', async () => {
    await cancelInvoice(SANDBOX_URL, ACCESS_TOKEN, CANCEL_INVOICE_REQUEST)
    const url = mockHttpRequest.mock.calls[0]?.[0] as string
    expect(url).toBe(`${SANDBOX_URL}/v1/billmanager-invoice/cancel-single-invoice`)
  })

  it('cancelBulkInvoices → /v1/billmanager-invoice/cancel-bulk-invoices', async () => {
    await cancelBulkInvoices(SANDBOX_URL, ACCESS_TOKEN, CANCEL_BULK_REQUEST)
    const url = mockHttpRequest.mock.calls[0]?.[0] as string
    expect(url).toBe(`${SANDBOX_URL}/v1/billmanager-invoice/cancel-bulk-invoices`)
  })

  it('reconcilePayment → /v1/billmanager-invoice/reconciliation', async () => {
    await reconcilePayment(SANDBOX_URL, ACCESS_TOKEN, BASE_RECONCILIATION_REQUEST)
    const url = mockHttpRequest.mock.calls[0]?.[0] as string
    expect(url).toBe(`${SANDBOX_URL}/v1/billmanager-invoice/reconciliation`)
  })

  it('all endpoints use POST method', async () => {
    const calls = [
      billManagerOptIn(SANDBOX_URL, ACCESS_TOKEN, BASE_OPT_IN_REQUEST),
      updateOptIn(SANDBOX_URL, ACCESS_TOKEN, BASE_OPT_IN_REQUEST),
      sendSingleInvoice(SANDBOX_URL, ACCESS_TOKEN, BASE_SINGLE_INVOICE_REQUEST),
      sendBulkInvoices(SANDBOX_URL, ACCESS_TOKEN, BASE_BULK_INVOICE_REQUEST),
      cancelInvoice(SANDBOX_URL, ACCESS_TOKEN, CANCEL_INVOICE_REQUEST),
      cancelBulkInvoices(SANDBOX_URL, ACCESS_TOKEN, CANCEL_BULK_REQUEST),
      reconcilePayment(SANDBOX_URL, ACCESS_TOKEN, BASE_RECONCILIATION_REQUEST),
    ]
    await Promise.all(calls)
    for (const call of mockHttpRequest.mock.calls) {
      const opts = call[1] as { method: string }
      expect(opts.method).toBe('POST')
    }
  })
})

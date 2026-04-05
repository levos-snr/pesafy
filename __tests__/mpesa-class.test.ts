/**
 * __tests__/mpesa-class.test.ts
 *
 * Focused test suite for the Mpesa class (src/mpesa/index.ts).
 *
 * The existing mpesa-index.test.ts covers shape/exports.
 * This file covers the BEHAVIOUR of every method:
 *   - Happy path: correct token + credential wiring → delegates to underlying fn
 *   - Sad path:   missing config fields → throws VALIDATION_ERROR before any HTTP
 *   - stkPushSafe / accountBalanceSafe: Result<T> wrapping
 *   - clearTokenCache(): delegates to TokenManager
 *   - environment getter
 *   - securityCredential: pre-computed vs derived from initiatorPassword+cert
 *
 * Run: pnpm test
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ── Mocks ─────────────────────────────────────────────────────────────────────
// Mock HTTP so no real network calls happen
vi.mock('../src/utils/http', () => ({ httpRequest: vi.fn() }))

// Mock fs/promises so certificate path tests don't touch disk
vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}))

// Mock encryption so we don't need a real cert
vi.mock('../src/core/encryption', () => ({
  encryptSecurityCredential: vi.fn().mockReturnValue('mocked-security-credential=='),
}))

import { httpRequest } from '../src/utils/http'
import { readFile } from 'node:fs/promises'
import { encryptSecurityCredential } from '../src/core/encryption'
import { Mpesa } from '../src/mpesa'
import { PesafyError } from '../src/utils/errors'

// ── Typed mocks ───────────────────────────────────────────────────────────────
const mockHttp = vi.mocked(httpRequest)
const mockReadFile = vi.mocked(readFile)
const mockEncrypt = vi.mocked(encryptSecurityCredential)

// ── Fixtures ──────────────────────────────────────────────────────────────────
const BASE_CONFIG = {
  consumerKey: 'test-key',
  consumerSecret: 'test-secret',
  environment: 'sandbox' as const,
}

const STK_CONFIG = {
  ...BASE_CONFIG,
  lipaNaMpesaShortCode: '174379',
  lipaNaMpesaPassKey: 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919',
}

const INITIATOR_CONFIG = {
  ...STK_CONFIG,
  initiatorName: 'testapi',
  securityCredential: 'pre-computed-cred==',
}

/** Fake token response */
function mockToken() {
  mockHttp.mockResolvedValueOnce({
    data: { access_token: 'test-token-xyz', expires_in: 3599 },
    status: 200,
    headers: {},
  } as never)
}

/** Fake successful Daraja acknowledgement (generic) */
function mockAck(extra: Record<string, string> = {}) {
  mockHttp.mockResolvedValueOnce({
    data: {
      OriginatorConversationID: 'oc-123',
      ConversationID: 'c-123',
      ResponseCode: '0',
      ResponseDescription: 'Accept the service request successfully.',
      ...extra,
    },
    status: 200,
    headers: {},
  } as never)
}

/** Fake STK push response */
function mockStkPushResponse() {
  mockHttp.mockResolvedValueOnce({
    data: {
      MerchantRequestID: 'mr-1',
      CheckoutRequestID: 'cr-1',
      ResponseCode: '0',
      ResponseDescription: 'Success',
      CustomerMessage: 'Please enter PIN',
    },
    status: 200,
    headers: {},
  } as never)
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. CONSTRUCTOR
// ═══════════════════════════════════════════════════════════════════════════════

describe('Mpesa constructor', () => {
  it('instantiates successfully with minimal config', () => {
    expect(() => new Mpesa(BASE_CONFIG)).not.toThrow()
  })

  it('throws INVALID_CREDENTIALS when consumerKey is empty', () => {
    expect(() => new Mpesa({ ...BASE_CONFIG, consumerKey: '' })).toThrow(PesafyError)

    let err: PesafyError | undefined
    try {
      new Mpesa({ ...BASE_CONFIG, consumerKey: '' })
    } catch (e) {
      err = e as PesafyError
    }
    expect(err?.code).toBe('INVALID_CREDENTIALS')
  })

  it('throws INVALID_CREDENTIALS when consumerSecret is empty', () => {
    let err: PesafyError | undefined
    try {
      new Mpesa({ ...BASE_CONFIG, consumerSecret: '' })
    } catch (e) {
      err = e as PesafyError
    }
    expect(err?.code).toBe('INVALID_CREDENTIALS')
  })

  it('environment getter returns the configured environment', () => {
    const sandbox = new Mpesa({ ...BASE_CONFIG, environment: 'sandbox' })
    expect(sandbox.environment).toBe('sandbox')

    const prod = new Mpesa({ ...BASE_CONFIG, environment: 'production' })
    expect(prod.environment).toBe('production')
  })

  it('clearTokenCache() does not throw on a fresh instance', () => {
    const client = new Mpesa(BASE_CONFIG)
    expect(() => client.clearTokenCache()).not.toThrow()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 2. STK PUSH
// ═══════════════════════════════════════════════════════════════════════════════

describe('mpesa.stkPush()', () => {
  afterEach(() => vi.clearAllMocks())

  it('throws VALIDATION_ERROR when lipaNaMpesaShortCode is missing', async () => {
    const client = new Mpesa(BASE_CONFIG)
    await expect(
      client.stkPush({
        amount: 100,
        phoneNumber: '254712345678',
        callbackUrl: 'https://example.com/cb',
        accountReference: 'REF',
        transactionDesc: 'Payment',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when lipaNaMpesaPassKey is missing', async () => {
    const client = new Mpesa({ ...BASE_CONFIG, lipaNaMpesaShortCode: '174379' })
    await expect(
      client.stkPush({
        amount: 100,
        phoneNumber: '254712345678',
        callbackUrl: 'https://example.com/cb',
        accountReference: 'REF',
        transactionDesc: 'Payment',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('fetches a token then calls the STK Push endpoint', async () => {
    const client = new Mpesa(STK_CONFIG)
    mockToken()
    mockStkPushResponse()

    const result = await client.stkPush({
      amount: 100,
      phoneNumber: '0712345678',
      callbackUrl: 'https://example.com/cb',
      accountReference: 'REF',
      transactionDesc: 'Payment',
    })

    expect(mockHttp).toHaveBeenCalledTimes(2) // token + push
    expect(result.ResponseCode).toBe('0')
    expect(result.CheckoutRequestID).toBe('cr-1')
  })

  it('caches the token: second stkPush call uses only 1 new HTTP call', async () => {
    const client = new Mpesa(STK_CONFIG)
    mockToken() // token
    mockStkPushResponse() // first push
    mockStkPushResponse() // second push

    await client.stkPush({
      amount: 100,
      phoneNumber: '0712345678',
      callbackUrl: 'https://example.com/cb',
      accountReference: 'REF',
      transactionDesc: 'Payment',
    })
    await client.stkPush({
      amount: 200,
      phoneNumber: '0712345678',
      callbackUrl: 'https://example.com/cb',
      accountReference: 'REF2',
      transactionDesc: 'Payment2',
    })

    // 1 token + 2 push calls = 3 total
    expect(mockHttp).toHaveBeenCalledTimes(3)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 3. stkPushSafe
// ═══════════════════════════════════════════════════════════════════════════════

describe('mpesa.stkPushSafe()', () => {
  afterEach(() => vi.clearAllMocks())

  it('returns { ok: true, data } on success', async () => {
    const client = new Mpesa(STK_CONFIG)
    mockToken()
    mockStkPushResponse()

    const result = await client.stkPushSafe({
      amount: 100,
      phoneNumber: '0712345678',
      callbackUrl: 'https://example.com/cb',
      accountReference: 'REF',
      transactionDesc: 'Payment',
    })

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.ResponseCode).toBe('0')
  })

  it('returns { ok: false, error } when shortCode is missing (no throw)', async () => {
    const client = new Mpesa(BASE_CONFIG) // no shortCode

    const result = await client.stkPushSafe({
      amount: 100,
      phoneNumber: '0712345678',
      callbackUrl: 'https://example.com/cb',
      accountReference: 'REF',
      transactionDesc: 'Payment',
    })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('VALIDATION_ERROR')
  })

  it('does not throw even when the underlying method would throw', async () => {
    const client = new Mpesa(BASE_CONFIG)
    await expect(
      client.stkPushSafe({
        amount: 100,
        phoneNumber: '0712345678',
        callbackUrl: 'https://example.com/cb',
        accountReference: 'REF',
        transactionDesc: 'Payment',
      }),
    ).resolves.toBeDefined()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 4. STK QUERY
// ═══════════════════════════════════════════════════════════════════════════════

describe('mpesa.stkQuery()', () => {
  afterEach(() => vi.clearAllMocks())

  it('throws VALIDATION_ERROR when lipaNaMpesaShortCode is missing', async () => {
    const client = new Mpesa(BASE_CONFIG)
    await expect(client.stkQuery({ checkoutRequestId: 'cr-1' })).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    })
  })

  it('calls the STK Query endpoint with the checkoutRequestId', async () => {
    const client = new Mpesa(STK_CONFIG)
    mockToken()
    mockHttp.mockResolvedValueOnce({
      data: {
        ResponseCode: '0',
        ResponseDescription: 'Success',
        MerchantRequestID: 'mr-1',
        CheckoutRequestID: 'cr-1',
        ResultCode: 0,
        ResultDesc: 'The service request processed successfully.',
      },
      status: 200,
      headers: {},
    } as never)

    const result = await client.stkQuery({ checkoutRequestId: 'cr-1' })
    expect(result.ResultCode).toBe(0)
    expect(result.CheckoutRequestID).toBe('cr-1')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 5. ACCOUNT BALANCE
// ═══════════════════════════════════════════════════════════════════════════════

describe('mpesa.accountBalance()', () => {
  afterEach(() => vi.clearAllMocks())

  it('throws VALIDATION_ERROR when initiatorName is missing', async () => {
    const client = new Mpesa(BASE_CONFIG)
    await expect(
      client.accountBalance({
        partyA: '600000',
        identifierType: '4',
        resultUrl: 'https://example.com/result',
        queueTimeOutUrl: 'https://example.com/timeout',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('uses securityCredential directly when pre-computed', async () => {
    const client = new Mpesa(INITIATOR_CONFIG)
    mockToken()
    mockAck()

    await client.accountBalance({
      partyA: '600000',
      identifierType: '4',
      resultUrl: 'https://example.com/result',
      queueTimeOutUrl: 'https://example.com/timeout',
    })

    // encryptSecurityCredential should NOT have been called
    expect(mockEncrypt).not.toHaveBeenCalled()
    // 2 HTTP calls: token + balance query
    expect(mockHttp).toHaveBeenCalledTimes(2)
  })

  it('reads certificate from file when certificatePath is provided', async () => {
    const client = new Mpesa({
      ...BASE_CONFIG,
      initiatorName: 'testapi',
      initiatorPassword: 'secret',
      certificatePath: './SandboxCertificate.cer',
    })
    mockReadFile.mockResolvedValueOnce(
      '-----BEGIN CERTIFICATE-----\nfake\n-----END CERTIFICATE-----\n' as never,
    )
    mockToken()
    mockAck()

    await client.accountBalance({
      partyA: '600000',
      identifierType: '4',
      resultUrl: 'https://example.com/result',
      queueTimeOutUrl: 'https://example.com/timeout',
    })

    expect(mockReadFile).toHaveBeenCalledWith('./SandboxCertificate.cer', 'utf-8')
    expect(mockEncrypt).toHaveBeenCalledOnce()
  })

  it('uses certificatePem directly when provided', async () => {
    const client = new Mpesa({
      ...BASE_CONFIG,
      initiatorName: 'testapi',
      initiatorPassword: 'secret',
      certificatePem: '-----BEGIN CERTIFICATE-----\nfakepem\n-----END CERTIFICATE-----\n',
    })
    mockToken()
    mockAck()

    await client.accountBalance({
      partyA: '600000',
      identifierType: '4',
      resultUrl: 'https://example.com/result',
      queueTimeOutUrl: 'https://example.com/timeout',
    })

    expect(mockReadFile).not.toHaveBeenCalled()
    expect(mockEncrypt).toHaveBeenCalledOnce()
  })

  it('throws INVALID_CREDENTIALS when initiatorPassword provided but no cert config', async () => {
    const client = new Mpesa({
      ...BASE_CONFIG,
      initiatorName: 'testapi',
      initiatorPassword: 'secret',
      // No certificatePath, certificatePem, or securityCredential
    })
    mockToken()

    await expect(
      client.accountBalance({
        partyA: '600000',
        identifierType: '4',
        resultUrl: 'https://example.com/result',
        queueTimeOutUrl: 'https://example.com/timeout',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' })
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 6. accountBalanceSafe
// ═══════════════════════════════════════════════════════════════════════════════

describe('mpesa.accountBalanceSafe()', () => {
  afterEach(() => vi.clearAllMocks())

  it('returns { ok: true, data } on success', async () => {
    const client = new Mpesa(INITIATOR_CONFIG)
    mockToken()
    mockAck()

    const result = await client.accountBalanceSafe({
      partyA: '600000',
      identifierType: '4',
      resultUrl: 'https://example.com/result',
      queueTimeOutUrl: 'https://example.com/timeout',
    })

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.ResponseCode).toBe('0')
  })

  it('returns { ok: false, error } when initiatorName is missing', async () => {
    const client = new Mpesa(BASE_CONFIG)

    const result = await client.accountBalanceSafe({
      partyA: '600000',
      identifierType: '4',
      resultUrl: 'https://example.com/result',
      queueTimeOutUrl: 'https://example.com/timeout',
    })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('VALIDATION_ERROR')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 7. TRANSACTION STATUS
// ═══════════════════════════════════════════════════════════════════════════════

describe('mpesa.transactionStatus()', () => {
  afterEach(() => vi.clearAllMocks())

  it('throws VALIDATION_ERROR when initiatorName is missing', async () => {
    const client = new Mpesa(BASE_CONFIG)
    await expect(
      client.transactionStatus({
        transactionId: 'TX123',
        partyA: '600000',
        identifierType: '4',
        resultUrl: 'https://example.com/result',
        queueTimeOutUrl: 'https://example.com/timeout',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('delegates to the underlying queryTransactionStatus function', async () => {
    const client = new Mpesa(INITIATOR_CONFIG)
    mockToken()
    mockAck()

    const result = await client.transactionStatus({
      transactionId: 'TX123',
      partyA: '600000',
      identifierType: '4',
      resultUrl: 'https://example.com/result',
      queueTimeOutUrl: 'https://example.com/timeout',
    })

    expect(result.ResponseCode).toBe('0')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 8. REVERSAL
// ═══════════════════════════════════════════════════════════════════════════════

describe('mpesa.reverseTransaction()', () => {
  afterEach(() => vi.clearAllMocks())

  it('throws VALIDATION_ERROR when initiatorName is missing', async () => {
    const client = new Mpesa(BASE_CONFIG)
    await expect(
      client.reverseTransaction({
        transactionId: 'TX123',
        receiverParty: '600000',
        amount: 100,
        resultUrl: 'https://example.com/result',
        queueTimeOutUrl: 'https://example.com/timeout',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('calls the reversal endpoint with the correct payload', async () => {
    const client = new Mpesa(INITIATOR_CONFIG)
    mockToken()
    mockAck()

    const result = await client.reverseTransaction({
      transactionId: 'PDU91HIVIT',
      receiverParty: '600000',
      amount: 200,
      resultUrl: 'https://example.com/result',
      queueTimeOutUrl: 'https://example.com/timeout',
    })

    expect(result.ResponseCode).toBe('0')
    // Confirm the reversal endpoint was called
    const reversalCall = mockHttp.mock.calls[1] // [0] = token, [1] = reversal
    expect(reversalCall?.[0] as string).toContain('reversal')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 9. DYNAMIC QR
// ═══════════════════════════════════════════════════════════════════════════════

describe('mpesa.generateDynamicQR()', () => {
  afterEach(() => vi.clearAllMocks())

  it('calls the QR endpoint and returns the response', async () => {
    const client = new Mpesa(BASE_CONFIG)
    mockToken()
    mockHttp.mockResolvedValueOnce({
      data: {
        ResponseCode: 'AG_20191219_000043fdf61864',
        RequestID: '16738-27456357-1',
        ResponseDescription: 'QR Code Successfully Generated.',
        QRCode: 'base64EncodedQRImageString==',
      },
      status: 200,
      headers: {},
    } as never)

    const result = await client.generateDynamicQR({
      merchantName: 'Test Shop',
      refNo: 'INV-001',
      amount: 500,
      trxCode: 'BG',
      cpi: '373132',
      size: 300,
    })

    expect(result.QRCode).toBe('base64EncodedQRImageString==')
  })

  it('throws VALIDATION_ERROR for invalid QR request (no merchantName)', async () => {
    // Mpesa.generateDynamicQR fetches the token first, then delegates to
    // _generateDynamicQR which runs validateDynamicQRRequest before the HTTP call.
    // So we need a token mock, but the QR endpoint itself is never called.
    const client = new Mpesa(BASE_CONFIG)
    mockToken()

    await expect(
      client.generateDynamicQR({
        merchantName: '',
        refNo: 'INV-001',
        amount: 500,
        trxCode: 'BG',
        cpi: '373132',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })

    // Only the token fetch was called — the QR endpoint was never reached
    expect(mockHttp).toHaveBeenCalledTimes(1)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 10. C2B METHODS
// ═══════════════════════════════════════════════════════════════════════════════

describe('mpesa.registerC2BUrls()', () => {
  afterEach(() => vi.clearAllMocks())

  it('calls the register URL endpoint', async () => {
    const client = new Mpesa(BASE_CONFIG)
    mockToken()
    mockHttp.mockResolvedValueOnce({
      data: {
        OriginatorCoversationID: 'oc-1',
        ResponseCode: '0',
        ResponseDescription: 'success',
      },
      status: 200,
      headers: {},
    } as never)

    const result = await client.registerC2BUrls({
      shortCode: '600984',
      responseType: 'Completed',
      confirmationUrl: 'https://example.com/confirm',
      validationUrl: 'https://example.com/validate',
    })

    expect(result.ResponseCode).toBe('0')
  })
})

describe('mpesa.simulateC2B()', () => {
  afterEach(() => vi.clearAllMocks())

  it('throws VALIDATION_ERROR in production environment (simulate is sandbox-only)', async () => {
    // Mpesa.simulateC2B fetches the token first, then _simulateC2B checks the baseUrl.
    const client = new Mpesa({ ...BASE_CONFIG, environment: 'production' })
    mockToken()

    await expect(
      client.simulateC2B({
        shortCode: '600984',
        commandId: 'CustomerPayBillOnline',
        amount: 100,
        msisdn: '254708374149',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('calls the simulate endpoint in sandbox', async () => {
    const client = new Mpesa(BASE_CONFIG)
    mockToken()
    mockHttp.mockResolvedValueOnce({
      data: {
        OriginatorCoversationID: 'oc-sim-1',
        ResponseCode: '0',
        ResponseDescription: 'Accept the service request successfully.',
      },
      status: 200,
      headers: {},
    } as never)

    const result = await client.simulateC2B({
      shortCode: '600984',
      commandId: 'CustomerPayBillOnline',
      amount: 100,
      msisdn: '254708374149',
      billRefNumber: 'TestRef',
    })

    expect(result.ResponseCode).toBe('0')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 11. TAX REMITTANCE
// ═══════════════════════════════════════════════════════════════════════════════

describe('mpesa.remitTax()', () => {
  afterEach(() => vi.clearAllMocks())

  it('throws VALIDATION_ERROR when initiatorName is missing', async () => {
    const client = new Mpesa(BASE_CONFIG)
    await expect(
      client.remitTax({
        amount: 1000,
        partyA: '888880',
        accountReference: 'PRN123',
        resultUrl: 'https://example.com/result',
        queueTimeOutUrl: 'https://example.com/timeout',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('calls the remittax endpoint', async () => {
    const client = new Mpesa(INITIATOR_CONFIG)
    mockToken()
    mockAck()

    const result = await client.remitTax({
      amount: 1000,
      partyA: '888880',
      accountReference: 'PRN123',
      resultUrl: 'https://example.com/result',
      queueTimeOutUrl: 'https://example.com/timeout',
    })

    expect(result.ResponseCode).toBe('0')
    const taxCall = mockHttp.mock.calls[1]
    expect(taxCall?.[0] as string).toContain('remittax')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 12. B2B EXPRESS CHECKOUT
// ═══════════════════════════════════════════════════════════════════════════════

describe('mpesa.b2bExpressCheckout()', () => {
  afterEach(() => vi.clearAllMocks())

  it('throws VALIDATION_ERROR when primaryShortCode is missing', async () => {
    // Mpesa.b2bExpressCheckout fetches the token first, then _initiateB2BExpressCheckout
    // validates the payload before making the HTTP call.
    const client = new Mpesa(BASE_CONFIG)
    mockToken()

    await expect(
      client.b2bExpressCheckout({
        primaryShortCode: '',
        receiverShortCode: '000002',
        amount: 100,
        paymentRef: 'REF',
        callbackUrl: 'https://example.com/cb',
        partnerName: 'Vendor',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('calls the USSD push endpoint', async () => {
    const client = new Mpesa(BASE_CONFIG)
    mockToken()
    mockHttp.mockResolvedValueOnce({
      data: { code: '0', status: 'USSD Initiated Successfully' },
      status: 200,
      headers: {},
    } as never)

    const result = await client.b2bExpressCheckout({
      primaryShortCode: '000001',
      receiverShortCode: '000002',
      amount: 100,
      paymentRef: 'REF',
      callbackUrl: 'https://example.com/cb',
      partnerName: 'Vendor',
    })

    expect(result.code).toBe('0')
    const call = mockHttp.mock.calls[1]
    expect(call?.[0] as string).toContain('ussdpush')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 13. B2B BUY GOODS
// ═══════════════════════════════════════════════════════════════════════════════

describe('mpesa.b2bBuyGoods()', () => {
  afterEach(() => vi.clearAllMocks())

  it('throws VALIDATION_ERROR when initiatorName is missing', async () => {
    const client = new Mpesa(BASE_CONFIG)
    await expect(
      client.b2bBuyGoods({
        commandId: 'BusinessBuyGoods',
        amount: 500,
        partyA: '600000',
        partyB: '000000',
        accountReference: 'ACCT123',
        resultUrl: 'https://example.com/result',
        queueTimeOutUrl: 'https://example.com/timeout',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('calls the B2B payment endpoint', async () => {
    const client = new Mpesa(INITIATOR_CONFIG)
    mockToken()
    mockAck()

    const result = await client.b2bBuyGoods({
      commandId: 'BusinessBuyGoods',
      amount: 500,
      partyA: '600000',
      partyB: '000000',
      accountReference: 'ACCT123',
      resultUrl: 'https://example.com/result',
      queueTimeOutUrl: 'https://example.com/timeout',
    })

    expect(result.ResponseCode).toBe('0')
    const call = mockHttp.mock.calls[1]
    expect(call?.[0] as string).toContain('b2b')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 14. B2B PAY BILL
// ═══════════════════════════════════════════════════════════════════════════════

describe('mpesa.b2bPayBill()', () => {
  afterEach(() => vi.clearAllMocks())

  it('throws VALIDATION_ERROR when initiatorName is missing', async () => {
    const client = new Mpesa(BASE_CONFIG)
    await expect(
      client.b2bPayBill({
        commandId: 'BusinessPayBill',
        amount: 500,
        partyA: '600000',
        partyB: '000001',
        accountReference: 'ACCT456',
        resultUrl: 'https://example.com/result',
        queueTimeOutUrl: 'https://example.com/timeout',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('calls the B2B payment endpoint', async () => {
    const client = new Mpesa(INITIATOR_CONFIG)
    mockToken()
    mockAck()

    const result = await client.b2bPayBill({
      commandId: 'BusinessPayBill',
      amount: 500,
      partyA: '600000',
      partyB: '000001',
      accountReference: 'ACCT456',
      resultUrl: 'https://example.com/result',
      queueTimeOutUrl: 'https://example.com/timeout',
    })

    expect(result.ResponseCode).toBe('0')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 15. B2C PAYMENT (Account Top Up)
// ═══════════════════════════════════════════════════════════════════════════════

describe('mpesa.b2cPayment()', () => {
  afterEach(() => vi.clearAllMocks())

  it('throws VALIDATION_ERROR when initiatorName is missing', async () => {
    const client = new Mpesa(BASE_CONFIG)
    await expect(
      client.b2cPayment({
        commandId: 'BusinessPayToBulk',
        amount: 1000,
        partyA: '600000',
        partyB: '600001',
        accountReference: 'BATCH-1',
        resultUrl: 'https://example.com/result',
        queueTimeOutUrl: 'https://example.com/timeout',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('calls the B2C payment endpoint', async () => {
    const client = new Mpesa(INITIATOR_CONFIG)
    mockToken()
    mockAck()

    const result = await client.b2cPayment({
      commandId: 'BusinessPayToBulk',
      amount: 1000,
      partyA: '600000',
      partyB: '600001',
      accountReference: 'BATCH-1',
      resultUrl: 'https://example.com/result',
      queueTimeOutUrl: 'https://example.com/timeout',
    })

    expect(result.ResponseCode).toBe('0')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 16. B2C DISBURSEMENT
// ═══════════════════════════════════════════════════════════════════════════════

describe('mpesa.b2cDisbursement()', () => {
  afterEach(() => vi.clearAllMocks())

  it('throws VALIDATION_ERROR when initiatorName is missing', async () => {
    const client = new Mpesa(BASE_CONFIG)
    await expect(
      client.b2cDisbursement({
        originatorConversationId: 'oc-dis-1',
        commandId: 'BusinessPayment',
        amount: 500,
        partyA: '600000',
        partyB: '254712345678',
        remarks: 'Salary payment',
        resultUrl: 'https://example.com/result',
        queueTimeOutUrl: 'https://example.com/timeout',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('calls the B2C disbursement endpoint', async () => {
    const client = new Mpesa(INITIATOR_CONFIG)
    mockToken()
    mockHttp.mockResolvedValueOnce({
      data: {
        ConversationID: 'c-dis-1',
        OriginatorConversationID: 'oc-dis-1',
        ResponseCode: '0',
        ResponseDescription: 'Accept the service request successfully.',
      },
      status: 200,
      headers: {},
    } as never)

    const result = await client.b2cDisbursement({
      originatorConversationId: 'oc-dis-1',
      commandId: 'SalaryPayment',
      amount: 5000,
      partyA: '600000',
      partyB: '254712345678',
      remarks: 'Salary',
      resultUrl: 'https://example.com/result',
      queueTimeOutUrl: 'https://example.com/timeout',
    })

    expect(result.ResponseCode).toBe('0')
    const call = mockHttp.mock.calls[1]
    expect(call?.[0] as string).toContain('b2c')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 17. BILL MANAGER METHODS
// ═══════════════════════════════════════════════════════════════════════════════

describe('mpesa.billManagerOptIn()', () => {
  afterEach(() => vi.clearAllMocks())

  it('calls the opt-in endpoint', async () => {
    const client = new Mpesa(BASE_CONFIG)
    mockToken()
    mockHttp.mockResolvedValueOnce({
      data: { app_key: 'APP_KEY_123', resmsg: 'Opt-in successful', rescode: '200' },
      status: 200,
      headers: {},
    } as never)

    const result = await client.billManagerOptIn({
      shortcode: '600984',
      email: 'billing@example.com',
      officialContact: '0712345678',
      sendReminders: '1',
      callbackUrl: 'https://example.com/payments',
    })

    expect(result.rescode).toBe('200')
    const call = mockHttp.mock.calls[1]
    expect(call?.[0] as string).toContain('billmanager-invoice/optin')
  })
})

describe('mpesa.updateOptIn()', () => {
  afterEach(() => vi.clearAllMocks())

  it('calls the change-optin-details endpoint', async () => {
    const client = new Mpesa(BASE_CONFIG)
    mockToken()
    mockHttp.mockResolvedValueOnce({
      data: { resmsg: 'Updated', rescode: '200' },
      status: 200,
      headers: {},
    } as never)

    const result = await client.updateOptIn({
      shortcode: '600984',
      email: 'new@example.com',
      officialContact: '0712345678',
      sendReminders: '0',
      callbackUrl: 'https://example.com/payments',
    })

    expect(result.rescode).toBe('200')
    const call = mockHttp.mock.calls[1]
    expect(call?.[0] as string).toContain('change-optin-details')
  })
})

describe('mpesa.sendInvoice()', () => {
  afterEach(() => vi.clearAllMocks())

  it('calls the single-invoicing endpoint', async () => {
    const client = new Mpesa(BASE_CONFIG)
    mockToken()
    mockHttp.mockResolvedValueOnce({
      data: { resmsg: 'Invoice sent', rescode: '200' },
      status: 200,
      headers: {},
    } as never)

    const result = await client.sendInvoice({
      externalReference: 'INV-001',
      billedFullName: 'John Doe',
      billedPhoneNumber: '0712345678',
      billedPeriod: 'April 2025',
      invoiceName: 'Monthly Rent',
      dueDate: '2025-04-30',
      accountReference: 'UNIT-5A',
      amount: 15000,
    })

    expect(result.rescode).toBe('200')
    const call = mockHttp.mock.calls[1]
    expect(call?.[0] as string).toContain('single-invoicing')
  })
})

describe('mpesa.sendBulkInvoices()', () => {
  afterEach(() => vi.clearAllMocks())

  it('calls the bulk-invoicing endpoint', async () => {
    const client = new Mpesa(BASE_CONFIG)
    mockToken()
    mockHttp.mockResolvedValueOnce({
      data: { resmsg: 'Bulk invoices sent', rescode: '200' },
      status: 200,
      headers: {},
    } as never)

    const result = await client.sendBulkInvoices({
      invoices: [
        {
          externalReference: 'INV-A',
          billedFullName: 'Alice',
          billedPhoneNumber: '0712345678',
          billedPeriod: 'April 2025',
          invoiceName: 'Rent',
          dueDate: '2025-04-30',
          accountReference: 'UNIT-1',
          amount: 10000,
        },
      ],
    })

    expect(result.rescode).toBe('200')
    const call = mockHttp.mock.calls[1]
    expect(call?.[0] as string).toContain('bulk-invoicing')
  })
})

describe('mpesa.cancelInvoice()', () => {
  afterEach(() => vi.clearAllMocks())

  it('calls the cancel-single-invoice endpoint', async () => {
    const client = new Mpesa(BASE_CONFIG)
    mockToken()
    mockHttp.mockResolvedValueOnce({
      data: { resmsg: 'Cancelled', rescode: '200' },
      status: 200,
      headers: {},
    } as never)

    const result = await client.cancelInvoice({ externalReference: 'INV-001' })

    expect(result.rescode).toBe('200')
    const call = mockHttp.mock.calls[1]
    expect(call?.[0] as string).toContain('cancel-single-invoice')
  })
})

describe('mpesa.cancelBulkInvoices()', () => {
  afterEach(() => vi.clearAllMocks())

  it('calls the cancel-bulk-invoices endpoint', async () => {
    const client = new Mpesa(BASE_CONFIG)
    mockToken()
    mockHttp.mockResolvedValueOnce({
      data: { resmsg: 'Cancelled', rescode: '200' },
      status: 200,
      headers: {},
    } as never)

    const result = await client.cancelBulkInvoices({
      externalReferences: ['INV-001', 'INV-002'],
    })

    expect(result.rescode).toBe('200')
    const call = mockHttp.mock.calls[1]
    expect(call?.[0] as string).toContain('cancel-bulk-invoices')
  })
})

describe('mpesa.reconcilePayment()', () => {
  afterEach(() => vi.clearAllMocks())

  it('calls the reconciliation endpoint', async () => {
    const client = new Mpesa(BASE_CONFIG)
    mockToken()
    mockHttp.mockResolvedValueOnce({
      data: { resmsg: 'Reconciled', rescode: '200' },
      status: 200,
      headers: {},
    } as never)

    const result = await client.reconcilePayment({
      transactionId: 'RJB53MYR1N',
      externalReference: 'INV-001',
      accountReference: 'LGHJIO789',
      paidAmount: '5000',
      paymentDate: '2021-09-15',
      phoneNumber: '0712345678',
      fullName: 'John Doe',
      invoiceName: 'Monthly Rent',
    })

    expect(result.rescode).toBe('200')
    const call = mockHttp.mock.calls[1]
    expect(call?.[0] as string).toContain('reconciliation')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 18. SECURITY CREDENTIAL DERIVATION PATHS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Mpesa — security credential derivation', () => {
  beforeEach(() => {
    mockEncrypt.mockReturnValue('derived-credential==')
  })
  afterEach(() => vi.clearAllMocks())

  it('uses pre-computed securityCredential without reading files', async () => {
    const client = new Mpesa({
      ...BASE_CONFIG,
      initiatorName: 'api',
      securityCredential: 'precomputed==',
    })
    mockToken()
    mockAck()

    await client.accountBalance({
      partyA: '600000',
      identifierType: '4',
      resultUrl: 'https://example.com/r',
      queueTimeOutUrl: 'https://example.com/t',
    })

    expect(mockReadFile).not.toHaveBeenCalled()
    expect(mockEncrypt).not.toHaveBeenCalled()
  })

  it('throws INVALID_CREDENTIALS when neither credential nor password is set', async () => {
    const client = new Mpesa({
      ...BASE_CONFIG,
      initiatorName: 'api',
      // No securityCredential, no initiatorPassword
    })
    mockToken()

    await expect(
      client.accountBalance({
        partyA: '600000',
        identifierType: '4',
        resultUrl: 'https://example.com/r',
        queueTimeOutUrl: 'https://example.com/t',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' })
  })

  it('reads the certificate file when certificatePath is given', async () => {
    const fakePem = '-----BEGIN CERT-----\nfake\n-----END CERT-----\n'
    mockReadFile.mockResolvedValueOnce(fakePem as never)

    const client = new Mpesa({
      ...BASE_CONFIG,
      initiatorName: 'api',
      initiatorPassword: 'pw',
      certificatePath: '/path/to/cert.cer',
    })
    mockToken()
    mockAck()

    await client.accountBalance({
      partyA: '600000',
      identifierType: '4',
      resultUrl: 'https://example.com/r',
      queueTimeOutUrl: 'https://example.com/t',
    })

    expect(mockReadFile).toHaveBeenCalledWith('/path/to/cert.cer', 'utf-8')
    expect(mockEncrypt).toHaveBeenCalledWith('pw', fakePem)
  })

  it('uses certificatePem inline without file I/O', async () => {
    const pem = '-----BEGIN CERT-----\ninline\n-----END CERT-----\n'
    const client = new Mpesa({
      ...BASE_CONFIG,
      initiatorName: 'api',
      initiatorPassword: 'pw',
      certificatePem: pem,
    })
    mockToken()
    mockAck()

    await client.accountBalance({
      partyA: '600000',
      identifierType: '4',
      resultUrl: 'https://example.com/r',
      queueTimeOutUrl: 'https://example.com/t',
    })

    expect(mockReadFile).not.toHaveBeenCalled()
    expect(mockEncrypt).toHaveBeenCalledWith('pw', pem)
  })
})

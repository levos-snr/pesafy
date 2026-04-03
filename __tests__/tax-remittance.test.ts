/**
 * __tests__/tax-remittance.test.ts
 *
 * Complete test suite for the Tax Remittance module:
 *
 *   Constants
 *   - KRA_SHORTCODE              — KRA M-PESA shortcode constant
 *   - TAX_COMMAND_ID             — CommandID constant
 *
 *   Initiation
 *   - remitTax()                 — POST /mpesa/b2b/v1/remittax
 *
 *   Type guards
 *   - isTaxRemittanceResult()    — runtime payload type guard
 *   - isTaxRemittanceSuccess()   — success type guard (handles "0" and 0)
 *   - isTaxRemittanceFailure()   — failure type guard
 *
 *   Payload extractors
 *   - getTaxResultCode()
 *   - getTaxResultDesc()
 *   - getTaxTransactionId()
 *   - getTaxConversationId()
 *   - getTaxOriginatorConversationId()
 *   - getTaxAmount()
 *   - getTaxCompletedTime()
 *   - getTaxReceiverName()
 *   - getTaxResultParam()
 *
 * Strictly covers only what is documented in the Safaricom Daraja
 * Tax Remittance API documentation.
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
import { KRA_SHORTCODE, remitTax, TAX_COMMAND_ID } from '../src/mpesa/tax-remittance/remit-tax'
import {
  getTaxAmount,
  getTaxCompletedTime,
  getTaxConversationId,
  getTaxOriginatorConversationId,
  getTaxReceiverName,
  getTaxResultCode,
  getTaxResultDesc,
  getTaxResultParam,
  getTaxTransactionId,
  isTaxRemittanceFailure,
  isTaxRemittanceResult,
  isTaxRemittanceSuccess,
} from '../src/mpesa/tax-remittance/webhooks'
import type {
  TaxRemittanceRequest,
  TaxRemittanceResponse,
  TaxRemittanceResult,
} from '../src/mpesa/tax-remittance/types'

// ── Typed mock ────────────────────────────────────────────────────────────────

const mockHttpRequest = vi.mocked(httpRequest)

// ── Shared fixtures ───────────────────────────────────────────────────────────

const SANDBOX_URL = 'https://sandbox.safaricom.co.ke'
const PROD_URL = 'https://api.safaricom.co.ke'
const ACCESS_TOKEN = 'test-bearer-token-tax'
const SECURITY_CREDENTIAL = 'FKX1/KPzT8hFOnozI+unz7mXDgTRbrlrZ+C1Vk=='
const INITIATOR_NAME = 'TaxPayer'

// ── Request fixtures ──────────────────────────────────────────────────────────

const BASE_REQUEST: TaxRemittanceRequest = {
  amount: 239,
  partyA: '888880',
  accountReference: '353353',
  resultUrl: 'https://mydomain.com/b2b/remittax/result/',
  queueTimeOutUrl: 'https://mydomain.com/b2b/remittax/queue/',
  remarks: 'OK',
}

// ── Response fixtures (from Daraja docs) ──────────────────────────────────────

const INITIATE_RESPONSE: TaxRemittanceResponse = {
  OriginatorConversationID: '5118-111210482-1',
  ConversationID: 'AG_20230420_2010759fd5662ef6d054',
  ResponseCode: '0',
  ResponseDescription: 'Accept the service request successfully',
}

// ── Callback payload fixtures (from Daraja docs) ──────────────────────────────

const SUCCESS_RESULT: TaxRemittanceResult = {
  Result: {
    ResultType: '0',
    ResultCode: '0',
    ResultDesc: 'The service request is processed successfully',
    OriginatorConversationID: '626f6ddf-ab37-4650-b882-blde92ec',
    ConversationID: 'AG_20181005_00004d7ee675c0c7ee0b',
    TransactionID: 'QKA81LK5CY',
    ResultParameters: {
      ResultParameter: [
        { Key: 'Amount', Value: '190.00' },
        { Key: 'TransactionCompletedTime', Value: '20221110110717' },
        { Key: 'ReceiverPartyPublicName', Value: '00000 Tax Collecting Company' },
      ],
    },
  },
}

const FAILURE_RESULT: TaxRemittanceResult = {
  Result: {
    ResultType: 0,
    ResultCode: 2001,
    ResultDesc: 'The initiator information is invalid.',
    OriginatorConversationID: '12337-23509183-5',
    ConversationID: 'AG_20230420_2010759fd5662ef6d055',
    TransactionID: 'OAK0000000',
  },
}

const FAILURE_NO_PARAMS: TaxRemittanceResult = {
  Result: {
    ResultType: 0,
    ResultCode: 1,
    ResultDesc: 'Insufficient funds.',
    OriginatorConversationID: 'ORG-001',
    ConversationID: 'CONV-001',
    TransactionID: 'OAK0000001',
  },
}

// Success result with single ResultParameter (non-array — Daraja inconsistency)
const SUCCESS_SINGLE_PARAM: TaxRemittanceResult = {
  Result: {
    ResultType: '0',
    ResultCode: '0',
    ResultDesc: 'The service request is processed successfully',
    OriginatorConversationID: 'ORG-SINGLE',
    ConversationID: 'CONV-SINGLE',
    TransactionID: 'QKA81LK5CZ',
    ResultParameters: {
      ResultParameter: { Key: 'Amount', Value: '500.00' },
    },
  },
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('KRA_SHORTCODE constant', () => {
  it('is "572572" (the only allowed PartyB for tax remittance)', () => {
    expect(KRA_SHORTCODE).toBe('572572')
  })

  it('is a string', () => {
    expect(typeof KRA_SHORTCODE).toBe('string')
  })
})

describe('TAX_COMMAND_ID constant', () => {
  it('is "PayTaxToKRA" (the only allowed CommandID)', () => {
    expect(TAX_COMMAND_ID).toBe('PayTaxToKRA')
  })

  it('is a string', () => {
    expect(typeof TAX_COMMAND_ID).toBe('string')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 2. remitTax() — SUCCESS
// ═══════════════════════════════════════════════════════════════════════════════

describe('remitTax() — success', () => {
  beforeEach(() => {
    mockHttpRequest.mockResolvedValue({ data: INITIATE_RESPONSE } as never)
  })

  it('returns the Daraja acknowledgement on success', async () => {
    const result = await remitTax(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(result).toStrictEqual(INITIATE_RESPONSE)
  })

  it('calls the correct Daraja Tax Remittance endpoint', async () => {
    await remitTax(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, BASE_REQUEST)
    expect(mockHttpRequest).toHaveBeenCalledWith(
      `${SANDBOX_URL}/mpesa/b2b/v1/remittax`,
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('uses the production endpoint URL', async () => {
    await remitTax(PROD_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, BASE_REQUEST)
    expect(mockHttpRequest).toHaveBeenCalledWith(
      `${PROD_URL}/mpesa/b2b/v1/remittax`,
      expect.any(Object),
    )
  })

  it('sends Authorization header with Bearer token', async () => {
    await remitTax(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, BASE_REQUEST)
    expect(mockHttpRequest).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${ACCESS_TOKEN}` }),
      }),
    )
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 3. remitTax() — REQUEST BODY SHAPE (Daraja spec)
// ═══════════════════════════════════════════════════════════════════════════════

describe('remitTax() — request body shape (Daraja spec)', () => {
  beforeEach(() => {
    mockHttpRequest.mockResolvedValue({ data: INITIATE_RESPONSE } as never)
  })

  function getBody(): Record<string, unknown> {
    const call = mockHttpRequest.mock.calls[0]
    return (call?.[1] as { body: Record<string, unknown> }).body
  }

  it('sends Initiator as the provided initiator name', async () => {
    await remitTax(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, BASE_REQUEST)
    expect(getBody()['Initiator']).toBe('TaxPayer')
  })

  it('sends SecurityCredential as provided', async () => {
    await remitTax(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, BASE_REQUEST)
    expect(getBody()['SecurityCredential']).toBe(SECURITY_CREDENTIAL)
  })

  it('sends CommandID as "PayTaxToKRA"', async () => {
    await remitTax(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, BASE_REQUEST)
    expect(getBody()['CommandID']).toBe('PayTaxToKRA')
  })

  it('sends SenderIdentifierType as "4" (hardcoded per Daraja docs)', async () => {
    await remitTax(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, BASE_REQUEST)
    expect(getBody()['SenderIdentifierType']).toBe('4')
  })

  it('sends RecieverIdentifierType as "4" (hardcoded per Daraja docs)', async () => {
    await remitTax(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, BASE_REQUEST)
    expect(getBody()['RecieverIdentifierType']).toBe('4')
  })

  it('sends Amount as a STRING (per Daraja spec)', async () => {
    await remitTax(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, BASE_REQUEST)
    expect(typeof getBody()['Amount']).toBe('string')
    expect(getBody()['Amount']).toBe('239')
  })

  it('rounds fractional amounts and stringifies (e.g. 239.7 → "240")', async () => {
    await remitTax(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
      ...BASE_REQUEST,
      amount: 239.7,
    })
    expect(getBody()['Amount']).toBe('240')
  })

  it('sends PartyA as a string', async () => {
    await remitTax(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, BASE_REQUEST)
    expect(typeof getBody()['PartyA']).toBe('string')
    expect(getBody()['PartyA']).toBe('888880')
  })

  it('sends PartyB as "572572" (KRA shortcode) when not provided', async () => {
    const { partyB: _omit, ...withoutPartyB } = BASE_REQUEST
    await remitTax(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, withoutPartyB)
    expect(getBody()['PartyB']).toBe('572572')
  })

  it('sends PartyB as the provided value when explicitly set', async () => {
    await remitTax(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
      ...BASE_REQUEST,
      partyB: '572572',
    })
    expect(getBody()['PartyB']).toBe('572572')
  })

  it('sends AccountReference exactly as provided (the KRA PRN)', async () => {
    await remitTax(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, BASE_REQUEST)
    expect(getBody()['AccountReference']).toBe('353353')
  })

  it('sends Remarks as provided', async () => {
    await remitTax(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, BASE_REQUEST)
    expect(getBody()['Remarks']).toBe('OK')
  })

  it('defaults Remarks to "Tax Remittance" when not provided', async () => {
    const { remarks: _omit, ...withoutRemarks } = BASE_REQUEST
    await remitTax(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, withoutRemarks)
    expect(getBody()['Remarks']).toBe('Tax Remittance')
  })

  it('sends QueueTimeOutURL exactly as provided', async () => {
    await remitTax(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, BASE_REQUEST)
    expect(getBody()['QueueTimeOutURL']).toBe('https://mydomain.com/b2b/remittax/queue/')
  })

  it('sends ResultURL exactly as provided', async () => {
    await remitTax(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, BASE_REQUEST)
    expect(getBody()['ResultURL']).toBe('https://mydomain.com/b2b/remittax/result/')
  })

  it('sends exactly 12 fields in the request body (all Daraja-documented fields)', async () => {
    await remitTax(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, BASE_REQUEST)
    const body = getBody()
    const expectedFields = [
      'Initiator',
      'SecurityCredential',
      'CommandID',
      'SenderIdentifierType',
      'RecieverIdentifierType',
      'Amount',
      'PartyA',
      'PartyB',
      'AccountReference',
      'Remarks',
      'QueueTimeOutURL',
      'ResultURL',
    ]
    for (const field of expectedFields) {
      expect(body).toHaveProperty(field)
    }
    expect(Object.keys(body)).toHaveLength(12)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 4. remitTax() — VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('remitTax() — amount validation', () => {
  it('throws VALIDATION_ERROR for amount 0', async () => {
    await expect(
      remitTax(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        amount: 0,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR for negative amount', async () => {
    await expect(
      remitTax(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        amount: -100,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR for amount that rounds to 0 (e.g. 0.4)', async () => {
    await expect(
      remitTax(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        amount: 0.4,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('accepts amount 1 (minimum valid value)', async () => {
    mockHttpRequest.mockResolvedValue({ data: INITIATE_RESPONSE } as never)
    await expect(
      remitTax(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        amount: 1,
      }),
    ).resolves.toBeDefined()
  })

  it('accepts 0.6 which rounds to 1 (meets minimum)', async () => {
    mockHttpRequest.mockResolvedValue({ data: INITIATE_RESPONSE } as never)
    await expect(
      remitTax(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        amount: 0.6,
      }),
    ).resolves.toBeDefined()
  })

  it('does not call httpRequest when amount validation fails', async () => {
    await remitTax(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
      ...BASE_REQUEST,
      amount: 0,
    }).catch(() => {})
    expect(mockHttpRequest).not.toHaveBeenCalled()
  })
})

describe('remitTax() — required field validation', () => {
  it('throws VALIDATION_ERROR when partyA is empty', async () => {
    await expect(
      remitTax(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        partyA: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when partyA is whitespace only', async () => {
    await expect(
      remitTax(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        partyA: '   ',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when accountReference is empty', async () => {
    await expect(
      remitTax(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        accountReference: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when accountReference is whitespace only', async () => {
    await expect(
      remitTax(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        accountReference: '   ',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when resultUrl is empty', async () => {
    await expect(
      remitTax(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        resultUrl: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when queueTimeOutUrl is empty', async () => {
    await expect(
      remitTax(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        queueTimeOutUrl: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('does not call httpRequest when required field validation fails', async () => {
    await remitTax(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
      ...BASE_REQUEST,
      partyA: '',
    }).catch(() => {})
    expect(mockHttpRequest).not.toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 5. remitTax() — RESPONSE FIELDS (Daraja spec)
// ═══════════════════════════════════════════════════════════════════════════════

describe('remitTax() — response fields (Daraja spec)', () => {
  beforeEach(() => {
    mockHttpRequest.mockResolvedValue({ data: INITIATE_RESPONSE } as never)
  })

  it('response includes OriginatorConversationID', async () => {
    const res = await remitTax(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(typeof res.OriginatorConversationID).toBe('string')
    expect(res.OriginatorConversationID.length).toBeGreaterThan(0)
  })

  it('response includes ConversationID', async () => {
    const res = await remitTax(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(typeof res.ConversationID).toBe('string')
    expect(res.ConversationID.length).toBeGreaterThan(0)
  })

  it('response includes ResponseCode', async () => {
    const res = await remitTax(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(typeof res.ResponseCode).toBe('string')
  })

  it('response includes ResponseDescription', async () => {
    const res = await remitTax(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(typeof res.ResponseDescription).toBe('string')
  })

  it('ResponseCode "0" indicates the request was accepted', async () => {
    const res = await remitTax(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(res.ResponseCode).toBe('0')
  })

  it('response matches the exact Daraja documented payload', async () => {
    const res = await remitTax(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(res).toStrictEqual(INITIATE_RESPONSE)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 6. remitTax() — ERROR PROPAGATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('remitTax() — error propagation', () => {
  it('propagates a generic Error from httpRequest', async () => {
    mockHttpRequest.mockRejectedValue(new Error('ECONNRESET'))
    await expect(
      remitTax(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, BASE_REQUEST),
    ).rejects.toThrow('ECONNRESET')
  })

  it('propagates a network timeout Error from httpRequest', async () => {
    mockHttpRequest.mockRejectedValue(new Error('ETIMEDOUT'))
    await expect(
      remitTax(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, BASE_REQUEST),
    ).rejects.toThrow('ETIMEDOUT')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 7. isTaxRemittanceResult() — RUNTIME TYPE GUARD
// ═══════════════════════════════════════════════════════════════════════════════

describe('isTaxRemittanceResult() — runtime type guard', () => {
  it('returns true for a valid success result payload', () => {
    expect(isTaxRemittanceResult(SUCCESS_RESULT)).toBe(true)
  })

  it('returns true for a valid failure result payload', () => {
    expect(isTaxRemittanceResult(FAILURE_RESULT)).toBe(true)
  })

  it('returns true for a failure result with no ResultParameters', () => {
    expect(isTaxRemittanceResult(FAILURE_NO_PARAMS)).toBe(true)
  })

  it('returns false for null', () => {
    expect(isTaxRemittanceResult(null)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(isTaxRemittanceResult(undefined)).toBe(false)
  })

  it('returns false for an empty object', () => {
    expect(isTaxRemittanceResult({})).toBe(false)
  })

  it('returns false when Result is missing', () => {
    expect(isTaxRemittanceResult({ data: 'something' })).toBe(false)
  })

  it('returns false when ResultCode is missing from Result', () => {
    expect(
      isTaxRemittanceResult({
        Result: { ConversationID: 'x', OriginatorConversationID: 'y' },
      }),
    ).toBe(false)
  })

  it('returns false when ConversationID is missing from Result', () => {
    expect(
      isTaxRemittanceResult({
        Result: { ResultCode: '0', OriginatorConversationID: 'y' },
      }),
    ).toBe(false)
  })

  it('returns false when OriginatorConversationID is missing from Result', () => {
    expect(
      isTaxRemittanceResult({
        Result: { ResultCode: '0', ConversationID: 'x' },
      }),
    ).toBe(false)
  })

  it('returns false for non-object values', () => {
    expect(isTaxRemittanceResult('string')).toBe(false)
    expect(isTaxRemittanceResult(42)).toBe(false)
    expect(isTaxRemittanceResult([])).toBe(false)
    expect(isTaxRemittanceResult(true)).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 8. isTaxRemittanceSuccess() / isTaxRemittanceFailure()
// ═══════════════════════════════════════════════════════════════════════════════

describe('isTaxRemittanceSuccess()', () => {
  it('returns true when ResultCode is "0" (string — per success docs sample)', () => {
    expect(isTaxRemittanceSuccess(SUCCESS_RESULT)).toBe(true)
  })

  it('returns true when ResultCode is 0 (number)', () => {
    const result: TaxRemittanceResult = {
      Result: { ...SUCCESS_RESULT.Result, ResultCode: 0 },
    }
    expect(isTaxRemittanceSuccess(result)).toBe(true)
  })

  it('returns false when ResultCode is 2001 (invalid initiator)', () => {
    expect(isTaxRemittanceSuccess(FAILURE_RESULT)).toBe(false)
  })

  it('returns false when ResultCode is 1 (insufficient funds)', () => {
    expect(isTaxRemittanceSuccess(FAILURE_NO_PARAMS)).toBe(false)
  })

  it('returns false when ResultCode is a non-zero string', () => {
    const result: TaxRemittanceResult = {
      Result: { ...FAILURE_RESULT.Result, ResultCode: '2001' },
    }
    expect(isTaxRemittanceSuccess(result)).toBe(false)
  })
})

describe('isTaxRemittanceFailure()', () => {
  it('returns false for success result (ResultCode "0")', () => {
    expect(isTaxRemittanceFailure(SUCCESS_RESULT)).toBe(false)
  })

  it('returns false for success result (ResultCode 0)', () => {
    const result: TaxRemittanceResult = {
      Result: { ...SUCCESS_RESULT.Result, ResultCode: 0 },
    }
    expect(isTaxRemittanceFailure(result)).toBe(false)
  })

  it('returns true for failure result (ResultCode 2001)', () => {
    expect(isTaxRemittanceFailure(FAILURE_RESULT)).toBe(true)
  })

  it('returns true for failure result (ResultCode 1)', () => {
    expect(isTaxRemittanceFailure(FAILURE_NO_PARAMS)).toBe(true)
  })

  it('isTaxRemittanceSuccess and isTaxRemittanceFailure are mutually exclusive', () => {
    expect(isTaxRemittanceSuccess(SUCCESS_RESULT) && isTaxRemittanceFailure(SUCCESS_RESULT)).toBe(
      false,
    )
    expect(isTaxRemittanceSuccess(FAILURE_RESULT) && isTaxRemittanceFailure(FAILURE_RESULT)).toBe(
      false,
    )
    expect(isTaxRemittanceSuccess(SUCCESS_RESULT) || isTaxRemittanceFailure(SUCCESS_RESULT)).toBe(
      true,
    )
    expect(isTaxRemittanceSuccess(FAILURE_RESULT) || isTaxRemittanceFailure(FAILURE_RESULT)).toBe(
      true,
    )
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 9. PAYLOAD EXTRACTORS
// ═══════════════════════════════════════════════════════════════════════════════

describe('getTaxResultCode()', () => {
  it('returns ResultCode "0" (string) from success result', () => {
    expect(getTaxResultCode(SUCCESS_RESULT)).toBe('0')
  })

  it('returns ResultCode 2001 (number) from failure result', () => {
    expect(getTaxResultCode(FAILURE_RESULT)).toBe(2001)
  })
})

describe('getTaxResultDesc()', () => {
  it('returns ResultDesc from success result', () => {
    expect(getTaxResultDesc(SUCCESS_RESULT)).toBe('The service request is processed successfully')
  })

  it('returns ResultDesc from failure result', () => {
    expect(getTaxResultDesc(FAILURE_RESULT)).toBe('The initiator information is invalid.')
  })
})

describe('getTaxTransactionId()', () => {
  it('returns TransactionID from success result', () => {
    expect(getTaxTransactionId(SUCCESS_RESULT)).toBe('QKA81LK5CY')
  })

  it('returns TransactionID from failure result', () => {
    expect(getTaxTransactionId(FAILURE_RESULT)).toBe('OAK0000000')
  })
})

describe('getTaxConversationId()', () => {
  it('returns ConversationID from success result', () => {
    expect(getTaxConversationId(SUCCESS_RESULT)).toBe('AG_20181005_00004d7ee675c0c7ee0b')
  })

  it('returns ConversationID from failure result', () => {
    expect(getTaxConversationId(FAILURE_RESULT)).toBe('AG_20230420_2010759fd5662ef6d055')
  })
})

describe('getTaxOriginatorConversationId()', () => {
  it('returns OriginatorConversationID from success result', () => {
    expect(getTaxOriginatorConversationId(SUCCESS_RESULT)).toBe('626f6ddf-ab37-4650-b882-blde92ec')
  })

  it('returns OriginatorConversationID from failure result', () => {
    expect(getTaxOriginatorConversationId(FAILURE_RESULT)).toBe('12337-23509183-5')
  })
})

describe('getTaxAmount()', () => {
  it('returns Amount as a number from success result', () => {
    expect(getTaxAmount(SUCCESS_RESULT)).toBe(190)
    expect(typeof getTaxAmount(SUCCESS_RESULT)).toBe('number')
  })

  it('parses "190.00" to 190 (whole number)', () => {
    expect(getTaxAmount(SUCCESS_RESULT)).toBe(190)
  })

  it('returns null when ResultParameters is absent (failure case)', () => {
    expect(getTaxAmount(FAILURE_RESULT)).toBeNull()
  })

  it('returns null when ResultParameters is absent (no params)', () => {
    expect(getTaxAmount(FAILURE_NO_PARAMS)).toBeNull()
  })

  it('returns Amount from single-parameter result (non-array form)', () => {
    expect(getTaxAmount(SUCCESS_SINGLE_PARAM)).toBe(500)
  })

  it('returns null when Amount key is not present', () => {
    const result: TaxRemittanceResult = {
      Result: {
        ...SUCCESS_RESULT.Result,
        ResultParameters: {
          ResultParameter: [{ Key: 'TransactionCompletedTime', Value: '20221110110717' }],
        },
      },
    }
    expect(getTaxAmount(result)).toBeNull()
  })
})

describe('getTaxCompletedTime()', () => {
  it('returns TransactionCompletedTime from success result', () => {
    expect(getTaxCompletedTime(SUCCESS_RESULT)).toBe('20221110110717')
  })

  it('returns null when ResultParameters is absent', () => {
    expect(getTaxCompletedTime(FAILURE_RESULT)).toBeNull()
  })

  it('returns null when TransactionCompletedTime key is not present', () => {
    const result: TaxRemittanceResult = {
      Result: {
        ...SUCCESS_RESULT.Result,
        ResultParameters: {
          ResultParameter: [{ Key: 'Amount', Value: '190.00' }],
        },
      },
    }
    expect(getTaxCompletedTime(result)).toBeNull()
  })
})

describe('getTaxReceiverName()', () => {
  it('returns ReceiverPartyPublicName from success result', () => {
    expect(getTaxReceiverName(SUCCESS_RESULT)).toBe('00000 Tax Collecting Company')
  })

  it('returns null when ResultParameters is absent', () => {
    expect(getTaxReceiverName(FAILURE_RESULT)).toBeNull()
  })

  it('returns null when ReceiverPartyPublicName key is not present', () => {
    const result: TaxRemittanceResult = {
      Result: {
        ...SUCCESS_RESULT.Result,
        ResultParameters: {
          ResultParameter: [{ Key: 'Amount', Value: '190.00' }],
        },
      },
    }
    expect(getTaxReceiverName(result)).toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 10. getTaxResultParam() — INTERNAL HELPER
// ═══════════════════════════════════════════════════════════════════════════════

describe('getTaxResultParam() — parameter extraction helper', () => {
  it('extracts Amount from an array of ResultParameters', () => {
    expect(getTaxResultParam(SUCCESS_RESULT, 'Amount')).toBe('190.00')
  })

  it('extracts TransactionCompletedTime from ResultParameters', () => {
    expect(getTaxResultParam(SUCCESS_RESULT, 'TransactionCompletedTime')).toBe('20221110110717')
  })

  it('extracts ReceiverPartyPublicName from ResultParameters', () => {
    expect(getTaxResultParam(SUCCESS_RESULT, 'ReceiverPartyPublicName')).toBe(
      '00000 Tax Collecting Company',
    )
  })

  it('extracts a value from a single ResultParameter (non-array form)', () => {
    expect(getTaxResultParam(SUCCESS_SINGLE_PARAM, 'Amount')).toBe('500.00')
  })

  it('returns undefined for a key not present in parameters', () => {
    expect(getTaxResultParam(SUCCESS_RESULT, 'NonExistentKey')).toBeUndefined()
  })

  it('returns undefined when ResultParameters is absent', () => {
    expect(getTaxResultParam(FAILURE_RESULT, 'Amount')).toBeUndefined()
  })

  it('returns undefined when ResultParameter array is empty', () => {
    const result: TaxRemittanceResult = {
      Result: {
        ...SUCCESS_RESULT.Result,
        ResultParameters: { ResultParameter: [] },
      },
    }
    expect(getTaxResultParam(result, 'Amount')).toBeUndefined()
  })

  it('extracts all 3 documented parameter keys from the success result', () => {
    expect(getTaxResultParam(SUCCESS_RESULT, 'Amount')).toBe('190.00')
    expect(getTaxResultParam(SUCCESS_RESULT, 'TransactionCompletedTime')).toBe('20221110110717')
    expect(getTaxResultParam(SUCCESS_RESULT, 'ReceiverPartyPublicName')).toBe(
      '00000 Tax Collecting Company',
    )
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 11. RESULT PAYLOAD STRUCTURE (Daraja spec)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Success result payload structure (Daraja spec)', () => {
  it('has a Result root object', () => {
    expect(SUCCESS_RESULT).toHaveProperty('Result')
    expect(typeof SUCCESS_RESULT.Result).toBe('object')
  })

  it('has ResultCode as "0" (string — per success docs sample)', () => {
    expect(SUCCESS_RESULT.Result.ResultCode).toBe('0')
  })

  it('has ResultType as "0" (string — per docs)', () => {
    expect(SUCCESS_RESULT.Result.ResultType).toBe('0')
  })

  it('has ResultDesc as a non-empty string', () => {
    expect(typeof SUCCESS_RESULT.Result.ResultDesc).toBe('string')
    expect(SUCCESS_RESULT.Result.ResultDesc.length).toBeGreaterThan(0)
  })

  it('has OriginatorConversationID as a non-empty string', () => {
    expect(typeof SUCCESS_RESULT.Result.OriginatorConversationID).toBe('string')
    expect(SUCCESS_RESULT.Result.OriginatorConversationID.length).toBeGreaterThan(0)
  })

  it('has ConversationID as a non-empty string', () => {
    expect(typeof SUCCESS_RESULT.Result.ConversationID).toBe('string')
    expect(SUCCESS_RESULT.Result.ConversationID.length).toBeGreaterThan(0)
  })

  it('has TransactionID as a non-empty string', () => {
    expect(typeof SUCCESS_RESULT.Result.TransactionID).toBe('string')
    expect(SUCCESS_RESULT.Result.TransactionID.length).toBeGreaterThan(0)
  })

  it('has ResultParameters with a ResultParameter array', () => {
    expect(SUCCESS_RESULT.Result.ResultParameters).toBeDefined()
    expect(Array.isArray(SUCCESS_RESULT.Result.ResultParameters?.ResultParameter)).toBe(true)
  })

  it('ResultParameters contains documented "Amount" key', () => {
    const params = SUCCESS_RESULT.Result.ResultParameters?.ResultParameter as Array<{
      Key: string
      Value: unknown
    }>
    expect(params.some((p) => p.Key === 'Amount')).toBe(true)
  })

  it('ResultParameters contains documented "TransactionCompletedTime" key', () => {
    const params = SUCCESS_RESULT.Result.ResultParameters?.ResultParameter as Array<{
      Key: string
      Value: unknown
    }>
    expect(params.some((p) => p.Key === 'TransactionCompletedTime')).toBe(true)
  })

  it('ResultParameters contains documented "ReceiverPartyPublicName" key', () => {
    const params = SUCCESS_RESULT.Result.ResultParameters?.ResultParameter as Array<{
      Key: string
      Value: unknown
    }>
    expect(params.some((p) => p.Key === 'ReceiverPartyPublicName')).toBe(true)
  })

  it('ResultParameters has exactly 3 documented keys (per Daraja docs)', () => {
    const params = SUCCESS_RESULT.Result.ResultParameters?.ResultParameter as Array<{
      Key: string
      Value: unknown
    }>
    expect(params).toHaveLength(3)
  })
})

describe('Failed result payload structure (Daraja spec)', () => {
  it('has non-zero ResultCode', () => {
    expect(FAILURE_RESULT.Result.ResultCode).not.toBe(0)
    expect(FAILURE_RESULT.Result.ResultCode).not.toBe('0')
  })

  it('has ResultCode 2001 (per docs failure example)', () => {
    expect(FAILURE_RESULT.Result.ResultCode).toBe(2001)
  })

  it('has ResultDesc "The initiator information is invalid." (per docs)', () => {
    expect(FAILURE_RESULT.Result.ResultDesc).toBe('The initiator information is invalid.')
  })

  it('has TransactionID as a non-empty string (generic on failure)', () => {
    expect(typeof FAILURE_RESULT.Result.TransactionID).toBe('string')
    expect(FAILURE_RESULT.Result.TransactionID.length).toBeGreaterThan(0)
  })

  it('may not have ResultParameters on failure', () => {
    expect(FAILURE_RESULT.Result.ResultParameters).toBeUndefined()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 12. DISCRIMINATED DISPATCH PATTERN
// ═══════════════════════════════════════════════════════════════════════════════

describe('Discriminated dispatch pattern', () => {
  /**
   * Simulates a real result handler using the type guards.
   * Returns which branch was taken.
   */
  function handleResult(result: TaxRemittanceResult): string {
    if (isTaxRemittanceSuccess(result)) return 'success'
    if (isTaxRemittanceFailure(result)) return 'failure'
    return 'unknown'
  }

  it('routes success result (ResultCode "0") to success branch', () => {
    expect(handleResult(SUCCESS_RESULT)).toBe('success')
  })

  it('routes success result (ResultCode 0) to success branch', () => {
    const result: TaxRemittanceResult = {
      Result: { ...SUCCESS_RESULT.Result, ResultCode: 0 },
    }
    expect(handleResult(result)).toBe('success')
  })

  it('routes failure result (ResultCode 2001) to failure branch', () => {
    expect(handleResult(FAILURE_RESULT)).toBe('failure')
  })

  it('routes failure result with no params to failure branch', () => {
    expect(handleResult(FAILURE_NO_PARAMS)).toBe('failure')
  })

  it('success handler can safely extract all documented fields', () => {
    if (isTaxRemittanceSuccess(SUCCESS_RESULT)) {
      expect(getTaxTransactionId(SUCCESS_RESULT)).toBe('QKA81LK5CY')
      expect(getTaxConversationId(SUCCESS_RESULT)).toBe('AG_20181005_00004d7ee675c0c7ee0b')
      expect(getTaxAmount(SUCCESS_RESULT)).toBe(190)
      expect(getTaxCompletedTime(SUCCESS_RESULT)).toBe('20221110110717')
      expect(getTaxReceiverName(SUCCESS_RESULT)).toBe('00000 Tax Collecting Company')
    }
  })

  it('failure handler extracts error fields; amount and receiver are null', () => {
    if (isTaxRemittanceFailure(FAILURE_RESULT)) {
      expect(getTaxResultDesc(FAILURE_RESULT)).toBe('The initiator information is invalid.')
      expect(getTaxAmount(FAILURE_RESULT)).toBeNull()
      expect(getTaxCompletedTime(FAILURE_RESULT)).toBeNull()
      expect(getTaxReceiverName(FAILURE_RESULT)).toBeNull()
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 13. EDGE CASES & SCENARIO COVERAGE
// ═══════════════════════════════════════════════════════════════════════════════

describe('Edge cases — amount parsing', () => {
  it('handles numeric Amount value in ResultParameter (not just string)', () => {
    const result: TaxRemittanceResult = {
      Result: {
        ...SUCCESS_RESULT.Result,
        ResultParameters: {
          ResultParameter: [{ Key: 'Amount', Value: 250 }],
        },
      },
    }
    expect(getTaxAmount(result)).toBe(250)
  })

  it('returns null for non-parseable Amount value', () => {
    const result: TaxRemittanceResult = {
      Result: {
        ...SUCCESS_RESULT.Result,
        ResultParameters: {
          ResultParameter: [{ Key: 'Amount', Value: 'not-a-number' }],
        },
      },
    }
    expect(getTaxAmount(result)).toBeNull()
  })
})

describe('Edge cases — PartyB defaults', () => {
  beforeEach(() => {
    mockHttpRequest.mockResolvedValue({ data: INITIATE_RESPONSE } as never)
  })

  function getBody(): Record<string, unknown> {
    const call = mockHttpRequest.mock.calls[0]
    return (call?.[1] as { body: Record<string, unknown> }).body
  }

  it('uses KRA_SHORTCODE as PartyB when partyB is omitted', async () => {
    const { partyB: _omit, ...req } = BASE_REQUEST
    await remitTax(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, req)
    expect(getBody()['PartyB']).toBe(KRA_SHORTCODE)
  })

  it('KRA_SHORTCODE matches PartyB in the Daraja docs example ("572572")', () => {
    expect(KRA_SHORTCODE).toBe('572572')
  })
})

describe('Edge cases — isTaxRemittanceResult with ResultCode = 0', () => {
  it('accepts ResultCode as numeric 0', () => {
    const result = {
      Result: {
        ResultType: 0,
        ResultCode: 0,
        ResultDesc: 'Success',
        OriginatorConversationID: 'ORG-001',
        ConversationID: 'CONV-001',
        TransactionID: 'TX-001',
      },
    }
    expect(isTaxRemittanceResult(result)).toBe(true)
  })

  it('accepts ResultCode as string "0"', () => {
    const result = {
      Result: {
        ResultType: '0',
        ResultCode: '0',
        ResultDesc: 'Success',
        OriginatorConversationID: 'ORG-001',
        ConversationID: 'CONV-001',
        TransactionID: 'TX-001',
      },
    }
    expect(isTaxRemittanceResult(result)).toBe(true)
  })
})

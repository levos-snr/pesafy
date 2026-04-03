/**
 * __tests__/b2b-pay-bill.test.ts
 *
 * Complete test suite for the Business Pay Bill module:
 *   - initiateB2BPayBill()              — pay bill initiation
 *   - B2B_PAY_BILL_RESULT_CODES        — documented result code constants
 *   - B2B_PAY_BILL_ERROR_CODES         — documented API error codes
 *   - isKnownB2BPayBillResultCode()    — result code validation helper
 *   - isB2BPayBillResult()             — runtime payload type guard
 *   - isB2BPayBillSuccess()            — success type guard
 *   - isB2BPayBillFailure()            — general failure type guard
 *   - getB2BPayBillResultCode()        — result code extractor
 *   - getB2BPayBillResultDesc()        — result description extractor
 *   - getB2BPayBillTransactionId()     — transaction ID extractor
 *   - getB2BPayBillConversationId()    — conversationID extractor
 *   - getB2BPayBillOriginatorConversationId() — originator conversation ID
 *   - getB2BPayBillAmount()            — amount extractor
 *   - getB2BPayBillCompletedTime()     — completion timestamp extractor
 *   - getB2BPayBillReceiverName()      — receiver name extractor
 *   - getB2BPayBillDebitPartyCharges() — charges extractor
 *   - getB2BPayBillCurrency()          — currency extractor
 *   - getB2BPayBillDebitPartyAffectedBalance() — affected balance extractor
 *   - getB2BPayBillDebitAccountBalance()       — debit account balance
 *   - getB2BPayBillInitiatorBalance()          — initiator balance
 *   - getB2BPayBillBillReferenceNumber()       — bill reference from ReferenceData
 *   - getB2BPayBillResultParam()               — internal parameter helper
 *
 * Strictly covers only what is documented in the Safaricom Daraja
 * Business Pay Bill API documentation.
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
import { initiateB2BPayBill } from '../src/mpesa/b2b-pay-bill/payment'
import {
  getB2BPayBillAmount,
  getB2BPayBillBillReferenceNumber,
  getB2BPayBillCompletedTime,
  getB2BPayBillConversationId,
  getB2BPayBillCurrency,
  getB2BPayBillDebitAccountBalance,
  getB2BPayBillDebitPartyAffectedBalance,
  getB2BPayBillDebitPartyCharges,
  getB2BPayBillInitiatorBalance,
  getB2BPayBillOriginatorConversationId,
  getB2BPayBillReceiverName,
  getB2BPayBillResultCode,
  getB2BPayBillResultDesc,
  getB2BPayBillResultParam,
  getB2BPayBillTransactionId,
  isB2BPayBillFailure,
  isB2BPayBillResult,
  isB2BPayBillSuccess,
  isKnownB2BPayBillResultCode,
} from '../src/mpesa/b2b-pay-bill/webhooks'
import {
  B2B_PAY_BILL_ERROR_CODES,
  B2B_PAY_BILL_RESULT_CODES,
} from '../src/mpesa/b2b-pay-bill/types'
import type {
  B2BPayBillRequest,
  B2BPayBillResponse,
  B2BPayBillResult,
} from '../src/mpesa/b2b-pay-bill/types'

// ── Typed mock ────────────────────────────────────────────────────────────────

const mockHttpRequest = vi.mocked(httpRequest)

// ── Shared fixtures ───────────────────────────────────────────────────────────

const SANDBOX_URL = 'https://sandbox.safaricom.co.ke'
const PROD_URL = 'https://api.safaricom.co.ke'
const ACCESS_TOKEN = 'test-bearer-token-b2b-pay-bill'
const SECURITY_CREDENTIAL = 'EncryptedPassword=='
const INITIATOR_NAME = 'testapi'

// ── Request fixtures ──────────────────────────────────────────────────────────

const BASE_REQUEST: B2BPayBillRequest = {
  commandId: 'BusinessPayBill',
  amount: 239,
  partyA: '123456',
  partyB: '000000',
  accountReference: '353353',
  requester: '254700000000',
  remarks: 'OK',
  queueTimeOutUrl: 'https://mydomain.com/timeout',
  resultUrl: 'https://mydomain.com/result',
}

// ── Synchronous acknowledgement fixture ──────────────────────────────────────

const INITIATE_RESPONSE: B2BPayBillResponse = {
  OriginatorConversationID: '5118-111210482-1',
  ConversationID: 'AG_20230420_2010759fd5662ef6d054',
  ResponseCode: '0',
  ResponseDescription: 'Accept the service request successfully',
}

// ── Async result payload fixtures (from Daraja docs) ──────────────────────────

const SUCCESS_RESULT: B2BPayBillResult = {
  Result: {
    ResultType: '0',
    ResultCode: '0',
    ResultDesc: 'The service request is processed successfully',
    OriginatorConversationID: '626f6ddf-ab37-4650-b882-blde92ec',
    ConversationID: '12345677dfdf89099B3',
    TransactionID: 'QKA81LK5CY',
    ResultParameters: {
      ResultParameter: [
        { Key: 'Amount', Value: '190.00' },
        { Key: 'TransCompletedTime', Value: '20221110110717' },
        { Key: 'ReceiverPartyPublicName', Value: 'TestPayBill - Vendor Ltd' },
        { Key: 'DebitPartyCharges', Value: '' },
        { Key: 'Currency', Value: 'KES' },
        { Key: 'DebitPartyAffectedAccountBalance', Value: 'Working|KES|900.00|900.00|0.00|0.00' },
        { Key: 'DebitAccountCurrentBalance', Value: 'Working|KES|1000.00|1000.00|0.00|0.00' },
        { Key: 'InitiatorAccountCurrentBalance', Value: 'Utility|KES|5000.00|5000.00|0.00|0.00' },
      ],
    },
    ReferenceData: {
      ReferenceItem: [{ Key: 'BillReferenceNumber', Value: '19008' }],
    },
  },
}

const FAILURE_RESULT: B2BPayBillResult = {
  Result: {
    ResultType: 0,
    ResultCode: 2001,
    ResultDesc: 'The initiator information is invalid.',
    OriginatorConversationID: '12337-23509183-5',
    ConversationID: 'AG_20200120_0000657265d5fa9ae5c0',
    TransactionID: 'OAK0000000',
    ResultParameters: {
      ResultParameter: [{ Key: 'BOCompletedTime', Value: 20200120164825 }],
    },
  },
}

const FAILURE_NO_PARAMS: B2BPayBillResult = {
  Result: {
    ResultType: 0,
    ResultCode: 2001,
    ResultDesc: 'The initiator information is invalid.',
    OriginatorConversationID: 'ORG-001',
    ConversationID: 'CONV-001',
    TransactionID: 'OAK0000001',
  },
}

const SUCCESS_SINGLE_PARAM: B2BPayBillResult = {
  Result: {
    ResultType: '0',
    ResultCode: '0',
    ResultDesc: 'The service request is processed successfully',
    OriginatorConversationID: 'ORG-SINGLE',
    ConversationID: 'CONV-SINGLE',
    TransactionID: 'QKA81LK5CZ',
    ResultParameters: {
      // Daraja sometimes sends a single object instead of array
      ResultParameter: { Key: 'Amount', Value: '500.00' },
    },
  },
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. B2B_PAY_BILL_RESULT_CODES CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('B2B_PAY_BILL_RESULT_CODES (documented by Daraja)', () => {
  it('SUCCESS is 0 (numeric)', () => {
    expect(B2B_PAY_BILL_RESULT_CODES.SUCCESS).toBe(0)
    expect(typeof B2B_PAY_BILL_RESULT_CODES.SUCCESS).toBe('number')
  })

  it('INSUFFICIENT_FUNDS is 1', () => {
    expect(B2B_PAY_BILL_RESULT_CODES.INSUFFICIENT_FUNDS).toBe(1)
  })

  it('AMOUNT_TOO_SMALL is 2', () => {
    expect(B2B_PAY_BILL_RESULT_CODES.AMOUNT_TOO_SMALL).toBe(2)
  })

  it('AMOUNT_TOO_LARGE is 3', () => {
    expect(B2B_PAY_BILL_RESULT_CODES.AMOUNT_TOO_LARGE).toBe(3)
  })

  it('DAILY_LIMIT_EXCEEDED is 4', () => {
    expect(B2B_PAY_BILL_RESULT_CODES.DAILY_LIMIT_EXCEEDED).toBe(4)
  })

  it('MAX_BALANCE_EXCEEDED is 8', () => {
    expect(B2B_PAY_BILL_RESULT_CODES.MAX_BALANCE_EXCEEDED).toBe(8)
  })

  it('INVALID_INITIATOR_INFO is 2001', () => {
    expect(B2B_PAY_BILL_RESULT_CODES.INVALID_INITIATOR_INFO).toBe(2001)
  })

  it('ACCOUNT_INACTIVE is 2006', () => {
    expect(B2B_PAY_BILL_RESULT_CODES.ACCOUNT_INACTIVE).toBe(2006)
  })

  it('PRODUCT_NOT_PERMITTED is 2028', () => {
    expect(B2B_PAY_BILL_RESULT_CODES.PRODUCT_NOT_PERMITTED).toBe(2028)
  })

  it('CUSTOMER_NOT_REGISTERED is 2040', () => {
    expect(B2B_PAY_BILL_RESULT_CODES.CUSTOMER_NOT_REGISTERED).toBe(2040)
  })

  it('contains exactly 10 documented result codes', () => {
    expect(Object.keys(B2B_PAY_BILL_RESULT_CODES)).toHaveLength(10)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 2. B2B_PAY_BILL_ERROR_CODES CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('B2B_PAY_BILL_ERROR_CODES (documented by Daraja)', () => {
  it('INVALID_ACCESS_TOKEN is "400.003.01"', () => {
    expect(B2B_PAY_BILL_ERROR_CODES.INVALID_ACCESS_TOKEN).toBe('400.003.01')
  })

  it('BAD_REQUEST is "400.003.02"', () => {
    expect(B2B_PAY_BILL_ERROR_CODES.BAD_REQUEST).toBe('400.003.02')
  })

  it('INTERNAL_SERVER_ERROR is "500.003.1001"', () => {
    expect(B2B_PAY_BILL_ERROR_CODES.INTERNAL_SERVER_ERROR).toBe('500.003.1001')
  })

  it('QUOTA_VIOLATION is "500.003.03"', () => {
    expect(B2B_PAY_BILL_ERROR_CODES.QUOTA_VIOLATION).toBe('500.003.03')
  })

  it('SPIKE_ARREST is "500.003.02"', () => {
    expect(B2B_PAY_BILL_ERROR_CODES.SPIKE_ARREST).toBe('500.003.02')
  })

  it('NOT_FOUND is "404.003.01"', () => {
    expect(B2B_PAY_BILL_ERROR_CODES.NOT_FOUND).toBe('404.003.01')
  })

  it('INVALID_AUTH_HEADER is "404.001.04"', () => {
    expect(B2B_PAY_BILL_ERROR_CODES.INVALID_AUTH_HEADER).toBe('404.001.04')
  })

  it('INVALID_PAYLOAD is "400.002.05"', () => {
    expect(B2B_PAY_BILL_ERROR_CODES.INVALID_PAYLOAD).toBe('400.002.05')
  })

  it('contains exactly 8 documented error codes', () => {
    expect(Object.keys(B2B_PAY_BILL_ERROR_CODES)).toHaveLength(8)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 3. isKnownB2BPayBillResultCode()
// ═══════════════════════════════════════════════════════════════════════════════

describe('isKnownB2BPayBillResultCode()', () => {
  it('returns true for 0 (success)', () => {
    expect(isKnownB2BPayBillResultCode(0)).toBe(true)
  })

  it('returns true for 1 (insufficient funds)', () => {
    expect(isKnownB2BPayBillResultCode(1)).toBe(true)
  })

  it('returns true for 2 (amount too small)', () => {
    expect(isKnownB2BPayBillResultCode(2)).toBe(true)
  })

  it('returns true for 3 (amount too large)', () => {
    expect(isKnownB2BPayBillResultCode(3)).toBe(true)
  })

  it('returns true for 4 (daily limit exceeded)', () => {
    expect(isKnownB2BPayBillResultCode(4)).toBe(true)
  })

  it('returns true for 8 (max balance exceeded)', () => {
    expect(isKnownB2BPayBillResultCode(8)).toBe(true)
  })

  it('returns true for 2001 (invalid initiator info)', () => {
    expect(isKnownB2BPayBillResultCode(2001)).toBe(true)
  })

  it('returns true for 2006 (account inactive)', () => {
    expect(isKnownB2BPayBillResultCode(2006)).toBe(true)
  })

  it('returns true for 2028 (product not permitted)', () => {
    expect(isKnownB2BPayBillResultCode(2028)).toBe(true)
  })

  it('returns true for 2040 (customer not registered)', () => {
    expect(isKnownB2BPayBillResultCode(2040)).toBe(true)
  })

  it('returns true for "0" (string variant)', () => {
    expect(isKnownB2BPayBillResultCode('0')).toBe(true)
  })

  it('returns true for "2001" (string variant)', () => {
    expect(isKnownB2BPayBillResultCode('2001')).toBe(true)
  })

  it('returns false for an undocumented code', () => {
    expect(isKnownB2BPayBillResultCode(9999)).toBe(false)
  })

  it('returns false for a negative number', () => {
    expect(isKnownB2BPayBillResultCode(-1)).toBe(false)
  })

  it('returns false for null', () => {
    expect(isKnownB2BPayBillResultCode(null)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(isKnownB2BPayBillResultCode(undefined)).toBe(false)
  })

  it('returns false for an empty string', () => {
    expect(isKnownB2BPayBillResultCode('')).toBe(false)
  })

  it('returns false for an arbitrary string', () => {
    expect(isKnownB2BPayBillResultCode('UNKNOWN')).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 4. initiateB2BPayBill() — SUCCESS
// ═══════════════════════════════════════════════════════════════════════════════

describe('initiateB2BPayBill() — success', () => {
  beforeEach(() => {
    mockHttpRequest.mockResolvedValue({ data: INITIATE_RESPONSE } as never)
  })

  it('returns the Daraja acknowledgement on success', async () => {
    const result = await initiateB2BPayBill(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(result).toStrictEqual(INITIATE_RESPONSE)
  })

  it('calls the correct Daraja B2B Pay Bill endpoint', async () => {
    await initiateB2BPayBill(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(mockHttpRequest).toHaveBeenCalledWith(
      `${SANDBOX_URL}/mpesa/b2b/v1/paymentrequest`,
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('uses the production endpoint URL', async () => {
    await initiateB2BPayBill(
      PROD_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(mockHttpRequest).toHaveBeenCalledWith(
      `${PROD_URL}/mpesa/b2b/v1/paymentrequest`,
      expect.any(Object),
    )
  })

  it('sends Authorization header with Bearer token', async () => {
    await initiateB2BPayBill(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(mockHttpRequest).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${ACCESS_TOKEN}` }),
      }),
    )
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 5. initiateB2BPayBill() — REQUEST BODY SHAPE (Daraja spec)
// ═══════════════════════════════════════════════════════════════════════════════

describe('initiateB2BPayBill() — request body shape (Daraja spec)', () => {
  beforeEach(() => {
    mockHttpRequest.mockResolvedValue({ data: INITIATE_RESPONSE } as never)
  })

  function getBody(): Record<string, unknown> {
    const call = mockHttpRequest.mock.calls[0]
    return (call?.[1] as { body: Record<string, unknown> }).body
  }

  it('sends Initiator as the provided initiator name', async () => {
    await initiateB2BPayBill(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(getBody()['Initiator']).toBe('testapi')
  })

  it('sends SecurityCredential as provided', async () => {
    await initiateB2BPayBill(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(getBody()['SecurityCredential']).toBe(SECURITY_CREDENTIAL)
  })

  it('sends CommandID as "BusinessPayBill"', async () => {
    await initiateB2BPayBill(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(getBody()['CommandID']).toBe('BusinessPayBill')
  })

  it('sends SenderIdentifierType as "4" (hardcoded per docs)', async () => {
    await initiateB2BPayBill(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(getBody()['SenderIdentifierType']).toBe('4')
  })

  it('sends RecieverIdentifierType as "4" (hardcoded per docs)', async () => {
    await initiateB2BPayBill(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(getBody()['RecieverIdentifierType']).toBe('4')
  })

  it('sends Amount as a STRING (per Daraja JSON spec)', async () => {
    await initiateB2BPayBill(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(typeof getBody()['Amount']).toBe('string')
    expect(getBody()['Amount']).toBe('239')
  })

  it('rounds fractional amounts before stringifying (e.g. 239.7 → "240")', async () => {
    await initiateB2BPayBill(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
      ...BASE_REQUEST,
      amount: 239.7,
    })
    expect(getBody()['Amount']).toBe('240')
  })

  it('sends PartyA as a string', async () => {
    await initiateB2BPayBill(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(typeof getBody()['PartyA']).toBe('string')
    expect(getBody()['PartyA']).toBe('123456')
  })

  it('sends PartyB as a string', async () => {
    await initiateB2BPayBill(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(typeof getBody()['PartyB']).toBe('string')
    expect(getBody()['PartyB']).toBe('000000')
  })

  it('sends AccountReference exactly as provided', async () => {
    await initiateB2BPayBill(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(getBody()['AccountReference']).toBe('353353')
  })

  it('truncates AccountReference to max 13 characters (per docs)', async () => {
    await initiateB2BPayBill(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
      ...BASE_REQUEST,
      accountReference: 'A'.repeat(20),
    })
    const ref = getBody()['AccountReference'] as string
    expect(ref.length).toBeLessThanOrEqual(13)
    expect(ref).toBe('A'.repeat(13))
  })

  it('sends Remarks exactly as provided', async () => {
    await initiateB2BPayBill(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(getBody()['Remarks']).toBe('OK')
  })

  it('defaults Remarks to "Business Pay Bill" when not provided', async () => {
    const { remarks: _, ...withoutRemarks } = BASE_REQUEST
    await initiateB2BPayBill(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      withoutRemarks,
    )
    expect(getBody()['Remarks']).toBe('Business Pay Bill')
  })

  it('sends QueueTimeOutURL exactly as provided', async () => {
    await initiateB2BPayBill(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(getBody()['QueueTimeOutURL']).toBe('https://mydomain.com/timeout')
  })

  it('sends ResultURL exactly as provided', async () => {
    await initiateB2BPayBill(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(getBody()['ResultURL']).toBe('https://mydomain.com/result')
  })

  it('includes Requester when provided', async () => {
    await initiateB2BPayBill(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(getBody()['Requester']).toBe('254700000000')
  })

  it('sends 13 fields when Requester is provided (all documented fields)', async () => {
    await initiateB2BPayBill(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
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
      'Requester',
      'Remarks',
      'QueueTimeOutURL',
      'ResultURL',
    ]
    for (const field of expectedFields) {
      expect(body).toHaveProperty(field)
    }
    expect(Object.keys(body)).toHaveLength(13)
  })

  it('omits Requester when not provided and sends exactly 12 fields', async () => {
    const { requester: _, ...withoutRequester } = BASE_REQUEST
    await initiateB2BPayBill(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      withoutRequester,
    )
    const body = getBody()
    expect(body).not.toHaveProperty('Requester')
    expect(Object.keys(body)).toHaveLength(12)
  })

  it('omits Requester when it is an empty string', async () => {
    await initiateB2BPayBill(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
      ...BASE_REQUEST,
      requester: '',
    })
    expect(getBody()).not.toHaveProperty('Requester')
  })

  it('omits Requester when it is whitespace only', async () => {
    await initiateB2BPayBill(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
      ...BASE_REQUEST,
      requester: '   ',
    })
    expect(getBody()).not.toHaveProperty('Requester')
  })

  it('sends Occassion when provided (note Daraja typo preserved)', async () => {
    await initiateB2BPayBill(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
      ...BASE_REQUEST,
      occasion: 'SupplierPayment',
    })
    expect(getBody()['Occassion']).toBe('SupplierPayment')
    expect(Object.keys(getBody())).toHaveLength(14)
  })

  it('omits Occassion when not provided', async () => {
    await initiateB2BPayBill(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(getBody()).not.toHaveProperty('Occassion')
  })

  it('omits Occassion when it is empty string', async () => {
    await initiateB2BPayBill(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
      ...BASE_REQUEST,
      occasion: '',
    })
    expect(getBody()).not.toHaveProperty('Occassion')
  })

  it('omits Occassion when it is whitespace only', async () => {
    await initiateB2BPayBill(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
      ...BASE_REQUEST,
      occasion: '   ',
    })
    expect(getBody()).not.toHaveProperty('Occassion')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 6. initiateB2BPayBill() — VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('initiateB2BPayBill() — CommandID validation', () => {
  it('throws VALIDATION_ERROR when commandId is not "BusinessPayBill"', async () => {
    await expect(
      initiateB2BPayBill(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        commandId: 'BusinessPayToBulk' as never,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('error message mentions "BusinessPayBill"', async () => {
    const error = await initiateB2BPayBill(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      { ...BASE_REQUEST, commandId: 'WrongCommand' as never },
    ).catch((e: unknown) => e as { message: string })
    expect(error.message).toContain('BusinessPayBill')
  })

  it('does not call httpRequest when commandId is wrong', async () => {
    await initiateB2BPayBill(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
      ...BASE_REQUEST,
      commandId: 'SalaryPayment' as never,
    }).catch(() => {})
    expect(mockHttpRequest).not.toHaveBeenCalled()
  })
})

describe('initiateB2BPayBill() — amount validation', () => {
  it('throws VALIDATION_ERROR for amount 0', async () => {
    await expect(
      initiateB2BPayBill(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        amount: 0,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR for negative amount', async () => {
    await expect(
      initiateB2BPayBill(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        amount: -100,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR for amount that rounds to 0 (e.g. 0.4)', async () => {
    await expect(
      initiateB2BPayBill(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        amount: 0.4,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('accepts amount 1 (minimum valid value)', async () => {
    mockHttpRequest.mockResolvedValue({ data: INITIATE_RESPONSE } as never)
    await expect(
      initiateB2BPayBill(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        amount: 1,
      }),
    ).resolves.toBeDefined()
  })

  it('accepts 0.6 which rounds to 1 (meets minimum)', async () => {
    mockHttpRequest.mockResolvedValue({ data: INITIATE_RESPONSE } as never)
    await expect(
      initiateB2BPayBill(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        amount: 0.6,
      }),
    ).resolves.toBeDefined()
  })

  it('does not call httpRequest when amount validation fails', async () => {
    await initiateB2BPayBill(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
      ...BASE_REQUEST,
      amount: 0,
    }).catch(() => {})
    expect(mockHttpRequest).not.toHaveBeenCalled()
  })
})

describe('initiateB2BPayBill() — required field validation', () => {
  it('throws VALIDATION_ERROR when partyA is empty', async () => {
    await expect(
      initiateB2BPayBill(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        partyA: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when partyB is empty', async () => {
    await expect(
      initiateB2BPayBill(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        partyB: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when accountReference is empty', async () => {
    await expect(
      initiateB2BPayBill(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        accountReference: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when resultUrl is empty', async () => {
    await expect(
      initiateB2BPayBill(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        resultUrl: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when queueTimeOutUrl is empty', async () => {
    await expect(
      initiateB2BPayBill(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        queueTimeOutUrl: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('does not call httpRequest when required field validation fails', async () => {
    await initiateB2BPayBill(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
      ...BASE_REQUEST,
      partyA: '',
    }).catch(() => {})
    expect(mockHttpRequest).not.toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 7. initiateB2BPayBill() — RESPONSE FIELDS (Daraja spec)
// ═══════════════════════════════════════════════════════════════════════════════

describe('initiateB2BPayBill() — response fields (Daraja spec)', () => {
  beforeEach(() => {
    mockHttpRequest.mockResolvedValue({ data: INITIATE_RESPONSE } as never)
  })

  it('response includes OriginatorConversationID', async () => {
    const res = await initiateB2BPayBill(
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
    const res = await initiateB2BPayBill(
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
    const res = await initiateB2BPayBill(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(typeof res.ResponseCode).toBe('string')
  })

  it('response includes ResponseDescription', async () => {
    const res = await initiateB2BPayBill(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(typeof res.ResponseDescription).toBe('string')
  })

  it('ResponseCode "0" indicates the request was accepted', async () => {
    const res = await initiateB2BPayBill(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(res.ResponseCode).toBe('0')
  })

  it('response matches the exact Daraja documented payload', async () => {
    const res = await initiateB2BPayBill(
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
// 8. initiateB2BPayBill() — ERROR PROPAGATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('initiateB2BPayBill() — error propagation', () => {
  it('propagates a generic Error from httpRequest', async () => {
    mockHttpRequest.mockRejectedValue(new Error('ECONNRESET'))
    await expect(
      initiateB2BPayBill(
        SANDBOX_URL,
        ACCESS_TOKEN,
        SECURITY_CREDENTIAL,
        INITIATOR_NAME,
        BASE_REQUEST,
      ),
    ).rejects.toThrow('ECONNRESET')
  })

  it('propagates a network timeout Error from httpRequest', async () => {
    mockHttpRequest.mockRejectedValue(new Error('ETIMEDOUT'))
    await expect(
      initiateB2BPayBill(
        SANDBOX_URL,
        ACCESS_TOKEN,
        SECURITY_CREDENTIAL,
        INITIATOR_NAME,
        BASE_REQUEST,
      ),
    ).rejects.toThrow('ETIMEDOUT')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 9. isB2BPayBillResult() — RUNTIME TYPE GUARD
// ═══════════════════════════════════════════════════════════════════════════════

describe('isB2BPayBillResult() — runtime type guard', () => {
  it('returns true for a valid success result', () => {
    expect(isB2BPayBillResult(SUCCESS_RESULT)).toBe(true)
  })

  it('returns true for a valid failure result', () => {
    expect(isB2BPayBillResult(FAILURE_RESULT)).toBe(true)
  })

  it('returns true for a failure result with no extra ResultParameters', () => {
    expect(isB2BPayBillResult(FAILURE_NO_PARAMS)).toBe(true)
  })

  it('returns false for null', () => {
    expect(isB2BPayBillResult(null)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(isB2BPayBillResult(undefined)).toBe(false)
  })

  it('returns false for an empty object', () => {
    expect(isB2BPayBillResult({})).toBe(false)
  })

  it('returns false when Result is missing', () => {
    expect(isB2BPayBillResult({ data: 'something' })).toBe(false)
  })

  it('returns false when ResultCode is missing from Result', () => {
    expect(
      isB2BPayBillResult({ Result: { ConversationID: 'x', OriginatorConversationID: 'y' } }),
    ).toBe(false)
  })

  it('returns false when ConversationID is missing', () => {
    expect(isB2BPayBillResult({ Result: { ResultCode: 0, OriginatorConversationID: 'y' } })).toBe(
      false,
    )
  })

  it('returns false when OriginatorConversationID is missing', () => {
    expect(isB2BPayBillResult({ Result: { ResultCode: 0, ConversationID: 'x' } })).toBe(false)
  })

  it('returns false for non-object values', () => {
    expect(isB2BPayBillResult('string')).toBe(false)
    expect(isB2BPayBillResult(42)).toBe(false)
    expect(isB2BPayBillResult([])).toBe(false)
    expect(isB2BPayBillResult(true)).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 10. isB2BPayBillSuccess() / isB2BPayBillFailure()
// ═══════════════════════════════════════════════════════════════════════════════

describe('isB2BPayBillSuccess()', () => {
  it('returns true when ResultCode is "0" (string — documented in success sample)', () => {
    expect(isB2BPayBillSuccess(SUCCESS_RESULT)).toBe(true)
  })

  it('returns true when ResultCode is 0 (number)', () => {
    const result: B2BPayBillResult = {
      Result: { ...SUCCESS_RESULT.Result, ResultCode: 0 },
    }
    expect(isB2BPayBillSuccess(result)).toBe(true)
  })

  it('returns false when ResultCode is 2001 (invalid initiator)', () => {
    expect(isB2BPayBillSuccess(FAILURE_RESULT)).toBe(false)
  })

  it('returns false for any non-zero ResultCode', () => {
    const result: B2BPayBillResult = {
      Result: { ...FAILURE_RESULT.Result, ResultCode: 1 },
    }
    expect(isB2BPayBillSuccess(result)).toBe(false)
  })
})

describe('isB2BPayBillFailure()', () => {
  it('returns false for success (ResultCode "0")', () => {
    expect(isB2BPayBillFailure(SUCCESS_RESULT)).toBe(false)
  })

  it('returns false for success (ResultCode 0 numeric)', () => {
    const result: B2BPayBillResult = {
      Result: { ...SUCCESS_RESULT.Result, ResultCode: 0 },
    }
    expect(isB2BPayBillFailure(result)).toBe(false)
  })

  it('returns true for failure (ResultCode 2001)', () => {
    expect(isB2BPayBillFailure(FAILURE_RESULT)).toBe(true)
  })

  it('returns true for failure with no params', () => {
    expect(isB2BPayBillFailure(FAILURE_NO_PARAMS)).toBe(true)
  })

  it('isB2BPayBillSuccess and isB2BPayBillFailure are mutually exclusive', () => {
    expect(isB2BPayBillSuccess(SUCCESS_RESULT) && isB2BPayBillFailure(SUCCESS_RESULT)).toBe(false)
    expect(isB2BPayBillSuccess(FAILURE_RESULT) && isB2BPayBillFailure(FAILURE_RESULT)).toBe(false)
    expect(isB2BPayBillSuccess(SUCCESS_RESULT) || isB2BPayBillFailure(SUCCESS_RESULT)).toBe(true)
    expect(isB2BPayBillSuccess(FAILURE_RESULT) || isB2BPayBillFailure(FAILURE_RESULT)).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 11. CORE FIELD EXTRACTORS
// ═══════════════════════════════════════════════════════════════════════════════

describe('getB2BPayBillTransactionId()', () => {
  it('returns TransactionID from success result', () => {
    expect(getB2BPayBillTransactionId(SUCCESS_RESULT)).toBe('QKA81LK5CY')
  })

  it('returns TransactionID from failure result (generic on failure)', () => {
    expect(getB2BPayBillTransactionId(FAILURE_RESULT)).toBe('OAK0000000')
  })
})

describe('getB2BPayBillConversationId()', () => {
  it('returns ConversationID from success result', () => {
    expect(getB2BPayBillConversationId(SUCCESS_RESULT)).toBe('12345677dfdf89099B3')
  })

  it('returns ConversationID from failure result', () => {
    expect(getB2BPayBillConversationId(FAILURE_RESULT)).toBe('AG_20200120_0000657265d5fa9ae5c0')
  })
})

describe('getB2BPayBillOriginatorConversationId()', () => {
  it('returns OriginatorConversationID from success result', () => {
    expect(getB2BPayBillOriginatorConversationId(SUCCESS_RESULT)).toBe(
      '626f6ddf-ab37-4650-b882-blde92ec',
    )
  })

  it('returns OriginatorConversationID from failure result', () => {
    expect(getB2BPayBillOriginatorConversationId(FAILURE_RESULT)).toBe('12337-23509183-5')
  })
})

describe('getB2BPayBillResultDesc()', () => {
  it('returns ResultDesc from success result', () => {
    expect(getB2BPayBillResultDesc(SUCCESS_RESULT)).toBe(
      'The service request is processed successfully',
    )
  })

  it('returns ResultDesc from failure result', () => {
    expect(getB2BPayBillResultDesc(FAILURE_RESULT)).toBe('The initiator information is invalid.')
  })
})

describe('getB2BPayBillResultCode()', () => {
  it('returns "0" (string) for success result', () => {
    expect(getB2BPayBillResultCode(SUCCESS_RESULT)).toBe('0')
  })

  it('returns 2001 (number) for failure result', () => {
    expect(getB2BPayBillResultCode(FAILURE_RESULT)).toBe(2001)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 12. RESULT PARAMETER EXTRACTORS
// ═══════════════════════════════════════════════════════════════════════════════

describe('getB2BPayBillAmount()', () => {
  it('returns Amount as a number from success result', () => {
    expect(getB2BPayBillAmount(SUCCESS_RESULT)).toBe(190)
    expect(typeof getB2BPayBillAmount(SUCCESS_RESULT)).toBe('number')
  })

  it('returns null when ResultParameters is absent', () => {
    expect(getB2BPayBillAmount(FAILURE_NO_PARAMS)).toBeNull()
  })

  it('handles whole-number amount strings (e.g. "190.00" → 190)', () => {
    expect(getB2BPayBillAmount(SUCCESS_RESULT)).toBe(190)
  })

  it('returns Amount from single-parameter result (non-array form)', () => {
    expect(getB2BPayBillAmount(SUCCESS_SINGLE_PARAM)).toBe(500)
  })
})

describe('getB2BPayBillCompletedTime()', () => {
  it('returns TransCompletedTime from success result', () => {
    expect(getB2BPayBillCompletedTime(SUCCESS_RESULT)).toBe('20221110110717')
  })

  it('returns BOCompletedTime when TransCompletedTime is absent (failure case)', () => {
    expect(getB2BPayBillCompletedTime(FAILURE_RESULT)).toBe('20200120164825')
  })

  it('returns null when no completion time is present', () => {
    expect(getB2BPayBillCompletedTime(FAILURE_NO_PARAMS)).toBeNull()
  })
})

describe('getB2BPayBillReceiverName()', () => {
  it('returns ReceiverPartyPublicName from success result', () => {
    expect(getB2BPayBillReceiverName(SUCCESS_RESULT)).toBe('TestPayBill - Vendor Ltd')
  })

  it('returns null when absent (failure result)', () => {
    expect(getB2BPayBillReceiverName(FAILURE_RESULT)).toBeNull()
  })

  it('returns null when ResultParameters is absent', () => {
    expect(getB2BPayBillReceiverName(FAILURE_NO_PARAMS)).toBeNull()
  })
})

describe('getB2BPayBillDebitPartyCharges()', () => {
  it('returns null when DebitPartyCharges is empty string (no charges)', () => {
    // SUCCESS_RESULT has DebitPartyCharges: '' — empty means no charges
    expect(getB2BPayBillDebitPartyCharges(SUCCESS_RESULT)).toBeNull()
  })

  it('returns charge string when charges are present', () => {
    const withCharges: B2BPayBillResult = {
      Result: {
        ...SUCCESS_RESULT.Result,
        ResultParameters: {
          ResultParameter: [
            { Key: 'Amount', Value: '190.00' },
            { Key: 'DebitPartyCharges', Value: '5.00' },
          ],
        },
      },
    }
    expect(getB2BPayBillDebitPartyCharges(withCharges)).toBe('5.00')
  })

  it('returns null when absent in failure result', () => {
    expect(getB2BPayBillDebitPartyCharges(FAILURE_RESULT)).toBeNull()
  })

  it('returns null when ResultParameters is absent', () => {
    expect(getB2BPayBillDebitPartyCharges(FAILURE_NO_PARAMS)).toBeNull()
  })
})

describe('getB2BPayBillCurrency()', () => {
  it('returns "KES" from success result', () => {
    expect(getB2BPayBillCurrency(SUCCESS_RESULT)).toBe('KES')
  })

  it('returns "KES" as default when Currency is absent', () => {
    expect(getB2BPayBillCurrency(FAILURE_RESULT)).toBe('KES')
  })

  it('returns "KES" when ResultParameters is absent', () => {
    expect(getB2BPayBillCurrency(FAILURE_NO_PARAMS)).toBe('KES')
  })
})

describe('getB2BPayBillDebitPartyAffectedBalance()', () => {
  it('returns DebitPartyAffectedAccountBalance from success result', () => {
    expect(getB2BPayBillDebitPartyAffectedBalance(SUCCESS_RESULT)).toBe(
      'Working|KES|900.00|900.00|0.00|0.00',
    )
  })

  it('returns null when absent', () => {
    expect(getB2BPayBillDebitPartyAffectedBalance(FAILURE_RESULT)).toBeNull()
  })

  it('returns null when ResultParameters is absent', () => {
    expect(getB2BPayBillDebitPartyAffectedBalance(FAILURE_NO_PARAMS)).toBeNull()
  })
})

describe('getB2BPayBillDebitAccountBalance()', () => {
  it('returns DebitAccountCurrentBalance from success result', () => {
    expect(getB2BPayBillDebitAccountBalance(SUCCESS_RESULT)).toBe(
      'Working|KES|1000.00|1000.00|0.00|0.00',
    )
  })

  it('returns null when absent', () => {
    expect(getB2BPayBillDebitAccountBalance(FAILURE_RESULT)).toBeNull()
  })

  it('returns null when ResultParameters is absent', () => {
    expect(getB2BPayBillDebitAccountBalance(FAILURE_NO_PARAMS)).toBeNull()
  })
})

describe('getB2BPayBillInitiatorBalance()', () => {
  it('returns InitiatorAccountCurrentBalance from success result', () => {
    expect(getB2BPayBillInitiatorBalance(SUCCESS_RESULT)).toBe(
      'Utility|KES|5000.00|5000.00|0.00|0.00',
    )
  })

  it('returns null when absent', () => {
    expect(getB2BPayBillInitiatorBalance(FAILURE_RESULT)).toBeNull()
  })

  it('returns null when ResultParameters is absent', () => {
    expect(getB2BPayBillInitiatorBalance(FAILURE_NO_PARAMS)).toBeNull()
  })
})

describe('getB2BPayBillBillReferenceNumber()', () => {
  it('returns BillReferenceNumber from ReferenceData in success result', () => {
    expect(getB2BPayBillBillReferenceNumber(SUCCESS_RESULT)).toBe('19008')
  })

  it('returns null when ReferenceData is absent', () => {
    expect(getB2BPayBillBillReferenceNumber(FAILURE_RESULT)).toBeNull()
  })

  it('returns null when ReferenceData is absent (no params)', () => {
    expect(getB2BPayBillBillReferenceNumber(FAILURE_NO_PARAMS)).toBeNull()
  })

  it('handles single ReferenceItem (non-array form)', () => {
    const result: B2BPayBillResult = {
      Result: {
        ...SUCCESS_RESULT.Result,
        ReferenceData: {
          ReferenceItem: { Key: 'BillReferenceNumber', Value: 'REF-001' },
        },
      },
    }
    expect(getB2BPayBillBillReferenceNumber(result)).toBe('REF-001')
  })

  it('handles array ReferenceItem with multiple entries', () => {
    const result: B2BPayBillResult = {
      Result: {
        ...SUCCESS_RESULT.Result,
        ReferenceData: {
          ReferenceItem: [
            { Key: 'QueueTimeoutURL', Value: 'https://example.com/timeout' },
            { Key: 'BillReferenceNumber', Value: 'BILL-42' },
          ],
        },
      },
    }
    expect(getB2BPayBillBillReferenceNumber(result)).toBe('BILL-42')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 13. getB2BPayBillResultParam() — INTERNAL HELPER
// ═══════════════════════════════════════════════════════════════════════════════

describe('getB2BPayBillResultParam() — parameter extraction helper', () => {
  it('extracts a value from an array of ResultParameters', () => {
    expect(getB2BPayBillResultParam(SUCCESS_RESULT, 'Amount')).toBe('190.00')
  })

  it('extracts a value from a single ResultParameter (non-array form)', () => {
    expect(getB2BPayBillResultParam(SUCCESS_SINGLE_PARAM, 'Amount')).toBe('500.00')
  })

  it('returns undefined for a key not present', () => {
    expect(getB2BPayBillResultParam(SUCCESS_RESULT, 'NonExistentKey')).toBeUndefined()
  })

  it('returns undefined when ResultParameters is absent', () => {
    expect(getB2BPayBillResultParam(FAILURE_NO_PARAMS, 'Amount')).toBeUndefined()
  })

  it('returns undefined when ResultParameter array is empty', () => {
    const result: B2BPayBillResult = {
      Result: {
        ...SUCCESS_RESULT.Result,
        ResultParameters: { ResultParameter: [] },
      },
    }
    expect(getB2BPayBillResultParam(result, 'Amount')).toBeUndefined()
  })

  it('extracts all documented result parameter keys correctly', () => {
    expect(getB2BPayBillResultParam(SUCCESS_RESULT, 'Amount')).toBe('190.00')
    expect(getB2BPayBillResultParam(SUCCESS_RESULT, 'TransCompletedTime')).toBe('20221110110717')
    expect(getB2BPayBillResultParam(SUCCESS_RESULT, 'ReceiverPartyPublicName')).toBe(
      'TestPayBill - Vendor Ltd',
    )
    expect(getB2BPayBillResultParam(SUCCESS_RESULT, 'DebitPartyCharges')).toBe('')
    expect(getB2BPayBillResultParam(SUCCESS_RESULT, 'Currency')).toBe('KES')
    expect(getB2BPayBillResultParam(SUCCESS_RESULT, 'DebitPartyAffectedAccountBalance')).toBe(
      'Working|KES|900.00|900.00|0.00|0.00',
    )
    expect(getB2BPayBillResultParam(SUCCESS_RESULT, 'DebitAccountCurrentBalance')).toBe(
      'Working|KES|1000.00|1000.00|0.00|0.00',
    )
    expect(getB2BPayBillResultParam(SUCCESS_RESULT, 'InitiatorAccountCurrentBalance')).toBe(
      'Utility|KES|5000.00|5000.00|0.00|0.00',
    )
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 14. RESULT PAYLOAD STRUCTURE (Daraja spec)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Success result payload structure (Daraja spec)', () => {
  it('has ResultCode "0" (string — per success docs sample)', () => {
    expect(SUCCESS_RESULT.Result.ResultCode).toBe('0')
    expect(typeof SUCCESS_RESULT.Result.ResultCode).toBe('string')
  })

  it('has ResultDesc as a non-empty string', () => {
    expect(typeof SUCCESS_RESULT.Result.ResultDesc).toBe('string')
    expect(SUCCESS_RESULT.Result.ResultDesc.length).toBeGreaterThan(0)
  })

  it('has TransactionID as a non-empty string', () => {
    expect(typeof SUCCESS_RESULT.Result.TransactionID).toBe('string')
    expect(SUCCESS_RESULT.Result.TransactionID.length).toBeGreaterThan(0)
  })

  it('has ResultParameters with a ResultParameter array', () => {
    expect(SUCCESS_RESULT.Result.ResultParameters).toBeDefined()
    expect(Array.isArray(SUCCESS_RESULT.Result.ResultParameters?.ResultParameter)).toBe(true)
  })

  it('has ReferenceData with BillReferenceNumber', () => {
    expect(SUCCESS_RESULT.Result.ReferenceData).toBeDefined()
    expect(getB2BPayBillBillReferenceNumber(SUCCESS_RESULT)).toBe('19008')
  })
})

describe('Failed result payload structure (Daraja spec)', () => {
  it('has non-zero ResultCode', () => {
    expect(FAILURE_RESULT.Result.ResultCode).not.toBe(0)
    expect(FAILURE_RESULT.Result.ResultCode).not.toBe('0')
  })

  it('has ResultCode 2001 (number — per failure docs sample)', () => {
    expect(FAILURE_RESULT.Result.ResultCode).toBe(2001)
    expect(typeof FAILURE_RESULT.Result.ResultCode).toBe('number')
  })

  it('has a TransactionID even on failure (generic ID)', () => {
    expect(typeof FAILURE_RESULT.Result.TransactionID).toBe('string')
    expect(FAILURE_RESULT.Result.TransactionID.length).toBeGreaterThan(0)
  })

  it('isKnownB2BPayBillResultCode returns true for failure ResultCode 2001', () => {
    expect(isKnownB2BPayBillResultCode(FAILURE_RESULT.Result.ResultCode)).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 15. DISCRIMINATED DISPATCH PATTERN
// ═══════════════════════════════════════════════════════════════════════════════

describe('Discriminated dispatch pattern', () => {
  function handleResult(result: B2BPayBillResult): string {
    if (isB2BPayBillSuccess(result)) return 'success'
    if (isB2BPayBillFailure(result)) return 'failure'
    return 'unknown'
  }

  it('routes success result (ResultCode "0") to success branch', () => {
    expect(handleResult(SUCCESS_RESULT)).toBe('success')
  })

  it('routes success result (ResultCode 0 numeric) to success branch', () => {
    const result: B2BPayBillResult = {
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
    if (isB2BPayBillSuccess(SUCCESS_RESULT)) {
      expect(getB2BPayBillTransactionId(SUCCESS_RESULT)).toBe('QKA81LK5CY')
      expect(getB2BPayBillAmount(SUCCESS_RESULT)).toBe(190)
      expect(getB2BPayBillCurrency(SUCCESS_RESULT)).toBe('KES')
      expect(getB2BPayBillReceiverName(SUCCESS_RESULT)).toBe('TestPayBill - Vendor Ltd')
      expect(getB2BPayBillCompletedTime(SUCCESS_RESULT)).toBe('20221110110717')
      expect(getB2BPayBillBillReferenceNumber(SUCCESS_RESULT)).toBe('19008')
      expect(getB2BPayBillDebitPartyCharges(SUCCESS_RESULT)).toBeNull()
    }
  })

  it('failure handler can safely extract error fields', () => {
    if (isB2BPayBillFailure(FAILURE_RESULT)) {
      expect(getB2BPayBillResultDesc(FAILURE_RESULT)).toBe('The initiator information is invalid.')
      expect(getB2BPayBillAmount(FAILURE_RESULT)).toBeNull()
      expect(getB2BPayBillReceiverName(FAILURE_RESULT)).toBeNull()
      expect(getB2BPayBillBillReferenceNumber(FAILURE_RESULT)).toBeNull()
    }
  })
})

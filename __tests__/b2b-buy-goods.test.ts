/**
 * __tests__/b2b-buy-goods.test.ts
 *
 * Complete test suite for the B2B Buy Goods module:
 *   - initiateB2BBuyGoods()             — payment initiation
 *   - B2B_BUY_GOODS_RESULT_CODES        — documented result code constants
 *   - B2B_BUY_GOODS_ERROR_CODES         — documented error code constants
 *   - isKnownB2BBuyGoodsResultCode()    — result code validation helper
 *   - isB2BBuyGoodsResult()             — runtime payload type guard
 *   - isB2BBuyGoodsSuccess()            — success type guard
 *   - isB2BBuyGoodsFailure()            — failure type guard
 *   - getB2BBuyGoodsTransactionId()     — M-PESA receipt extractor
 *   - getB2BBuyGoodsConversationId()    — conversation ID extractor
 *   - getB2BBuyGoodsOriginatorConversationId() — originator ID extractor
 *   - getB2BBuyGoodsResultDesc()        — result description extractor
 *   - getB2BBuyGoodsResultCode()        — result code extractor
 *   - getB2BBuyGoodsAmount()            — amount extractor
 *   - getB2BBuyGoodsCompletedTime()     — completion timestamp extractor
 *   - getB2BBuyGoodsReceiverName()      — receiver name extractor
 *   - getB2BBuyGoodsDebitPartyCharges() — charges extractor
 *   - getB2BBuyGoodsCurrency()          — currency extractor
 *   - getB2BBuyGoodsDebitPartyAffectedBalance() — affected balance extractor
 *   - getB2BBuyGoodsDebitAccountBalance()       — debit balance extractor
 *   - getB2BBuyGoodsInitiatorBalance()  — initiator balance extractor
 *   - getB2BBuyGoodsBillReferenceNumber() — bill reference extractor
 *   - getB2BBuyGoodsQueueTimeoutUrl()   — queue timeout URL extractor
 *   - getB2BBuyGoodsResultParam()       — generic parameter extractor
 *
 * Strictly covers only what is documented in the Safaricom Daraja
 * Business Buy Goods API documentation.
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
import { initiateB2BBuyGoods } from '../src/mpesa/b2b-buy-goods/payment'
import {
  getB2BBuyGoodsAmount,
  getB2BBuyGoodsBillReferenceNumber,
  getB2BBuyGoodsCompletedTime,
  getB2BBuyGoodsConversationId,
  getB2BBuyGoodsCurrency,
  getB2BBuyGoodsDebitAccountBalance,
  getB2BBuyGoodsDebitPartyAffectedBalance,
  getB2BBuyGoodsDebitPartyCharges,
  getB2BBuyGoodsInitiatorBalance,
  getB2BBuyGoodsOriginatorConversationId,
  getB2BBuyGoodsQueueTimeoutUrl,
  getB2BBuyGoodsReceiverName,
  getB2BBuyGoodsResultCode,
  getB2BBuyGoodsResultDesc,
  getB2BBuyGoodsResultParam,
  getB2BBuyGoodsTransactionId,
  isB2BBuyGoodsFailure,
  isB2BBuyGoodsResult,
  isB2BBuyGoodsSuccess,
  isKnownB2BBuyGoodsResultCode,
} from '../src/mpesa/b2b-buy-goods/webhooks'
import {
  B2B_BUY_GOODS_ERROR_CODES,
  B2B_BUY_GOODS_RESULT_CODES,
} from '../src/mpesa/b2b-buy-goods/types'
import type {
  B2BBuyGoodsRequest,
  B2BBuyGoodsResponse,
  B2BBuyGoodsResult,
} from '../src/mpesa/b2b-buy-goods/types'

// ── Typed mock ────────────────────────────────────────────────────────────────

const mockHttpRequest = vi.mocked(httpRequest)

// ── Shared fixtures ───────────────────────────────────────────────────────────

const SANDBOX_URL = 'https://sandbox.safaricom.co.ke'
const PROD_URL = 'https://api.safaricom.co.ke'
const ACCESS_TOKEN = 'test-bearer-token-b2b-buy-goods'
const SECURITY_CREDENTIAL = 'EncryptedPassword=='
const INITIATOR_NAME = 'testapi'

// ── Request fixtures ──────────────────────────────────────────────────────────

const BASE_REQUEST: B2BBuyGoodsRequest = {
  commandId: 'BusinessBuyGoods',
  amount: 239,
  partyA: '123456',
  partyB: '000000',
  accountReference: '353353',
  requester: '254700000000',
  remarks: 'OK',
  queueTimeOutUrl: 'https://mydomain.com/b2b/businessbuygoods/queue/',
  resultUrl: 'https://mydomain.com/b2b/businessbuygoods/result/',
}

// ── Response fixtures (from Daraja docs) ──────────────────────────────────────

const INITIATE_RESPONSE: B2BBuyGoodsResponse = {
  OriginatorConversationID: '5118-111210482-1',
  ConversationID: 'AG_20230420_2010759fd5662ef6d054',
  ResponseCode: '0',
  ResponseDescription: 'Accept the service request successfully',
}

// ── Async result fixtures (from Daraja docs) ──────────────────────────────────

const SUCCESS_RESULT: B2BBuyGoodsResult = {
  Result: {
    ResultType: '0',
    ResultCode: '0',
    ResultDesc: 'The service request is processed successfully',
    OriginatorConversationID: '626f6ddf-ab37-4650-b882-b1de92ec9aa4',
    ConversationID: '12345677dfdf89099B3',
    TransactionID: 'QKA81LK5CY',
    ResultParameters: {
      ResultParameter: [
        {
          Key: 'DebitAccountBalance',
          Value: '{Amount={CurrencyCode=KES, MinimumAmount=618683, BasicAmount=6186.83}}',
        },
        { Key: 'Amount', Value: '190.00' },
        {
          Key: 'DebitPartyAffectedAccountBalance',
          Value: 'Working Account|KES|346568.83|6186.83|340382.00|0.00',
        },
        { Key: 'TransCompletedTime', Value: '20221110110717' },
        { Key: 'DebitPartyCharges', Value: '' },
        { Key: 'ReceiverPartyPublicName', Value: '000000 - Biller Company' },
        { Key: 'Currency', Value: 'KES' },
        {
          Key: 'InitiatorAccountCurrentBalance',
          Value: '{Amount={CurrencyCode=KES, MinimumAmount=618683, BasicAmount=6186.83}}',
        },
      ],
    },
    ReferenceData: {
      ReferenceItem: [
        { Key: 'BillReferenceNumber', Value: '19008' },
        {
          Key: 'QueueTimeoutURL',
          Value: 'https://mydomain.com/b2b/businessbuygoods/queue/',
        },
      ],
    },
  },
}

const FAILURE_RESULT: B2BBuyGoodsResult = {
  Result: {
    ResultType: 0,
    ResultCode: 2001,
    ResultDesc: 'The initiator information is invalid.',
    OriginatorConversationID: '12337-23509183-5',
    ConversationID: 'AG_20200120_0000657265d5fa9ae5c0',
    TransactionID: 'OAK0000000',
    ResultParameters: {
      ResultParameter: { Key: 'BOCompletedTime', Value: 20200120164825 },
    },
    ReferenceData: {
      ReferenceItem: {
        Key: 'QueueTimeoutURL',
        Value: 'https://mydomain.com/b2b/businessbuygoods/queue/',
      },
    },
  },
}

const FAILURE_NO_PARAMS: B2BBuyGoodsResult = {
  Result: {
    ResultType: 0,
    ResultCode: 1,
    ResultDesc: 'Insufficient funds in the account.',
    OriginatorConversationID: 'ORG-001',
    ConversationID: 'CONV-001',
    TransactionID: 'OAK0000001',
  },
}

// Success result with single ResultParameter object (not array) — Daraja inconsistency
const SUCCESS_SINGLE_PARAM: B2BBuyGoodsResult = {
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
// 1. B2B_BUY_GOODS_RESULT_CODES CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('B2B_BUY_GOODS_RESULT_CODES (documented by Daraja)', () => {
  it('SUCCESS is 0 (numeric)', () => {
    expect(B2B_BUY_GOODS_RESULT_CODES.SUCCESS).toBe(0)
    expect(typeof B2B_BUY_GOODS_RESULT_CODES.SUCCESS).toBe('number')
  })

  it('INSUFFICIENT_FUNDS is 1', () => {
    expect(B2B_BUY_GOODS_RESULT_CODES.INSUFFICIENT_FUNDS).toBe(1)
  })

  it('AMOUNT_TOO_SMALL is 2', () => {
    expect(B2B_BUY_GOODS_RESULT_CODES.AMOUNT_TOO_SMALL).toBe(2)
  })

  it('AMOUNT_TOO_LARGE is 3', () => {
    expect(B2B_BUY_GOODS_RESULT_CODES.AMOUNT_TOO_LARGE).toBe(3)
  })

  it('DAILY_LIMIT_EXCEEDED is 4', () => {
    expect(B2B_BUY_GOODS_RESULT_CODES.DAILY_LIMIT_EXCEEDED).toBe(4)
  })

  it('MAX_BALANCE_EXCEEDED is 8', () => {
    expect(B2B_BUY_GOODS_RESULT_CODES.MAX_BALANCE_EXCEEDED).toBe(8)
  })

  it('INVALID_INITIATOR_INFO is 2001', () => {
    expect(B2B_BUY_GOODS_RESULT_CODES.INVALID_INITIATOR_INFO).toBe(2001)
  })

  it('ACCOUNT_INACTIVE is 2006', () => {
    expect(B2B_BUY_GOODS_RESULT_CODES.ACCOUNT_INACTIVE).toBe(2006)
  })

  it('PRODUCT_NOT_PERMITTED is 2028', () => {
    expect(B2B_BUY_GOODS_RESULT_CODES.PRODUCT_NOT_PERMITTED).toBe(2028)
  })

  it('CUSTOMER_NOT_REGISTERED is 2040', () => {
    expect(B2B_BUY_GOODS_RESULT_CODES.CUSTOMER_NOT_REGISTERED).toBe(2040)
  })

  it('contains exactly 10 documented result codes', () => {
    expect(Object.keys(B2B_BUY_GOODS_RESULT_CODES)).toHaveLength(10)
  })

  it('all values are numbers', () => {
    for (const value of Object.values(B2B_BUY_GOODS_RESULT_CODES)) {
      expect(typeof value).toBe('number')
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 2. B2B_BUY_GOODS_ERROR_CODES CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('B2B_BUY_GOODS_ERROR_CODES (documented by Daraja)', () => {
  it('INVALID_ACCESS_TOKEN is "400.003.01"', () => {
    expect(B2B_BUY_GOODS_ERROR_CODES.INVALID_ACCESS_TOKEN).toBe('400.003.01')
  })

  it('BAD_REQUEST is "400.003.02"', () => {
    expect(B2B_BUY_GOODS_ERROR_CODES.BAD_REQUEST).toBe('400.003.02')
  })

  it('INTERNAL_SERVER_ERROR is "500.003.1001"', () => {
    expect(B2B_BUY_GOODS_ERROR_CODES.INTERNAL_SERVER_ERROR).toBe('500.003.1001')
  })

  it('QUOTA_VIOLATION is "500.003.03"', () => {
    expect(B2B_BUY_GOODS_ERROR_CODES.QUOTA_VIOLATION).toBe('500.003.03')
  })

  it('SPIKE_ARREST is "500.003.02"', () => {
    expect(B2B_BUY_GOODS_ERROR_CODES.SPIKE_ARREST).toBe('500.003.02')
  })

  it('NOT_FOUND is "404.003.01"', () => {
    expect(B2B_BUY_GOODS_ERROR_CODES.NOT_FOUND).toBe('404.003.01')
  })

  it('INVALID_AUTH_HEADER is "404.001.04"', () => {
    expect(B2B_BUY_GOODS_ERROR_CODES.INVALID_AUTH_HEADER).toBe('404.001.04')
  })

  it('INVALID_PAYLOAD is "400.002.05"', () => {
    expect(B2B_BUY_GOODS_ERROR_CODES.INVALID_PAYLOAD).toBe('400.002.05')
  })

  it('contains exactly 8 documented error codes', () => {
    expect(Object.keys(B2B_BUY_GOODS_ERROR_CODES)).toHaveLength(8)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 3. isKnownB2BBuyGoodsResultCode()
// ═══════════════════════════════════════════════════════════════════════════════

describe('isKnownB2BBuyGoodsResultCode()', () => {
  it('returns true for 0 (success)', () => {
    expect(isKnownB2BBuyGoodsResultCode(0)).toBe(true)
  })

  it('returns true for 1 (insufficient funds)', () => {
    expect(isKnownB2BBuyGoodsResultCode(1)).toBe(true)
  })

  it('returns true for 2', () => {
    expect(isKnownB2BBuyGoodsResultCode(2)).toBe(true)
  })

  it('returns true for 3', () => {
    expect(isKnownB2BBuyGoodsResultCode(3)).toBe(true)
  })

  it('returns true for 4', () => {
    expect(isKnownB2BBuyGoodsResultCode(4)).toBe(true)
  })

  it('returns true for 8', () => {
    expect(isKnownB2BBuyGoodsResultCode(8)).toBe(true)
  })

  it('returns true for 2001', () => {
    expect(isKnownB2BBuyGoodsResultCode(2001)).toBe(true)
  })

  it('returns true for 2006', () => {
    expect(isKnownB2BBuyGoodsResultCode(2006)).toBe(true)
  })

  it('returns true for 2028', () => {
    expect(isKnownB2BBuyGoodsResultCode(2028)).toBe(true)
  })

  it('returns true for 2040', () => {
    expect(isKnownB2BBuyGoodsResultCode(2040)).toBe(true)
  })

  it('returns true for "0" (string variant)', () => {
    expect(isKnownB2BBuyGoodsResultCode('0')).toBe(true)
  })

  it('returns true for "2001" (string variant)', () => {
    expect(isKnownB2BBuyGoodsResultCode('2001')).toBe(true)
  })

  it('returns false for an undocumented code', () => {
    expect(isKnownB2BBuyGoodsResultCode(9999)).toBe(false)
  })

  it('returns false for a negative number', () => {
    expect(isKnownB2BBuyGoodsResultCode(-1)).toBe(false)
  })

  it('returns false for null', () => {
    expect(isKnownB2BBuyGoodsResultCode(null)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(isKnownB2BBuyGoodsResultCode(undefined)).toBe(false)
  })

  it('returns false for an empty string', () => {
    expect(isKnownB2BBuyGoodsResultCode('')).toBe(false)
  })

  it('returns false for an arbitrary string', () => {
    expect(isKnownB2BBuyGoodsResultCode('UNKNOWN')).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 4. initiateB2BBuyGoods() — SUCCESS
// ═══════════════════════════════════════════════════════════════════════════════

describe('initiateB2BBuyGoods() — success', () => {
  beforeEach(() => {
    mockHttpRequest.mockResolvedValue({ data: INITIATE_RESPONSE } as never)
  })

  it('returns the Daraja acknowledgement on success', async () => {
    const result = await initiateB2BBuyGoods(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(result).toStrictEqual(INITIATE_RESPONSE)
  })

  it('calls the correct Daraja B2B endpoint', async () => {
    await initiateB2BBuyGoods(
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
    await initiateB2BBuyGoods(
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
    await initiateB2BBuyGoods(
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
// 5. initiateB2BBuyGoods() — REQUEST BODY SHAPE (Daraja spec)
// ═══════════════════════════════════════════════════════════════════════════════

describe('initiateB2BBuyGoods() — request body shape (Daraja spec)', () => {
  beforeEach(() => {
    mockHttpRequest.mockResolvedValue({ data: INITIATE_RESPONSE } as never)
  })

  function getBody(): Record<string, unknown> {
    const call = mockHttpRequest.mock.calls[0]
    return (call?.[1] as { body: Record<string, unknown> }).body
  }

  it('sends Initiator as the provided initiator name', async () => {
    await initiateB2BBuyGoods(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(getBody()['Initiator']).toBe('testapi')
  })

  it('sends SecurityCredential as provided', async () => {
    await initiateB2BBuyGoods(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(getBody()['SecurityCredential']).toBe(SECURITY_CREDENTIAL)
  })

  it('sends CommandID as "BusinessBuyGoods"', async () => {
    await initiateB2BBuyGoods(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(getBody()['CommandID']).toBe('BusinessBuyGoods')
  })

  it('sends SenderIdentifierType as "4" (hardcoded per docs)', async () => {
    await initiateB2BBuyGoods(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(getBody()['SenderIdentifierType']).toBe('4')
  })

  it('sends RecieverIdentifierType as "4" (hardcoded per docs)', async () => {
    await initiateB2BBuyGoods(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(getBody()['RecieverIdentifierType']).toBe('4')
  })

  it('sends Amount as a STRING per Daraja JSON spec', async () => {
    await initiateB2BBuyGoods(
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
    await initiateB2BBuyGoods(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
      ...BASE_REQUEST,
      amount: 239.7,
    })
    expect(getBody()['Amount']).toBe('240')
  })

  it('sends PartyA as a string', async () => {
    await initiateB2BBuyGoods(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(typeof getBody()['PartyA']).toBe('string')
    expect(getBody()['PartyA']).toBe('123456')
  })

  it('sends PartyB as a string (till/merchant number)', async () => {
    await initiateB2BBuyGoods(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(typeof getBody()['PartyB']).toBe('string')
    expect(getBody()['PartyB']).toBe('000000')
  })

  it('truncates AccountReference to 13 characters per docs', async () => {
    await initiateB2BBuyGoods(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
      ...BASE_REQUEST,
      accountReference: 'A'.repeat(20),
    })
    const ref = getBody()['AccountReference'] as string
    expect(ref.length).toBeLessThanOrEqual(13)
    expect(ref).toBe('A'.repeat(13))
  })

  it('sends Remarks exactly as provided', async () => {
    await initiateB2BBuyGoods(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(getBody()['Remarks']).toBe('OK')
  })

  it('defaults Remarks to "Business Buy Goods" when not provided', async () => {
    const { remarks: _, ...withoutRemarks } = BASE_REQUEST
    await initiateB2BBuyGoods(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      withoutRemarks,
    )
    expect(getBody()['Remarks']).toBe('Business Buy Goods')
  })

  it('sends QueueTimeOutURL exactly as provided', async () => {
    await initiateB2BBuyGoods(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(getBody()['QueueTimeOutURL']).toBe('https://mydomain.com/b2b/businessbuygoods/queue/')
  })

  it('sends ResultURL exactly as provided', async () => {
    await initiateB2BBuyGoods(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(getBody()['ResultURL']).toBe('https://mydomain.com/b2b/businessbuygoods/result/')
  })

  it('includes Requester when provided', async () => {
    await initiateB2BBuyGoods(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(getBody()['Requester']).toBe('254700000000')
  })

  it('omits Requester when not provided', async () => {
    const { requester: _, ...withoutRequester } = BASE_REQUEST
    await initiateB2BBuyGoods(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      withoutRequester,
    )
    expect(getBody()).not.toHaveProperty('Requester')
  })

  it('omits Requester when it is an empty string', async () => {
    await initiateB2BBuyGoods(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
      ...BASE_REQUEST,
      requester: '',
    })
    expect(getBody()).not.toHaveProperty('Requester')
  })

  it('omits Requester when it is whitespace only', async () => {
    await initiateB2BBuyGoods(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
      ...BASE_REQUEST,
      requester: '   ',
    })
    expect(getBody()).not.toHaveProperty('Requester')
  })

  it('sends 13 fields when Requester is provided (all Daraja-documented fields)', async () => {
    await initiateB2BBuyGoods(
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

  it('sends 12 fields when Requester is omitted', async () => {
    const { requester: _, ...withoutRequester } = BASE_REQUEST
    await initiateB2BBuyGoods(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      withoutRequester,
    )
    expect(Object.keys(getBody())).toHaveLength(12)
    expect(getBody()).not.toHaveProperty('Requester')
  })

  it('sends Occassion (Daraja typo preserved) when occasion is provided', async () => {
    await initiateB2BBuyGoods(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
      ...BASE_REQUEST,
      occasion: 'StockReplenishment',
    })
    expect(getBody()['Occassion']).toBe('StockReplenishment')
  })

  it('omits Occassion when not provided', async () => {
    await initiateB2BBuyGoods(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(getBody()).not.toHaveProperty('Occassion')
  })

  it('omits Occassion when it is an empty string', async () => {
    await initiateB2BBuyGoods(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
      ...BASE_REQUEST,
      occasion: '',
    })
    expect(getBody()).not.toHaveProperty('Occassion')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 6. initiateB2BBuyGoods() — CommandID VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('initiateB2BBuyGoods() — CommandID validation', () => {
  it('throws VALIDATION_ERROR when commandId is not "BusinessBuyGoods"', async () => {
    await expect(
      initiateB2BBuyGoods(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        commandId: 'BusinessPayBill' as never,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('error message mentions "BusinessBuyGoods"', async () => {
    const error = await initiateB2BBuyGoods(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      { ...BASE_REQUEST, commandId: 'WrongCommand' as never },
    ).catch((e: unknown) => e as { message: string })
    expect(error.message).toContain('BusinessBuyGoods')
  })

  it('does not call httpRequest when commandId is wrong', async () => {
    await initiateB2BBuyGoods(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
      ...BASE_REQUEST,
      commandId: 'BusinessPayBill' as never,
    }).catch(() => {})
    expect(mockHttpRequest).not.toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 7. initiateB2BBuyGoods() — AMOUNT VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('initiateB2BBuyGoods() — amount validation', () => {
  it('throws VALIDATION_ERROR for amount 0', async () => {
    await expect(
      initiateB2BBuyGoods(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        amount: 0,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR for negative amount', async () => {
    await expect(
      initiateB2BBuyGoods(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        amount: -100,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR for amount that rounds to 0 (e.g. 0.4)', async () => {
    await expect(
      initiateB2BBuyGoods(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        amount: 0.4,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('accepts amount 1 (minimum)', async () => {
    mockHttpRequest.mockResolvedValue({ data: INITIATE_RESPONSE } as never)
    await expect(
      initiateB2BBuyGoods(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        amount: 1,
      }),
    ).resolves.toBeDefined()
  })

  it('accepts 0.6 which rounds to 1 (meets minimum)', async () => {
    mockHttpRequest.mockResolvedValue({ data: INITIATE_RESPONSE } as never)
    await expect(
      initiateB2BBuyGoods(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        amount: 0.6,
      }),
    ).resolves.toBeDefined()
  })

  it('does not call httpRequest when amount validation fails', async () => {
    await initiateB2BBuyGoods(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
      ...BASE_REQUEST,
      amount: 0,
    }).catch(() => {})
    expect(mockHttpRequest).not.toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 8. initiateB2BBuyGoods() — REQUIRED FIELD VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('initiateB2BBuyGoods() — required field validation', () => {
  it('throws VALIDATION_ERROR when partyA is empty', async () => {
    await expect(
      initiateB2BBuyGoods(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        partyA: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when partyB is empty', async () => {
    await expect(
      initiateB2BBuyGoods(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        partyB: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when accountReference is empty', async () => {
    await expect(
      initiateB2BBuyGoods(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        accountReference: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when resultUrl is empty', async () => {
    await expect(
      initiateB2BBuyGoods(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        resultUrl: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when queueTimeOutUrl is empty', async () => {
    await expect(
      initiateB2BBuyGoods(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        queueTimeOutUrl: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('does not call httpRequest when required field validation fails', async () => {
    await initiateB2BBuyGoods(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
      ...BASE_REQUEST,
      partyA: '',
    }).catch(() => {})
    expect(mockHttpRequest).not.toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 9. initiateB2BBuyGoods() — RESPONSE FIELDS (Daraja spec)
// ═══════════════════════════════════════════════════════════════════════════════

describe('initiateB2BBuyGoods() — response fields (Daraja spec)', () => {
  beforeEach(() => {
    mockHttpRequest.mockResolvedValue({ data: INITIATE_RESPONSE } as never)
  })

  it('response includes OriginatorConversationID', async () => {
    const res = await initiateB2BBuyGoods(
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
    const res = await initiateB2BBuyGoods(
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
    const res = await initiateB2BBuyGoods(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(typeof res.ResponseCode).toBe('string')
  })

  it('response includes ResponseDescription', async () => {
    const res = await initiateB2BBuyGoods(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(typeof res.ResponseDescription).toBe('string')
  })

  it('ResponseCode "0" indicates request was accepted', async () => {
    const res = await initiateB2BBuyGoods(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(res.ResponseCode).toBe('0')
  })

  it('response matches the exact Daraja documented payload', async () => {
    const res = await initiateB2BBuyGoods(
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
// 10. initiateB2BBuyGoods() — ERROR PROPAGATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('initiateB2BBuyGoods() — error propagation', () => {
  it('propagates a generic Error from httpRequest', async () => {
    mockHttpRequest.mockRejectedValue(new Error('ECONNRESET'))
    await expect(
      initiateB2BBuyGoods(
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
      initiateB2BBuyGoods(
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
// 11. isB2BBuyGoodsResult() — RUNTIME TYPE GUARD
// ═══════════════════════════════════════════════════════════════════════════════

describe('isB2BBuyGoodsResult() — runtime type guard', () => {
  it('returns true for a valid success result', () => {
    expect(isB2BBuyGoodsResult(SUCCESS_RESULT)).toBe(true)
  })

  it('returns true for a valid failure result', () => {
    expect(isB2BBuyGoodsResult(FAILURE_RESULT)).toBe(true)
  })

  it('returns true for a failure result with no ResultParameters', () => {
    expect(isB2BBuyGoodsResult(FAILURE_NO_PARAMS)).toBe(true)
  })

  it('returns false for null', () => {
    expect(isB2BBuyGoodsResult(null)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(isB2BBuyGoodsResult(undefined)).toBe(false)
  })

  it('returns false for an empty object', () => {
    expect(isB2BBuyGoodsResult({})).toBe(false)
  })

  it('returns false when Result is missing', () => {
    expect(isB2BBuyGoodsResult({ data: 'something' })).toBe(false)
  })

  it('returns false when ResultCode is missing', () => {
    expect(
      isB2BBuyGoodsResult({ Result: { ConversationID: 'x', OriginatorConversationID: 'y' } }),
    ).toBe(false)
  })

  it('returns false when ConversationID is missing', () => {
    expect(isB2BBuyGoodsResult({ Result: { ResultCode: 0, OriginatorConversationID: 'y' } })).toBe(
      false,
    )
  })

  it('returns false when OriginatorConversationID is missing', () => {
    expect(isB2BBuyGoodsResult({ Result: { ResultCode: 0, ConversationID: 'x' } })).toBe(false)
  })

  it('returns false for non-object values', () => {
    expect(isB2BBuyGoodsResult('string')).toBe(false)
    expect(isB2BBuyGoodsResult(42)).toBe(false)
    expect(isB2BBuyGoodsResult([])).toBe(false)
    expect(isB2BBuyGoodsResult(true)).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 12. isB2BBuyGoodsSuccess() / isB2BBuyGoodsFailure()
// ═══════════════════════════════════════════════════════════════════════════════

describe('isB2BBuyGoodsSuccess()', () => {
  it('returns true when ResultCode is "0" (string — per success docs sample)', () => {
    expect(isB2BBuyGoodsSuccess(SUCCESS_RESULT)).toBe(true)
  })

  it('returns true when ResultCode is 0 (number)', () => {
    const result: B2BBuyGoodsResult = {
      Result: { ...SUCCESS_RESULT.Result, ResultCode: 0 },
    }
    expect(isB2BBuyGoodsSuccess(result)).toBe(true)
  })

  it('returns false when ResultCode is 2001', () => {
    expect(isB2BBuyGoodsSuccess(FAILURE_RESULT)).toBe(false)
  })

  it('returns false when ResultCode is 1 (insufficient funds)', () => {
    expect(isB2BBuyGoodsSuccess(FAILURE_NO_PARAMS)).toBe(false)
  })
})

describe('isB2BBuyGoodsFailure()', () => {
  it('returns false for success (ResultCode "0")', () => {
    expect(isB2BBuyGoodsFailure(SUCCESS_RESULT)).toBe(false)
  })

  it('returns true for failure (ResultCode 2001)', () => {
    expect(isB2BBuyGoodsFailure(FAILURE_RESULT)).toBe(true)
  })

  it('returns true for failure (ResultCode 1)', () => {
    expect(isB2BBuyGoodsFailure(FAILURE_NO_PARAMS)).toBe(true)
  })

  it('isB2BBuyGoodsSuccess and isB2BBuyGoodsFailure are mutually exclusive', () => {
    expect(isB2BBuyGoodsSuccess(SUCCESS_RESULT) && isB2BBuyGoodsFailure(SUCCESS_RESULT)).toBe(false)
    expect(isB2BBuyGoodsSuccess(FAILURE_RESULT) && isB2BBuyGoodsFailure(FAILURE_RESULT)).toBe(false)
    expect(isB2BBuyGoodsSuccess(SUCCESS_RESULT) || isB2BBuyGoodsFailure(SUCCESS_RESULT)).toBe(true)
    expect(isB2BBuyGoodsSuccess(FAILURE_RESULT) || isB2BBuyGoodsFailure(FAILURE_RESULT)).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 13. CORE FIELD EXTRACTORS
// ═══════════════════════════════════════════════════════════════════════════════

describe('getB2BBuyGoodsTransactionId()', () => {
  it('returns TransactionID from success result', () => {
    expect(getB2BBuyGoodsTransactionId(SUCCESS_RESULT)).toBe('QKA81LK5CY')
  })

  it('returns TransactionID from failure result (generic ID on failure)', () => {
    expect(getB2BBuyGoodsTransactionId(FAILURE_RESULT)).toBe('OAK0000000')
  })
})

describe('getB2BBuyGoodsConversationId()', () => {
  it('returns ConversationID from success result', () => {
    expect(getB2BBuyGoodsConversationId(SUCCESS_RESULT)).toBe('12345677dfdf89099B3')
  })

  it('returns ConversationID from failure result', () => {
    expect(getB2BBuyGoodsConversationId(FAILURE_RESULT)).toBe('AG_20200120_0000657265d5fa9ae5c0')
  })
})

describe('getB2BBuyGoodsOriginatorConversationId()', () => {
  it('returns OriginatorConversationID from success result', () => {
    expect(getB2BBuyGoodsOriginatorConversationId(SUCCESS_RESULT)).toBe(
      '626f6ddf-ab37-4650-b882-b1de92ec9aa4',
    )
  })

  it('returns OriginatorConversationID from failure result', () => {
    expect(getB2BBuyGoodsOriginatorConversationId(FAILURE_RESULT)).toBe('12337-23509183-5')
  })
})

describe('getB2BBuyGoodsResultDesc()', () => {
  it('returns ResultDesc from success result', () => {
    expect(getB2BBuyGoodsResultDesc(SUCCESS_RESULT)).toBe(
      'The service request is processed successfully',
    )
  })

  it('returns ResultDesc from failure result', () => {
    expect(getB2BBuyGoodsResultDesc(FAILURE_RESULT)).toBe('The initiator information is invalid.')
  })
})

describe('getB2BBuyGoodsResultCode()', () => {
  it('returns "0" (string) for success result', () => {
    expect(getB2BBuyGoodsResultCode(SUCCESS_RESULT)).toBe('0')
  })

  it('returns 2001 (number) for failure result', () => {
    expect(getB2BBuyGoodsResultCode(FAILURE_RESULT)).toBe(2001)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 14. RESULT PARAMETER EXTRACTORS
// ═══════════════════════════════════════════════════════════════════════════════

describe('getB2BBuyGoodsAmount()', () => {
  it('returns Amount as a number from success result', () => {
    expect(getB2BBuyGoodsAmount(SUCCESS_RESULT)).toBe(190)
    expect(typeof getB2BBuyGoodsAmount(SUCCESS_RESULT)).toBe('number')
  })

  it('returns null when ResultParameters is absent', () => {
    expect(getB2BBuyGoodsAmount(FAILURE_NO_PARAMS)).toBeNull()
  })

  it('returns Amount from single-parameter (non-array) form', () => {
    expect(getB2BBuyGoodsAmount(SUCCESS_SINGLE_PARAM)).toBe(500)
  })
})

describe('getB2BBuyGoodsCompletedTime()', () => {
  it('returns TransCompletedTime from success result', () => {
    expect(getB2BBuyGoodsCompletedTime(SUCCESS_RESULT)).toBe('20221110110717')
  })

  it('returns BOCompletedTime as fallback from failure result (object form)', () => {
    expect(getB2BBuyGoodsCompletedTime(FAILURE_RESULT)).toBe('20200120164825')
  })

  it('returns null when neither time field is present', () => {
    expect(getB2BBuyGoodsCompletedTime(FAILURE_NO_PARAMS)).toBeNull()
  })
})

describe('getB2BBuyGoodsReceiverName()', () => {
  it('returns ReceiverPartyPublicName from success result', () => {
    expect(getB2BBuyGoodsReceiverName(SUCCESS_RESULT)).toBe('000000 - Biller Company')
  })

  it('returns null when not present', () => {
    expect(getB2BBuyGoodsReceiverName(FAILURE_RESULT)).toBeNull()
  })

  it('returns null when ResultParameters is absent', () => {
    expect(getB2BBuyGoodsReceiverName(FAILURE_NO_PARAMS)).toBeNull()
  })
})

describe('getB2BBuyGoodsDebitPartyCharges()', () => {
  it('returns null when DebitPartyCharges is empty string (no charges)', () => {
    expect(getB2BBuyGoodsDebitPartyCharges(SUCCESS_RESULT)).toBeNull()
  })

  it('returns charge string when charges are present', () => {
    const withCharges: B2BBuyGoodsResult = {
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
    expect(getB2BBuyGoodsDebitPartyCharges(withCharges)).toBe('5.00')
  })

  it('returns null when ResultParameters is absent', () => {
    expect(getB2BBuyGoodsDebitPartyCharges(FAILURE_NO_PARAMS)).toBeNull()
  })
})

describe('getB2BBuyGoodsCurrency()', () => {
  it('returns "KES" from success result', () => {
    expect(getB2BBuyGoodsCurrency(SUCCESS_RESULT)).toBe('KES')
  })

  it('returns "KES" as default when Currency not in parameters', () => {
    expect(getB2BBuyGoodsCurrency(FAILURE_RESULT)).toBe('KES')
  })

  it('returns "KES" when ResultParameters is absent', () => {
    expect(getB2BBuyGoodsCurrency(FAILURE_NO_PARAMS)).toBe('KES')
  })
})

describe('getB2BBuyGoodsDebitPartyAffectedBalance()', () => {
  it('returns DebitPartyAffectedAccountBalance from success result', () => {
    expect(getB2BBuyGoodsDebitPartyAffectedBalance(SUCCESS_RESULT)).toBe(
      'Working Account|KES|346568.83|6186.83|340382.00|0.00',
    )
  })

  it('returns null when not present', () => {
    expect(getB2BBuyGoodsDebitPartyAffectedBalance(FAILURE_NO_PARAMS)).toBeNull()
  })
})

describe('getB2BBuyGoodsDebitAccountBalance()', () => {
  it('returns DebitAccountBalance from success result', () => {
    const value = getB2BBuyGoodsDebitAccountBalance(SUCCESS_RESULT)
    expect(value).toBe('{Amount={CurrencyCode=KES, MinimumAmount=618683, BasicAmount=6186.83}}')
  })

  it('returns null when not present', () => {
    expect(getB2BBuyGoodsDebitAccountBalance(FAILURE_NO_PARAMS)).toBeNull()
  })
})

describe('getB2BBuyGoodsInitiatorBalance()', () => {
  it('returns InitiatorAccountCurrentBalance from success result', () => {
    const value = getB2BBuyGoodsInitiatorBalance(SUCCESS_RESULT)
    expect(value).toBe('{Amount={CurrencyCode=KES, MinimumAmount=618683, BasicAmount=6186.83}}')
  })

  it('returns null when not present', () => {
    expect(getB2BBuyGoodsInitiatorBalance(FAILURE_NO_PARAMS)).toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 15. REFERENCE DATA EXTRACTORS
// ═══════════════════════════════════════════════════════════════════════════════

describe('getB2BBuyGoodsBillReferenceNumber()', () => {
  it('returns BillReferenceNumber from ReferenceData array form', () => {
    expect(getB2BBuyGoodsBillReferenceNumber(SUCCESS_RESULT)).toBe('19008')
  })

  it('returns null when ReferenceData is absent', () => {
    expect(getB2BBuyGoodsBillReferenceNumber(FAILURE_NO_PARAMS)).toBeNull()
  })

  it('returns null when BillReferenceNumber key is not in ReferenceData', () => {
    // FAILURE_RESULT has only QueueTimeoutURL in ReferenceData (object form)
    expect(getB2BBuyGoodsBillReferenceNumber(FAILURE_RESULT)).toBeNull()
  })
})

describe('getB2BBuyGoodsQueueTimeoutUrl()', () => {
  it('returns QueueTimeoutURL from ReferenceData array form', () => {
    expect(getB2BBuyGoodsQueueTimeoutUrl(SUCCESS_RESULT)).toBe(
      'https://mydomain.com/b2b/businessbuygoods/queue/',
    )
  })

  it('returns QueueTimeoutURL from ReferenceData object form (failure)', () => {
    expect(getB2BBuyGoodsQueueTimeoutUrl(FAILURE_RESULT)).toBe(
      'https://mydomain.com/b2b/businessbuygoods/queue/',
    )
  })

  it('returns null when ReferenceData is absent', () => {
    expect(getB2BBuyGoodsQueueTimeoutUrl(FAILURE_NO_PARAMS)).toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 16. getB2BBuyGoodsResultParam() — INTERNAL HELPER
// ═══════════════════════════════════════════════════════════════════════════════

describe('getB2BBuyGoodsResultParam()', () => {
  it('extracts a value from an array of ResultParameters', () => {
    expect(getB2BBuyGoodsResultParam(SUCCESS_RESULT, 'Amount')).toBe('190.00')
  })

  it('extracts a value from a single ResultParameter (non-array form)', () => {
    expect(getB2BBuyGoodsResultParam(SUCCESS_SINGLE_PARAM, 'Amount')).toBe('500.00')
  })

  it('extracts BOCompletedTime from single-object form (failure)', () => {
    expect(getB2BBuyGoodsResultParam(FAILURE_RESULT, 'BOCompletedTime')).toBe(20200120164825)
  })

  it('returns undefined for a key not present', () => {
    expect(getB2BBuyGoodsResultParam(SUCCESS_RESULT, 'NonExistent')).toBeUndefined()
  })

  it('returns undefined when ResultParameters is absent', () => {
    expect(getB2BBuyGoodsResultParam(FAILURE_NO_PARAMS, 'Amount')).toBeUndefined()
  })

  it('extracts all documented result parameter keys', () => {
    expect(getB2BBuyGoodsResultParam(SUCCESS_RESULT, 'Amount')).toBe('190.00')
    expect(getB2BBuyGoodsResultParam(SUCCESS_RESULT, 'TransCompletedTime')).toBe('20221110110717')
    expect(getB2BBuyGoodsResultParam(SUCCESS_RESULT, 'ReceiverPartyPublicName')).toBe(
      '000000 - Biller Company',
    )
    expect(getB2BBuyGoodsResultParam(SUCCESS_RESULT, 'Currency')).toBe('KES')
    expect(getB2BBuyGoodsResultParam(SUCCESS_RESULT, 'DebitPartyCharges')).toBe('')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 17. RESULT PAYLOAD STRUCTURE (Daraja spec)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Success result payload structure (Daraja spec)', () => {
  it('has a Result root object', () => {
    expect(SUCCESS_RESULT).toHaveProperty('Result')
    expect(typeof SUCCESS_RESULT.Result).toBe('object')
  })

  it('has ResultCode as "0" (string — per success docs sample)', () => {
    expect(SUCCESS_RESULT.Result.ResultCode).toBe('0')
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

  it('ResultParameters contains Amount key', () => {
    const params = SUCCESS_RESULT.Result.ResultParameters?.ResultParameter as Array<{
      Key: string
      Value: unknown
    }>
    expect(params.some((p) => p.Key === 'Amount')).toBe(true)
  })

  it('ResultParameters contains Currency key', () => {
    const params = SUCCESS_RESULT.Result.ResultParameters?.ResultParameter as Array<{
      Key: string
      Value: unknown
    }>
    expect(params.some((p) => p.Key === 'Currency')).toBe(true)
  })

  it('has ReferenceData with a ReferenceItem array', () => {
    expect(SUCCESS_RESULT.Result.ReferenceData).toBeDefined()
    expect(Array.isArray(SUCCESS_RESULT.Result.ReferenceData?.ReferenceItem)).toBe(true)
  })
})

describe('Failed result payload structure (Daraja spec)', () => {
  it('has ResultCode as 2001 (number — per failure docs sample)', () => {
    expect(FAILURE_RESULT.Result.ResultCode).toBe(2001)
    expect(typeof FAILURE_RESULT.Result.ResultCode).toBe('number')
  })

  it('has a non-zero ResultCode', () => {
    expect(FAILURE_RESULT.Result.ResultCode).not.toBe(0)
    expect(FAILURE_RESULT.Result.ResultCode).not.toBe('0')
  })

  it('has a TransactionID even on failure (generic ID)', () => {
    expect(typeof FAILURE_RESULT.Result.TransactionID).toBe('string')
    expect(FAILURE_RESULT.Result.TransactionID.length).toBeGreaterThan(0)
  })

  it('ResultParameter may be a single object on failure (not array)', () => {
    const params = FAILURE_RESULT.Result.ResultParameters?.ResultParameter
    expect(params).toBeDefined()
    expect(Array.isArray(params)).toBe(false)
    expect(typeof params).toBe('object')
  })

  it('isKnownB2BBuyGoodsResultCode returns true for failure code 2001', () => {
    expect(isKnownB2BBuyGoodsResultCode(FAILURE_RESULT.Result.ResultCode)).toBe(true)
  })

  it('isKnownB2BBuyGoodsResultCode returns true for failure code 1', () => {
    expect(isKnownB2BBuyGoodsResultCode(FAILURE_NO_PARAMS.Result.ResultCode)).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 18. DISCRIMINATED DISPATCH PATTERN
// ═══════════════════════════════════════════════════════════════════════════════

describe('Discriminated dispatch pattern', () => {
  function handleResult(result: B2BBuyGoodsResult): string {
    if (isB2BBuyGoodsSuccess(result)) return 'success'
    if (isB2BBuyGoodsFailure(result)) return 'failure'
    return 'unknown'
  }

  it('routes success result (ResultCode "0") to success branch', () => {
    expect(handleResult(SUCCESS_RESULT)).toBe('success')
  })

  it('routes success result (ResultCode 0) to success branch', () => {
    const result: B2BBuyGoodsResult = {
      Result: { ...SUCCESS_RESULT.Result, ResultCode: 0 },
    }
    expect(handleResult(result)).toBe('success')
  })

  it('routes failure result (ResultCode 2001) to failure branch', () => {
    expect(handleResult(FAILURE_RESULT)).toBe('failure')
  })

  it('routes failure result (ResultCode 1) to failure branch', () => {
    expect(handleResult(FAILURE_NO_PARAMS)).toBe('failure')
  })

  it('success handler can safely extract all documented fields', () => {
    if (isB2BBuyGoodsSuccess(SUCCESS_RESULT)) {
      expect(getB2BBuyGoodsTransactionId(SUCCESS_RESULT)).toBe('QKA81LK5CY')
      expect(getB2BBuyGoodsAmount(SUCCESS_RESULT)).toBe(190)
      expect(getB2BBuyGoodsReceiverName(SUCCESS_RESULT)).toBe('000000 - Biller Company')
      expect(getB2BBuyGoodsCurrency(SUCCESS_RESULT)).toBe('KES')
      expect(getB2BBuyGoodsCompletedTime(SUCCESS_RESULT)).toBe('20221110110717')
      expect(getB2BBuyGoodsBillReferenceNumber(SUCCESS_RESULT)).toBe('19008')
      expect(getB2BBuyGoodsQueueTimeoutUrl(SUCCESS_RESULT)).toBe(
        'https://mydomain.com/b2b/businessbuygoods/queue/',
      )
    }
  })

  it('failure handler can safely extract error fields', () => {
    if (isB2BBuyGoodsFailure(FAILURE_RESULT)) {
      expect(getB2BBuyGoodsResultDesc(FAILURE_RESULT)).toBe('The initiator information is invalid.')
      expect(getB2BBuyGoodsAmount(FAILURE_RESULT)).toBeNull()
      expect(getB2BBuyGoodsReceiverName(FAILURE_RESULT)).toBeNull()
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 19. B2B BUY GOODS vs B2B PAY BILL — DISTINCTION
// ═══════════════════════════════════════════════════════════════════════════════

describe('B2B Buy Goods is distinct from B2B Pay Bill', () => {
  it('CommandID is "BusinessBuyGoods" (not "BusinessPayBill")', () => {
    expect(BASE_REQUEST.commandId).toBe('BusinessBuyGoods')
  })

  it('throws VALIDATION_ERROR if "BusinessPayBill" commandId is used', async () => {
    await expect(
      initiateB2BBuyGoods(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        commandId: 'BusinessPayBill' as never,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('B2B_BUY_GOODS_RESULT_CODES and B2B_PAY_BILL_RESULT_CODES have same structure', async () => {
    // Both APIs share the same documented result code set
    const { B2B_PAY_BILL_RESULT_CODES } = await import('../src/mpesa/b2b-pay-bill/types')
    expect(Object.keys(B2B_BUY_GOODS_RESULT_CODES)).toStrictEqual(
      Object.keys(B2B_PAY_BILL_RESULT_CODES),
    )
    expect(Object.values(B2B_BUY_GOODS_RESULT_CODES)).toStrictEqual(
      Object.values(B2B_PAY_BILL_RESULT_CODES),
    )
  })
})

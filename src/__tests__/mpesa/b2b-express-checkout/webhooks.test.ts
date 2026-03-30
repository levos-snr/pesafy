// 📁 PATH: src/__tests__/mpesa/b2b-express-checkout/webhooks.test.ts
import { describe, expect, it } from 'vitest'
import {
  getB2BAmount,
  getB2BConversationId,
  getB2BRequestId,
  getB2BTransactionId,
  isB2BCheckoutCallback,
  isB2BCheckoutCancelled,
  isB2BCheckoutSuccess,
} from '../../../mpesa/b2b-express-checkout/webhooks'
import type {
  B2BExpressCheckoutCallbackCancelled,
  B2BExpressCheckoutCallbackSuccess,
} from '../../../mpesa/b2b-express-checkout/types'

const SUCCESS_CALLBACK: B2BExpressCheckoutCallbackSuccess = {
  resultCode: '0',
  resultDesc: 'The service request is processed successfully.',
  amount: '100',
  requestId: 'req-001',
  resultType: '0',
  conversationID: 'AG_20231001_001',
  transactionId: 'RDQ01NFT1Q',
  status: 'SUCCESS',
}

const CANCELLED_CALLBACK: B2BExpressCheckoutCallbackCancelled = {
  resultCode: '4001',
  resultDesc: 'User cancelled transaction',
  requestId: 'req-002',
  amount: '100',
  paymentReference: 'payRef001',
}

describe('isB2BCheckoutCallback', () => {
  it('returns true for a success callback', () => {
    expect(isB2BCheckoutCallback(SUCCESS_CALLBACK)).toBe(true)
  })

  it('returns true for a cancelled callback', () => {
    expect(isB2BCheckoutCallback(CANCELLED_CALLBACK)).toBe(true)
  })

  it('returns false for null', () => {
    expect(isB2BCheckoutCallback(null)).toBe(false)
  })

  it('returns false for missing resultCode', () => {
    expect(isB2BCheckoutCallback({ requestId: 'x', amount: '10' })).toBe(false)
  })

  it('returns false for missing requestId', () => {
    expect(isB2BCheckoutCallback({ resultCode: '0', amount: '10' })).toBe(false)
  })

  it('returns false for non-string resultCode', () => {
    expect(
      isB2BCheckoutCallback({ resultCode: 0, requestId: 'x', amount: '10' }),
    ).toBe(false)
  })
})

describe('isB2BCheckoutSuccess', () => {
  it('returns true for resultCode 0', () => {
    expect(isB2BCheckoutSuccess(SUCCESS_CALLBACK)).toBe(true)
  })

  it('returns false for cancelled (resultCode 4001)', () => {
    expect(isB2BCheckoutSuccess(CANCELLED_CALLBACK)).toBe(false)
  })
})

describe('isB2BCheckoutCancelled', () => {
  it('returns true for resultCode 4001', () => {
    expect(isB2BCheckoutCancelled(CANCELLED_CALLBACK)).toBe(true)
  })

  it('returns false for success (resultCode 0)', () => {
    expect(isB2BCheckoutCancelled(SUCCESS_CALLBACK)).toBe(false)
  })
})

describe('getB2BTransactionId', () => {
  it('returns transactionId for success callback', () => {
    expect(getB2BTransactionId(SUCCESS_CALLBACK)).toBe('RDQ01NFT1Q')
  })

  it('returns null for cancelled callback', () => {
    expect(getB2BTransactionId(CANCELLED_CALLBACK)).toBeNull()
  })
})

describe('getB2BAmount', () => {
  it('returns amount as a number for success', () => {
    expect(getB2BAmount(SUCCESS_CALLBACK)).toBe(100)
  })

  it('returns amount as a number for cancelled', () => {
    expect(getB2BAmount(CANCELLED_CALLBACK)).toBe(100)
  })
})

describe('getB2BRequestId', () => {
  it('returns the requestId from success callback', () => {
    expect(getB2BRequestId(SUCCESS_CALLBACK)).toBe('req-001')
  })

  it('returns the requestId from cancelled callback', () => {
    expect(getB2BRequestId(CANCELLED_CALLBACK)).toBe('req-002')
  })
})

describe('getB2BConversationId', () => {
  it('returns conversationID for success callback', () => {
    expect(getB2BConversationId(SUCCESS_CALLBACK)).toBe('AG_20231001_001')
  })

  it('returns null for cancelled callback', () => {
    expect(getB2BConversationId(CANCELLED_CALLBACK)).toBeNull()
  })
})

// 📁 PATH: src/__tests__/mpesa/webhooks/retry.test.ts
import { describe, expect, it, vi } from 'vitest'
import { retryWithBackoff } from '../../../mpesa/webhooks/retry'

describe('retryWithBackoff', () => {
  it('resolves immediately on first success', async () => {
    const fn = vi.fn().mockResolvedValueOnce('result')
    const result = await retryWithBackoff(fn, { initialDelay: 0 })
    expect(result.success).toBe(true)
    expect(result.data).toBe('result')
    expect(result.attempts).toBe(1)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries on failure and succeeds on second attempt', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValueOnce('ok')

    const result = await retryWithBackoff(fn, { initialDelay: 10 })
    expect(result.success).toBe(true)
    expect(result.attempts).toBe(2)
  })

  it('stops at maxRetries and returns failure', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'))

    const result = await retryWithBackoff(fn, {
      maxRetries: 2,
      initialDelay: 1,
    })
    expect(result.success).toBe(false)
    expect(result.attempts).toBe(2)
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('stops immediately on a 4xx-like error (non-retryable)', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('400 Bad Request'))

    const result = await retryWithBackoff(fn, {
      maxRetries: 5,
      initialDelay: 1,
    })
    expect(result.success).toBe(false)
    // Should not retry 4xx
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('returns the last error in result.error on failure', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('net fail'))

    const result = await retryWithBackoff(fn, {
      maxRetries: 1,
      initialDelay: 1,
    })
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
    expect(result.error?.message).toContain('Max retries')
  })

  it('works with maxRetries: 1 (single attempt)', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('error'))
    const result = await retryWithBackoff(fn, {
      maxRetries: 1,
      initialDelay: 1,
    })
    expect(result.success).toBe(false)
    expect(result.attempts).toBeLessThanOrEqual(1)
  })

  it('tracks attempt count correctly', async () => {
    let attempts = 0
    const fn = vi.fn().mockImplementation(async () => {
      attempts++
      if (attempts < 3) throw new Error('not yet')
      return 'done'
    })

    const result = await retryWithBackoff(fn, {
      maxRetries: 5,
      initialDelay: 1,
    })
    expect(result.success).toBe(true)
    expect(result.attempts).toBe(3)
  })
})

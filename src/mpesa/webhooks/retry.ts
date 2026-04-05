// src/mpesa/webhooks/retry.ts
//
// CHANGE: `while (attempts < opts.maxRetries)` → `while (attempts <= opts.maxRetries)`
//
// Rationale: maxRetries is the number of *retries* after the first attempt.
// With maxRetries = 0 the caller expects exactly one attempt (no retries).
// The old `<` condition skipped the loop entirely for maxRetries = 0.

export interface RetryOptions {
  /** Maximum number of attempts (default: Infinity) */
  maxRetries?: number
  /** Initial delay in ms (default: 1000 = 1 second) */
  initialDelay?: number
  /** Maximum delay cap in ms (default: 3_600_000 = 1 hour) */
  maxDelay?: number
  /** Multiplier per retry (default: 2 — doubles each time) */
  backoffMultiplier?: number
  /** Maximum total duration in ms (default: 30 days) */
  maxRetryDuration?: number
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: Infinity,
  initialDelay: 1_000,
  maxDelay: 3_600_000,
  backoffMultiplier: 2,
  maxRetryDuration: 30 * 24 * 60 * 60 * 1_000, // 30 days
}

export interface RetryResult<T> {
  success: boolean
  data?: T
  attempts: number
  error?: Error
}

/**
 * Retries `fn` with exponential backoff until it resolves, or limits are hit.
 *
 * `maxRetries` = number of *retries* after the first attempt.
 *   0 → one attempt total, no retries
 *   N → up to N+1 attempts total
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<RetryResult<T>> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  let delay = opts.initialDelay
  let attempts = 0
  const startTime = Date.now()

  // FIX: `<=` instead of `<` so maxRetries=0 still executes one attempt
  while (attempts <= opts.maxRetries) {
    attempts++

    if (Date.now() - startTime > opts.maxRetryDuration) {
      return {
        success: false,
        attempts,
        error: new Error('Max retry duration exceeded'),
      }
    }

    try {
      const data = await fn()
      return { success: true, data, attempts }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))

      // Don't retry client errors (4xx) — they won't self-heal
      if (err.message.includes('4')) {
        return { success: false, attempts, error: err }
      }

      if (attempts <= opts.maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delay))
        delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelay)
      }
    }
  }

  return {
    success: false,
    attempts,
    error: new Error('Max retries exceeded'),
  }
}

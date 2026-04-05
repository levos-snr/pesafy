/**
 * __tests__/remaining-branches.test.ts
 *
 * Covers the two branches that require special handling:
 *
 *   src/utils/phone/index.ts
 *   └─ if (n.length !== 12)  — dead code; documented below with ignore directive
 *
 *   src/utils/errors/index.ts
 *   └─ if (Error.captureStackTrace) false-branch — covered by simulating non-V8
 *
 * Run: pnpm test
 */

import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest'
import { formatSafaricomPhone } from '../src/utils/phone'
import { PesafyError } from '../src/utils/errors'

// ══════════════════════════════════════════════════════════════════════════════
// 1.  src/utils/phone/index.ts — if (n.length !== 12) true-branch
// ══════════════════════════════════════════════════════════════════════════════
//
// ┌─ WHY THIS BRANCH CANNOT BE HIT ────────────────────────────────────────────
// │
// │  The guard  `if (n.length !== 12)`  is DEAD CODE.  Every assignment that
// │  reaches it produces exactly 12 digits:
// │
// │    Branch 1 — digits.startsWith('254') && digits.length === 12
// │              n = digits            → always 12 chars ✓
// │
// │    Branch 2 — digits.startsWith('0') && digits.length === 10
// │              n = '254' + slice(1)  → 3 + 9 = 12 chars ✓
// │
// │    Branch 3 — digits.length === 9
// │              n = '254' + digits    → 3 + 9 = 12 chars ✓
// │
// │    Else      throws before n is ever assigned → guard never reached
// │
// │  There is no input that satisfies one of the three assignment conditions
// │  *and* also produces a string ≠ 12 chars.  The branch exists as a
// │  belt-and-suspenders safety net but can never fire.
// │
// └─────────────────────────────────────────────────────────────────────────────
//
// RECOMMENDED FIX — add the following ignore comment to the source so coverage
// tools stop flagging it as a gap:
//
//   /* c8 ignore next 6 */          ← for Vitest / c8
//   /* istanbul ignore next 6 */    ← for Jest / Istanbul
//   if (n.length !== 12) {
//     throw new PesafyError({ ... })
//   }
//
// The tests below verify the three reachable paths that correctly set `n` and
// confirm the guard's postcondition (n.length === 12) holds for every one of
// them — proving the guard is structurally redundant.

describe('formatSafaricomPhone() — n.length !== 12 guard is structurally unreachable', () => {
  it('branch-1 (254-prefix): n is always exactly 12 chars — guard postcondition holds', () => {
    const result = formatSafaricomPhone('254712345678')
    // Postcondition: the guard would only fire if this were false
    expect(result).toHaveLength(12)
    expect(result).toBe('254712345678')
  })

  it('branch-2 (leading-0): 3 + slice(9) = 12 — guard postcondition holds', () => {
    // n = '254' + '0712345678'.slice(1) = '254' + '712345678' (9 chars) = 12
    const result = formatSafaricomPhone('0712345678')
    expect(result).toHaveLength(12)
    expect(result).toBe('254712345678')
  })

  it('branch-3 (bare-9): 3 + 9 = 12 — guard postcondition holds', () => {
    // n = '254' + '712345678' = 12
    const result = formatSafaricomPhone('712345678')
    expect(result).toHaveLength(12)
    expect(result).toBe('254712345678')
  })

  it('else-branch: throws BEFORE n is assigned — guard is never evaluated', () => {
    // Input falls into the else-branch (throw) which precedes the guard,
    // so the guard is not reached at all.
    expect(() => formatSafaricomPhone('12345')).toThrow(PesafyError)
  })

  it('all three assignment paths satisfy n.length === 12 (exhaustive)', () => {
    const cases = [
      ['254712345678', '254712345678'], // branch-1
      ['0712345678', '254712345678'], // branch-2
      ['712345678', '254712345678'], // branch-3
    ] as const

    for (const [input, expected] of cases) {
      const result = formatSafaricomPhone(input)
      expect(result).toBe(expected)
      expect(result).toHaveLength(12) // guard postcondition
    }
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// 2.  src/utils/errors/index.ts — if (Error.captureStackTrace) FALSE-branch
// ══════════════════════════════════════════════════════════════════════════════
//
// `Error.captureStackTrace` is a V8-only API.  In other runtimes (SpiderMonkey,
// JavaScriptCore, Hermes) it does not exist, so the `if` condition is false.
//
// Strategy: temporarily remove the property before constructing PesafyError,
// then restore it in afterEach so no other test is affected.

describe('PesafyError — if (Error.captureStackTrace) FALSE-branch (non-V8 simulation)', () => {
  // Save and restore so the property is always available for all other tests.
  let originalCaptureStackTrace: typeof Error.captureStackTrace

  beforeEach(() => {
    originalCaptureStackTrace = Error.captureStackTrace
  })

  afterEach(() => {
    Error.captureStackTrace = originalCaptureStackTrace
  })

  it('does not throw when Error.captureStackTrace is undefined (non-V8 runtime)', () => {
    // @ts-expect-error — intentionally simulating a non-V8 environment
    delete Error.captureStackTrace
    expect(Error.captureStackTrace).toBeUndefined() // precondition: property gone

    // PesafyError constructor must not throw even without captureStackTrace
    expect(
      () => new PesafyError({ code: 'API_ERROR', message: 'non-V8 runtime test' }),
    ).not.toThrow()
  })

  it('is still an instance of Error when captureStackTrace is absent', () => {
    // @ts-expect-error
    delete Error.captureStackTrace

    const err = new PesafyError({ code: 'NETWORK_ERROR', message: 'no captureStackTrace' })
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(PesafyError)
  })

  it('all properties are correctly set when captureStackTrace is absent', () => {
    // @ts-expect-error
    delete Error.captureStackTrace

    const err = new PesafyError({
      code: 'TIMEOUT',
      message: 'timed out',
      statusCode: 504,
      requestId: 'req-xyz',
    })

    expect(err.code).toBe('TIMEOUT')
    expect(err.message).toBe('timed out')
    expect(err.statusCode).toBe(504)
    expect(err.requestId).toBe('req-xyz')
    expect(err.name).toBe('PesafyError')
  })

  it('retryable is computed correctly when captureStackTrace is absent', () => {
    // @ts-expect-error
    delete Error.captureStackTrace

    expect(new PesafyError({ code: 'TIMEOUT', message: '' }).retryable).toBe(true)
    expect(new PesafyError({ code: 'API_ERROR', message: '' }).retryable).toBe(false)
  })

  it('toJSON() works correctly when captureStackTrace is absent', () => {
    // @ts-expect-error
    delete Error.captureStackTrace

    const json = new PesafyError({ code: 'API_ERROR', message: 'test' }).toJSON()
    expect(json).toMatchObject({
      name: 'PesafyError',
      code: 'API_ERROR',
      message: 'test',
      retryable: false,
    })
  })

  it('captureStackTrace is restored after the test (sanity-check for afterEach)', () => {
    // This test runs AFTER afterEach restores the property — proves cleanup works.
    expect(typeof Error.captureStackTrace).toBe('function')
  })
})

/**
 * __tests__/phone.test.ts
 *
 * Complete test suite for src/utils/phone/index.ts
 *
 * Covers every branch of formatSafaricomPhone():
 *   Branch 1  — already-normalised 254XXXXXXXXX (12 digits, starts with "254")
 *   Branch 2  — leading-zero format 07XXXXXXXX   (10 digits, starts with "0")
 *   Branch 3  — bare 9-digit format 7XXXXXXXX
 *   Error 1   — completely invalid input  → PesafyError INVALID_PHONE
 *   Error 2   — 254 prefix but wrong length → PesafyError INVALID_PHONE
 *   Edge cases — whitespace, +254 prefix, dashes, mixed case digits
 *
 * Run: pnpm test
 */

import { describe, expect, it } from 'vitest'
import { formatSafaricomPhone } from '../src/utils/phone'
import { PesafyError } from '../src/utils/errors'

// ═══════════════════════════════════════════════════════════════════════════════
// Branch 1 — 254XXXXXXXXX (already normalised, 12 digits)
// ═══════════════════════════════════════════════════════════════════════════════

describe('formatSafaricomPhone() — 254XXXXXXXXX input (already normalised)', () => {
  it('returns the number unchanged when already 254XXXXXXXXX', () => {
    expect(formatSafaricomPhone('254712345678')).toBe('254712345678')
  })

  it('handles another valid 254-prefix number', () => {
    expect(formatSafaricomPhone('254700000001')).toBe('254700000001')
  })

  it('strips non-digit chars before matching: +254712345678 → 254712345678', () => {
    expect(formatSafaricomPhone('+254712345678')).toBe('254712345678')
  })

  it('strips spaces: "254 712 345 678" → 254712345678', () => {
    expect(formatSafaricomPhone('254 712 345 678')).toBe('254712345678')
  })

  it('strips dashes: "254-712-345-678" → 254712345678', () => {
    expect(formatSafaricomPhone('254-712-345-678')).toBe('254712345678')
  })

  it('strips parentheses: "(254)712345678" → 254712345678', () => {
    expect(formatSafaricomPhone('(254)712345678')).toBe('254712345678')
  })

  it('result is always exactly 12 characters', () => {
    const result = formatSafaricomPhone('254712345678')
    expect(result).toHaveLength(12)
  })

  it('result starts with "254"', () => {
    expect(formatSafaricomPhone('254712345678').startsWith('254')).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Branch 2 — 07XXXXXXXX (10 digits, leading zero)
// ═══════════════════════════════════════════════════════════════════════════════

describe('formatSafaricomPhone() — 07XXXXXXXX input (leading zero)', () => {
  it('converts 0712345678 → 254712345678', () => {
    expect(formatSafaricomPhone('0712345678')).toBe('254712345678')
  })

  it('converts 0700000001 → 254700000001', () => {
    expect(formatSafaricomPhone('0700000001')).toBe('254700000001')
  })

  it('converts 0110000000 → 254110000000', () => {
    expect(formatSafaricomPhone('0110000000')).toBe('254110000000')
  })

  it('strips spaces before converting: "07 12 34 56 78" → 254712345678', () => {
    expect(formatSafaricomPhone('07 12 34 56 78')).toBe('254712345678')
  })

  it('strips dashes before converting: "07-12-34-56-78" → 254712345678', () => {
    expect(formatSafaricomPhone('07-12-34-56-78')).toBe('254712345678')
  })

  it('result is always exactly 12 characters', () => {
    expect(formatSafaricomPhone('0712345678')).toHaveLength(12)
  })

  it('result starts with "254"', () => {
    expect(formatSafaricomPhone('0712345678').startsWith('254')).toBe(true)
  })

  it('correctly replaces the leading 0 with 254, not prefixing 254 to the full 10 digits', () => {
    // 0712345678 → remove leading 0 → 712345678 → prepend 254 → 254712345678
    const result = formatSafaricomPhone('0712345678')
    expect(result).toBe('254712345678')
    expect(result).not.toBe('254' + '0712345678') // must not be 25407...
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Branch 3 — 9-digit input (bare MSISDN without country code or leading zero)
// ═══════════════════════════════════════════════════════════════════════════════

describe('formatSafaricomPhone() — 9-digit input (bare MSISDN)', () => {
  it('converts 712345678 → 254712345678', () => {
    expect(formatSafaricomPhone('712345678')).toBe('254712345678')
  })

  it('converts 700000001 → 254700000001', () => {
    expect(formatSafaricomPhone('700000001')).toBe('254700000001')
  })

  it('result is always exactly 12 characters', () => {
    expect(formatSafaricomPhone('712345678')).toHaveLength(12)
  })

  it('result starts with "254"', () => {
    expect(formatSafaricomPhone('712345678').startsWith('254')).toBe(true)
  })

  it('strips non-digit chars from 9-digit: "712-345-678" → 254712345678', () => {
    expect(formatSafaricomPhone('712-345-678')).toBe('254712345678')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Error path — invalid inputs → PesafyError INVALID_PHONE
// ═══════════════════════════════════════════════════════════════════════════════

describe('formatSafaricomPhone() — invalid inputs throw PesafyError', () => {
  const invalidInputs = [
    { input: '123', label: 'too short (3 digits)' },
    { input: '12345', label: 'too short (5 digits)' },
    { input: '1234567', label: 'ambiguous 7 digits' },
    { input: '12345678901234', label: 'too long (14 digits)' },
    { input: '', label: 'empty string' },
    { input: 'abc', label: 'non-numeric string' },
    { input: 'phone', label: 'word string' },
    { input: '+++++', label: 'only symbols' },
  ]

  for (const { input, label } of invalidInputs) {
    it(`throws PesafyError for ${label}: "${input}"`, () => {
      expect(() => formatSafaricomPhone(input)).toThrow(PesafyError)
    })

    it(`error code is INVALID_PHONE for ${label}`, () => {
      let caught: PesafyError | undefined
      try {
        formatSafaricomPhone(input)
      } catch (e) {
        caught = e as PesafyError
      }
      expect(caught?.code).toBe('INVALID_PHONE')
    })
  }

  it('error message includes the original input', () => {
    let caught: PesafyError | undefined
    try {
      formatSafaricomPhone('99999')
    } catch (e) {
      caught = e as PesafyError
    }
    expect(caught?.message).toContain('99999')
  })

  it('throws a PesafyError (not a plain Error) for invalid input', () => {
    expect(() => formatSafaricomPhone('bad')).toThrow(PesafyError)
  })

  it('error is also an instance of Error', () => {
    let caught: unknown
    try {
      formatSafaricomPhone('bad')
    } catch (e) {
      caught = e
    }
    expect(caught).toBeInstanceOf(Error)
    expect(caught).toBeInstanceOf(PesafyError)
  })

  it('254-prefix but only 11 digits total (wrong length) → INVALID_PHONE', () => {
    // "25471234567" — starts with 254 but is only 11 digits → falls through to error
    expect(() => formatSafaricomPhone('25471234567')).toThrow(PesafyError)
  })

  it('254-prefix but 13 digits total → INVALID_PHONE', () => {
    expect(() => formatSafaricomPhone('2547123456789')).toThrow(PesafyError)
  })

  it('11-digit number that does not start with 0 or 254 → INVALID_PHONE', () => {
    expect(() => formatSafaricomPhone('17123456789')).toThrow(PesafyError)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Edge cases & idempotency
// ═══════════════════════════════════════════════════════════════════════════════

describe('formatSafaricomPhone() — edge cases', () => {
  it('is idempotent: calling twice on the result returns the same value', () => {
    const once = formatSafaricomPhone('0712345678')
    const twice = formatSafaricomPhone(once)
    expect(twice).toBe(once)
  })

  it('handles the Safaricom sandbox test MSISDN 254708374149', () => {
    expect(formatSafaricomPhone('254708374149')).toBe('254708374149')
  })

  it('handles the sandbox test MSISDN in 07 format: 0708374149', () => {
    expect(formatSafaricomPhone('0708374149')).toBe('254708374149')
  })

  it('handles the sandbox test MSISDN in 9-digit format: 708374149', () => {
    expect(formatSafaricomPhone('708374149')).toBe('254708374149')
  })

  it('all three equivalent formats produce the same output', () => {
    const a = formatSafaricomPhone('254712345678')
    const b = formatSafaricomPhone('0712345678')
    const c = formatSafaricomPhone('712345678')
    expect(a).toBe(b)
    expect(b).toBe(c)
  })

  it('strips whitespace around the number', () => {
    expect(formatSafaricomPhone('  0712345678  ')).toBe('254712345678')
  })
})

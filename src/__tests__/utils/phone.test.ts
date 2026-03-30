// 📁 PATH: src/__tests__/utils/phone.test.ts
import { describe, expect, it } from 'vitest'
import { formatSafaricomPhone } from '../../utils/phone'
import { PesafyError } from '../../utils/errors'

describe('formatSafaricomPhone', () => {
  // ── Happy paths ──────────────────────────────────────────────────────────

  it('accepts 07XXXXXXXX format and normalises to 2547XXXXXXXX', () => {
    expect(formatSafaricomPhone('0712345678')).toBe('254712345678')
  })

  it('accepts 01XXXXXXXX format and normalises to 2541XXXXXXXX', () => {
    expect(formatSafaricomPhone('0112345678')).toBe('254112345678')
  })

  it('accepts already-normalised 254XXXXXXXXX', () => {
    expect(formatSafaricomPhone('254712345678')).toBe('254712345678')
  })

  it('accepts +254XXXXXXXXX (strips the + sign)', () => {
    expect(formatSafaricomPhone('+254712345678')).toBe('254712345678')
  })

  it('accepts 9-digit number and prepends 254', () => {
    expect(formatSafaricomPhone('712345678')).toBe('254712345678')
  })

  it('strips spaces from the phone number', () => {
    expect(formatSafaricomPhone('0712 345 678')).toBe('254712345678')
  })

  it('strips hyphens from the phone number', () => {
    expect(formatSafaricomPhone('0712-345-678')).toBe('254712345678')
  })

  it('strips parentheses', () => {
    expect(formatSafaricomPhone('(0712) 345678')).toBe('254712345678')
  })

  // ── Edge cases ───────────────────────────────────────────────────────────

  it('handles 254-prefixed number with spaces', () => {
    expect(formatSafaricomPhone('254 712 345 678')).toBe('254712345678')
  })

  // ── Error paths ──────────────────────────────────────────────────────────

  it('throws PesafyError for a clearly invalid number', () => {
    expect(() => formatSafaricomPhone('123')).toThrow(PesafyError)
  })

  it('throws PesafyError with INVALID_PHONE code', () => {
    try {
      formatSafaricomPhone('123')
    } catch (e) {
      expect(e).toBeInstanceOf(PesafyError)
      expect((e as PesafyError).code).toBe('INVALID_PHONE')
    }
  })

  it('throws PesafyError for empty string', () => {
    expect(() => formatSafaricomPhone('')).toThrow(PesafyError)
  })

  it('throws PesafyError for 11-digit number (not valid Kenyan format)', () => {
    expect(() => formatSafaricomPhone('12345678901')).toThrow(PesafyError)
  })

  it('throws PesafyError for letters only', () => {
    expect(() => formatSafaricomPhone('abcdefghij')).toThrow(PesafyError)
  })
})

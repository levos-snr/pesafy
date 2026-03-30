// 📁 PATH: src/utils/phone/index.ts

import { PesafyError } from '../errors'

/** Normalises any common Kenyan phone format to 254XXXXXXXXX (12 digits) */
export function formatSafaricomPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  let n: string

  if (digits.startsWith('254') && digits.length === 12) n = digits
  else if (digits.startsWith('0') && digits.length === 10)
    n = `254${digits.slice(1)}`
  else if (digits.length === 9) n = `254${digits}`
  else {
    throw new PesafyError({
      code: 'INVALID_PHONE',
      message: `Cannot parse "${phone}". Use 07XXXXXXXX, 2547XXXXXXXX, or +2547XXXXXXXX.`,
    })
  }

  if (n.length !== 12) {
    throw new PesafyError({
      code: 'INVALID_PHONE',
      message: `"${phone}" normalised to "${n}" — expected 12 digits.`,
    })
  }
  return n
}

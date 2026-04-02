// src/mpesa/stk-push/utils.ts

export { formatSafaricomPhone as formatPhoneNumber } from '../../utils/phone'

/**
 * Generates the STK Push password.
 * Formula: Base64( Shortcode + Passkey + Timestamp )
 *
 * Uses btoa() — works in Node.js ≥18, Bun, browsers, and edge runtimes.
 */
export function getStkPushPassword(shortCode: string, passKey: string, timestamp: string): string {
  return btoa(`${shortCode}${passKey}${timestamp}`)
}

/**
 * Returns a Daraja-compatible timestamp: YYYYMMDDHHmmss
 *
 * Call this ONCE per request and reuse the result.
 */
export function getTimestamp(): string {
  const now = new Date()
  const pad = (n: number): string => n.toString().padStart(2, '0')
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join('')
}

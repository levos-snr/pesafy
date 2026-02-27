/**
 * Shared phone number utilities for M-Pesa API calls.
 *
 * Two formatters are intentionally separate:
 *  - formatSafaricomPhone  → strict, for STK Push (only Safaricom/Airtel)
 *  - formatKenyanMsisdn    → permissive, for C2B simulate and B2C PartyB
 *
 * Daraja consistently expects 12-digit MSISDN without the '+' prefix.
 */

/** Strips non-digit characters and normalises leading zeros / country code. */
function toE164Kenya(phone: string): string {
  const digits = phone.replace(/\D/g, "");

  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("0")) return `254${digits.slice(1)}`;
  // Bare 9-digit local number (e.g. 712345678)
  if (digits.length === 9) return `254${digits}`;

  // Fallback — prepend country code and let the validator catch it
  return `254${digits}`;
}

/**
 * Strict formatter for STK Push.
 * Accepts Safaricom (2547xx) and Airtel Kenya (2541x) numbers only.
 * Throws a clear error on invalid input so Daraja never receives a bad MSISDN.
 */
export function formatSafaricomPhone(phone: string): string {
  const formatted = toE164Kenya(phone);

  // 2547xxxxxxxx  (Safaricom)  |  2541xxxxxxxx (Airtel Kenya)
  if (!/^254[71]\d{8}$/.test(formatted)) {
    throw new Error(
      `Invalid Kenyan phone number: "${phone}". ` +
        "Expected format: 07XXXXXXXX, 2547XXXXXXXX, or +2547XXXXXXXX."
    );
  }

  return formatted;
}

/**
 * Permissive formatter for C2B simulate and B2C PartyB.
 * Accepts any valid 12-digit Kenyan MSISDN (Safaricom, Airtel, Telkom, …).
 * Still throws if the result is structurally impossible.
 */
export function formatKenyanMsisdn(phone: string): string {
  const formatted = toE164Kenya(phone);

  // Must be exactly 12 digits and start with 254
  if (!/^254\d{9}$/.test(formatted)) {
    throw new Error(
      `Invalid MSISDN: "${phone}". ` +
        "Expected a 12-digit Kenyan number starting with 254."
    );
  }

  return formatted;
}

/**
 * Converts a formatted MSISDN string to the numeric form Daraja expects in
 * C2B simulate requests ("Msisdn": 254708374149 — no quotes in the JSON).
 */
export function msisdnToNumber(phone: string): number {
  return parseInt(formatKenyanMsisdn(phone), 10);
}

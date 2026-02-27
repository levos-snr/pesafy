/** STK Push utilities */

/**
 * Formats a phone number to the required 2547XXXXXXXX format.
 * Handles 07XXXXXXXX, 2547XXXXXXXX, and +2547XXXXXXXX inputs.
 *
 * Throws if the result is not a valid Kenyan number (12 digits, 2547… or 2541…).
 * This surfaces a clear error instead of letting Daraja return a cryptic one.
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");

  let formatted: string;
  if (cleaned.startsWith("254")) {
    formatted = cleaned;
  } else if (cleaned.startsWith("0")) {
    formatted = "254" + cleaned.slice(1);
  } else if (cleaned.length === 9) {
    // bare 9-digit number without leading 0 or country code
    formatted = "254" + cleaned;
  } else {
    formatted = "254" + cleaned;
  }

  // Validate: must be 12 digits starting with 2547 (Safaricom) or 2541 (Airtel)
  if (!/^254[71]\d{8}$/.test(formatted)) {
    throw new Error(
      `Invalid Kenyan phone number: "${phone}". ` +
        "Expected format: 07XXXXXXXX, 2547XXXXXXXX, or +2547XXXXXXXX."
    );
  }

  return formatted;
}

/**
 * Generates the STK Push password.
 * Formula: Base64(Shortcode + Passkey + Timestamp)
 *
 * Uses btoa() instead of Buffer — works in Node.js, Bun, browsers, and
 * edge runtimes (Cloudflare Workers, Deno, etc.).
 *
 * IMPORTANT: The timestamp passed here MUST be the exact same value sent in
 * the request body's `Timestamp` field. Safaricom validates they match.
 * Always call getTimestamp() once and pass the result to both this function
 * and the request body — never call getTimestamp() twice.
 */
export function getStkPushPassword(
  shortCode: string,
  passKey: string,
  timestamp: string
): string {
  const raw = `${shortCode}${passKey}${timestamp}`;
  // btoa is available globally in Node 16+, Bun, browsers, and edge runtimes.
  return btoa(raw);
}

/**
 * Generates a Daraja-compatible timestamp: YYYYMMDDHHmmss
 * Call this once per request and reuse the value.
 */
export function getTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join("");
}

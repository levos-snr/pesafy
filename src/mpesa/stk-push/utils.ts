/** STK Push utilities */

/**
 * Formats a phone number to the required 2547XXXXXXXX format.
 * Handles 07XXXXXXXX, 2547XXXXXXXX, and +2547XXXXXXXX inputs.
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0")) return "254" + cleaned.slice(1);
  if (cleaned.startsWith("254")) return cleaned;
  return "254" + cleaned;
}

/**
 * Generates the STK Push password.
 * Formula: Base64(Shortcode + Passkey + Timestamp)
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
  return Buffer.from(raw, "utf-8").toString("base64");
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

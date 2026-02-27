/**
 * STK Push utilities
 *
 * Phone formatting delegates to the shared `formatSafaricomPhone` util which
 * validates Safaricom/Airtel numbers and throws a clear error on bad input.
 */
export { formatSafaricomPhone as formatPhoneNumber } from "../../utils/phone";

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

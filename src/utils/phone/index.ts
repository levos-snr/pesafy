/**
 * Phone number utilities for Daraja API.
 *
 * Daraja spec: PartyA and PhoneNumber must be in the format 2547XXXXXXXX
 * (12-digit, starts with 254, no +, no spaces, no dashes).
 *
 * Accepted input formats:
 *   0712345678   → 254712345678
 *   +254712345678 → 254712345678
 *   254712345678  → 254712345678 (already correct)
 *   712345678     → 254712345678
 */

import { PesafyError } from "../errors";

/** Normalises any common Kenyan phone format to 254XXXXXXXXX (12 digits) */
export function formatSafaricomPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");

  let normalised: string;

  if (digits.startsWith("254") && digits.length === 12) {
    normalised = digits;
  } else if (digits.startsWith("0") && digits.length === 10) {
    normalised = `254${digits.slice(1)}`;
  } else if (digits.length === 9) {
    // e.g. 712345678 → 254712345678
    normalised = `254${digits}`;
  } else if (digits.startsWith("254") && digits.length !== 12) {
    throw new PesafyError({
      code: "INVALID_PHONE",
      message: `Invalid phone number "${phone}". Expected 254XXXXXXXXX (12 digits).`,
    });
  } else {
    throw new PesafyError({
      code: "INVALID_PHONE",
      message: `Cannot parse phone number "${phone}". Use 07XXXXXXXX, 2547XXXXXXXX, or +2547XXXXXXXX.`,
    });
  }

  // Final sanity check: must be exactly 12 digits
  if (normalised.length !== 12) {
    throw new PesafyError({
      code: "INVALID_PHONE",
      message: `Phone number "${phone}" normalised to "${normalised}" which is not 12 digits.`,
    });
  }

  return normalised;
}

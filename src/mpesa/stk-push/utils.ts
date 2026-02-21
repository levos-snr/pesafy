/** Generate STK Push password: Base64(Shortcode + Passkey + Timestamp) */

export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0")) return "254" + cleaned.slice(1);
  if (cleaned.startsWith("254")) return cleaned;
  return "254" + cleaned;
}

export function getStkPushPassword(shortCode: string, passKey: string): string {
  const timestamp = getTimestamp();
  const password = `${shortCode}${passKey}${timestamp}`;
  return Buffer.from(password, "utf-8").toString("base64");
}

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

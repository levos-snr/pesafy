// 📁 PATH: src/__tests__/mpesa/stk-push/utils.test.ts
import { describe, expect, it } from "vite-plus/test";
import { formatPhoneNumber, getStkPushPassword, getTimestamp } from "../../../mpesa/stk-push/utils";

describe("getTimestamp", () => {
  it("returns a 14-character string", () => {
    expect(getTimestamp()).toHaveLength(14);
  });

  it("matches YYYYMMDDHHmmss format", () => {
    const ts = getTimestamp();
    expect(ts).toMatch(/^\d{14}$/);
  });

  it("starts with the current 4-digit year", () => {
    const ts = getTimestamp();
    expect(ts.slice(0, 4)).toBe(String(new Date().getFullYear()));
  });

  it("has valid month (01–12)", () => {
    const month = Number(getTimestamp().slice(4, 6));
    expect(month).toBeGreaterThanOrEqual(1);
    expect(month).toBeLessThanOrEqual(12);
  });

  it("has valid day (01–31)", () => {
    const day = Number(getTimestamp().slice(6, 8));
    expect(day).toBeGreaterThanOrEqual(1);
    expect(day).toBeLessThanOrEqual(31);
  });

  it("has valid hour (00–23)", () => {
    const hour = Number(getTimestamp().slice(8, 10));
    expect(hour).toBeGreaterThanOrEqual(0);
    expect(hour).toBeLessThanOrEqual(23);
  });

  it("has valid minute (00–59)", () => {
    const min = Number(getTimestamp().slice(10, 12));
    expect(min).toBeGreaterThanOrEqual(0);
    expect(min).toBeLessThanOrEqual(59);
  });
});

describe("getStkPushPassword", () => {
  const shortCode = "174379";
  const passKey = "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919";
  const timestamp = "20160216165627";

  it("returns a non-empty base64 string", () => {
    const pw = getStkPushPassword(shortCode, passKey, timestamp);
    expect(pw).toBeTruthy();
    expect(typeof pw).toBe("string");
  });

  it("decodes to Shortcode+Passkey+Timestamp", () => {
    const pw = getStkPushPassword(shortCode, passKey, timestamp);
    const decoded = atob(pw);
    expect(decoded).toBe(`${shortCode}${passKey}${timestamp}`);
  });

  it("produces different passwords for different timestamps", () => {
    const pw1 = getStkPushPassword(shortCode, passKey, "20160216165627");
    const pw2 = getStkPushPassword(shortCode, passKey, "20160216165628");
    expect(pw1).not.toBe(pw2);
  });

  it("produces different passwords for different shortcodes", () => {
    const pw1 = getStkPushPassword("174379", passKey, timestamp);
    const pw2 = getStkPushPassword("600000", passKey, timestamp);
    expect(pw1).not.toBe(pw2);
  });
});

describe("formatPhoneNumber", () => {
  it("normalises 07XXXXXXXX to 2547XXXXXXXX", () => {
    expect(formatPhoneNumber("0712345678")).toBe("254712345678");
  });

  it("passes 254XXXXXXXXX through unchanged", () => {
    expect(formatPhoneNumber("254712345678")).toBe("254712345678");
  });
});

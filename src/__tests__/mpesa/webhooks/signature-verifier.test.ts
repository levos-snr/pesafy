// 📁 PATH: src/__tests__/mpesa/webhooks/signature-verifier.test.ts
import { describe, expect, it } from "vite-plus/test";
import {
  parseStkPushWebhook,
  SAFARICOM_IPS,
  verifyWebhookIP,
} from "../../../mpesa/webhooks/signature-verifier";

describe("SAFARICOM_IPS", () => {
  it("is a non-empty array", () => {
    expect(SAFARICOM_IPS.length).toBeGreaterThan(0);
  });

  it("contains valid IPv4 addresses", () => {
    const ipv4Regex = /^\d{1,3}(\.\d{1,3}){3}$/;
    for (const ip of SAFARICOM_IPS) {
      expect(ip).toMatch(ipv4Regex);
    }
  });

  it("contains known Safaricom IP", () => {
    expect(SAFARICOM_IPS).toContain("196.201.214.200");
  });
});

describe("verifyWebhookIP", () => {
  it("returns true for a known Safaricom IP", () => {
    expect(verifyWebhookIP("196.201.214.200")).toBe(true);
  });

  it("returns false for an unknown IP", () => {
    expect(verifyWebhookIP("1.2.3.4")).toBe(false);
  });

  it("accepts a custom allowed IP list", () => {
    expect(verifyWebhookIP("10.0.0.1", ["10.0.0.1", "10.0.0.2"])).toBe(true);
  });

  it("rejects IPs not in the custom list", () => {
    expect(verifyWebhookIP("196.201.214.200", ["10.0.0.1"])).toBe(false);
  });

  it("returns false for empty string IP", () => {
    expect(verifyWebhookIP("")).toBe(false);
  });

  it("returns false for localhost", () => {
    expect(verifyWebhookIP("127.0.0.1")).toBe(false);
  });
});

describe("parseStkPushWebhook", () => {
  const validWebhook = {
    Body: {
      stkCallback: {
        MerchantRequestID: "MR-001",
        CheckoutRequestID: "ws_CO_001",
        ResultCode: 0,
        ResultDesc: "The service request is processed successfully.",
        CallbackMetadata: {
          Item: [{ Name: "Amount", Value: 100 }],
        },
      },
    },
  };

  it("returns the typed payload for a valid webhook", () => {
    const result = parseStkPushWebhook(validWebhook);
    expect(result).not.toBeNull();
    expect(result?.Body.stkCallback.ResultCode).toBe(0);
  });

  it("returns null for a payload without Body.stkCallback", () => {
    expect(parseStkPushWebhook({ Body: {} })).toBeNull();
  });

  it("returns null for null input", () => {
    expect(parseStkPushWebhook(null)).toBeNull();
  });

  it("returns null for a plain string", () => {
    expect(parseStkPushWebhook("not a webhook")).toBeNull();
  });

  it("preserves full webhook structure", () => {
    const result = parseStkPushWebhook(validWebhook);
    expect(result?.Body.stkCallback.CheckoutRequestID).toBe("ws_CO_001");
  });
});

// 📁 PATH: src/__tests__/mpesa/webhooks/webhook-handler.test.ts
import { describe, expect, it } from "vite-plus/test";
import {
  extractAmount,
  extractPhoneNumber,
  extractTransactionId,
  handleWebhook,
  isSuccessfulCallback,
} from "../../../mpesa/webhooks/webhook-handler";
import type { StkPushWebhook } from "../../../mpesa/webhooks/types";

const SUCCESS_WEBHOOK: StkPushWebhook = {
  Body: {
    stkCallback: {
      MerchantRequestID: "MR-001",
      CheckoutRequestID: "ws_CO_001",
      ResultCode: 0,
      ResultDesc: "The service request is processed successfully.",
      CallbackMetadata: {
        Item: [
          { Name: "Amount", Value: 500 },
          { Name: "MpesaReceiptNumber", Value: "QKA81LK5CY" },
          { Name: "PhoneNumber", Value: 254712345678 },
          { Name: "TransactionDate", Value: 20231001120000 },
        ],
      },
    },
  },
};

const FAILURE_WEBHOOK: StkPushWebhook = {
  Body: {
    stkCallback: {
      MerchantRequestID: "MR-002",
      CheckoutRequestID: "ws_CO_002",
      ResultCode: 1032,
      ResultDesc: "Request cancelled by user.",
    },
  },
};

describe("isSuccessfulCallback", () => {
  it("returns true for ResultCode 0", () => {
    expect(isSuccessfulCallback(SUCCESS_WEBHOOK)).toBe(true);
  });

  it("returns false for non-zero ResultCode", () => {
    expect(isSuccessfulCallback(FAILURE_WEBHOOK)).toBe(false);
  });
});

describe("extractTransactionId", () => {
  it("returns MpesaReceiptNumber for success", () => {
    expect(extractTransactionId(SUCCESS_WEBHOOK)).toBe("QKA81LK5CY");
  });

  it("returns null for failure (no metadata)", () => {
    expect(extractTransactionId(FAILURE_WEBHOOK)).toBeNull();
  });
});

describe("extractAmount", () => {
  it("returns the Amount as a number for success", () => {
    expect(extractAmount(SUCCESS_WEBHOOK)).toBe(500);
  });

  it("returns null for failure", () => {
    expect(extractAmount(FAILURE_WEBHOOK)).toBeNull();
  });
});

describe("extractPhoneNumber", () => {
  it("returns the PhoneNumber as a string for success", () => {
    expect(extractPhoneNumber(SUCCESS_WEBHOOK)).toBe("254712345678");
  });

  it("returns null for failure", () => {
    expect(extractPhoneNumber(FAILURE_WEBHOOK)).toBeNull();
  });
});

describe("handleWebhook", () => {
  it("returns success=true for a valid STK Push webhook", () => {
    const result = handleWebhook(SUCCESS_WEBHOOK, { skipIPCheck: true });
    expect(result.success).toBe(true);
    expect(result.eventType).toBe("stk_push");
  });

  it("returns success=false for an unknown payload", () => {
    const result = handleWebhook({ foo: "bar" }, { skipIPCheck: true });
    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
  });

  it("returns success=false when IP is not in the whitelist", () => {
    const result = handleWebhook(SUCCESS_WEBHOOK, { requestIP: "1.2.3.4" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("not in the Safaricom whitelist");
  });

  it("returns success=true when IP is whitelisted", () => {
    const result = handleWebhook(SUCCESS_WEBHOOK, {
      requestIP: "196.201.214.200",
    });
    expect(result.success).toBe(true);
  });

  it("skips IP check when skipIPCheck=true", () => {
    const result = handleWebhook(SUCCESS_WEBHOOK, {
      requestIP: "1.2.3.4",
      skipIPCheck: true,
    });
    expect(result.success).toBe(true);
  });

  it("skips IP check when requestIP is not provided", () => {
    const result = handleWebhook(SUCCESS_WEBHOOK, {});
    expect(result.success).toBe(true);
  });

  it("returns null data for unknown payload", () => {
    const result = handleWebhook(null, { skipIPCheck: true });
    expect(result.data).toBeNull();
  });

  it("attaches typed data to successful result", () => {
    const result = handleWebhook(SUCCESS_WEBHOOK, { skipIPCheck: true });
    const webhook = result.data as StkPushWebhook;
    expect(webhook?.Body?.stkCallback?.ResultCode).toBe(0);
  });
});

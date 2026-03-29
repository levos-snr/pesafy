// 📁 PATH: src/__tests__/mpesa/stk-push/types.test.ts
import { describe, expect, it } from "vite-plus/test";
import {
  getCallbackValue,
  isStkCallbackSuccess,
  type StkCallbackFailure,
  type StkCallbackSuccess,
  type StkPushCallback,
} from "../../../mpesa/stk-push/types";

const successCallback: StkCallbackSuccess = {
  MerchantRequestID: "MR-001",
  CheckoutRequestID: "ws_CO_001",
  ResultCode: 0,
  ResultDesc: "The service request is processed successfully.",
  CallbackMetadata: {
    Item: [
      { Name: "Amount", Value: 100 },
      { Name: "MpesaReceiptNumber", Value: "QKA81LK5CY" },
      { Name: "TransactionDate", Value: 20240101120000 },
      { Name: "PhoneNumber", Value: 254712345678 },
    ],
  },
};

const failureCallback: StkCallbackFailure = {
  MerchantRequestID: "MR-002",
  CheckoutRequestID: "ws_CO_002",
  ResultCode: 1032,
  ResultDesc: "Request cancelled by the user",
};

const successWrapper: StkPushCallback = { Body: { stkCallback: successCallback } };
const failureWrapper: StkPushCallback = { Body: { stkCallback: failureCallback } };

describe("isStkCallbackSuccess", () => {
  it("returns true for ResultCode 0", () => {
    expect(isStkCallbackSuccess(successCallback)).toBe(true);
  });

  it("returns false for non-zero ResultCode", () => {
    expect(isStkCallbackSuccess(failureCallback)).toBe(false);
  });
});

describe("getCallbackValue", () => {
  it("extracts Amount from a successful callback", () => {
    expect(getCallbackValue(successWrapper, "Amount")).toBe(100);
  });

  it("extracts MpesaReceiptNumber from a successful callback", () => {
    expect(getCallbackValue(successWrapper, "MpesaReceiptNumber")).toBe("QKA81LK5CY");
  });

  it("extracts PhoneNumber from a successful callback", () => {
    expect(getCallbackValue(successWrapper, "PhoneNumber")).toBe(254712345678);
  });

  it("returns undefined for a failed callback", () => {
    expect(getCallbackValue(failureWrapper, "Amount")).toBeUndefined();
  });

  it("returns undefined when key is not in metadata", () => {
    expect(getCallbackValue(successWrapper, "Balance")).toBeUndefined();
  });
});

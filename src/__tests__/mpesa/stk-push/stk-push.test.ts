// 📁 PATH: src/__tests__/mpesa/stk-push/stk-push.test.ts
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { PesafyError } from "../../../utils/errors";

vi.mock("../../../utils/http", () => ({ httpRequest: vi.fn() }));

import { httpRequest } from "../../../utils/http";
import { processStkPush } from "../../../mpesa/stk-push/stk-push";

const mockHttpRequest = vi.mocked(httpRequest);

const BASE_REQUEST = {
  amount: 100,
  phoneNumber: "254712345678",
  callbackUrl: "https://example.com/callback",
  accountReference: "REF001",
  transactionDesc: "Payment",
  shortCode: "174379",
  passKey: "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919",
};

const MOCK_RESPONSE = {
  MerchantRequestID: "22205-34066-1",
  CheckoutRequestID: "ws_CO_001",
  ResponseCode: "0",
  ResponseDescription: "Success. Request accepted for processing",
  CustomerMessage: "Success. Request accepted for processing",
};

describe("processStkPush", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the Daraja response on success", async () => {
    mockHttpRequest.mockResolvedValueOnce({ data: MOCK_RESPONSE, status: 200, headers: {} });
    const result = await processStkPush(
      "https://sandbox.safaricom.co.ke",
      "token123",
      BASE_REQUEST,
    );
    expect(result).toEqual(MOCK_RESPONSE);
  });

  it("calls the correct endpoint", async () => {
    mockHttpRequest.mockResolvedValueOnce({ data: MOCK_RESPONSE, status: 200, headers: {} });
    await processStkPush("https://sandbox.safaricom.co.ke", "token123", BASE_REQUEST);
    expect(mockHttpRequest).toHaveBeenCalledWith(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("passes Bearer token in Authorization header", async () => {
    mockHttpRequest.mockResolvedValueOnce({ data: MOCK_RESPONSE, status: 200, headers: {} });
    await processStkPush("https://sandbox.safaricom.co.ke", "mytoken", BASE_REQUEST);
    expect(mockHttpRequest).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer mytoken" }),
      }),
    );
  });

  it("throws PesafyError when amount < 1", async () => {
    await expect(
      processStkPush("https://sandbox.safaricom.co.ke", "token", {
        ...BASE_REQUEST,
        amount: 0,
      }),
    ).rejects.toThrow(PesafyError);
  });

  it("throws PesafyError with VALIDATION_ERROR when amount < 1", async () => {
    try {
      await processStkPush("https://sandbox.safaricom.co.ke", "token", {
        ...BASE_REQUEST,
        amount: -5,
      });
    } catch (e) {
      expect(e).toBeInstanceOf(PesafyError);
      expect((e as PesafyError).code).toBe("VALIDATION_ERROR");
    }
  });

  it("truncates AccountReference to 12 characters", async () => {
    mockHttpRequest.mockResolvedValueOnce({ data: MOCK_RESPONSE, status: 200, headers: {} });
    await processStkPush("https://sandbox.safaricom.co.ke", "token", {
      ...BASE_REQUEST,
      accountReference: "VERYLONGACCOUNTREFERENCE",
    });
    // Use non-null assertion (!): mock was just called so calls[0] is defined
    const callBody = (mockHttpRequest.mock.calls[0]![1] as { body: Record<string, unknown> }).body;
    expect(String(callBody["AccountReference"]).length).toBeLessThanOrEqual(12);
  });

  it("truncates TransactionDesc to 13 characters", async () => {
    mockHttpRequest.mockResolvedValueOnce({ data: MOCK_RESPONSE, status: 200, headers: {} });
    await processStkPush("https://sandbox.safaricom.co.ke", "token", {
      ...BASE_REQUEST,
      transactionDesc: "This is a very long description",
    });
    const callBody = (mockHttpRequest.mock.calls[0]![1] as { body: Record<string, unknown> }).body;
    expect(String(callBody["TransactionDesc"]).length).toBeLessThanOrEqual(13);
  });

  it("uses CustomerPayBillOnline as default TransactionType", async () => {
    mockHttpRequest.mockResolvedValueOnce({ data: MOCK_RESPONSE, status: 200, headers: {} });
    await processStkPush("https://sandbox.safaricom.co.ke", "token", BASE_REQUEST);
    const callBody = (mockHttpRequest.mock.calls[0]![1] as { body: Record<string, unknown> }).body;
    expect(callBody["TransactionType"]).toBe("CustomerPayBillOnline");
  });

  it("uses custom partyB when provided", async () => {
    mockHttpRequest.mockResolvedValueOnce({ data: MOCK_RESPONSE, status: 200, headers: {} });
    await processStkPush("https://sandbox.safaricom.co.ke", "token", {
      ...BASE_REQUEST,
      partyB: "600000",
    });
    const callBody = (mockHttpRequest.mock.calls[0]![1] as { body: Record<string, unknown> }).body;
    expect(callBody["PartyB"]).toBe("600000");
  });

  it("defaults PartyB to shortCode when partyB is not provided", async () => {
    mockHttpRequest.mockResolvedValueOnce({ data: MOCK_RESPONSE, status: 200, headers: {} });
    await processStkPush("https://sandbox.safaricom.co.ke", "token", BASE_REQUEST);
    const callBody = (mockHttpRequest.mock.calls[0]![1] as { body: Record<string, unknown> }).body;
    expect(callBody["PartyB"]).toBe(BASE_REQUEST.shortCode);
  });

  it("rounds fractional amounts", async () => {
    mockHttpRequest.mockResolvedValueOnce({ data: MOCK_RESPONSE, status: 200, headers: {} });
    await processStkPush("https://sandbox.safaricom.co.ke", "token", {
      ...BASE_REQUEST,
      amount: 99.7,
    });
    const callBody = (mockHttpRequest.mock.calls[0]![1] as { body: Record<string, unknown> }).body;
    expect(callBody["Amount"]).toBe(100);
  });

  it("re-throws PesafyError from httpRequest", async () => {
    const apiError = new PesafyError({
      code: "API_ERROR",
      message: "Bad Request",
      statusCode: 400,
    });
    mockHttpRequest.mockRejectedValueOnce(apiError);
    await expect(
      processStkPush("https://sandbox.safaricom.co.ke", "token", BASE_REQUEST),
    ).rejects.toThrow(apiError);
  });
});

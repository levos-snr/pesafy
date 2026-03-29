// 📁 PATH: src/__tests__/mpesa/c2b/register-url.test.ts
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

vi.mock("../../../utils/http", () => ({ httpRequest: vi.fn() }));

import { httpRequest } from "../../../utils/http";
import { registerC2BUrls } from "../../../mpesa/c2b/register-url";

const mockHttp = vi.mocked(httpRequest);

const BASE = {
  shortCode: "600638",
  responseType: "Completed" as const,
  confirmationUrl: "https://example.com/c2b/confirmation",
  validationUrl: "https://example.com/c2b/validation",
};

const OK_RESP = {
  OriginatorCoversationID: "1234-56789-1",
  ResponseCode: "0",
  ResponseDescription: "Success",
};

describe("registerC2BUrls", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns Daraja response on success", async () => {
    mockHttp.mockResolvedValueOnce({ data: OK_RESP, status: 200, headers: {} });
    const result = await registerC2BUrls("https://sandbox.safaricom.co.ke", "token", BASE);
    expect(result).toEqual(OK_RESP);
  });

  it("calls v2 endpoint by default", async () => {
    mockHttp.mockResolvedValueOnce({ data: OK_RESP, status: 200, headers: {} });
    await registerC2BUrls("https://sandbox.safaricom.co.ke", "token", BASE);
    expect(mockHttp).toHaveBeenCalledWith(
      expect.stringContaining("/mpesa/c2b/v2/registerurl"),
      expect.anything(),
    );
  });

  it("can use v1 endpoint when specified", async () => {
    mockHttp.mockResolvedValueOnce({ data: OK_RESP, status: 200, headers: {} });
    await registerC2BUrls("https://sandbox.safaricom.co.ke", "token", {
      ...BASE,
      apiVersion: "v1",
    });
    expect(mockHttp).toHaveBeenCalledWith(
      expect.stringContaining("/mpesa/c2b/v1/registerurl"),
      expect.anything(),
    );
  });

  it("throws VALIDATION_ERROR when shortCode is missing", async () => {
    await expect(
      registerC2BUrls("https://sandbox.safaricom.co.ke", "token", { ...BASE, shortCode: "" }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("throws VALIDATION_ERROR for invalid responseType", async () => {
    await expect(
      registerC2BUrls("https://sandbox.safaricom.co.ke", "token", {
        ...BASE,
        responseType: "completed" as "Completed",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("throws VALIDATION_ERROR when confirmationUrl contains forbidden keyword", async () => {
    await expect(
      registerC2BUrls("https://sandbox.safaricom.co.ke", "token", {
        ...BASE,
        confirmationUrl: "https://example.com/mpesa/confirmation",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("throws VALIDATION_ERROR when validationUrl contains forbidden keyword", async () => {
    await expect(
      registerC2BUrls("https://sandbox.safaricom.co.ke", "token", {
        ...BASE,
        validationUrl: "https://example.com/safaricom/validation",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("passes Completed responseType", async () => {
    mockHttp.mockResolvedValueOnce({ data: OK_RESP, status: 200, headers: {} });
    await registerC2BUrls("https://sandbox.safaricom.co.ke", "token", BASE);
    // Use non-null assertion (!): we just called the mock so calls[0] is guaranteed
    const body = (mockHttp.mock.calls[0]![1] as { body: Record<string, unknown> }).body;
    expect(body["ResponseType"]).toBe("Completed");
  });

  it("passes Cancelled responseType", async () => {
    mockHttp.mockResolvedValueOnce({ data: OK_RESP, status: 200, headers: {} });
    await registerC2BUrls("https://sandbox.safaricom.co.ke", "token", {
      ...BASE,
      responseType: "Cancelled",
    });
    const body = (mockHttp.mock.calls[0]![1] as { body: Record<string, unknown> }).body;
    expect(body["ResponseType"]).toBe("Cancelled");
  });
});

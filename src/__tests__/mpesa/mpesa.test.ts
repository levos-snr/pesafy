// 📁 PATH: src/__tests__/mpesa/mpesa.test.ts
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { PesafyError } from "../../utils/errors";

// ── Mock all sub-modules so we can test Mpesa orchestration in isolation ──────
vi.mock("../../mpesa/stk-push/stk-push", () => ({ processStkPush: vi.fn() }));
vi.mock("../../mpesa/stk-push/stk-query", () => ({ queryStkPush: vi.fn() }));
vi.mock("../../mpesa/dynamic-qr/generate", () => ({ generateDynamicQR: vi.fn() }));
vi.mock("../../mpesa/c2b/register-url", () => ({ registerC2BUrls: vi.fn() }));
vi.mock("../../mpesa/c2b/simulate", () => ({ simulateC2B: vi.fn() }));
vi.mock("../../mpesa/account-balance/query", () => ({ queryAccountBalance: vi.fn() }));
vi.mock("../../mpesa/reversal/request", () => ({ requestReversal: vi.fn() }));

// ── FIX: TokenManager must be a class / regular-function constructor. ─────────
// Arrow functions cannot be used with `new`, which is exactly what
// src/mpesa/index.ts:108 does: `this.tokenManager = new TokenManager(...)`.
// Using a class here makes Vitest happy AND silences the "[vitest] The vi.fn()
// mock did not use 'function' or 'class'" warning.
vi.mock("../../core/auth/token-manager", () => ({
  TokenManager: vi.fn(
    function (this: { getAccessToken: () => Promise<string>; clearCache: () => void }) {
      this.getAccessToken = vi.fn().mockResolvedValue("mock-token");
      this.clearCache = vi.fn();
    },
  ),
}));

vi.mock("../../core/encryption", () => ({
  encryptSecurityCredential: vi.fn().mockReturnValue("encrypted-cred"),
}));
vi.mock("node:fs/promises", () => ({
  readFile: vi
    .fn()
    .mockResolvedValue("-----BEGIN CERTIFICATE-----\nMOCK\n-----END CERTIFICATE-----"),
}));

import { Mpesa } from "../../mpesa";
import { processStkPush } from "../../mpesa/stk-push/stk-push";
import { queryStkPush } from "../../mpesa/stk-push/stk-query";
import { generateDynamicQR } from "../../mpesa/dynamic-qr/generate";
import { queryAccountBalance } from "../../mpesa/account-balance/query";
import { requestReversal } from "../../mpesa/reversal/request";

const mockProcessStkPush = vi.mocked(processStkPush);
const mockQueryStkPush = vi.mocked(queryStkPush);
const mockGenerateQR = vi.mocked(generateDynamicQR);
const mockQueryBalance = vi.mocked(queryAccountBalance);
// kept to avoid unused-import warnings even though reversal test only
// checks the validation path (no mock call assertion needed there)
vi.mocked(requestReversal);

const VALID_CONFIG = {
  consumerKey: "test-consumer-key",
  consumerSecret: "test-consumer-secret",
  environment: "sandbox" as const,
  lipaNaMpesaShortCode: "174379",
  lipaNaMpesaPassKey: "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919",
};

// ─────────────────────────────────────────────────────────────────────────────
describe("Mpesa constructor", () => {
  it("creates instance with valid config", () => {
    const mpesa = new Mpesa(VALID_CONFIG);
    expect(mpesa).toBeInstanceOf(Mpesa);
  });

  it("throws INVALID_CREDENTIALS when consumerKey is missing", () => {
    expect(() => new Mpesa({ ...VALID_CONFIG, consumerKey: "" })).toThrow(PesafyError);
  });

  it("throws INVALID_CREDENTIALS when consumerSecret is missing", () => {
    expect(() => new Mpesa({ ...VALID_CONFIG, consumerSecret: "" })).toThrow(PesafyError);
  });

  it("exposes the environment property", () => {
    const mpesa = new Mpesa(VALID_CONFIG);
    expect(mpesa.environment).toBe("sandbox");
  });

  it("uses production environment when set", () => {
    const mpesa = new Mpesa({ ...VALID_CONFIG, environment: "production" });
    expect(mpesa.environment).toBe("production");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("Mpesa.stkPush", () => {
  beforeEach(() => vi.clearAllMocks());

  const STK_RESPONSE = {
    MerchantRequestID: "22205-34066-1",
    CheckoutRequestID: "ws_CO_001",
    ResponseCode: "0",
    ResponseDescription: "Success",
    CustomerMessage: "Success",
  };

  it("calls processStkPush and returns result", async () => {
    mockProcessStkPush.mockResolvedValueOnce(STK_RESPONSE);
    const mpesa = new Mpesa(VALID_CONFIG);
    const result = await mpesa.stkPush({
      amount: 100,
      phoneNumber: "0712345678",
      callbackUrl: "https://example.com/callback",
      accountReference: "REF001",
      transactionDesc: "Payment",
    });
    expect(result).toEqual(STK_RESPONSE);
    expect(mockProcessStkPush).toHaveBeenCalledOnce();
  });

  it("throws VALIDATION_ERROR when shortCode not configured", async () => {
    const mpesa = new Mpesa({ ...VALID_CONFIG, lipaNaMpesaShortCode: undefined });
    await expect(
      mpesa.stkPush({
        amount: 100,
        phoneNumber: "0712345678",
        callbackUrl: "https://example.com/callback",
        accountReference: "REF001",
        transactionDesc: "Payment",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("Mpesa.stkQuery", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls queryStkPush and returns result", async () => {
    const QUERY_RESPONSE = {
      ResponseCode: "0",
      ResponseDescription: "Success",
      MerchantRequestID: "MR-001",
      CheckoutRequestID: "ws_CO_001",
      ResultCode: 0,
      ResultDesc: "The service request is processed successfully.",
    };
    mockQueryStkPush.mockResolvedValueOnce(QUERY_RESPONSE);
    const mpesa = new Mpesa(VALID_CONFIG);
    const result = await mpesa.stkQuery({ checkoutRequestId: "ws_CO_001" });
    expect(result).toEqual(QUERY_RESPONSE);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("Mpesa.generateDynamicQR", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls generateDynamicQR and returns result", async () => {
    const QR_RESPONSE = {
      ResponseCode: "0",
      RequestID: "req-001",
      ResponseDescription: "QR Code Successfully Generated.",
      QRCode: "base64string==",
    };
    mockGenerateQR.mockResolvedValueOnce(QR_RESPONSE);
    const mpesa = new Mpesa(VALID_CONFIG);
    const result = await mpesa.generateDynamicQR({
      merchantName: "Test Merchant",
      refNo: "INV001",
      amount: 100,
      trxCode: "BG",
      cpi: "373132",
    });
    expect(result).toEqual(QR_RESPONSE);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("Mpesa.accountBalance", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws VALIDATION_ERROR when initiatorName is not configured", async () => {
    const mpesa = new Mpesa({ ...VALID_CONFIG, initiatorName: undefined });
    await expect(
      mpesa.accountBalance({
        partyA: "174379",
        identifierType: "4",
        resultUrl: "https://example.com/result",
        queueTimeOutUrl: "https://example.com/timeout",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("calls queryAccountBalance when properly configured", async () => {
    const BALANCE_RESPONSE = {
      OriginatorConversationID: "OC-001",
      ConversationID: "AG_001",
      ResponseCode: "0",
      ResponseDescription: "Accept the service request successfully.",
    };
    mockQueryBalance.mockResolvedValueOnce(BALANCE_RESPONSE);

    const mpesa = new Mpesa({
      ...VALID_CONFIG,
      initiatorName: "testapi",
      initiatorPassword: "Safaricom123!",
      certificatePath: "./SandboxCertificate.cer",
    });

    const result = await mpesa.accountBalance({
      partyA: "174379",
      identifierType: "4",
      resultUrl: "https://example.com/result",
      queueTimeOutUrl: "https://example.com/timeout",
    });
    expect(result).toEqual(BALANCE_RESPONSE);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("Mpesa.reverseTransaction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws VALIDATION_ERROR when initiatorName is not configured", async () => {
    const mpesa = new Mpesa({ ...VALID_CONFIG, initiatorName: undefined });
    await expect(
      mpesa.reverseTransaction({
        transactionId: "TX123",
        receiverParty: "174379",
        receiverIdentifierType: "4",
        amount: 100,
        resultUrl: "https://example.com/result",
        queueTimeOutUrl: "https://example.com/timeout",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("Mpesa.stkPushSafe", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns ok result on success", async () => {
    const STK_RESPONSE = {
      MerchantRequestID: "MR-001",
      CheckoutRequestID: "ws_CO_001",
      ResponseCode: "0",
      ResponseDescription: "Success",
      CustomerMessage: "Success",
    };
    mockProcessStkPush.mockResolvedValueOnce(STK_RESPONSE);
    const mpesa = new Mpesa(VALID_CONFIG);
    const result = await mpesa.stkPushSafe({
      amount: 100,
      phoneNumber: "0712345678",
      callbackUrl: "https://example.com/callback",
      accountReference: "REF001",
      transactionDesc: "Payment",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual(STK_RESPONSE);
  });

  it("returns err result on failure", async () => {
    const apiError = new PesafyError({ code: "API_ERROR", message: "Bad Request" });
    mockProcessStkPush.mockRejectedValueOnce(apiError);
    const mpesa = new Mpesa(VALID_CONFIG);
    const result = await mpesa.stkPushSafe({
      amount: 100,
      phoneNumber: "0712345678",
      callbackUrl: "https://example.com/callback",
      accountReference: "REF001",
      transactionDesc: "Payment",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe(apiError);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("Mpesa.clearTokenCache", () => {
  it("does not throw", () => {
    const mpesa = new Mpesa(VALID_CONFIG);
    expect(() => mpesa.clearTokenCache()).not.toThrow();
  });
});

// 📁 PATH: src/__tests__/utils/http.test.ts
/**
 * Advanced patterns used here:
 *   • vi.stubGlobal("fetch", ...)  — replace global fetch without touching modules
 *   • it.each                      — parametrized retry-status tests
 *   • vi.spyOn(console, "warn")    — assert retry warning is logged
 *   • it.concurrent                — independent fetch-mock tests run in parallel
 */
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vite-plus/test";
import { httpRequest } from "../../utils/http";
import { PesafyError } from "../../utils/errors";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeFetchResponse(
  body: unknown,
  status = 200,
  contentType = "application/json",
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string) => (name === "content-type" ? contentType : null),
      forEach: (cb: (v: string, k: string) => void) => cb(contentType, "content-type"),
    },
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

function makeFetchNetworkError(message = "Network failure"): Promise<Response> {
  return Promise.reject(new TypeError(message));
}

// ── Setup: replace global fetch with a vi.fn() stub ──────────────────────────
let fetchSpy: MockInstance;

beforeEach(() => {
  fetchSpy = vi.fn();
  vi.stubGlobal("fetch", fetchSpy);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

// ── Happy path ────────────────────────────────────────────────────────────────
describe("httpRequest — success", () => {
  it("returns parsed JSON for a 200 response", async () => {
    fetchSpy.mockResolvedValueOnce(makeFetchResponse({ access_token: "tok123" }));
    const res = await httpRequest<{ access_token: string }>(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate",
      { method: "GET", headers: { Authorization: "Basic abc" }, retries: 0 },
    );
    expect(res.status).toBe(200);
    expect(res.data.access_token).toBe("tok123");
  });

  it("sends Content-Type and Accept headers automatically", async () => {
    fetchSpy.mockResolvedValueOnce(makeFetchResponse({}));
    await httpRequest("https://example.com", { method: "POST", retries: 0 });
    const init = fetchSpy.mock.calls[0]?.[1] as RequestInit;
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
    expect((init.headers as Record<string, string>)["Accept"]).toBe("application/json");
  });

  it("serialises body to JSON", async () => {
    fetchSpy.mockResolvedValueOnce(makeFetchResponse({}));
    const payload = { Amount: 100, PhoneNumber: "254712345678" };
    await httpRequest("https://example.com", {
      method: "POST",
      body: payload,
      retries: 0,
    });
    const init = fetchSpy.mock.calls[0]?.[1] as RequestInit;
    expect(init.body).toBe(JSON.stringify(payload));
  });

  it("passes Idempotency-Key header when provided", async () => {
    fetchSpy.mockResolvedValueOnce(makeFetchResponse({}));
    await httpRequest("https://example.com", {
      method: "POST",
      idempotencyKey: "idem-key-001",
      retries: 0,
    });
    const init = fetchSpy.mock.calls[0]?.[1] as RequestInit;
    expect((init.headers as Record<string, string>)["Idempotency-Key"]).toBe("idem-key-001");
  });
});

// ── Retry behaviour ───────────────────────────────────────────────────────────
describe("httpRequest — retries", () => {
  // Parametrized: these status codes MUST trigger a retry
  it.each([429, 500, 502, 503, 504])("retries on HTTP %i (transient)", async (status) => {
    // Fail once with a transient status, then succeed
    fetchSpy
      .mockResolvedValueOnce(makeFetchResponse({ error: "transient" }, status))
      .mockResolvedValueOnce(makeFetchResponse({ ok: true }));

    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const res = await httpRequest("https://example.com", {
      method: "POST",
      retries: 1,
      retryDelay: 1,
    });

    expect(res.data).toEqual({ ok: true });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Retry 1/1"));
    consoleSpy.mockRestore();
  });

  // Parametrized: these status codes must NOT retry
  it.each([400, 401, 403, 404, 422])("does NOT retry on HTTP %i (client error)", async (status) => {
    fetchSpy.mockResolvedValueOnce(makeFetchResponse({ error: "bad request" }, status));

    await expect(
      httpRequest("https://example.com", {
        method: "POST",
        retries: 3,
        retryDelay: 1,
      }),
    ).rejects.toMatchObject({ code: "API_ERROR", statusCode: status });

    // Only one fetch call — no retries
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("throws REQUEST_FAILED after exhausting all retries", async () => {
    fetchSpy.mockResolvedValue(makeFetchResponse({ error: "down" }, 503));

    await expect(
      httpRequest("https://example.com", {
        method: "POST",
        retries: 2,
        retryDelay: 1,
      }),
    ).rejects.toMatchObject({ code: "REQUEST_FAILED" });

    // 1 initial + 2 retries = 3 total calls
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  it("succeeds if last retry succeeds", async () => {
    fetchSpy
      .mockResolvedValueOnce(makeFetchResponse({}, 503))
      .mockResolvedValueOnce(makeFetchResponse({}, 503))
      .mockResolvedValueOnce(makeFetchResponse({ done: true }));

    const res = await httpRequest<{ done: boolean }>("https://example.com", {
      method: "POST",
      retries: 2,
      retryDelay: 1,
    });
    expect(res.data.done).toBe(true);
  });
});

// ── Network errors ────────────────────────────────────────────────────────────
describe("httpRequest — network errors", () => {
  it("wraps network failure in NETWORK_ERROR", async () => {
    fetchSpy.mockImplementationOnce(() => makeFetchNetworkError("fetch failed"));

    await expect(
      httpRequest("https://example.com", { method: "GET", retries: 0 }),
    ).rejects.toMatchObject({ code: "NETWORK_ERROR" });
  });

  it("retries on network failure and then succeeds", async () => {
    fetchSpy
      .mockImplementationOnce(() => makeFetchNetworkError())
      .mockResolvedValueOnce(makeFetchResponse({ recovered: true }));

    const res = await httpRequest<{ recovered: boolean }>("https://example.com", {
      method: "GET",
      retries: 1,
      retryDelay: 1,
    });
    expect(res.data.recovered).toBe(true);
  });
});

// ── Timeout ───────────────────────────────────────────────────────────────────
describe("httpRequest — timeout", () => {
  it("throws TIMEOUT when the request exceeds the timeout", async () => {
    // Use a real 20 ms timeout instead of fake timers.
    //
    // The fake-timer approach caused an unhandled rejection: when
    // vi.advanceTimersByTimeAsync fired the abort, the fetch promise rejected
    // while we were still awaiting advanceTimersByTimeAsync — before the outer
    // `expect(promise).rejects` had a chance to attach a catch handler. Node
    // temporarily logged it as an unhandled rejection and Vitest surfaced it as
    // a test error even though the test itself eventually passed.
    //
    // With a real 20 ms timeout httpRequest's own AbortController fires,
    // the mock fetch rejects via the signal listener, and httpRequest's
    // catch block converts it to a PesafyError(TIMEOUT) — all within the
    // single awaited promise chain, so no unhandled rejection occurs.
    fetchSpy.mockImplementationOnce(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          const signal = init.signal as AbortSignal;
          signal?.addEventListener("abort", () => {
            const err = new Error("The operation was aborted");
            err.name = "AbortError";
            reject(err);
          });
        }),
    );

    await expect(
      httpRequest("https://example.com", {
        method: "GET",
        timeout: 20, // real 20 ms — fast enough for CI, no fake-timer race
        retries: 0,
      }),
    ).rejects.toMatchObject({ code: "TIMEOUT" });
  });
});

// ── Error body extraction ─────────────────────────────────────────────────────
describe("httpRequest — error body parsing", () => {
  it.concurrent("extracts errorMessage from Daraja error envelope", async () => {
    const localFetch = vi
      .fn()
      .mockResolvedValueOnce(makeFetchResponse({ errorMessage: "Invalid Access Token" }, 400));
    vi.stubGlobal("fetch", localFetch);

    await expect(
      httpRequest("https://example.com", { method: "POST", retries: 0 }),
    ).rejects.toMatchObject({ message: "Invalid Access Token" });
  });

  it.concurrent("extracts ResponseDescription when errorMessage absent", async () => {
    const localFetch = vi
      .fn()
      .mockResolvedValueOnce(makeFetchResponse({ ResponseDescription: "Wrong credentials" }, 401));
    vi.stubGlobal("fetch", localFetch);

    await expect(
      httpRequest("https://example.com", { method: "POST", retries: 0 }),
    ).rejects.toMatchObject({ message: "Wrong credentials" });
  });

  it.concurrent("throws a PesafyError (not a plain Error)", async () => {
    const localFetch = vi.fn().mockResolvedValueOnce(makeFetchResponse({ error: "gone" }, 500));
    vi.stubGlobal("fetch", localFetch);

    try {
      await httpRequest("https://example.com", { method: "POST", retries: 0 });
    } catch (e) {
      expect(e).toBeInstanceOf(PesafyError);
    }
  });
});

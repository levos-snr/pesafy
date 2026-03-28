// 📁 PATH: src/adapters/nextjs.ts

/**
 * Next.js App Router adapter for Pesafy.
 *
 * Creates typed Next.js Route Handlers you can drop into your app/ directory.
 *
 * @example
 * // app/api/mpesa/[[...route]]/route.ts
 * import { createMpesaNextHandlers } from "pesafy/adapters/nextjs";
 *
 * const handlers = createMpesaNextHandlers({
 *   consumerKey:          process.env.MPESA_CONSUMER_KEY!,
 *   consumerSecret:       process.env.MPESA_CONSUMER_SECRET!,
 *   environment:          "sandbox",
 *   lipaNaMpesaShortCode: "174379",
 *   lipaNaMpesaPassKey:   "bfb279...",
 *   callbackUrl:          "https://yourdomain.com/api/mpesa/callback",
 * });
 *
 * export const { POST } = handlers;
 *
 * ---
 * Or use individual handlers:
 *
 * // app/api/mpesa/stk-push/route.ts
 * export const POST = createStkPushHandler({...config});
 */

import { Mpesa } from "../mpesa";
import { PesafyError } from "../utils/errors";
import { verifyWebhookIP } from "../mpesa/webhooks";
import type { MpesaConfig } from "../mpesa/types";

export interface MpesaNextConfig extends MpesaConfig {
  callbackUrl: string;
  resultUrl?: string;
  queueTimeOutUrl?: string;
  skipIPCheck?: boolean;
}

type NextRequest = {
  json(): Promise<unknown>;
  headers: { get(name: string): string | null };
  nextUrl?: { pathname: string };
};

// Lightweight shim so we don't import next/server at lib build time
function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function getIP(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? ""
  );
}

/**
 * Creates a typed Next.js Route Handler for STK Push initiation.
 * Mount at: app/api/mpesa/stk-push/route.ts
 */
export function createStkPushHandler(config: MpesaNextConfig) {
  const mpesa = new Mpesa(config);
  return async function POST(req: NextRequest): Promise<Response> {
    try {
      const body = (await req.json()) as {
        amount: number;
        phoneNumber: string;
        accountReference?: string;
        transactionDesc?: string;
        partyB?: string;
      };

      if (!body.amount || body.amount <= 0)
        throw new PesafyError({ code: "VALIDATION_ERROR", message: "amount must be > 0" });
      if (!body.phoneNumber)
        throw new PesafyError({ code: "VALIDATION_ERROR", message: "phoneNumber is required" });

      const result = await mpesa.stkPush({
        amount: body.amount,
        phoneNumber: body.phoneNumber,
        callbackUrl: config.callbackUrl,
        accountReference: body.accountReference ?? `REF-${Date.now().toString(36).toUpperCase()}`,
        transactionDesc: body.transactionDesc ?? "Payment",
        partyB: body.partyB,
      });

      return jsonResponse(result);
    } catch (e) {
      if (e instanceof PesafyError) {
        return jsonResponse({ error: e.code, message: e.message }, e.statusCode ?? 400);
      }
      return jsonResponse({ error: "INTERNAL_ERROR", message: "Unexpected error" }, 500);
    }
  };
}

/**
 * Creates a typed Next.js Route Handler for STK Push Query.
 * Mount at: app/api/mpesa/stk-query/route.ts
 */
export function createStkQueryHandler(config: MpesaNextConfig) {
  const mpesa = new Mpesa(config);
  return async function POST(req: NextRequest): Promise<Response> {
    try {
      const { checkoutRequestId } = (await req.json()) as { checkoutRequestId: string };
      if (!checkoutRequestId)
        throw new PesafyError({
          code: "VALIDATION_ERROR",
          message: "checkoutRequestId is required",
        });
      return jsonResponse(await mpesa.stkQuery({ checkoutRequestId }));
    } catch (e) {
      if (e instanceof PesafyError)
        return jsonResponse({ error: e.code, message: e.message }, e.statusCode ?? 400);
      return jsonResponse({ error: "INTERNAL_ERROR" }, 500);
    }
  };
}

/**
 * Creates a typed Next.js Route Handler for STK Push callbacks.
 * Mount at: app/api/mpesa/callback/route.ts
 */
export function createStkCallbackHandler(
  config: MpesaNextConfig & {
    onSuccess?: (data: {
      receiptNumber: string | null;
      amount: number | null;
      phone: string | null;
    }) => Promise<void> | void;
    onFailure?: (data: { resultCode: number; resultDesc: string }) => Promise<void> | void;
  },
) {
  return async function POST(req: NextRequest): Promise<Response> {
    if (!config.skipIPCheck) {
      const ip = getIP(req);
      if (ip && !verifyWebhookIP(ip)) {
        console.warn("[pesafy/nextjs] Callback from unknown IP:", ip);
      }
    }

    const body = (await req.json()) as Record<string, unknown>;
    const cb = (body?.Body as Record<string, unknown>)?.stkCallback as
      | Record<string, unknown>
      | undefined;
    if (!cb) return jsonResponse({ ResultCode: 0, ResultDesc: "Accepted" });

    const isSuccess = (cb.ResultCode as number) === 0;
    const metadata = (cb.CallbackMetadata as Record<string, unknown>)?.Item as
      | Array<Record<string, unknown>>
      | undefined;
    const findItem = (name: string) => metadata?.find((i) => i.Name === name)?.Value;

    if (isSuccess && config.onSuccess) {
      Promise.resolve(
        config.onSuccess({
          receiptNumber: findItem("MpesaReceiptNumber") as string | null,
          amount: findItem("Amount") as number | null,
          phone: findItem("PhoneNumber") as string | null,
        }),
      ).catch(console.error);
    } else if (!isSuccess && config.onFailure) {
      Promise.resolve(
        config.onFailure({
          resultCode: cb.ResultCode as number,
          resultDesc: cb.ResultDesc as string,
        }),
      ).catch(console.error);
    }

    return jsonResponse({ ResultCode: 0, ResultDesc: "Accepted" });
  };
}

/**
 * Creates all M-PESA handlers as a bundle.
 * Route param-based dispatch — mount at: app/api/mpesa/[[...route]]/route.ts
 */
export function createMpesaNextHandlers(config: MpesaNextConfig) {
  const stkPush = createStkPushHandler(config);
  const stkQuery = createStkQueryHandler(config);
  const stkCallback = createStkCallbackHandler(config);

  const mpesa = new Mpesa(config);

  return {
    async POST(req: NextRequest): Promise<Response> {
      const pathname = req.nextUrl?.pathname ?? "";

      if (pathname.endsWith("stk-push")) return stkPush(req);
      if (pathname.endsWith("stk-query")) return stkQuery(req);
      if (pathname.endsWith("callback")) return stkCallback(req);

      if (pathname.endsWith("balance")) {
        try {
          const body = (await req.json()) as { partyA: string; identifierType: "1" | "2" | "4" };
          return jsonResponse(
            await mpesa.accountBalance({
              ...body,
              resultUrl: config.resultUrl ?? "",
              queueTimeOutUrl: config.queueTimeOutUrl ?? "",
            }),
          );
        } catch (e) {
          if (e instanceof PesafyError)
            return jsonResponse({ error: e.code, message: e.message }, 400);
          return jsonResponse({ error: "INTERNAL_ERROR" }, 500);
        }
      }

      return jsonResponse({ error: "NOT_FOUND", message: `No handler for ${pathname}` }, 404);
    },
  };
}

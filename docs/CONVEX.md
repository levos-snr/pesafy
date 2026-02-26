# Using pesafy with Convex

This guide shows how to persist STK Push requests, callbacks, and tokens in your Convex project when using `pesafy`.

`pesafy` is platform-agnostic — it handles the Safaricom API only. Persistence is your responsibility. Copy the schema and helpers below into your own `convex/` folder.

---

## 1. Schema

Add these tables to your `convex/schema.ts`:

```ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // OAuth token cache — one row per environment
  mpesaTokens: defineTable({
    environment: v.string(), // "sandbox" | "production"
    accessToken: v.string(),
    expiresAt: v.number(),   // Unix seconds
    fetchedAt: v.number(),   // Unix ms
  }).index("by_environment", ["environment"]),

  // One row per outgoing STK Push (created after ResponseCode "0")
  stkPushRequests: defineTable({
    merchantRequestId: v.string(),
    checkoutRequestId: v.string(),
    environment: v.string(),
    amount: v.number(),
    phoneNumber: v.string(),  // 2547XXXXXXXX format
    shortCode: v.string(),
    transactionType: v.string(),
    accountReference: v.string(),
    transactionDesc: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("success"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_checkoutRequestId", ["checkoutRequestId"])
    .index("by_merchantRequestId", ["merchantRequestId"])
    .index("by_phoneNumber", ["phoneNumber"])
    .index("by_status", ["status"]),

  // One row per callback POST from Safaricom to your CallBackURL
  stkCallbacks: defineTable({
    checkoutRequestId: v.string(),
    merchantRequestId: v.string(),
    resultCode: v.number(),       // 0 = success, 1032 = cancelled
    resultDesc: v.string(),
    mpesaReceiptNumber: v.optional(v.string()),
    amount: v.optional(v.number()),
    transactionDate: v.optional(v.number()),
    phoneNumber: v.optional(v.string()),
    rawPayload: v.string(),       // JSON.stringify of full callback body
    receivedAt: v.number(),
  })
    .index("by_checkoutRequestId", ["checkoutRequestId"])
    .index("by_mpesaReceiptNumber", ["mpesaReceiptNumber"]),

  // One row per manual stkQuery() poll
  stkQueryResults: defineTable({
    checkoutRequestId: v.string(),
    merchantRequestId: v.string(),
    responseCode: v.string(),
    responseDescription: v.string(),
    resultCode: v.string(),
    resultDesc: v.string(),
    queriedAt: v.number(),
  }).index("by_checkoutRequestId", ["checkoutRequestId"]),
});
```

---

## 2. Mutations & Queries

Create `convex/mpesa/tokens.ts`:

```ts
import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

const TOKEN_BUFFER_SECONDS = 60;

// Upsert a freshly fetched token. Call after every Daraja token response.
export const saveToken = mutation({
  args: {
    environment: v.string(),
    accessToken: v.string(),
    expiresIn: v.number(),
  },
  returns: v.id("mpesaTokens"),
  handler: async (ctx, args) => {
    const now = Date.now();
    const expiresAt = now / 1000 + args.expiresIn;

    const existing = await ctx.db
      .query("mpesaTokens")
      .withIndex("by_environment", (q) => q.eq("environment", args.environment))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { accessToken: args.accessToken, expiresAt, fetchedAt: now });
      return existing._id;
    }

    return ctx.db.insert("mpesaTokens", {
      environment: args.environment,
      accessToken: args.accessToken,
      expiresAt,
      fetchedAt: now,
    });
  },
});

// Returns a valid cached token, or null if expired/missing.
// When null, fetch a fresh token from Daraja then call saveToken().
export const getActiveToken = query({
  args: { environment: v.string() },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("mpesaTokens")
      .withIndex("by_environment", (q) => q.eq("environment", args.environment))
      .unique();

    if (!row) return null;
    const nowSeconds = Date.now() / 1000;
    return row.expiresAt > nowSeconds + TOKEN_BUFFER_SECONDS ? row.accessToken : null;
  },
});

// Force-expire a token (call this on any 401 response).
export const invalidateToken = mutation({
  args: { environment: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("mpesaTokens")
      .withIndex("by_environment", (q) => q.eq("environment", args.environment))
      .unique();

    if (row) await ctx.db.patch(row._id, { expiresAt: 0 });
    return null;
  },
});
```

Create `convex/mpesa/stk.ts`:

```ts
import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

// Call after processStkPush() returns ResponseCode "0"
export const saveStkRequest = mutation({
  args: {
    merchantRequestId: v.string(),
    checkoutRequestId: v.string(),
    environment: v.string(),
    amount: v.number(),
    phoneNumber: v.string(),
    shortCode: v.string(),
    transactionType: v.string(),
    accountReference: v.string(),
    transactionDesc: v.string(),
  },
  returns: v.id("stkPushRequests"),
  handler: async (ctx, args) => {
    const now = Date.now();
    return ctx.db.insert("stkPushRequests", {
      ...args,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Call inside your CallBackURL handler.
// Automatically updates the parent stkPushRequest status.
export const saveCallback = mutation({
  args: {
    checkoutRequestId: v.string(),
    merchantRequestId: v.string(),
    resultCode: v.number(),
    resultDesc: v.string(),
    mpesaReceiptNumber: v.optional(v.string()),
    amount: v.optional(v.number()),
    transactionDate: v.optional(v.number()),
    phoneNumber: v.optional(v.string()),
    rawPayload: v.string(), // JSON.stringify(req.body)
  },
  returns: v.id("stkCallbacks"),
  handler: async (ctx, args) => {
    const now = Date.now();

    const callbackId = await ctx.db.insert("stkCallbacks", {
      ...args,
      receivedAt: now,
    });

    // 0 = success | 1032 = cancelled by user | anything else = failed
    const status =
      args.resultCode === 0 ? "success"
      : args.resultCode === 1032 ? "cancelled"
      : "failed";

    const request = await ctx.db
      .query("stkPushRequests")
      .withIndex("by_checkoutRequestId", (q) =>
        q.eq("checkoutRequestId", args.checkoutRequestId)
      )
      .unique();

    if (request) await ctx.db.patch(request._id, { status, updatedAt: now });

    return callbackId;
  },
});

// Call after queryStkPush() to persist the poll result.
// Updates parent status when the result is conclusive.
export const saveQueryResult = mutation({
  args: {
    checkoutRequestId: v.string(),
    merchantRequestId: v.string(),
    responseCode: v.string(),
    responseDescription: v.string(),
    resultCode: v.string(),
    resultDesc: v.string(),
  },
  returns: v.id("stkQueryResults"),
  handler: async (ctx, args) => {
    const now = Date.now();
    const queryId = await ctx.db.insert("stkQueryResults", { ...args, queriedAt: now });

    const conclusive =
      args.resultCode === "0" ||
      args.resultCode === "1032" ||
      (args.resultCode !== "" && args.responseCode === "0");

    if (conclusive) {
      const status =
        args.resultCode === "0" ? "success"
        : args.resultCode === "1032" ? "cancelled"
        : "failed";

      const request = await ctx.db
        .query("stkPushRequests")
        .withIndex("by_checkoutRequestId", (q) =>
          q.eq("checkoutRequestId", args.checkoutRequestId)
        )
        .unique();

      if (request && request.status === "pending") {
        await ctx.db.patch(request._id, { status, updatedAt: now });
      }
    }

    return queryId;
  },
});

// Fetch a single STK Push request by CheckoutRequestID
export const getByCheckoutId = query({
  args: { checkoutRequestId: v.string() },
  handler: async (ctx, args) =>
    ctx.db
      .query("stkPushRequests")
      .withIndex("by_checkoutRequestId", (q) =>
        q.eq("checkoutRequestId", args.checkoutRequestId)
      )
      .unique(),
});

// Fetch all requests for a phone number, newest first
export const listByPhone = query({
  args: {
    phoneNumber: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) =>
    ctx.db
      .query("stkPushRequests")
      .withIndex("by_phoneNumber", (q) => q.eq("phoneNumber", args.phoneNumber))
      .order("desc")
      .take(args.limit ?? 20),
});

// Fetch the callback for a CheckoutRequestID (null = not received yet)
export const getCallback = query({
  args: { checkoutRequestId: v.string() },
  handler: async (ctx, args) =>
    ctx.db
      .query("stkCallbacks")
      .withIndex("by_checkoutRequestId", (q) =>
        q.eq("checkoutRequestId", args.checkoutRequestId)
      )
      .unique(),
});

// Fetch all manual query poll results for a CheckoutRequestID, newest first
export const listQueryResults = query({
  args: { checkoutRequestId: v.string() },
  handler: async (ctx, args) =>
    ctx.db
      .query("stkQueryResults")
      .withIndex("by_checkoutRequestId", (q) =>
        q.eq("checkoutRequestId", args.checkoutRequestId)
      )
      .order("desc")
      .collect(),
});
```

---

## 3. Wiring it together

Here's a full example of an STK Push flow in a Convex HTTP action:

```ts
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import { Mpesa, isStkCallbackSuccess, getCallbackValue } from "pesafy";

const mpesa = new Mpesa({
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: "sandbox",
  lipaNaMpesaShortCode: process.env.MPESA_SHORT_CODE!,
  lipaNaMpesaPassKey: process.env.MPESA_PASS_KEY!,
});

// POST /mpesa/stk-push
export const initiateStkPush = httpAction(async (ctx, request) => {
  const { amount, phoneNumber, accountReference } = await request.json();

  const result = await mpesa.stkPush({
    amount,
    phoneNumber,
    callbackUrl: process.env.MPESA_CALLBACK_URL!,
    accountReference,
    transactionDesc: "Payment",
  });

  // Only save if Safaricom accepted the request
  if (result.ResponseCode === "0") {
    await ctx.runMutation(api.mpesa.stk.saveStkRequest, {
      merchantRequestId: result.MerchantRequestID,
      checkoutRequestId: result.CheckoutRequestID,
      environment: "sandbox",
      amount,
      phoneNumber,
      shortCode: process.env.MPESA_SHORT_CODE!,
      transactionType: "CustomerPayBillOnline",
      accountReference,
      transactionDesc: "Payment",
    });
  }

  return new Response(JSON.stringify(result), { status: 200 });
});

// POST /mpesa/callback  ← this is your CallBackURL
export const stkCallback = httpAction(async (ctx, request) => {
  const body = await request.json();
  const cb = body.Body.stkCallback;

  await ctx.runMutation(api.mpesa.stk.saveCallback, {
    checkoutRequestId: cb.CheckoutRequestID,
    merchantRequestId: cb.MerchantRequestID,
    resultCode: cb.ResultCode,
    resultDesc: cb.ResultDesc,
    mpesaReceiptNumber: isStkCallbackSuccess(cb)
      ? String(getCallbackValue({ Body: body.Body }, "MpesaReceiptNumber") ?? "")
      : undefined,
    amount: isStkCallbackSuccess(cb)
      ? Number(getCallbackValue({ Body: body.Body }, "Amount"))
      : undefined,
    phoneNumber: isStkCallbackSuccess(cb)
      ? String(getCallbackValue({ Body: body.Body }, "PhoneNumber") ?? "")
      : undefined,
    rawPayload: JSON.stringify(body),
  });

  // Safaricom expects a 200 with no body
  return new Response(null, { status: 200 });
});
```

---

## 4. File placement in your Convex project

```
your-app/
└── convex/
    ├── schema.ts          ← add the tables above to your existing schema
    ├── http.ts            ← register initiateStkPush and stkCallback routes
    └── mpesa/
        ├── stk.ts         ← copy from above
        └── tokens.ts      ← copy from above
```

---

## Notes

- `pesafy` has no Convex dependency. These files live entirely in your app.
- The `rawPayload` field on `stkCallbacks` stores the full Safaricom POST body as a JSON string — useful for auditing and replaying failed callbacks.
- Token caching via `mpesaTokens` is optional. `pesafy` caches tokens in-memory by default. Use the Convex token cache only if you're running multiple serverless workers and want to share a single token across them.
- Always respond to Safaricom's callback with HTTP 200 immediately, even if your mutation fails — otherwise Safaricom will retry the callback repeatedly.

import { v } from "convex/values";
import { internalQuery, QueryCtx, query } from "./_generated/server";
import { authComponent } from "./auth";

async function requireUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  try {
    return await authComponent.getAuthUser(ctx);
  } catch {
    return null;
  }
}

// Get transactions for a business
export const getTransactions = query({
  args: {
    businessId: v.id("businesses"),
    limit: v.optional(v.number()),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("success"),
        v.literal("failed"),
        v.literal("cancelled")
      )
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!user) return [];

    const business = await ctx.db.get(args.businessId);
    if (!business || business.userId !== user._id) return [];

    if (args.status !== undefined) {
      const status = args.status;
      return await ctx.db
        .query("transactions")
        .withIndex("by_business_and_status", (q) =>
          q.eq("businessId", args.businessId).eq("status", status)
        )
        .order("desc")
        .take(args.limit ?? 100);
    }

    return await ctx.db
      .query("transactions")
      .withIndex("by_business_and_created", (q) =>
        q.eq("businessId", args.businessId)
      )
      .order("desc")
      .take(args.limit ?? 100);
  },
});

// Get transaction by ID
export const getTransaction = query({
  args: { transactionId: v.id("transactions") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!user) return null;

    const transaction = await ctx.db.get(args.transactionId);
    if (!transaction) return null;

    const business = await ctx.db.get(transaction.businessId);
    if (!business || business.userId !== user._id) return null;

    return transaction;
  },
});

// Internal: Get transactions by transaction ID (for webhook handler)
export const getByTransactionId = internalQuery({
  args: { transactionId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("transactions")
      .withIndex("by_transaction_id", (q) =>
        q.eq("transactionId", args.transactionId)
      )
      .collect();
  },
});

// Get dashboard stats
export const getDashboardStats = query({
  args: { businessId: v.id("businesses") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!user) return null;

    const business = await ctx.db.get(args.businessId);
    if (!business || business.userId !== user._id) return null;

    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_business", (q) => q.eq("businessId", args.businessId))
      .collect();

    const now = Date.now();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayStartTime = todayStart.getTime();

    const todayTransactions = transactions.filter(
      (t) => t.createdAt >= todayStartTime
    );

    const totalVolume = todayTransactions
      .filter((t) => t.status === "success")
      .reduce((sum, t) => sum + t.amount, 0);

    const successCount = todayTransactions.filter(
      (t) => t.status === "success"
    ).length;

    const successRate =
      todayTransactions.length > 0
        ? (successCount / todayTransactions.length) * 100
        : 0;

    return {
      totalVolume,
      transactionCount: todayTransactions.length,
      successCount,
      successRate: Math.round(successRate * 100) / 100,
      recentTransactions: transactions
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 10),
    };
  },
});

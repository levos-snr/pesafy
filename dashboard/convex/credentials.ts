import { v } from "convex/values";
import { MutationCtx, mutation, QueryCtx, query } from "./_generated/server";
import { authComponent } from "./auth";

async function requireUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  try {
    return await authComponent.getAuthUser(ctx);
  } catch {
    return null;
  }
}

// Get credentials for a business (only returns if user owns the business)
export const getCredentials = query({
  args: { businessId: v.id("businesses") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!user) return null;

    const business = await ctx.db.get(args.businessId);
    if (!business || business.userId !== user._id) return null;

    const creds = await ctx.db
      .query("credentials")
      .withIndex("by_business", (q) => q.eq("businessId", args.businessId))
      .first();

    return creds;
  },
});

// Set credentials for a business
export const setCredentials = mutation({
  args: {
    businessId: v.id("businesses"),
    consumerKey: v.string(),
    consumerSecret: v.string(),
    lipaNaMpesaPassKey: v.optional(v.string()),
    initiatorName: v.optional(v.string()),
    initiatorPassword: v.optional(v.string()),
    certificatePem: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const business = await ctx.db.get(args.businessId);
    if (!business || business.userId !== user._id) {
      throw new Error("Business not found or access denied");
    }

    const existing = await ctx.db
      .query("credentials")
      .withIndex("by_business", (q) => q.eq("businessId", args.businessId))
      .first();

    const now = Date.now();
    const { businessId, ...creds } = args;

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...creds,
        updatedAt: now,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("credentials", {
        businessId,
        ...creds,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

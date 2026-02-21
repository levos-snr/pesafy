import { v } from "convex/values";
import {
  internalQuery,
  MutationCtx,
  mutation,
  QueryCtx,
  query,
} from "./_generated/server";
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

export const getUserBusinesses = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    if (!user) return [];

    return await ctx.db
      .query("businesses")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

export const getBusiness = query({
  args: { businessId: v.id("businesses") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!user) return null;

    const business = await ctx.db.get(args.businessId);
    if (!business || business.userId !== user._id) return null;

    return business;
  },
});

/**
 * Internal-only version used by mpesaActions (Node.js runtime).
 * Auth is already verified in the action before this is called.
 */
export const getBusinessInternal = internalQuery({
  args: { businessId: v.id("businesses") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.businessId);
  },
});

export const createBusiness = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    mpesaEnvironment: v.union(v.literal("sandbox"), v.literal("production")),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("businesses")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (existing) throw new Error("A business with that slug already exists");

    const now = Date.now();
    return await ctx.db.insert("businesses", {
      name: args.name,
      slug: args.slug,
      userId: user._id,
      mpesaEnvironment: args.mpesaEnvironment,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateBusiness = mutation({
  args: {
    businessId: v.id("businesses"),
    name: v.optional(v.string()),
    mpesaEnvironment: v.optional(
      v.union(v.literal("sandbox"), v.literal("production"))
    ),
    lipaNaMpesaShortCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const business = await ctx.db.get(args.businessId);
    if (!business || business.userId !== user._id) {
      throw new Error("Business not found or access denied");
    }

    const { businessId, ...updates } = args;
    await ctx.db.patch(businessId, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

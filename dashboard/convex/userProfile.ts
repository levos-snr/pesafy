import { v } from "convex/values";
import { MutationCtx, mutation, QueryCtx, query } from "./_generated/server";
import { authComponent, createAuth } from "./auth";

// ── Auth guard ──────────────────────────────────────────────────────────────

async function requireUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  try {
    return await authComponent.getAuthUser(ctx);
  } catch {
    return null;
  }
}

// ── Get profile (creates default if missing) ─────────────────────────────────

export const getProfile = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    if (!user) return null;

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    return {
      // From Better Auth user object
      id: user._id,
      name: user.name,
      email: user.email,
      image: user.image ?? null,
      emailVerified: user.emailVerified ?? false,
      // From extended profile table
      ...(profile ?? {}),
    };
  },
});

// ── Update display name (via Better Auth API) ─────────────────────────────────

export const updateName = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!user) throw new Error("Not authenticated");

    if (!args.name.trim()) throw new Error("Name cannot be empty");

    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
    await auth.api.updateUser({
      body: { name: args.name.trim() },
      headers,
    });
  },
});

// ── Update avatar image URL (via Better Auth API) ────────────────────────────

export const updateAvatar = mutation({
  args: { imageUrl: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
    await auth.api.updateUser({
      body: { image: args.imageUrl ?? null },
      headers,
    });
  },
});

// ── Change password ───────────────────────────────────────────────────────────

export const changePassword = mutation({
  args: {
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!user) throw new Error("Not authenticated");

    if (args.newPassword.length < 8) {
      throw new Error("New password must be at least 8 characters");
    }

    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
    await auth.api.changePassword({
      body: {
        currentPassword: args.currentPassword,
        newPassword: args.newPassword,
      },
      headers,
    });
  },
});

// ── Update extended profile (phone, preferences, etc.) ───────────────────────

export const updateProfile = mutation({
  args: {
    phoneNumber: v.optional(v.string()),
    phoneCountryCode: v.optional(v.string()),
    avatarColor: v.optional(v.string()),
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, { ...args, updatedAt: now });
    } else {
      await ctx.db.insert("userProfiles", {
        userId: user._id,
        ...args,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

// ── Update preferences ────────────────────────────────────────────────────────

export const updatePreferences = mutation({
  args: {
    theme: v.optional(
      v.union(v.literal("light"), v.literal("dark"), v.literal("system"))
    ),
    emailNotifications: v.optional(v.boolean()),
    smsNotifications: v.optional(v.boolean()),
    weeklyDigest: v.optional(v.boolean()),
    language: v.optional(v.string()),
    currency: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, { ...args, updatedAt: now });
    } else {
      await ctx.db.insert("userProfiles", {
        userId: user._id,
        ...args,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

// ── Mark onboarding step ──────────────────────────────────────────────────────

export const updateOnboardingStep = mutation({
  args: {
    step: v.number(),
    completed: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        onboardingStep: args.step,
        onboardingCompleted: args.completed ?? existing.onboardingCompleted,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("userProfiles", {
        userId: user._id,
        onboardingStep: args.step,
        onboardingCompleted: args.completed ?? false,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

// ── Delete account ────────────────────────────────────────────────────────────

export const deleteAccount = mutation({
  args: { confirmationEmail: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!user) throw new Error("Not authenticated");

    if (args.confirmationEmail.toLowerCase() !== user.email?.toLowerCase()) {
      throw new Error("Email does not match. Account not deleted.");
    }

    // Delete userProfile first
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (profile) await ctx.db.delete(profile._id);

    // Delete user via Better Auth API
    // body is required by better-call even though all its fields are optional
    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
    await auth.api.deleteUser({ headers, body: {} });
  },
});

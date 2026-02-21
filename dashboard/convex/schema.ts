import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Businesses/Organizations - users can have multiple businesses
  businesses: defineTable({
    name: v.string(),
    slug: v.string(),
    // Better Auth user IDs are plain strings, not Convex document IDs.
    // They live in the component's "user" table which is outside your schema.
    userId: v.string(),
    mpesaEnvironment: v.union(v.literal("sandbox"), v.literal("production")),
    lipaNaMpesaShortCode: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_slug", ["slug"]),

  // API Credentials - encrypted storage per business
  credentials: defineTable({
    businessId: v.id("businesses"),
    consumerKey: v.string(),
    consumerSecret: v.string(),
    lipaNaMpesaPassKey: v.optional(v.string()),
    initiatorName: v.optional(v.string()),
    initiatorPassword: v.optional(v.string()),
    certificatePem: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_business", ["businessId"]),

  // Webhooks configuration
  webhooks: defineTable({
    businessId: v.id("businesses"),
    url: v.string(),
    secret: v.string(),
    events: v.array(
      v.union(
        v.literal("stk_push"),
        v.literal("b2c"),
        v.literal("b2b"),
        v.literal("c2b"),
        v.literal("reversal"),
        v.literal("transaction_status")
      )
    ),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_business", ["businessId"])
    .index("by_business_and_active", ["businessId", "isActive"]),

  // Transactions - monitoring and history
  transactions: defineTable({
    businessId: v.id("businesses"),
    transactionId: v.string(),
    type: v.union(
      v.literal("stk_push"),
      v.literal("stk_query"),
      v.literal("b2c"),
      v.literal("b2b"),
      v.literal("c2b"),
      v.literal("qr_code"),
      v.literal("transaction_status"),
      v.literal("reversal")
    ),
    amount: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("success"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
    phoneNumber: v.optional(v.string()),
    accountReference: v.optional(v.string()),
    transactionDesc: v.optional(v.string()),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_business", ["businessId"])
    .index("by_business_and_status", ["businessId", "status"])
    .index("by_business_and_created", ["businessId", "createdAt"])
    .index("by_transaction_id", ["transactionId"]),

  // Webhook deliveries - for retry and logging
  webhookDeliveries: defineTable({
    webhookId: v.id("webhooks"),
    transactionId: v.optional(v.id("transactions")),
    eventId: v.string(),
    payload: v.any(),
    responseStatus: v.optional(v.number()),
    responseBody: v.optional(v.string()),
    attempts: v.number(),
    lastAttemptAt: v.number(),
    deliveredAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_webhook", ["webhookId"])
    .index("by_transaction", ["transactionId"])
    .index("by_event_id", ["eventId"]),
});

import { integer, jsonb, numeric, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid, } from "drizzle-orm/pg-core";
export const reputationEventTypeEnum = pgEnum("reputation_event_type", [
    "CONTRACT_COMPLETED",
    "CONTRACT_BREACH",
    "LATE_COMPLETION",
    "AUCTION_WON",
    "AUCTION_CANCELED",
    "PAYMENT_CONFIRMED",
    "SLOT_UNFILLED",
]);
export const executivePublicLevelEnum = pgEnum("executive_public_level", [
    "STANDARD",
    "SELECT",
    "ELITE",
]);
export const reputationEvents = pgTable("reputation_events", {
    id: uuid("id").primaryKey().defaultRandom(),
    source: text("source").notNull(),
    eventId: text("event_id").notNull(),
    type: reputationEventTypeEnum("type").notNull(),
    executiveId: text("executive_id"),
    ownerId: text("owner_id"),
    referenceId: text("reference_id").notNull(),
    payload: jsonb("payload").$type().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
    sourceEventUniqueIdx: uniqueIndex("reputation_events_source_event_uidx").on(table.source, table.eventId),
}));
export const executiveReputations = pgTable("executive_reputations", {
    id: uuid("id").primaryKey().defaultRandom(),
    executiveId: text("executive_id").notNull().unique(),
    completionRate: numeric("completion_rate", { precision: 8, scale: 6 }).notNull().default("0"),
    onTimeRate: numeric("on_time_rate", { precision: 8, scale: 6 }).notNull().default("0"),
    breachRate: numeric("breach_rate", { precision: 8, scale: 6 }).notNull().default("0"),
    slotFillRate: numeric("slot_fill_rate", { precision: 8, scale: 6 }).notNull().default("0"),
    avgClearingPrice: integer("avg_clearing_price").notNull().default(0),
    priceTrendScore: numeric("price_trend_score", { precision: 8, scale: 6 }).notNull().default("0"),
    reliabilityScore: numeric("reliability_score", { precision: 8, scale: 6 }).notNull().default("0"),
    reputationScore: numeric("reputation_score", { precision: 6, scale: 2 }).notNull().default("0"),
    publicLevel: executivePublicLevelEnum("public_level").notNull().default("STANDARD"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
export const ownerReputations = pgTable("owner_reputations", {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id").notNull().unique(),
    paymentReliability: numeric("payment_reliability", { precision: 8, scale: 6 }).notNull().default("0"),
    cancellationRate: numeric("cancellation_rate", { precision: 8, scale: 6 }).notNull().default("0"),
    breachInitiationRate: numeric("breach_initiation_rate", { precision: 8, scale: 6 }).notNull().default("0"),
    bidConsistencyScore: numeric("bid_consistency_score", { precision: 8, scale: 6 }).notNull().default("0"),
    engagementScore: numeric("engagement_score", { precision: 8, scale: 6 }).notNull().default("0"),
    internalRiskScore: numeric("internal_risk_score", { precision: 6, scale: 2 }).notNull().default("0"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

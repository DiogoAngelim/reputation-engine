import { eq } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { executiveReputations, ownerReputations, reputationEvents } from "../db/schema.js";
const parseNum = (input) => Number(input ?? 0);
class PgReputationRepository {
    conn;
    constructor(conn = getDb()) {
        this.conn = conn;
    }
    async transaction(fn) {
        if (this.conn === getDb()) {
            return this.conn.transaction(async (tx) => fn(new PgReputationRepository(tx)));
        }
        return fn(this);
    }
    async insertEventIfAbsent(event) {
        const inserted = await this.conn
            .insert(reputationEvents)
            .values({
            source: event.source,
            eventId: event.eventId,
            type: event.type,
            executiveId: event.executiveId ?? null,
            ownerId: event.ownerId ?? null,
            referenceId: event.referenceId,
            payload: event.payload,
            createdAt: event.createdAt,
        })
            .onConflictDoNothing({ target: [reputationEvents.source, reputationEvents.eventId] })
            .returning({ id: reputationEvents.id });
        return inserted.length > 0;
    }
    async getExecutiveEvents(executiveId) {
        const rows = await this.conn
            .select({
            type: reputationEvents.type,
            createdAt: reputationEvents.createdAt,
            payload: reputationEvents.payload,
        })
            .from(reputationEvents)
            .where(eq(reputationEvents.executiveId, executiveId));
        return rows.map((row) => ({
            type: row.type,
            createdAt: row.createdAt,
            payload: (row.payload ?? {}),
        }));
    }
    async getOwnerEvents(ownerId) {
        const rows = await this.conn
            .select({
            type: reputationEvents.type,
            createdAt: reputationEvents.createdAt,
            payload: reputationEvents.payload,
        })
            .from(reputationEvents)
            .where(eq(reputationEvents.ownerId, ownerId));
        return rows.map((row) => ({
            type: row.type,
            createdAt: row.createdAt,
            payload: (row.payload ?? {}),
        }));
    }
    async upsertExecutiveScore(executiveId, score) {
        await this.conn
            .insert(executiveReputations)
            .values({
            executiveId,
            completionRate: String(score.completionRate),
            onTimeRate: String(score.onTimeRate),
            breachRate: String(score.breachRate),
            slotFillRate: String(score.slotFillRate),
            avgClearingPrice: score.avgClearingPrice,
            priceTrendScore: String(score.priceTrendScore),
            reliabilityScore: String(score.reliabilityScore),
            reputationScore: String(score.reputationScore),
            publicLevel: score.publicLevel,
            updatedAt: new Date(),
        })
            .onConflictDoUpdate({
            target: executiveReputations.executiveId,
            set: {
                completionRate: String(score.completionRate),
                onTimeRate: String(score.onTimeRate),
                breachRate: String(score.breachRate),
                slotFillRate: String(score.slotFillRate),
                avgClearingPrice: score.avgClearingPrice,
                priceTrendScore: String(score.priceTrendScore),
                reliabilityScore: String(score.reliabilityScore),
                reputationScore: String(score.reputationScore),
                publicLevel: score.publicLevel,
                updatedAt: new Date(),
            },
        });
    }
    async upsertOwnerScore(ownerId, score) {
        await this.conn
            .insert(ownerReputations)
            .values({
            ownerId,
            paymentReliability: String(score.paymentReliability),
            cancellationRate: String(score.cancellationRate),
            breachInitiationRate: String(score.breachInitiationRate),
            bidConsistencyScore: String(score.bidConsistencyScore),
            engagementScore: String(score.engagementScore),
            internalRiskScore: String(score.internalRiskScore),
            updatedAt: new Date(),
        })
            .onConflictDoUpdate({
            target: ownerReputations.ownerId,
            set: {
                paymentReliability: String(score.paymentReliability),
                cancellationRate: String(score.cancellationRate),
                breachInitiationRate: String(score.breachInitiationRate),
                bidConsistencyScore: String(score.bidConsistencyScore),
                engagementScore: String(score.engagementScore),
                internalRiskScore: String(score.internalRiskScore),
                updatedAt: new Date(),
            },
        });
    }
    async getExecutiveReputation(executiveId) {
        const rows = await this.conn
            .select()
            .from(executiveReputations)
            .where(eq(executiveReputations.executiveId, executiveId))
            .limit(1);
        const row = rows[0];
        if (!row)
            return null;
        return {
            executiveId: row.executiveId,
            completionRate: parseNum(row.completionRate),
            onTimeRate: parseNum(row.onTimeRate),
            breachRate: parseNum(row.breachRate),
            slotFillRate: parseNum(row.slotFillRate),
            avgClearingPrice: row.avgClearingPrice,
            priceTrendScore: parseNum(row.priceTrendScore),
            reliabilityScore: parseNum(row.reliabilityScore),
            reputationScore: parseNum(row.reputationScore),
            publicLevel: row.publicLevel,
        };
    }
    async getOwnerReputation(ownerId) {
        const rows = await this.conn
            .select()
            .from(ownerReputations)
            .where(eq(ownerReputations.ownerId, ownerId))
            .limit(1);
        const row = rows[0];
        if (!row)
            return null;
        return {
            ownerId: row.ownerId,
            paymentReliability: parseNum(row.paymentReliability),
            cancellationRate: parseNum(row.cancellationRate),
            breachInitiationRate: parseNum(row.breachInitiationRate),
            bidConsistencyScore: parseNum(row.bidConsistencyScore),
            engagementScore: parseNum(row.engagementScore),
            internalRiskScore: parseNum(row.internalRiskScore),
        };
    }
}
let repositorySingleton = null;
export const getReputationRepository = () => {
    if (!repositorySingleton) {
        repositorySingleton = new PgReputationRepository();
    }
    return repositorySingleton;
};

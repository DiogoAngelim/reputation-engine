import { describe, expect, it } from "vitest";
import { ReputationService } from "../src/services/reputation.service.js";
class InMemoryReputationRepository {
    events = new Map();
    executiveEvents = new Map();
    ownerEvents = new Map();
    executiveScore = new Map();
    ownerScore = new Map();
    async transaction(fn) {
        return fn(this);
    }
    async insertEventIfAbsent(event) {
        const key = `${event.source}::${event.eventId}`;
        if (this.events.has(key))
            return false;
        this.events.set(key, event);
        if (event.executiveId) {
            const list = this.executiveEvents.get(event.executiveId) ?? [];
            list.push({ type: event.type, createdAt: event.createdAt, payload: event.payload });
            this.executiveEvents.set(event.executiveId, list);
        }
        if (event.ownerId) {
            const list = this.ownerEvents.get(event.ownerId) ?? [];
            list.push({ type: event.type, createdAt: event.createdAt, payload: event.payload });
            this.ownerEvents.set(event.ownerId, list);
        }
        return true;
    }
    async getExecutiveEvents(executiveId) {
        return this.executiveEvents.get(executiveId) ?? [];
    }
    async getOwnerEvents(ownerId) {
        return this.ownerEvents.get(ownerId) ?? [];
    }
    async upsertExecutiveScore(executiveId, score) {
        this.executiveScore.set(executiveId, score);
    }
    async upsertOwnerScore(ownerId, score) {
        this.ownerScore.set(ownerId, score);
    }
    async getExecutiveReputation(executiveId) {
        const score = this.executiveScore.get(executiveId);
        return score ? { executiveId, ...score } : null;
    }
    async getOwnerReputation(ownerId) {
        const score = this.ownerScore.get(ownerId);
        return score ? { ownerId, ...score } : null;
    }
}
describe("reputation service idempotency", () => {
    it("applies only first event occurrence by source+eventId", async () => {
        const repo = new InMemoryReputationRepository();
        const service = new ReputationService(repo);
        const first = await service.applyEventAndRecalculate({
            source: "CONTRACT",
            eventId: "evt-1",
            type: "CONTRACT_COMPLETED",
            executiveId: "exec-1",
            ownerId: "owner-1",
            referenceId: "contract-1",
            payload: {},
        });
        const duplicate = await service.applyEventAndRecalculate({
            source: "CONTRACT",
            eventId: "evt-1",
            type: "CONTRACT_COMPLETED",
            executiveId: "exec-1",
            ownerId: "owner-1",
            referenceId: "contract-1",
            payload: {},
        });
        expect(first.applied).toBe(true);
        expect(duplicate.applied).toBe(false);
        const publicRep = await service.getExecutivePublicReputation("exec-1");
        expect(publicRep).not.toBeNull();
        expect(publicRep?.completionRate).toBe(1);
    });
});

import { calculateExecutiveScore, calculateOwnerScore, } from "./scoring.service.js";
import { getReputationRepository } from "./reputation.repository.js";
export class ReputationService {
    repo;
    constructor(repo = getReputationRepository()) {
        this.repo = repo;
    }
    async recalculateExecutive(executiveId) {
        return this.repo.transaction(async (txRepo) => {
            const events = await txRepo.getExecutiveEvents(executiveId);
            const score = calculateExecutiveScore(events);
            await txRepo.upsertExecutiveScore(executiveId, score);
            return score;
        });
    }
    async recalculateOwner(ownerId) {
        return this.repo.transaction(async (txRepo) => {
            const events = await txRepo.getOwnerEvents(ownerId);
            const score = calculateOwnerScore(events);
            await txRepo.upsertOwnerScore(ownerId, score);
            return score;
        });
    }
    async applyEventAndRecalculate(event) {
        return this.repo.transaction(async (txRepo) => {
            const inserted = await txRepo.insertEventIfAbsent({
                source: event.source,
                eventId: event.eventId,
                type: event.type,
                executiveId: event.executiveId,
                ownerId: event.ownerId,
                referenceId: event.referenceId,
                payload: event.payload,
                createdAt: event.createdAt ?? new Date(),
            });
            if (!inserted) {
                return { applied: false };
            }
            if (event.executiveId) {
                const executiveEvents = await txRepo.getExecutiveEvents(event.executiveId);
                const executiveScore = calculateExecutiveScore(executiveEvents);
                await txRepo.upsertExecutiveScore(event.executiveId, executiveScore);
            }
            if (event.ownerId) {
                const ownerEvents = await txRepo.getOwnerEvents(event.ownerId);
                const ownerScore = calculateOwnerScore(ownerEvents);
                await txRepo.upsertOwnerScore(event.ownerId, ownerScore);
            }
            return { applied: true };
        });
    }
    async getExecutivePublicReputation(executiveId) {
        const result = await this.repo.getExecutiveReputation(executiveId);
        if (!result)
            return null;
        return {
            reputationScore: result.reputationScore,
            publicLevel: result.publicLevel,
            completionRate: result.completionRate,
            onTimeRate: result.onTimeRate,
            slotFillRate: result.slotFillRate,
            avgClearingPrice: result.avgClearingPrice,
        };
    }
    async getOwnerInternalReputation(ownerId) {
        return this.repo.getOwnerReputation(ownerId);
    }
}

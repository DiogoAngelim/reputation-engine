import type { ReputationHookPayload } from "../types/reputation.js";
import {
  calculateExecutiveScore,
  calculateOwnerScore,
  type ExecutiveScoreResult,
  type OwnerScoreResult,
} from "./scoring.service.js";
import { getReputationRepository, type ReputationRepository } from "./reputation.repository.js";

export class ReputationService {
  constructor(private readonly repo: ReputationRepository = getReputationRepository()) { }

  async recalculateExecutive(executiveId: string): Promise<ExecutiveScoreResult> {
    return this.repo.transaction(async (txRepo) => {
      const events = await txRepo.getExecutiveEvents(executiveId);
      const score = calculateExecutiveScore(events);
      await txRepo.upsertExecutiveScore(executiveId, score);
      return score;
    });
  }

  async recalculateOwner(ownerId: string): Promise<OwnerScoreResult> {
    return this.repo.transaction(async (txRepo) => {
      const events = await txRepo.getOwnerEvents(ownerId);
      const score = calculateOwnerScore(events);
      await txRepo.upsertOwnerScore(ownerId, score);
      return score;
    });
  }

  async applyEventAndRecalculate(event: {
    source: ReputationHookPayload["source"];
    eventId: string;
    type:
    | "CONTRACT_COMPLETED"
    | "CONTRACT_BREACH"
    | "LATE_COMPLETION"
    | "AUCTION_WON"
    | "AUCTION_CANCELED"
    | "PAYMENT_CONFIRMED"
    | "SLOT_UNFILLED";
    executiveId?: string;
    ownerId?: string;
    referenceId: string;
    payload: Record<string, unknown>;
    createdAt?: Date;
  }): Promise<{ applied: boolean }> {
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

  async getExecutivePublicReputation(executiveId: string) {
    const result = await this.repo.getExecutiveReputation(executiveId);
    if (!result) return null;

    return {
      reputationScore: result.reputationScore,
      publicLevel: result.publicLevel,
      completionRate: result.completionRate,
      onTimeRate: result.onTimeRate,
      slotFillRate: result.slotFillRate,
      avgClearingPrice: result.avgClearingPrice,
    };
  }

  async getOwnerInternalReputation(ownerId: string) {
    return this.repo.getOwnerReputation(ownerId);
  }
}

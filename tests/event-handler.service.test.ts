import { describe, expect, it } from "vitest";
import { ReputationService } from "../src/services/reputation.service.js";
import type { ReputationRepository, NewReputationEvent } from "../src/services/reputation.repository.js";
import type { ExecutiveScoreResult, OwnerScoreResult, ReputationEventRecord } from "../src/services/scoring.service.js";

class InMemoryReputationRepository implements ReputationRepository {
  private readonly events = new Map<string, NewReputationEvent>();
  private readonly executiveEvents = new Map<string, ReputationEventRecord[]>();
  private readonly ownerEvents = new Map<string, ReputationEventRecord[]>();
  private readonly executiveScore = new Map<string, ExecutiveScoreResult>();
  private readonly ownerScore = new Map<string, OwnerScoreResult>();

  async transaction<T>(fn: (repo: ReputationRepository) => Promise<T>): Promise<T> {
    return fn(this);
  }

  async insertEventIfAbsent(event: NewReputationEvent): Promise<boolean> {
    const key = `${event.source}::${event.eventId}`;
    if (this.events.has(key)) return false;

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

  async getExecutiveEvents(executiveId: string): Promise<ReputationEventRecord[]> {
    return this.executiveEvents.get(executiveId) ?? [];
  }

  async getOwnerEvents(ownerId: string): Promise<ReputationEventRecord[]> {
    return this.ownerEvents.get(ownerId) ?? [];
  }

  async upsertExecutiveScore(executiveId: string, score: ExecutiveScoreResult): Promise<void> {
    this.executiveScore.set(executiveId, score);
  }

  async upsertOwnerScore(ownerId: string, score: OwnerScoreResult): Promise<void> {
    this.ownerScore.set(ownerId, score);
  }

  async getExecutiveReputation(executiveId: string): Promise<(ExecutiveScoreResult & { executiveId: string }) | null> {
    const score = this.executiveScore.get(executiveId);
    return score ? { executiveId, ...score } : null;
  }

  async getOwnerReputation(ownerId: string): Promise<(OwnerScoreResult & { ownerId: string }) | null> {
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

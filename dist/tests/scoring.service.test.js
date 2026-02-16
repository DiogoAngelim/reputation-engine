import { describe, expect, it } from "vitest";
import { calculateExecutiveScore, calculateOwnerScore, classifyPublicLevel, normalizeTo100, } from "../src/services/scoring.service.js";
const d = (value) => new Date(value);
describe("scoring.service", () => {
    it("normalizes and classifies executive public levels", () => {
        expect(normalizeTo100(1.2)).toBe(100);
        expect(normalizeTo100(-0.3)).toBe(0);
        expect(classifyPublicLevel(85)).toBe("ELITE");
        expect(classifyPublicLevel(70)).toBe("SELECT");
        expect(classifyPublicLevel(69.99)).toBe("STANDARD");
    });
    it("calculates deterministic executive score", () => {
        const events = [
            { type: "CONTRACT_COMPLETED", createdAt: d("2025-01-01"), payload: {} },
            { type: "CONTRACT_COMPLETED", createdAt: d("2025-01-02"), payload: {} },
            { type: "CONTRACT_BREACH", createdAt: d("2025-01-03"), payload: {} },
            { type: "LATE_COMPLETION", createdAt: d("2025-01-04"), payload: {} },
            { type: "SLOT_UNFILLED", createdAt: d("2025-01-05"), payload: { openedSlots: 10, unfilledSlots: 2 } },
            { type: "AUCTION_WON", createdAt: d("2025-01-10"), payload: { amountCents: 10000 } },
            { type: "AUCTION_WON", createdAt: d("2025-01-20"), payload: { amountCents: 12000 } },
        ];
        const score = calculateExecutiveScore(events);
        expect(score.completionRate).toBeCloseTo(0.666666, 5);
        expect(score.onTimeRate).toBeCloseTo(0.5, 5);
        expect(score.breachRate).toBeCloseTo(0.333333, 5);
        expect(score.slotFillRate).toBe(0.8);
        expect(score.avgClearingPrice).toBe(11000);
        expect(score.reputationScore).toBeGreaterThan(0);
        expect(["STANDARD", "SELECT", "ELITE"]).toContain(score.publicLevel);
    });
    it("calculates deterministic owner score", () => {
        const events = [
            { type: "AUCTION_WON", createdAt: d("2025-01-01"), payload: { amountCents: 10000 } },
            { type: "AUCTION_WON", createdAt: d("2025-01-02"), payload: { amountCents: 11000 } },
            { type: "AUCTION_CANCELED", createdAt: d("2025-01-03"), payload: {} },
            { type: "PAYMENT_CONFIRMED", createdAt: d("2025-01-04"), payload: {} },
            { type: "CONTRACT_BREACH", createdAt: d("2025-01-05"), payload: { initiator: "OWNER" } },
            { type: "CONTRACT_COMPLETED", createdAt: d("2025-01-06"), payload: {} },
        ];
        const score = calculateOwnerScore(events);
        expect(score.paymentReliability).toBe(0.5);
        expect(score.cancellationRate).toBeCloseTo(0.333333, 5);
        expect(score.breachInitiationRate).toBe(0.5);
        expect(score.bidConsistencyScore).toBeGreaterThan(0);
        expect(score.internalRiskScore).toBeGreaterThanOrEqual(0);
        expect(score.internalRiskScore).toBeLessThanOrEqual(100);
    });
});

import { z } from "zod";
import type { ReputationHookPayload } from "../types/reputation.js";
import { ReputationService } from "./reputation.service.js";

const basePayloadSchema = z.object({
  source: z.enum(["AUCTION", "CONTRACT", "SLOT_SCHEDULER", "ESCROW"]),
  eventId: z.string().min(1),
  referenceId: z.string().min(1),
  occurredAt: z.coerce.date().optional(),
  executiveId: z.string().min(1).optional(),
  ownerId: z.string().min(1).optional(),
  amountCents: z.number().int().nonnegative().optional(),
  openedSlots: z.number().int().positive().optional(),
  unfilledSlots: z.number().int().nonnegative().optional(),
  onTime: z.boolean().optional(),
  initiator: z.enum(["OWNER", "EXECUTIVE"]).optional(),
});

export class ReputationEventHandlerService {
  constructor(private readonly reputationService = new ReputationService()) { }

  async onContractCompleted(payload: ReputationHookPayload) {
    const parsed = basePayloadSchema.parse(payload);

    return this.reputationService.applyEventAndRecalculate({
      source: parsed.source,
      eventId: parsed.eventId,
      type: "CONTRACT_COMPLETED",
      executiveId: parsed.executiveId,
      ownerId: parsed.ownerId,
      referenceId: parsed.referenceId,
      payload: {
        onTime: parsed.onTime ?? true,
      },
      createdAt: parsed.occurredAt,
    });
  }

  async onContractBreached(payload: ReputationHookPayload & { initiator?: "OWNER" | "EXECUTIVE" }) {
    const parsed = basePayloadSchema.parse(payload);

    return this.reputationService.applyEventAndRecalculate({
      source: parsed.source,
      eventId: parsed.eventId,
      type: "CONTRACT_BREACH",
      executiveId: parsed.executiveId,
      ownerId: parsed.ownerId,
      referenceId: parsed.referenceId,
      payload: {
        initiator: parsed.initiator ?? "EXECUTIVE",
      },
      createdAt: parsed.occurredAt,
    });
  }

  async onAuctionWon(payload: ReputationHookPayload) {
    const parsed = basePayloadSchema.parse(payload);

    return this.reputationService.applyEventAndRecalculate({
      source: parsed.source,
      eventId: parsed.eventId,
      type: "AUCTION_WON",
      executiveId: parsed.executiveId,
      ownerId: parsed.ownerId,
      referenceId: parsed.referenceId,
      payload: {
        amountCents: parsed.amountCents ?? 0,
      },
      createdAt: parsed.occurredAt,
    });
  }

  async onAuctionCanceled(payload: ReputationHookPayload) {
    const parsed = basePayloadSchema.parse(payload);

    return this.reputationService.applyEventAndRecalculate({
      source: parsed.source,
      eventId: parsed.eventId,
      type: "AUCTION_CANCELED",
      executiveId: parsed.executiveId,
      ownerId: parsed.ownerId,
      referenceId: parsed.referenceId,
      payload: {},
      createdAt: parsed.occurredAt,
    });
  }

  async onPaymentConfirmed(payload: ReputationHookPayload) {
    const parsed = basePayloadSchema.parse(payload);

    return this.reputationService.applyEventAndRecalculate({
      source: parsed.source,
      eventId: parsed.eventId,
      type: "PAYMENT_CONFIRMED",
      ownerId: parsed.ownerId,
      referenceId: parsed.referenceId,
      payload: {
        amountCents: parsed.amountCents ?? 0,
      },
      createdAt: parsed.occurredAt,
    });
  }

  async onLateCompletion(payload: ReputationHookPayload) {
    const parsed = basePayloadSchema.parse(payload);

    return this.reputationService.applyEventAndRecalculate({
      source: parsed.source,
      eventId: parsed.eventId,
      type: "LATE_COMPLETION",
      executiveId: parsed.executiveId,
      referenceId: parsed.referenceId,
      payload: {},
      createdAt: parsed.occurredAt,
    });
  }

  async onSlotUnfilled(payload: ReputationHookPayload & { unfilledSlots?: number }) {
    const parsed = basePayloadSchema.parse(payload);

    return this.reputationService.applyEventAndRecalculate({
      source: parsed.source,
      eventId: parsed.eventId,
      type: "SLOT_UNFILLED",
      executiveId: parsed.executiveId,
      referenceId: parsed.referenceId,
      payload: {
        openedSlots: parsed.openedSlots ?? 1,
        unfilledSlots: parsed.unfilledSlots ?? 1,
      },
      createdAt: parsed.occurredAt,
    });
  }
}

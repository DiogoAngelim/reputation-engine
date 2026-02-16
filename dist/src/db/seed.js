import { ReputationEventHandlerService } from "../services/event-handler.service.js";
const seed = async () => {
    const handlers = new ReputationEventHandlerService();
    await handlers.onAuctionWon({
        source: "AUCTION",
        eventId: "seed-auction-won-1",
        referenceId: "auction-001",
        executiveId: "exec-seed-1",
        ownerId: "owner-seed-1",
        amountCents: 100_000,
        occurredAt: new Date("2026-01-01T10:00:00.000Z"),
    });
    await handlers.onContractCompleted({
        source: "CONTRACT",
        eventId: "seed-contract-completed-1",
        referenceId: "contract-001",
        executiveId: "exec-seed-1",
        ownerId: "owner-seed-1",
        onTime: true,
        occurredAt: new Date("2026-01-02T10:00:00.000Z"),
    });
    await handlers.onPaymentConfirmed({
        source: "ESCROW",
        eventId: "seed-payment-confirmed-1",
        referenceId: "escrow-001",
        ownerId: "owner-seed-1",
        amountCents: 100_000,
        occurredAt: new Date("2026-01-03T10:00:00.000Z"),
    });
    await handlers.onAuctionWon({
        source: "AUCTION",
        eventId: "seed-auction-won-2",
        referenceId: "auction-002",
        executiveId: "exec-seed-1",
        ownerId: "owner-seed-1",
        amountCents: 110_000,
        occurredAt: new Date("2026-01-10T10:00:00.000Z"),
    });
    await handlers.onLateCompletion({
        source: "CONTRACT",
        eventId: "seed-late-completion-1",
        referenceId: "contract-002",
        executiveId: "exec-seed-1",
        occurredAt: new Date("2026-01-11T10:00:00.000Z"),
    });
    await handlers.onContractCompleted({
        source: "CONTRACT",
        eventId: "seed-contract-completed-2",
        referenceId: "contract-002",
        executiveId: "exec-seed-1",
        ownerId: "owner-seed-1",
        onTime: false,
        occurredAt: new Date("2026-01-11T10:00:01.000Z"),
    });
    await handlers.onSlotUnfilled({
        source: "SLOT_SCHEDULER",
        eventId: "seed-slot-unfilled-1",
        referenceId: "slot-001",
        executiveId: "exec-seed-1",
        openedSlots: 10,
        unfilledSlots: 2,
        occurredAt: new Date("2026-01-12T10:00:00.000Z"),
    });
    process.stdout.write("Seed events applied (idempotent by source+eventId).\n");
};
seed().catch((error) => {
    process.stderr.write(`Seed failed: ${error instanceof Error ? error.message : "unknown error"}\n`);
    process.exit(1);
});

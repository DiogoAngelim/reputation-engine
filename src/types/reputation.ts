export const REPUTATION_EVENT_TYPES = [
  "CONTRACT_COMPLETED",
  "CONTRACT_BREACH",
  "LATE_COMPLETION",
  "AUCTION_WON",
  "AUCTION_CANCELED",
  "PAYMENT_CONFIRMED",
  "SLOT_UNFILLED",
] as const;

export const EXECUTIVE_PUBLIC_LEVELS = ["STANDARD", "SELECT", "ELITE"] as const;

export type ReputationEventType = (typeof REPUTATION_EVENT_TYPES)[number];
export type ExecutivePublicLevel = (typeof EXECUTIVE_PUBLIC_LEVELS)[number];

export type EventSource = "AUCTION" | "CONTRACT" | "SLOT_SCHEDULER" | "ESCROW";

export interface ReputationHookPayload {
  source: EventSource;
  eventId: string;
  referenceId: string;
  occurredAt?: Date;
  executiveId?: string;
  ownerId?: string;
  amountCents?: number;
  openedSlots?: number;
  filledSlots?: number;
  onTime?: boolean;
}

export interface ExecutiveReputationView {
  executiveId: string;
  reputationScore: number;
  publicLevel: ExecutivePublicLevel;
  completionRate: number;
  onTimeRate: number;
  slotFillRate: number;
  avgClearingPrice: number;
}

export interface OwnerReputationView {
  ownerId: string;
  paymentReliability: number;
  cancellationRate: number;
  breachInitiationRate: number;
  bidConsistencyScore: number;
  engagementScore: number;
  internalRiskScore: number;
}

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const safeRate = (numerator, denominator) => denominator <= 0 ? 0 : clamp(numerator / denominator);
const round6 = (value) => Math.round(value * 1_000_000) / 1_000_000;
const round2 = (value) => Math.round(value * 100) / 100;
const getInt = (input) => {
    const parsed = Number(input);
    if (!Number.isFinite(parsed))
        return 0;
    return Math.trunc(parsed);
};
const getBool = (input) => input === true;
export const classifyPublicLevel = (reputationScore) => {
    if (reputationScore >= 85)
        return "ELITE";
    if (reputationScore >= 70)
        return "SELECT";
    return "STANDARD";
};
export const normalizeTo100 = (value) => round2(clamp(value, 0, 1) * 100);
export const calculatePriceTrendScore = (events) => {
    const wonEvents = events
        .filter((event) => event.type === "AUCTION_WON")
        .map((event) => ({ createdAt: event.createdAt, amountCents: getInt(event.payload.amountCents) }))
        .filter((event) => event.amountCents > 0)
        .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
    if (wonEvents.length === 0) {
        return { score: 0, avgClearingPrice: 0 };
    }
    const total = wonEvents.reduce((sum, current) => sum + current.amountCents, 0);
    const avgClearingPrice = Math.trunc(total / wonEvents.length);
    if (wonEvents.length === 1) {
        return { score: 0.5, avgClearingPrice };
    }
    const first = wonEvents[0].amountCents;
    const last = wonEvents[wonEvents.length - 1].amountCents;
    const trend = (last - first) / Math.max(first, 1);
    return { score: round6(clamp((trend + 1) / 2)), avgClearingPrice };
};
export const calculateExecutiveScore = (events) => {
    const completedContracts = events.filter((event) => event.type === "CONTRACT_COMPLETED").length;
    const breachedContracts = events.filter((event) => event.type === "CONTRACT_BREACH").length;
    const lateCompletions = events.filter((event) => event.type === "LATE_COMPLETION").length;
    const totalContracts = completedContracts + breachedContracts;
    const onTimeCompletions = Math.max(completedContracts - lateCompletions, 0);
    const openedSlots = events.reduce((sum, event) => {
        if (event.type !== "SLOT_UNFILLED")
            return sum;
        return sum + Math.max(getInt(event.payload.openedSlots), 0);
    }, 0);
    const unfilledSlots = events.reduce((sum, event) => {
        if (event.type !== "SLOT_UNFILLED")
            return sum;
        return sum + Math.max(getInt(event.payload.unfilledSlots), 1);
    }, 0);
    const filledSlots = Math.max(openedSlots - unfilledSlots, 0);
    const completionRate = round6(safeRate(completedContracts, totalContracts));
    const onTimeRate = round6(safeRate(onTimeCompletions, completedContracts));
    const breachRate = round6(safeRate(breachedContracts, totalContracts));
    const slotFillRate = round6(safeRate(filledSlots, openedSlots));
    const { score: priceTrendScore, avgClearingPrice } = calculatePriceTrendScore(events);
    const reliabilityScore = round6(clamp(completionRate * 0.35 + onTimeRate * 0.25 - breachRate * 0.25 + slotFillRate * 0.15));
    const reputationScore = normalizeTo100(clamp(reliabilityScore * 0.85 + priceTrendScore * 0.15));
    const publicLevel = classifyPublicLevel(reputationScore);
    return {
        completionRate,
        onTimeRate,
        breachRate,
        slotFillRate,
        avgClearingPrice,
        priceTrendScore,
        reliabilityScore,
        reputationScore,
        publicLevel,
    };
};
export const calculateOwnerScore = (events) => {
    const auctionWon = events.filter((event) => event.type === "AUCTION_WON");
    const auctionCanceled = events.filter((event) => event.type === "AUCTION_CANCELED");
    const payments = events.filter((event) => event.type === "PAYMENT_CONFIRMED");
    const ownerBreaches = events.filter((event) => {
        if (event.type !== "CONTRACT_BREACH")
            return false;
        return String(event.payload.initiator ?? "").toUpperCase() === "OWNER";
    }).length;
    const breachCandidates = events.filter((event) => event.type === "CONTRACT_BREACH" || event.type === "CONTRACT_COMPLETED").length;
    const paymentReliability = round6(safeRate(payments.length, auctionWon.length));
    const cancellationRate = round6(safeRate(auctionCanceled.length, auctionWon.length + auctionCanceled.length));
    const breachInitiationRate = round6(safeRate(ownerBreaches, breachCandidates));
    const wonAmounts = auctionWon
        .map((event) => getInt(event.payload.amountCents))
        .filter((amount) => amount > 0);
    const mean = wonAmounts.length > 0 ? wonAmounts.reduce((sum, value) => sum + value, 0) / wonAmounts.length : 0;
    const variance = wonAmounts.length > 0
        ? wonAmounts.reduce((sum, value) => sum + (value - mean) ** 2, 0) / wonAmounts.length
        : 0;
    const stdDev = Math.sqrt(variance);
    const cv = mean > 0 ? stdDev / mean : 1;
    const bidConsistencyScore = round6(clamp(1 - cv));
    const engagementScore = round6(clamp(events.length / 20));
    const internalRiskScore = normalizeTo100(clamp((1 - paymentReliability) * 0.35 +
        cancellationRate * 0.25 +
        breachInitiationRate * 0.2 +
        (1 - bidConsistencyScore) * 0.1 +
        (1 - engagementScore) * 0.1));
    return {
        paymentReliability,
        cancellationRate,
        breachInitiationRate,
        bidConsistencyScore,
        engagementScore,
        internalRiskScore,
    };
};
export const mapEventRecord = (type, createdAt, payload) => ({
    type,
    createdAt,
    payload,
});
export const eventPayloadFlag = (payload, key) => getBool(payload[key]);

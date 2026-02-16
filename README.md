# Reputation Engine

Backend API module for deterministic behavioral reputation scoring in a Brazil-only premium marketplace.

This module is event-driven, auditable, transactional, and uses only objective behavioral signals.

## 1) Scope and principles

### What this module does

- Stores normalized reputation data for executives (public) and owners (private/internal).
- Consumes events from Auction, Contract, Slot Scheduler, and Escrow domains.
- Recalculates affected scores on every accepted event.
- Exposes REST endpoints for public executive reputation and admin-only owner reputation.

### What this module explicitly does not do

- No subjective reviews.
- No star ratings.
- No text feedback.
- No manual editing of computed reputation values.
- No user-provided scoring values.

### Deterministic behavior guarantees

- Same ordered event history always produces the same score output.
- Currency is stored and processed in integer cents when applicable.
- Idempotency prevents duplicate event impact.
- Score writes occur inside database transactions.

---

## 2) Technology stack

- Runtime: Node.js
- Language: TypeScript
- API: Express REST
- Database: PostgreSQL
- ORM/query: Drizzle ORM + Drizzle Kit migrations
- Validation: Zod
- Tests: Vitest

---

## 3) High-level architecture

### Core layers

1. **Event ingestion layer**
   - Receives validated event payloads.
   - Converts domain hooks into internal reputation events.

2. **Application service layer**
   - Applies idempotent event insert.
   - Triggers executive and/or owner recalculation.

3. **Scoring engine**
   - Computes deterministic metrics and normalized scores.
   - Classifies executive public level.

4. **Persistence layer**
   - Stores event ledger and materialized score tables.
   - Uses transaction boundaries for consistency.

5. **Presentation layer (REST)**
   - Public executive endpoint.
   - Admin-only internal owner endpoint.

### Event flow summary

1. Event arrives at internal route.
2. Payload is validated by schema.
3. Event is inserted into `reputation_events` with idempotency key (`source`, `event_id`).
4. If insert is new, recalculation runs for impacted entity/entities.
5. Upsert updates `executive_reputations` and/or `owner_reputations`.

---

## 4) Data model (Drizzle)

### `reputation_events`

Audit/event ledger table.

- `id` UUID primary key
- `source` text (`AUCTION`, `CONTRACT`, `SLOT_SCHEDULER`, `ESCROW`)
- `event_id` text
- `type` enum:
  - `CONTRACT_COMPLETED`
  - `CONTRACT_BREACH`
  - `LATE_COMPLETION`
  - `AUCTION_WON`
  - `AUCTION_CANCELED`
  - `PAYMENT_CONFIRMED`
  - `SLOT_UNFILLED`
- `executive_id` nullable text
- `owner_id` nullable text
- `reference_id` text
- `payload` jsonb
- `created_at` timestamptz

**Uniqueness/idempotency constraint**

- Unique index on (`source`, `event_id`)

### `executive_reputations` (PUBLIC)

- `id` UUID primary key
- `executive_id` unique text
- `completion_rate` numeric(8,6)
- `on_time_rate` numeric(8,6)
- `breach_rate` numeric(8,6)
- `slot_fill_rate` numeric(8,6)
- `avg_clearing_price` integer (cents)
- `price_trend_score` numeric(8,6)
- `reliability_score` numeric(8,6)
- `reputation_score` numeric(6,2) normalized 0–100
- `public_level` enum (`STANDARD`, `SELECT`, `ELITE`)
- `updated_at` timestamptz

### `owner_reputations` (PRIVATE / INTERNAL)

- `id` UUID primary key
- `owner_id` unique text
- `payment_reliability` numeric(8,6)
- `cancellation_rate` numeric(8,6)
- `breach_initiation_rate` numeric(8,6)
- `bid_consistency_score` numeric(8,6)
- `engagement_score` numeric(8,6)
- `internal_risk_score` numeric(6,2) normalized 0–100
- `updated_at` timestamptz

---

## 5) Scoring model (deterministic)

Rates are clamped to [0,1].

### Executive metrics

1. **Completion Rate**
   - completedContracts / totalContracts

2. **On-Time Rate**
   - onTimeCompletions / completedContracts
   - `onTimeCompletions = max(completedContracts - lateCompletions, 0)`

3. **Breach Rate**
   - breachedContracts / totalContracts

4. **Slot Fill Rate**
   - filledSlots / openedSlots
   - from `SLOT_UNFILLED` payload with `openedSlots` and `unfilledSlots`

5. **Price Trend Score**
   - Uses ordered `AUCTION_WON` events and integer `amountCents`.
   - If no auctions: score = 0
   - If one auction: score = 0.5
   - Else: trend = (last - first) / max(first, 1)
   - score = clamp((trend + 1) / 2)

6. **Reliability Score**

\[
\text{reliability} = 0.35\cdot completion + 0.25\cdot onTime - 0.25\cdot breach + 0.15\cdot slotFill
\]

7. **Final Executive Reputation (0–100)**

\[
\text{reputationRaw} = 0.85\cdot reliability + 0.15\cdot priceTrend
\]

\[
\text{reputationScore} = round2(clamp(reputationRaw,0,1) \cdot 100)
\]

8. **Public Level classification**

- `ELITE` if score >= 85
- `SELECT` if score >= 70 and < 85
- `STANDARD` if score < 70

### Owner internal metrics

1. **Payment Reliability**
   - paymentConfirmedCount / auctionWonCount

2. **Cancellation Rate**
   - auctionCanceledCount / (auctionWonCount + auctionCanceledCount)

3. **Breach Initiation Rate**
   - ownerInitiatedBreaches / (contractBreaches + contractCompletions)

4. **Bid Consistency Score**
   - Based on coefficient of variation of won auction amounts.
   - `bidConsistency = clamp(1 - cv)`

5. **Engagement Score**
   - `clamp(totalOwnerEvents / 20)`

6. **Internal Risk Score (0–100)**

\[
\text{riskRaw} = 0.35\cdot(1-paymentReliability) + 0.25\cdot cancellationRate + 0.20\cdot breachInitiationRate + 0.10\cdot(1-bidConsistency) + 0.10\cdot(1-engagement)
\]

\[
\text{internalRiskScore} = round2(clamp(riskRaw,0,1)\cdot 100)
\]

---

## 6) Event handlers (domain hooks)

Implemented hook methods:

- `onContractCompleted()`
- `onContractBreached()`
- `onAuctionWon()`
- `onAuctionCanceled()`
- `onPaymentConfirmed()`
- `onLateCompletion()`
- `onSlotUnfilled()`

Each accepted event:

1. Writes one `reputation_events` row.
2. Recalculates affected entity scores.
3. Upserts score row(s).
4. Runs inside transaction.
5. Is idempotent by (`source`, `event_id`).

### Sources

- Auction module (`AUCTION`)
- Contract module (`CONTRACT`)
- Slot scheduler (`SLOT_SCHEDULER`)
- Escrow module (`ESCROW`)

---

## 7) REST API

Base routes are mounted in app as:

- Public/internal reputation read APIs: `/reputation`
- Event ingestion APIs: `/internal/reputation-events`

### Health

- `GET /health`
- Response: `{ "status": "ok" }`

### Public endpoint

#### `GET /reputation/executive/:id`

Returns executive public reputation view:

- `reputationScore`
- `publicLevel`
- `completionRate`
- `onTimeRate`
- `slotFillRate`
- `avgClearingPrice`

### Admin-only endpoints

Admin auth header:

- `x-admin-token: <ADMIN_API_TOKEN>`

#### `GET /reputation/owner/:id`

Returns full internal owner reputation object.

#### `POST /reputation/recalculate/:executiveId`

Forces recomputation from stored event history for that executive.

### Internal event ingestion endpoints (admin-only)

- `POST /internal/reputation-events/contract/completed`
- `POST /internal/reputation-events/contract/breached`
- `POST /internal/reputation-events/auction/won`
- `POST /internal/reputation-events/auction/canceled`
- `POST /internal/reputation-events/escrow/payment-confirmed`
- `POST /internal/reputation-events/contract/late-completion`
- `POST /internal/reputation-events/slot/unfilled`

Event responses return:

- `{ "applied": true }` when new event inserted and applied
- `{ "applied": false }` when duplicate event ignored (idempotent)

---

## 8) Security and access model

### Public visibility

- Executive reputation (`executive_reputations`) is public via endpoint.

### Private/internal visibility

- Owner reputation (`owner_reputations`) is never public.
- Owner endpoint is protected with admin middleware.

### Operational controls

- Missing `ADMIN_API_TOKEN` causes admin route failure (500 config error).
- Invalid/missing admin token causes 403.

---

## 9) Consistency, transactions, and idempotency

### Transaction scope

Every event application and recalculation is wrapped in one repository transaction:

- insert event (conflict-safe)
- fetch relevant history
- compute deterministic score
- upsert reputation row(s)

### Idempotency contract

- Key = (`source`, `event_id`)
- Duplicate key does not alter scores
- Service returns `applied: false` on duplicates

---

## 10) Setup and local run

### Environment variables

Required:

- `DATABASE_URL` (PostgreSQL connection string)

Required for admin routes:

- `ADMIN_API_TOKEN`

Optional:

- `PORT` (default `3000`)

Bootstrap from example:

```bash
cp .env.example .env
```

### Install

```bash
npm install
```

### Generate migration (already done for initial schema)

```bash
npm run db:generate
```

### Apply migration

```bash
npm run db:migrate
```

### Seed deterministic demo data

```bash
npm run db:seed
```

### Run app

```bash
npm run dev
```

### Run app (production mode)

```bash
npm run build && npm start
```

### Build

```bash
npm run build
```

### Tests

```bash
npm test
```

---

## 11) Testing coverage

Current tests validate:

1. Score normalization and public-level thresholds.
2. Deterministic executive and owner scoring outputs.
3. Idempotency behavior (`source + eventId`) in service flow.

Test files:

- `tests/scoring.service.test.ts`
- `tests/event-handler.service.test.ts`

---

## 12) Important implementation notes

1. **Currency discipline**
   - Auction/payment amounts are consumed as `amountCents` integers.
   - Average clearing price is persisted as integer cents.

2. **On-time logic**
   - On-time rate currently derives from `CONTRACT_COMPLETED` and `LATE_COMPLETION` event counts.
   - `onTime` field in completed payload is stored but not used directly in formula.

3. **No manual score editing path**
   - Scores are written only by recomputation logic from event history.

4. **Auditable origin**
   - Every score update is explainable by corresponding immutable event ledger entries.

---

## 13) Operational examples

### Public executive lookup

```bash
curl -s http://localhost:3000/reputation/executive/exec-seed-1
```

### Internal owner lookup (admin)

```bash
curl -s \
  -H "x-admin-token: ${ADMIN_API_TOKEN}" \
  http://localhost:3000/reputation/owner/owner-seed-1
```

### Ingest auction won event (admin)

```bash
curl -s -X POST \
  -H "content-type: application/json" \
  -H "x-admin-token: ${ADMIN_API_TOKEN}" \
  -d '{
    "source": "AUCTION",
    "eventId": "auction-evt-1001",
    "referenceId": "auction-1001",
    "executiveId": "exec-123",
    "ownerId": "owner-456",
    "amountCents": 125000
  }' \
  http://localhost:3000/internal/reputation-events/auction/won
```

---

## 14) File map

- App bootstrap: `src/app.ts`, `src/server.ts`
- Database schema/client: `src/db/schema.ts`, `src/db/client.ts`
- Seed script: `src/db/seed.ts`
- Types: `src/types/reputation.ts`
- Scoring engine: `src/services/scoring.service.ts`
- Transactional repository: `src/services/reputation.repository.ts`
- Service orchestration: `src/services/reputation.service.ts`
- Event handlers: `src/services/event-handler.service.ts`
- Public/admin APIs: `src/controllers/reputation.controller.ts`
- Internal event APIs: `src/controllers/reputation-events.controller.ts`
- Admin middleware: `src/middleware/adminAuth.ts`
- Tests: `tests/*.test.ts`
- Migration artifacts: `drizzle/*`

---

## 15) Production checklist

- Configure PostgreSQL with backups and retention.
- Protect admin token distribution and rotation.
- Ensure all producer modules generate globally unique `eventId` per source.
- Add API gateway/network policy so only trusted internal systems call event ingestion routes.
- Monitor conflict rate on idempotency index to detect producer retries/failures.
- Add observability around event latency and recalculation time.

---

If you keep this module as an internal service, the recommended integration pattern is asynchronous domain event publishing from Auction/Contract/Slot/Escrow services into the ingestion routes, preserving one stable `eventId` per source event for strict idempotency.

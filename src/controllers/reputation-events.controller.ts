import { Router } from "express";
import { adminAuth } from "../middleware/adminAuth.js";
import { ReputationEventHandlerService } from "../services/event-handler.service.js";

export const reputationEventsRouter = Router();
const handlers = new ReputationEventHandlerService();

reputationEventsRouter.post("/contract/completed", adminAuth, async (req, res) => {
  const result = await handlers.onContractCompleted(req.body);
  res.json(result);
});

reputationEventsRouter.post("/contract/breached", adminAuth, async (req, res) => {
  const result = await handlers.onContractBreached(req.body);
  res.json(result);
});

reputationEventsRouter.post("/auction/won", adminAuth, async (req, res) => {
  const result = await handlers.onAuctionWon(req.body);
  res.json(result);
});

reputationEventsRouter.post("/auction/canceled", adminAuth, async (req, res) => {
  const result = await handlers.onAuctionCanceled(req.body);
  res.json(result);
});

reputationEventsRouter.post("/escrow/payment-confirmed", adminAuth, async (req, res) => {
  const result = await handlers.onPaymentConfirmed(req.body);
  res.json(result);
});

reputationEventsRouter.post("/contract/late-completion", adminAuth, async (req, res) => {
  const result = await handlers.onLateCompletion(req.body);
  res.json(result);
});

reputationEventsRouter.post("/slot/unfilled", adminAuth, async (req, res) => {
  const result = await handlers.onSlotUnfilled(req.body);
  res.json(result);
});

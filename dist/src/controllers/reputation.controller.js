import { Router } from "express";
import { ReputationService } from "../services/reputation.service.js";
import { adminAuth } from "../middleware/adminAuth.js";
export const reputationRouter = Router();
const reputationService = new ReputationService();
reputationRouter.get("/executive/:id", async (req, res) => {
    const result = await reputationService.getExecutivePublicReputation(req.params.id);
    if (!result) {
        res.status(404).json({ error: "executive reputation not found" });
        return;
    }
    res.json(result);
});
reputationRouter.get("/owner/:id", adminAuth, async (req, res) => {
    const result = await reputationService.getOwnerInternalReputation(req.params.id);
    if (!result) {
        res.status(404).json({ error: "owner reputation not found" });
        return;
    }
    res.json(result);
});
reputationRouter.post("/recalculate/:executiveId", adminAuth, async (req, res) => {
    const result = await reputationService.recalculateExecutive(req.params.executiveId);
    res.json(result);
});

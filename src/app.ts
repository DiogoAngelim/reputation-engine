import express from "express";
import { reputationRouter } from "./controllers/reputation.controller.js";
import { reputationEventsRouter } from "./controllers/reputation-events.controller.js";

export const app = express();

app.use(express.json({ limit: "200kb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/reputation", reputationRouter);
app.use("/internal/reputation-events", reputationEventsRouter);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof Error) {
    res.status(400).json({ error: error.message });
    return;
  }

  res.status(500).json({ error: "internal server error" });
});

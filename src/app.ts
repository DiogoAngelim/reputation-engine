import express from "express";
import { ZodError } from "zod";
import { reputationRouter } from "./controllers/reputation.controller.js";
import { reputationEventsRouter } from "./controllers/reputation-events.controller.js";

export const app = express();

app.use(express.json({ limit: "200kb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/reputation", reputationRouter);
app.use("/internal/reputation-events", reputationEventsRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "not found" });
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: "invalid request payload",
      details: error.issues,
    });
    return;
  }

  if (error instanceof Error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(500).json({ error: "internal server error" });
});

import type { Request, Response, NextFunction } from "express";

export const adminAuth = (req: Request, res: Response, next: NextFunction): void => {
  const expected = process.env.ADMIN_API_TOKEN;

  if (!expected) {
    res.status(500).json({ error: "ADMIN_API_TOKEN not configured" });
    return;
  }

  const provided = req.header("x-admin-token");

  if (!provided || provided !== expected) {
    res.status(403).json({ error: "admin access required" });
    return;
  }

  next();
};

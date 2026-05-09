import type { Response } from "express";
import { prisma } from "@crypto-analytics/database";
import type { AuthenticatedRequest } from "../middleware/auth.js";

/**
 * GET /api/v1/alerts
 * Fetches user alerts from the live Postgres database.
 */
export const getUserAlerts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const alerts = await prisma.alert.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    res.json(alerts);
  } catch (error) {
    console.error("❌ Database Error (Alerts):", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

import type { Request, Response } from "express";
import { prisma } from "@crypto-analytics/database";

/**
 * GET /api/v1/alerts
 * Fetches recent alerts from the live Postgres database.
 */
export const getUserAlerts = async (_req: Request, res: Response): Promise<void> => {
  try {
    const alerts = await prisma.alert.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    res.json(alerts);
  } catch (error) {
    console.error("❌ Database Error (Alerts):", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

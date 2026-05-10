import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
import type { RequestHandler, Request, Response, NextFunction } from "express";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { rateLimit } from "express-rate-limit";
import { createProxyMiddleware } from "http-proxy-middleware";

import { getMarketHistory, getTickers } from "./controllers/market.js";
import { getUserAlerts } from "./controllers/alerts.js";
import { createLogger } from "@crypto-analytics/contracts";
import crypto from "crypto";
import { redis } from "./redis.js";

const app = express();
const logger = createLogger("api-gateway");
const PORT = process.env.PORT || 4000;

// ── Security & Middleware ──────────────────────────────────
app.set("trust proxy", 1);
app.use(helmet({
  hsts: {
    maxAge: 31536000,
    preload: true,
  }
}));
const corsOrigin = process.env.CORS_ORIGIN || "*";
if (process.env.NODE_ENV === "production" && corsOrigin === "*") {
  throw new Error("CORS_ORIGIN must be explicitly set in production (currently '*')");
}
app.use(cors({ origin: corsOrigin }));
app.use(compression());

// ── Request ID & Logging Middleware ────────────────────────
app.use((req, res, next) => {
  req.headers["x-request-id"] = req.headers["x-request-id"] || crypto.randomUUID();
  res.setHeader("x-request-id", req.headers["x-request-id"]);
  logger.info({ reqId: req.headers["x-request-id"], method: req.method, url: req.url }, "Incoming Request");
  next();
});


// ── Body Parsing (for non-proxied routes) ──────────────────
app.use(express.json({ limit: "10kb" }));

// ── Rate Limiting ──────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});
app.use("/api", limiter);

// ── Public Market API Routes ───
app.get("/api/v1/market/history/:symbol", getMarketHistory);
app.get("/api/v1/market/candles", getMarketHistory);
app.get("/api/v1/market/tickers", getTickers);

// ── Protected User Routes ──────────────────────────────────
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>): RequestHandler => {
  return (req, res, next) => fn(req, res, next).catch(next);
};
app.get("/api/v1/alerts", asyncHandler(getUserAlerts));

// ── Health Check ───────────────────────────────────────────
app.get("/health", async (_req, res) => {
  try {
    const redisHealthy = redis.status === "ready" || redis.status === "connecting";
    if (!redisHealthy) {
      return res.status(503).json({
        status: "unhealthy",
        service: "api-gateway",
        redis: redis.status,
        timestamp: new Date().toISOString(),
      });
    }
    res.json({
      status: "healthy",
      service: "api-gateway",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch {
    res.status(503).json({ status: "unhealthy", service: "api-gateway" });
  }
});

app.get("/api/v1", (_req, res) => {
  res.json({ message: "Crypto Analytics API v1", version: "0.0.1" });
});

// ── Global Error Handler ───────────────────────────────────
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    logger.error({ err, reqId: req.headers["x-request-id"] }, "Gateway Error");
    res.status(500).json({ error: "Internal Server Error", reqId: req.headers["x-request-id"] });
  }
);

// ── Start ──────────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info(`🚀 API Gateway listening on http://localhost:${PORT}`);
  logger.info(`   Health:      http://localhost:${PORT}/health`);
});

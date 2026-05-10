// ────────────────────────────────────────────────────────────
// Composition Root: main.ts
// ────────────────────────────────────────────────────────────
// This is the ONLY file that knows about ALL layers.
// It creates concrete implementations, injects them into
// use cases, mounts the Express router, and starts the server.
//
// Dependency flow (Clean Architecture):
//
//   main.ts (wiring)
//     └→ presentation/controllers (validate + dispatch)
//         └→ application/use-cases (orchestrate business logic)
//             └→ domain/entities (pure business rules)
//
//   main.ts (wiring)
//     └→ infrastructure/* (concrete implementations)
//         └→ satisfy domain/repositories/* interfaces
// ────────────────────────────────────────────────────────────

import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
import express from "express";
import cors from "cors";
import helmet from "helmet";

// ── Shared Database (Prisma singleton from monorepo package) ─
import { prisma, disconnect } from "@crypto-analytics/database";

// ── Infrastructure ─────────────────────────────────────────
import { PrismaUserRepository } from "./infrastructure/database/PrismaUserRepository.js";
import { JwtTokenService } from "./infrastructure/security/JwtTokenService.js";
import { BcryptPasswordHasher } from "./infrastructure/security/BcryptPasswordHasher.js";

// ── Application ────────────────────────────────────────────
import { RegisterUser } from "./application/use-cases/RegisterUser.js";
import { LoginUser } from "./application/use-cases/LoginUser.js";

// ── Presentation ───────────────────────────────────────────
import { createAuthRouter } from "./presentation/controllers/AuthController.js";

// ── Configuration ──────────────────────────────────────────
const config = {
  port: parseInt(process.env.AUTH_PORT || "4001", 10),
  corsOrigin: (() => {
    const origin = process.env.CORS_ORIGIN || "*";
    if (process.env.NODE_ENV === "production" && origin === "*") {
      throw new Error("CORS_ORIGIN must be explicitly set in production (currently '*')");
    }
    return origin;
  })(),
  jwt: {
    secret: (() => {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        throw new Error("JWT_SECRET environment variable is required");
      }
      return secret;
    })(),
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },
  bcrypt: {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || "12", 10),
  },
};

// ── Bootstrap ──────────────────────────────────────────────
async function bootstrap(): Promise<void> {
  console.log("🚀 Auth Service starting (Clean Architecture)...");

  // ── 1. Create Infrastructure ──────────────────────────
  const userRepository = new PrismaUserRepository(prisma);
  const tokenService = new JwtTokenService(config.jwt.secret, config.jwt.expiresIn);
  const passwordHasher = new BcryptPasswordHasher(config.bcrypt.saltRounds);

  console.log("✅ Infrastructure initialized (Prisma + JWT + Bcrypt)");

  // ── 2. Create Use Cases (inject dependencies) ─────────
  const registerUser = new RegisterUser({
    userRepository,
    tokenService,
    passwordHasher,
  });

  const loginUser = new LoginUser({
    userRepository,
    tokenService,
    passwordHasher,
  });

  console.log("✅ Use cases initialized");

  // ── 3. Create Express App ─────────────────────────────
  const app = express();

  // Security middleware
  app.set("trust proxy", 1);
  app.use(helmet({
    hsts: {
      maxAge: 31536000,
      preload: true,
    }
  }));
  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json({ limit: "1mb" }));

  // Mount auth routes
  const authRouter = createAuthRouter({ registerUser, loginUser });
  app.use("/auth", authRouter);

  // Root health check
  app.get("/health", (_req, res) => {
    res.json({
      status: "healthy",
      service: "auth-service",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // ── 4. Start Server ───────────────────────────────────
  const server = app.listen(config.port, () => {
    console.log(`🚀 Auth Service listening on http://localhost:${config.port}`);
    console.log(`   POST /auth/register — Create account`);
    console.log(`   POST /auth/login    — Authenticate`);
    console.log(`   GET  /auth/health   — Health check`);
  });

  // ── 5. Graceful Shutdown ──────────────────────────────
  async function shutdown(signal: string): Promise<void> {
    console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
    server.close();
    await disconnect();
    process.exit(0);
  }

  process.on("SIGINT", async () => await shutdown("SIGINT"));
  process.on("SIGTERM", async () => await shutdown("SIGTERM"));
}

bootstrap().catch((err) => {
  console.error("💥 Fatal error:", err);
  process.exit(1);
});

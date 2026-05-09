// ────────────────────────────────────────────────────────────
// Presentation: AuthController
// ────────────────────────────────────────────────────────────
// Express router that validates incoming requests with Zod
// and passes them to the Application Use Cases.
//
// Responsibilities:
// 1. Parse request body
// 2. Validate with Zod DTOs (validation at the edge)
// 3. Call the appropriate use case
// 4. Map results/errors to HTTP responses
//
// This controller has NO business logic.

import { Router, type Request, type Response } from "express";
import { RegisterSchema, LoginSchema } from "../../application/dtos/AuthDTO.js";
import type { RegisterUser } from "../../application/use-cases/RegisterUser.js";
import type { LoginUser } from "../../application/use-cases/LoginUser.js";
import { AppError } from "../../application/errors/AppError.js";

interface AuthControllerDeps {
  registerUser: RegisterUser;
  loginUser: LoginUser;
}

export function createAuthRouter(deps: AuthControllerDeps): Router {
  const router = Router();

  // ── POST /auth/register ──────────────────────────────────
  router.post("/register", async (req: Request, res: Response) => {
    try {
      // 1. Validate at the edge
      const result = RegisterSchema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({
          error: "Validation failed",
          details: result.error.flatten().fieldErrors,
        });
        return;
      }

      // 2. Execute use case
      const data = await deps.registerUser.execute(result.data);

      // 3. Return response
      res.status(201).json({
        message: "User registered successfully",
        user: data.user,
        token: data.token,
      });
    } catch (err) {
      handleError(res, err);
    }
  });

  // ── POST /auth/login ─────────────────────────────────────
  router.post("/login", async (req: Request, res: Response) => {
    try {
      // 1. Validate at the edge
      const result = LoginSchema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({
          error: "Validation failed",
          details: result.error.flatten().fieldErrors,
        });
        return;
      }

      // 2. Execute use case
      const data = await deps.loginUser.execute(result.data);

      // 3. Return response
      res.status(200).json({
        message: "Login successful",
        user: data.user,
        token: data.token,
      });
    } catch (err) {
      handleError(res, err);
    }
  });

  // ── GET /auth/health ─────────────────────────────────────
  router.get("/health", (_req: Request, res: Response) => {
    res.json({
      status: "healthy",
      service: "auth-service",
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}

// ── Error Mapping ──────────────────────────────────────────
// Maps AppError status codes to HTTP responses.
function handleError(res: Response, err: unknown): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  console.error("[AuthController] Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
}

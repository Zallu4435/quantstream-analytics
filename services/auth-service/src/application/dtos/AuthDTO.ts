// ────────────────────────────────────────────────────────────
// Application DTO: Auth Schemas
// ────────────────────────────────────────────────────────────
// Zod schemas for validating incoming REST requests.
// Validation happens at the EDGE (presentation layer).

import { z } from "zod";

export const RegisterSchema = z.object({
  email: z
    .string()
    .email("Invalid email format")
    .transform((e) => e.toLowerCase().trim()),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters"),
  name: z.string().min(1).max(100).optional(),
});

export type RegisterDTO = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z
    .string()
    .email("Invalid email format")
    .transform((e) => e.toLowerCase().trim()),
  password: z
    .string()
    .min(1, "Password is required"),
});

export type LoginDTO = z.infer<typeof LoginSchema>;

// ────────────────────────────────────────────────────────────
// Domain Repository Interface: IUserRepository
// ────────────────────────────────────────────────────────────
// Defines the contract for user persistence.
// Infrastructure layer provides the concrete Prisma implementation.

import type { User } from "../entities/User.js";

export interface CreateUserData {
  email: string;
  passwordHash: string;
  name?: string;
}

export interface IUserRepository {
  /** Find a user by email */
  findByEmail(email: string): Promise<User | null>;

  /** Find a user by ID */
  findById(id: string): Promise<User | null>;

  /** Create a new user and return the created entity */
  create(data: CreateUserData): Promise<User>;

  /** Check if an email is already registered */
  existsByEmail(email: string): Promise<boolean>;
}

// ────────────────────────────────────────────────────────────
// Infrastructure: BcryptPasswordHasher
// ────────────────────────────────────────────────────────────
// Concrete implementation of IPasswordHasher using bcryptjs.
// This is the ONLY file that knows about bcrypt.

import bcrypt from "bcryptjs";
import type { IPasswordHasher } from "../../domain/repositories/IPasswordHasher.js";

export class BcryptPasswordHasher implements IPasswordHasher {
  constructor(private readonly saltRounds: number = 12) {}

  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  async compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}

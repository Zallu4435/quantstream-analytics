// ────────────────────────────────────────────────────────────
// Application Use Case: RegisterUser
// ────────────────────────────────────────────────────────────
// Single Responsibility: Create a new user account.
//
// Flow:
// 1. Check if email is already taken
// 2. Hash the password
// 3. Persist the user
// 4. Generate and return a JWT
//
// NEVER imports bcryptjs, jsonwebtoken, or Prisma directly.

import type { IUserRepository } from "../../domain/repositories/IUserRepository.js";
import type { ITokenService } from "../../domain/repositories/ITokenService.js";
import type { IPasswordHasher } from "../../domain/repositories/IPasswordHasher.js";
import type { RegisterDTO } from "../dtos/AuthDTO.js";
import { AppError } from "../errors/AppError.js";

interface RegisterUserDeps {
  userRepository: IUserRepository;
  tokenService: ITokenService;
  passwordHasher: IPasswordHasher;
}

export interface RegisterResult {
  user: { id: string; email: string; name: string | null; createdAt: Date };
  token: string;
}

export class RegisterUser {
  private readonly userRepo: IUserRepository;
  private readonly tokenService: ITokenService;
  private readonly hasher: IPasswordHasher;

  constructor(deps: RegisterUserDeps) {
    this.userRepo = deps.userRepository;
    this.tokenService = deps.tokenService;
    this.hasher = deps.passwordHasher;
  }

  async execute(dto: RegisterDTO): Promise<RegisterResult> {
    // 1. Check uniqueness
    const exists = await this.userRepo.existsByEmail(dto.email);
    if (exists) {
      throw new AppError("Email is already registered", 409);
    }

    // 2. Hash password
    const passwordHash = await this.hasher.hash(dto.password);

    // 3. Persist user
    const user = await this.userRepo.create({
      email: dto.email,
      passwordHash,
      name: dto.name,
    });

    // 4. Generate token
    const token = this.tokenService.generateToken({
      userId: user.id,
      email: user.email,
    });

    return {
      user: user.toPublicJSON(),
      token,
    };
  }
}

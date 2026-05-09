// ────────────────────────────────────────────────────────────
// Application Use Case: LoginUser
// ────────────────────────────────────────────────────────────
// Single Responsibility: Authenticate a user with credentials.
//
// Flow:
// 1. Find user by email
// 2. Verify password
// 3. Generate and return a JWT

import type { IUserRepository } from "../../domain/repositories/IUserRepository.js";
import type { ITokenService } from "../../domain/repositories/ITokenService.js";
import type { IPasswordHasher } from "../../domain/repositories/IPasswordHasher.js";
import type { LoginDTO } from "../dtos/AuthDTO.js";
import { AppError } from "../errors/AppError.js";

interface LoginUserDeps {
  userRepository: IUserRepository;
  tokenService: ITokenService;
  passwordHasher: IPasswordHasher;
}

export interface LoginResult {
  user: { id: string; email: string; name: string | null; createdAt: Date };
  token: string;
}

export class LoginUser {
  private readonly userRepo: IUserRepository;
  private readonly tokenService: ITokenService;
  private readonly hasher: IPasswordHasher;

  constructor(deps: LoginUserDeps) {
    this.userRepo = deps.userRepository;
    this.tokenService = deps.tokenService;
    this.hasher = deps.passwordHasher;
  }

  async execute(dto: LoginDTO): Promise<LoginResult> {
    // 1. Find user
    const user = await this.userRepo.findByEmail(dto.email);
    if (!user) {
      // Use generic message to prevent email enumeration
      throw new AppError("Invalid email or password", 401);
    }

    // 2. Verify password
    const isValid = await this.hasher.compare(dto.password, user.passwordHash);
    if (!isValid) {
      throw new AppError("Invalid email or password", 401);
    }

    // 3. Generate token
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

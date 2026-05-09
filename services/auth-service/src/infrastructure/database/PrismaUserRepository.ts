// ────────────────────────────────────────────────────────────
// Infrastructure: PrismaUserRepository
// ────────────────────────────────────────────────────────────
// Concrete implementation of IUserRepository using the shared
// @crypto-analytics/database Prisma client.
//
// This is the ONLY file that knows about Prisma for users.

import type { PrismaClient } from "@prisma/client";
import { User } from "../../domain/entities/User.js";
import type {
  IUserRepository,
  CreateUserData,
} from "../../domain/repositories/IUserRepository.js";

function mapToUser(record: {
  id: string;
  email: string;
  passwordHash: string;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
}): User {
  return new User({
    id: record.id,
    email: record.email,
    passwordHash: record.passwordHash,
    name: record.name,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByEmail(email: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!record) return null;
    return mapToUser(record);
  }

  async findById(id: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!record) return null;
    return mapToUser(record);
  }

  async create(data: CreateUserData): Promise<User> {
    const record = await this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        name: data.name ?? null,
      },
    });

    return mapToUser(record);
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { email },
    });
    return count > 0;
  }
}

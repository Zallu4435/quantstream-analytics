// ────────────────────────────────────────────────────────────
// Infrastructure: JwtTokenService
// ────────────────────────────────────────────────────────────
// Concrete implementation of ITokenService using jsonwebtoken.
// This is the ONLY file that knows about JWT.

import jwt from "jsonwebtoken";
import type {
  ITokenService,
  TokenPayload,
} from "../../domain/repositories/ITokenService.js";

export class JwtTokenService implements ITokenService {
  constructor(
    private readonly secret: string,
    private readonly expiresIn: string | number = "7d"
  ) { }

  generateToken(payload: TokenPayload): string {
    return jwt.sign(payload, this.secret, {
      expiresIn: this.expiresIn as jwt.SignOptions["expiresIn"],
    });
  }

  verifyToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, this.secret) as TokenPayload;
      return decoded;
    } catch {
      return null;
    }
  }
}

// ────────────────────────────────────────────────────────────
// Domain Service Interface: ITokenService
// ────────────────────────────────────────────────────────────
// Defines the contract for token generation and verification.
// Use cases depend on this interface, not on jsonwebtoken directly.

export interface TokenPayload {
  userId: string;
  email: string;
}

export interface ITokenService {
  /** Generate an access token for a user */
  generateToken(payload: TokenPayload): string;

  /** Verify a token and return the decoded payload */
  verifyToken(token: string): TokenPayload | null;
}

// ────────────────────────────────────────────────────────────
// Domain Service Interface: IPasswordHasher
// ────────────────────────────────────────────────────────────
// Defines the contract for password hashing and comparison.
// Use cases depend on this interface, not on bcryptjs directly.

export interface IPasswordHasher {
  /** Hash a plaintext password */
  hash(password: string): Promise<string>;

  /** Compare a plaintext password against a hash */
  compare(password: string, hash: string): Promise<boolean>;
}

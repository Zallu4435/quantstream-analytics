// ────────────────────────────────────────────────────────────
// Domain Entity: User
// ────────────────────────────────────────────────────────────
// Pure business object — NO framework dependencies.
// Represents an authenticated user in the system.

export interface UserProps {
  id: string;
  email: string;
  passwordHash: string;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class User {
  readonly id: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly name: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: UserProps) {
    this.id = props.id;
    this.email = props.email;
    this.passwordHash = props.passwordHash;
    this.name = props.name;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  /** Serialize to a safe public representation (no passwordHash) */
  toPublicJSON(): { id: string; email: string; name: string | null; createdAt: Date } {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      createdAt: this.createdAt,
    };
  }
}

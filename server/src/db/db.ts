/**
 * The database seam.
 *
 * Deliberately async even though the only implementation today
 * (node:sqlite) is synchronous. A synchronous interface could never be
 * backed by Postgres, which would make the "swappable store" claim false.
 * Wrapping sync calls in promises costs nothing; the reverse is impossible.
 *
 * SQL is written with `?` placeholders. A Postgres implementation
 * translates those to $1..$n — a small, well-understood rewrite, and the
 * only dialect difference the repositories are allowed to rely on.
 */

export type SqlParam = string | number | null;

export interface Db {
  all<T>(sql: string, params?: SqlParam[]): Promise<T[]>;
  get<T>(sql: string, params?: SqlParam[]): Promise<T | undefined>;
  run(sql: string, params?: SqlParam[]): Promise<void>;
  /**
   * Runs fn inside a transaction, rolling back if it throws. Nesting is
   * supported via savepoints, so a repository method that already opens a
   * transaction can be called from inside another one.
   */
  tx<T>(fn: (db: Db) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

/** Thrown when a write violates a uniqueness constraint. */
export class ConflictError extends Error {
  readonly constraintHint: string;
  constructor(constraintHint: string, message?: string) {
    super(message ?? `conflict on ${constraintHint}`);
    this.name = "ConflictError";
    this.constraintHint = constraintHint;
  }
}

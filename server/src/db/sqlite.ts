/**
 * node:sqlite implementation of the Db seam.
 *
 * SQLite is flagged experimental by Node 22 and prints a warning on first
 * use. It is here because it is the store this project can actually run and
 * test in CI today; Postgres is the target for anything holding real player
 * memory. See server/README.md.
 */

import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { ConflictError, type Db, type SqlParam } from "./db.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

export const SCHEMA_PATH = join(HERE, "schema.sql");

/** Turns a driver error into ConflictError when it is a uniqueness failure. */
const translate = (err: unknown): unknown => {
  const message = err instanceof Error ? err.message : String(err);
  if (/UNIQUE constraint failed: (.+)/.test(message)) {
    const hint = /UNIQUE constraint failed: (.+)/.exec(message)?.[1] ?? "unknown";
    return new ConflictError(hint, message);
  }
  return err;
};

class SqliteDb implements Db {
  readonly #raw: DatabaseSync;
  #depth = 0;

  constructor(raw: DatabaseSync) {
    this.#raw = raw;
  }

  async all<T>(sql: string, params: SqlParam[] = []): Promise<T[]> {
    try {
      return this.#raw.prepare(sql).all(...params) as T[];
    } catch (err) {
      throw translate(err);
    }
  }

  async get<T>(sql: string, params: SqlParam[] = []): Promise<T | undefined> {
    try {
      return this.#raw.prepare(sql).get(...params) as T | undefined;
    } catch (err) {
      throw translate(err);
    }
  }

  async run(sql: string, params: SqlParam[] = []): Promise<void> {
    try {
      this.#raw.prepare(sql).run(...params);
    } catch (err) {
      throw translate(err);
    }
  }

  async tx<T>(fn: (db: Db) => Promise<T>): Promise<T> {
    // Savepoints rather than a bare BEGIN, so nesting works.
    const name = `sp_${this.#depth}`;
    this.#raw.exec(this.#depth === 0 ? "BEGIN" : `SAVEPOINT ${name}`);
    this.#depth += 1;
    try {
      const out = await fn(this);
      this.#depth -= 1;
      this.#raw.exec(this.#depth === 0 ? "COMMIT" : `RELEASE ${name}`);
      return out;
    } catch (err) {
      this.#depth -= 1;
      this.#raw.exec(this.#depth === 0 ? "ROLLBACK" : `ROLLBACK TO ${name}`);
      throw translate(err);
    }
  }

  async close(): Promise<void> {
    this.#raw.close();
  }
}

/**
 * Opens a database and applies the schema. `:memory:` gives each test its
 * own isolated store.
 *
 * Foreign keys are off by default in SQLite, which silently turns every
 * REFERENCES clause in the schema into a comment. Turning them on is not
 * optional.
 */
export function openSqlite(path = ":memory:"): Db {
  const raw = new DatabaseSync(path);
  raw.exec("PRAGMA foreign_keys = ON");
  raw.exec("PRAGMA journal_mode = WAL");
  raw.exec(readFileSync(SCHEMA_PATH, "utf8"));
  return new SqliteDb(raw);
}

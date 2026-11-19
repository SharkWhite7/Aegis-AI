/**
 * Applies the schema to a file-backed database. Idempotent: every
 * statement in schema.sql is CREATE ... IF NOT EXISTS.
 *
 *   node src/db/migrate.ts ./aegis.db
 */
import { openSqlite } from "./sqlite.ts";
import { seedBuiltinAgents } from "../marketplace/agents.ts";

const path = process.argv[2] ?? process.env["AEGIS_DB"] ?? "./aegis.db";
const db = openSqlite(path);
const seeded = await seedBuiltinAgents(db);
await db.close();
console.log(`schema applied to ${path}; built-in agents inserted: ${seeded}`);

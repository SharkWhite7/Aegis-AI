/**
 * Entry point.
 *
 * Picks the real model adapter when a managed credential is present and
 * the deterministic stub when it is not, and says which out loud at boot.
 * Starting silently on the stub is how you end up demoing plumbing and
 * believing you heard the product.
 */

import { openSqlite } from "./db/sqlite.ts";
import { seedBuiltinAgents } from "./marketplace/agents.ts";
import { buildApp } from "./http/app.ts";
import { StubModelAdapter } from "./model/stub.ts";
import { AnthropicModelAdapter, hasManagedCredential } from "./model/anthropic.ts";
import type { ModelAdapter } from "./model/adapter.ts";
import { devSignInAllowed } from "./auth/dev.ts";

const dbPath = process.env["AEGIS_DB"] ?? "./aegis.db";
const port = Number(process.env["PORT"] ?? 8787);
const host = process.env["HOST"] ?? "127.0.0.1";

const db = openSqlite(dbPath);
const seeded = await seedBuiltinAgents(db);

const live = hasManagedCredential();
// Spacing the stub's chunks makes streaming observable without a real
// model. Development only: with a credential present the real adapter is
// used and this has no effect.
const stubChunkMs = Number(process.env["AEGIS_STUB_CHUNK_MS"] ?? 0);

const model: ModelAdapter = live
  ? new AnthropicModelAdapter()
  : new StubModelAdapter(
      Number.isFinite(stubChunkMs) && stubChunkMs > 0
        ? { chunkDelayMs: stubChunkMs }
        : {},
    );

const devSignIn = devSignInAllowed(process.env);

const app = buildApp({
  db,
  model,
  logger: true,
  devSignIn,
  ...(process.env["AEGIS_SERVICE_TOKEN"]
    ? { serviceToken: process.env["AEGIS_SERVICE_TOKEN"] }
    : {}),
});

await app.listen({ port, host });

app.log.info(
  {
    db: dbPath,
    builtinAgentsInserted: seeded,
    model: model.id,
    inference: live ? "managed (live)" : "STUB — replies are placeholders",
  },
  "aegis server up",
);

if (devSignIn) {
  app.log.warn(
    "DEVELOPMENT SIGN-IN IS ON. POST /auth/dev signs anyone in as any " +
      "handle, with no proof. This must never be reachable by anyone else.",
  );
}

if (!live) {
  app.log.warn(
    "No managed credential found, so every reply is a deterministic stub. " +
      "Set ANTHROPIC_API_KEY to talk to the real model.",
  );
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void app.close().then(() => db.close()).then(() => process.exit(0));
  });
}

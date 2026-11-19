import { randomUUID } from "node:crypto";

/** Opaque ids. UUIDv4 so they carry no ordering or tenant information. */
export const newId = (): string => randomUUID();

/** ISO-8601 UTC. One place, so every table's timestamps sort together. */
export const now = (): string => new Date().toISOString();

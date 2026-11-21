/**
 * One place that decides which HTTP status a domain error becomes.
 *
 * Deliberately exhaustive rather than a catch-all 500: a client that gets
 * 500 for a bad email cannot tell a mistake it made from an outage.
 */

import { ValidationError } from "../domain/validate.ts";
import { ConflictError } from "../db/db.ts";
import { ForbiddenError, NotFoundError } from "../marketplace/agents.ts";
import { CeilingReachedError, SessionClosedError } from "../chat/service.ts";
import { UnusableTitleError } from "../profiles/repo.ts";
import { ModelRefusedError } from "../model/adapter.ts";

export type ErrorBody = {
  error: string;
  message: string;
  field?: string;
  /**
   * Set only by the consumption ceiling. A limit a caller cannot read is
   * indistinguishable from a bug, so the response says which kind ran out,
   * how much was consumed, and over what window.
   */
  kind?: string;
  spent?: number;
  ceiling?: number;
  windowStartedAt?: string;
};

export type Mapped = { status: number; body: ErrorBody };

export function mapError(err: unknown): Mapped {
  if (err instanceof ValidationError) {
    return {
      status: 400,
      body: { error: "invalid_request", message: err.message, field: err.field },
    };
  }
  if (err instanceof UnusableTitleError) {
    return { status: 400, body: { error: "invalid_request", message: err.message } };
  }
  if (err instanceof NotFoundError) {
    return { status: 404, body: { error: "not_found", message: err.message } };
  }
  if (err instanceof ForbiddenError) {
    return { status: 403, body: { error: "forbidden", message: err.message } };
  }
  if (err instanceof SessionClosedError) {
    return { status: 409, body: { error: "session_closed", message: err.message } };
  }
  if (err instanceof CeilingReachedError) {
    // 429 and not 402: nothing is for sale, so "payment required" would be
    // a claim about a product that does not exist. The window rolling is
    // what clears this, so it belongs with the other "come back later".
    return {
      status: 429,
      body: {
        error: "ceiling_reached",
        message: err.message,
        kind: err.verdict.kind,
        spent: err.verdict.spent,
        ceiling: err.verdict.ceiling,
        windowStartedAt: err.verdict.windowStartedAt,
      },
    };
  }
  if (err instanceof ConflictError) {
    return { status: 409, body: { error: "conflict", message: err.message } };
  }
  if (err instanceof UnauthorizedError) {
    return { status: 401, body: { error: "unauthorized", message: err.message } };
  }
  if (err instanceof ModelRefusedError) {
    // Not our bug and not the client's: the provider declined. 422 rather
    // than 500 so callers do not retry it as a transient failure.
    return { status: 422, body: { error: "model_refused", message: err.message } };
  }
  return {
    status: 500,
    body: { error: "internal", message: "an unexpected error occurred" },
  };
}

/** Thrown when a route needs a signed-in player and has none. */
export class UnauthorizedError extends Error {
  constructor(message = "sign in required") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

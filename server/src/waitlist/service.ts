/**
 * Waitlist capture.
 *
 * The site's two "Request access" CTAs currently point at a #access
 * section that does not exist. This is what stands behind them.
 *
 * Two things it deliberately does not do:
 *
 *  - There is no count endpoint. "1,842 on the list" is a fabricated
 *    metric by construction, and the product is marked PRE-ALPHA.
 *  - A repeat signup is not an error and not a duplicate row. It reports
 *    `already`, so the form can say something true without leaking
 *    whether that address was on the list (see note on the HTTP route).
 */

import type { Db } from "../db/db.ts";
import { ConflictError } from "../db/db.ts";
import { newId, now } from "../domain/ids.ts";
import type { WaitlistEntry, WaitlistSource } from "../domain/types.ts";
import {
  WAITLIST_SOURCES,
  optionalString,
  requireEmail,
  requireOneOf,
} from "../domain/validate.ts";

export type JoinInput = {
  email: unknown;
  gameTitle?: unknown;
  source?: unknown;
};

export type JoinResult = {
  status: "added" | "already";
  entry: Pick<WaitlistEntry, "id" | "email" | "gameTitle" | "source">;
};

type Row = {
  id: string;
  email: string;
  game_title: string | null;
  source: string;
  created_at: string;
  confirmed_at: string | null;
};

export async function joinWaitlist(
  db: Db,
  input: JoinInput,
): Promise<JoinResult> {
  const email = requireEmail(input.email);
  // The most useful field on the form: it says which profiles to generate
  // first. Optional, because demanding it would cost signups.
  const gameTitle = optionalString(input.gameTitle, "gameTitle", { max: 120 });
  const source: WaitlistSource =
    input.source === undefined || input.source === null
      ? "other"
      : requireOneOf(input.source, "source", WAITLIST_SOURCES);

  const id = newId();
  try {
    await db.run(
      `INSERT INTO waitlist_entry (id, email, game_title, source, created_at, confirmed_at)
       VALUES (?, ?, ?, ?, ?, NULL)`,
      [id, email, gameTitle, source, now()],
    );
    return { status: "added", entry: { id, email, gameTitle, source } };
  } catch (err) {
    if (err instanceof ConflictError) {
      const row = await db.get<Row>(
        "SELECT * FROM waitlist_entry WHERE email = ?",
        [email],
      );
      if (row) {
        return {
          status: "already",
          entry: {
            id: row.id,
            email: row.email,
            gameTitle: row.game_title,
            source: row.source as WaitlistSource,
          },
        };
      }
    }
    throw err;
  }
}

/** Operational only. Never exposed over HTTP — see the note above. */
export const countWaitlist = async (db: Db): Promise<number> => {
  const row = await db.get<{ n: number }>(
    "SELECT COUNT(*) AS n FROM waitlist_entry",
  );
  return row?.n ?? 0;
};

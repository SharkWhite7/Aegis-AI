"use client";

import { useId, useState } from "react";
import {
  matchProfile,
  ON_FILE,
  PROFILE_FIELDS,
  NOTE_GENERATED,
  NOTE_UNKNOWN,
  NOTE_WAITING,
  type Profile,
} from "@/lib/profiles";

const LEADER = "·".repeat(120);
const EMPTY = PROFILE_FIELDS.map((f) => [f, ""] as [string, string]);

export default function ProfileFinder() {
  const [query, setQuery] = useState("GTA VI");
  const inputId = useId();

  const typed = query.trim();
  const profile: Profile | null = matchProfile(typed);
  const waiting = typed.length < 2;

  const title = profile?.title ?? (waiting ? "awaiting a title" : typed);
  const fields = profile?.fields ?? EMPTY;

  const status = profile
    ? profile.status === "pre-release"
      ? "Pre-release"
      : "Generated"
    : waiting
      ? "—"
      : "Not on file";

  const note =
    profile?.note ??
    (profile ? NOTE_GENERATED : waiting ? NOTE_WAITING : NOTE_UNKNOWN);

  return (
    <div className="grid-12 gap-y-12">
      {/* ── Control ───────────────────────────────────────── */}
      <div className="col-span-12 lg:col-span-4">
        <label htmlFor={inputId} className="t-label block text-bone-dim">
          Your game
        </label>
        <input
          id={inputId}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="type a title"
          autoComplete="off"
          spellCheck={false}
          className="field-line t-head mt-4"
        />

        <p className="t-label mt-9 text-bone-dim">On file</p>
        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2.5">
          {ON_FILE.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => setQuery(p.title)}
                className="t-mono link-wipe text-bone-dim transition-colors duration-300 hover:text-bone"
              >
                {p.title}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* ── The profile ───────────────────────────────────── */}
      <div className="panel col-span-12 lg:col-span-7 lg:col-start-6">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="dot-live shrink-0" aria-hidden />
            <span className="t-label truncate text-bone">Profile · {title}</span>
          </div>
          <span className="t-label shrink-0 text-bone-dim">{status}</span>
        </div>

        <dl aria-live="polite" className="px-5 py-5">
          {fields.map(([k, v], i) => (
            <div
              key={k}
              className={`flex flex-wrap items-baseline gap-x-4 py-2.5 ${
                i === 0 ? "" : "border-t border-line-soft"
              }`}
            >
              <dt className="t-label min-w-0 text-bone-dim">{k}</dt>
              <span
                className="leader-dots t-mono hidden text-bone-mute sm:block"
                aria-hidden
              >
                {LEADER}
              </span>
              <dd
                /* An em dash here means "known to be unknown" — that is
                   content, so it does not sit at bone-mute's 2.85:1. */
                className={`t-mono ml-auto text-right sm:ml-0 ${
                  v ? "text-bone" : "text-bone-dim"
                }`}
              >
                {v || "—"}
              </dd>
            </div>
          ))}
        </dl>

        {/* Two lines reserved at sm+, so a one-line note and a two-line
            note occupy the same box and the card never resizes mid-keystroke. */}
        <p className="t-mono border-t border-line px-5 py-4 text-bone-dim sm:min-h-[calc(1.6em*2+2rem)]">
          {note}
        </p>
      </div>
    </div>
  );
}

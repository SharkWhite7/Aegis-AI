-- AEGIS AI companion backend — schema.
--
-- Written to run unchanged on both SQLite (node:sqlite, used in development
-- and in tests) and PostgreSQL (the target). That portability costs us
-- idiomatic types: ids and timestamps are TEXT, and JSON columns are TEXT
-- holding JSON. On Postgres those become uuid / timestamptz / jsonb in a
-- later, additive migration. The tradeoff is deliberate — one schema we can
-- actually execute beats two dialects we cannot keep in step.
--
-- Timestamps are ISO-8601 UTC strings, so lexical order is chronological.
-- There is no money anywhere in this file. See README for why.

-- ── Waitlist ────────────────────────────────────────────────────────────
-- Deliberately not a player. Joining the list is not creating an account.
CREATE TABLE IF NOT EXISTS waitlist_entry (
  id            TEXT PRIMARY KEY,
  -- Stored already lowercased and trimmed; the UNIQUE index is what makes
  -- a second signup idempotent rather than a duplicate.
  email         TEXT NOT NULL UNIQUE,
  -- What they typed in the game field. The most useful signal the waitlist
  -- can collect: it says which profiles to generate first.
  game_title    TEXT,
  source        TEXT NOT NULL,
  created_at    TEXT NOT NULL,
  -- Double opt-in. An unconfirmed row is not a subscriber.
  confirmed_at  TEXT
);

-- ── Players ─────────────────────────────────────────────────────────────
-- No API key column, now or ever: inference is managed. No plan column
-- either, because nothing is charged for yet and a column that always
-- reads 'free' is a claim about a product we have not built.
CREATE TABLE IF NOT EXISTS player (
  id            TEXT PRIMARY KEY,
  handle        TEXT NOT NULL UNIQUE,
  display_name  TEXT,
  -- The Discord account this player signs in with. NULL for players made
  -- before sign-in existed, and for test fixtures.
  discord_id    TEXT UNIQUE,
  created_at    TEXT NOT NULL
);

-- ── Sessions a player signs in to ───────────────────────────────────────
-- Server-side rather than a self-contained signed token, because signing
-- out has to actually end a session. A player's whole memory sits behind
-- this; "the cookie expires eventually" is not the same as revoking.
--
-- The token itself is NEVER stored. What is stored is its SHA-256, so a
-- copy of this table does not let anyone sign in as anybody.
CREATE TABLE IF NOT EXISTS auth_session (
  id          TEXT PRIMARY KEY,
  player_id   TEXT NOT NULL REFERENCES player(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  created_at  TEXT NOT NULL,
  expires_at  TEXT NOT NULL,
  revoked_at  TEXT
);

CREATE INDEX IF NOT EXISTS auth_session_player_idx
  ON auth_session (player_id, revoked_at);

-- ── Game profiles ───────────────────────────────────────────────────────
-- One row per title, shared by every player. That reuse is the whole
-- economics of "no per-title engineering".
CREATE TABLE IF NOT EXISTS game_profile (
  id                TEXT PRIMARY KEY,
  -- Normalised title (lowercase, alphanumerics only), matching the site's
  -- own norm() in lib/profiles.ts so a title typed on the site and in the
  -- app resolve to the same profile.
  slug              TEXT NOT NULL UNIQUE,
  title             TEXT NOT NULL,
  aliases           TEXT NOT NULL,            -- JSON array of strings
  status            TEXT NOT NULL CHECK (status IN ('generated','pre_release','unknown')),
  -- JSON object: field key -> { value: string|null, provenance, confidence }.
  -- value === null is a meaningful answer: known to be unknown.
  fields            TEXT NOT NULL,
  generator_version TEXT NOT NULL,
  model_id          TEXT,
  created_at        TEXT NOT NULL,
  refreshed_at      TEXT
);

-- ── Marketplace agents ──────────────────────────────────────────────────
-- Holds both the six built-in personalities and community-authored agents,
-- in one table, because a chat session picks from a single roster.
--
-- There is no price column. People will sell agents later; today nothing is
-- charged, and a dormant price field would assert a commerce feature that
-- does not exist. Adding it later is an additive migration.
CREATE TABLE IF NOT EXISTS agent (
  id            TEXT PRIMARY KEY,
  slug          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  -- One line under the name, as the site's persona cards do.
  role          TEXT NOT NULL,
  -- The agent's actual voice instruction. This is what reaches the model.
  persona_brief TEXT NOT NULL,
  source        TEXT NOT NULL CHECK (source IN ('builtin','community')),
  -- NULL for built-ins. Community agents must have an author; enforced in
  -- code because SQL cannot express a conditional NOT NULL portably.
  author_id     TEXT REFERENCES player(id) ON DELETE SET NULL,
  visibility    TEXT NOT NULL CHECK (visibility IN ('draft','published')),
  -- Denormalised count, kept in step with agent_star inside one
  -- transaction. Ranking reads this; agent_star remains the source of truth.
  star_count    INTEGER NOT NULL DEFAULT 0 CHECK (star_count >= 0),
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

-- One star per player per agent. Without this constraint a "star" counts
-- clicks rather than people, and the ranking means nothing.
CREATE TABLE IF NOT EXISTS agent_star (
  agent_id   TEXT NOT NULL REFERENCES agent(id) ON DELETE CASCADE,
  player_id  TEXT NOT NULL REFERENCES player(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (agent_id, player_id)
);

-- Ranking is "most stars first", so the index leads on star_count.
-- created_at breaks ties deterministically, oldest first.
CREATE INDEX IF NOT EXISTS agent_rank_idx
  ON agent (visibility, star_count DESC, created_at ASC);

-- ── Sessions and turns ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS session (
  id              TEXT PRIMARY KEY,
  player_id       TEXT NOT NULL REFERENCES player(id) ON DELETE CASCADE,
  game_profile_id TEXT NOT NULL REFERENCES game_profile(id),
  agent_id        TEXT NOT NULL REFERENCES agent(id),
  started_at      TEXT NOT NULL,
  ended_at        TEXT,
  -- Written when the session closes; feeds the next session's digest, so
  -- session 100 opens knowing session 1 without replaying 99 transcripts.
  summary         TEXT,
  turn_count      INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS session_player_idx
  ON session (player_id, started_at DESC);

CREATE TABLE IF NOT EXISTS turn (
  id         TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES session(id) ON DELETE CASCADE,
  seq        INTEGER NOT NULL,
  role       TEXT NOT NULL CHECK (role IN ('player','copilot')),
  text       TEXT NOT NULL,
  -- Voice is latency-bound, so it is measured from the first turn onward.
  latency_ms INTEGER,
  created_at TEXT NOT NULL,
  UNIQUE (session_id, seq)
);

-- ── Memory ──────────────────────────────────────────────────────────────
-- Player-scoped with an optional game link. The thread in the brief is
-- about the person ("it knows the difference between a bad week and a quiet
-- one"), which cannot cross games if memory is scoped to a title.
CREATE TABLE IF NOT EXISTS memory_entry (
  id                 TEXT PRIMARY KEY,
  player_id          TEXT NOT NULL REFERENCES player(id) ON DELETE CASCADE,
  session_id         TEXT REFERENCES session(id) ON DELETE SET NULL,
  game_profile_id    TEXT REFERENCES game_profile(id) ON DELETE SET NULL,
  kind               TEXT NOT NULL CHECK (kind IN
                       ('preference','goal','fact','event','conversation','challenge_outcome')),
  -- One assertion, human-readable, because it is injected as prose.
  text               TEXT NOT NULL,
  salience           REAL NOT NULL DEFAULT 0.5 CHECK (salience >= 0 AND salience <= 1),
  last_referenced_at TEXT,
  -- A memory that has been contradicted points at the one that replaced it.
  -- Without this the digest accumulates contradictions and the companion
  -- gets worse as it accumulates, not better.
  superseded_by      TEXT REFERENCES memory_entry(id) ON DELETE SET NULL,
  created_at         TEXT NOT NULL
);

-- The digest's hot path: live memories for a player, most salient first.
CREATE INDEX IF NOT EXISTS memory_live_idx
  ON memory_entry (player_id, superseded_by, salience DESC, created_at DESC);

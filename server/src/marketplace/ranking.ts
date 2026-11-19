/**
 * Marketplace ranking.
 *
 * The rule, as asked for: the agents with the most stars are always at the
 * top. Ties break by age, oldest first, so the order is total and stable —
 * without that second key two agents on the same star count could swap
 * places between requests and pagination would skip or repeat rows.
 *
 * Only published agents are ranked. Drafts belong to their author.
 *
 * Two honest limits of ranking on raw star count, recorded here because
 * they are properties of the rule and not of this code:
 *
 *  1. It has no cold start. The first agent to get popular stays on top,
 *     and a better one published later has no path to the first page where
 *     anyone would see it to star it.
 *  2. It rewards reach over quality. One star per player (enforced by the
 *     agent_star primary key) stops one person clicking twice, but not an
 *     author who can ask a thousand people to click once.
 *
 * Both are fixed by changing this one function — a time-decayed score, or
 * a confidence bound — which is why the rule lives alone in a file.
 */

export const RANK_ORDER_SQL = "star_count DESC, created_at ASC";

export const rankedPublishedSql = (): string =>
  `SELECT * FROM agent
     WHERE visibility = 'published'
     ORDER BY ${RANK_ORDER_SQL}
     LIMIT ? OFFSET ?`;

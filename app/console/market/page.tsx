import { Suspense } from "react";
import Link from "next/link";
import { rankedAgents, type MarketAgent } from "../_lib/market";

/**
 * The ranking.
 *
 * The order is the service's and is not re-sorted here: star_count DESC,
 * created_at ASC, as recorded in server/src/marketplace/ranking.ts. That
 * file also records two honest limits of ranking on raw star count — no
 * cold start, and reach counts for more than quality — which is why this
 * screen offers no "trending" or "recommended" shelf. Nothing computes
 * either, and a label with nothing behind it is the kind of invented
 * signal the ranking file warns about.
 *
 * The heading is static and prerenders. The rows are a runtime read, so
 * they stream in behind a boundary.
 */
export default function MarketPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return (
    <div className="space-y-14">
      <header className="grid-12 gap-y-8">
        <div className="col-span-12 lg:col-span-7">
          <p className="t-label text-bone-dim">The marketplace</p>
          <h1 className="t-display-s mt-4 text-bone">
            Most stars first<span className="text-magenta">.</span>
          </h1>
        </div>
        <div className="col-span-12 lg:col-span-4 lg:col-start-9">
          <p className="t-small max-w-[46ch] text-bone-dim">
            Published agents, ordered by how many players starred them. Ties
            go to whichever was published first, so the order is the same
            every time you load it. There is no editorial pick and nothing
            is promoted.
          </p>
          <Link
            href="/console/market/mine"
            className="t-label link-wipe mt-6 inline-block text-bone-dim"
          >
            Your agents
          </Link>
        </div>
      </header>

      <hr className="rule" />

      <Suspense fallback={<Waiting />}>
        <Ranking searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

const PAGE = 20;

function Waiting() {
  return <p className="t-label text-bone-dim">Reading the ranking</p>;
}

async function Ranking({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const raw = params["from"];
  const parsed = Number(Array.isArray(raw) ? raw[0] : raw);
  const offset = Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;

  const page = await rankedAgents({ limit: PAGE, offset });

  if (!page.ok) {
    return (
      <div className="panel p-6">
        <p className="t-label text-bone-dim">The ranking could not be read</p>
        <p className="t-small mt-4 max-w-[52ch] text-bone-dim">{page.reason}</p>
        <p className="t-small mt-4 max-w-[52ch] text-bone-dim">
          This is not an empty marketplace. It is an unanswered request, and
          the two are not the same, so nothing is shown in place of the
          rows.
        </p>
      </div>
    );
  }

  const { agents, hasMore } = page.value;

  if (agents.length === 0) {
    return (
      <div className="panel p-6">
        <p className="t-label text-bone-dim">
          {offset === 0 ? "Nothing published" : "Nothing on this page"}
        </p>
        <p className="t-body-lg mt-5 max-w-[48ch] text-bone-dim">
          {offset === 0
            ? "No agent has been published yet, so there is no ranking to show. The first one to be published will be the whole list."
            : "The ranking does not run this far. Go back to the start of it."}
        </p>
        {offset === 0 ? (
          <Link href="/console/market/mine" className="btn-stamp mt-8">
            Write one
            <span className="arrow" aria-hidden>
              →
            </span>
          </Link>
        ) : (
          <Link href="/console/market" className="btn-stamp mt-8">
            Back to the top
          </Link>
        )}
      </div>
    );
  }

  return (
    <div>
      <ol>
        {agents.map((agent, index) => (
          <Row key={agent.id} agent={agent} position={offset + index + 1} />
        ))}
      </ol>

      <div className="mt-12 flex flex-wrap items-center justify-between gap-5">
        <p className="t-label text-bone-dim">
          <span className="nums">
            {offset + 1}–{offset + agents.length}
          </span>{" "}
          {hasMore ? "· more below" : "· the whole ranking"}
        </p>
        <div className="flex flex-wrap items-center gap-7">
          {offset > 0 ? (
            <Link
              href={
                offset - PAGE > 0
                  ? `/console/market?from=${offset - PAGE}`
                  : "/console/market"
              }
              className="t-label link-wipe text-bone-dim"
            >
              ← Previous
            </Link>
          ) : null}
          {hasMore ? (
            <Link
              href={`/console/market?from=${offset + PAGE}`}
              className="t-label link-wipe text-bone-dim"
            >
              Next →
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * One row.
 *
 * The position is this row's place in the order, not a score. There is no
 * star control here: knowing whether *you* have starred an agent is one
 * request per agent at the service, and a row that guessed instead would
 * be a button that can disagree with the primary key enforcing it. The
 * agent's own page reads that state and offers the button there.
 */
function Row({ agent, position }: { agent: MarketAgent; position: number }) {
  return (
    <li className="border-t border-line last:border-b">
      <Link
        href={`/console/market/${agent.slug}`}
        className="group grid-12 items-baseline gap-y-3 py-7"
      >
        <p className="t-label nums col-span-2 text-bone-dim lg:col-span-1">
          {String(position).padStart(2, "0")}
        </p>

        <div className="col-span-10 min-w-0 lg:col-span-7">
          <h2 className="t-head text-bone transition-colors duration-300 group-hover:text-magenta">
            {agent.name}
          </h2>
          <p className="t-small mt-3 max-w-[54ch] text-bone-dim">{agent.role}</p>
        </div>

        <p className="t-label col-span-12 text-bone-dim lg:col-span-2 lg:text-right">
          <span className="nums text-bone">{agent.starCount}</span>{" "}
          {agent.starCount === 1 ? "star" : "stars"}
        </p>

        <p className="t-label col-span-12 text-bone-dim lg:col-span-2 lg:text-right">
          {agent.source === "builtin" ? "Built in" : "Community"}
        </p>
      </Link>
    </li>
  );
}

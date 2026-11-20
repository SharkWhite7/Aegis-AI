import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "../../_lib/config";
import { whoAmI } from "../../_lib/backend";
import { agentBySlug, starState, type MarketAgent } from "../../_lib/market";
import StarButton from "../_lib/StarButton";

/**
 * This route blocks on the server rather than being prerendered.
 *
 * Frame, in the root layout, reads usePathname() to tell the app apart
 * from the site. On a dynamic segment that value is only known at request
 * time. The remedy Next offers — a Suspense boundary around Frame — would
 * sit in the root layout and therefore apply to the landing, which is
 * fully static today and must stay that way. An agent's page is read once
 * and is per-player in its star state, so there is nothing to lose here.
 *
 * Same reasoning, and same line, as app/console/play/[id]/page.tsx.
 */
export const instant = false;

export default async function AgentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <Suspense fallback={<p className="t-label text-bone-dim">Opening</p>}>
      <Sheet slug={slug} />
    </Suspense>
  );
}

async function Sheet({ slug }: { slug: string }) {
  const found = await agentBySlug(slug);

  if (!found.ok) {
    return (
      <div className="panel p-6">
        <p className="t-label text-bone-dim">This agent could not be read</p>
        <p className="t-small mt-4 max-w-[52ch] text-bone-dim">{found.reason}</p>
        <p className="t-small mt-4 max-w-[52ch] text-bone-dim">
          Whether it exists is unknown — the request did not get an answer
          either way.
        </p>
      </div>
    );
  }
  // The service said there is no such slug. That is a 404, not an empty
  // page dressed up as one.
  if (found.value === null) notFound();

  const agent = found.value;
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value ?? null;
  const player = token ? await whoAmI(token) : null;

  return (
    <article className="space-y-14">
      <header className="grid-12 gap-y-10">
        <div className="col-span-12 lg:col-span-8">
          <Link href="/console/market" className="t-label link-wipe text-bone-dim">
            ← The ranking
          </Link>
          <h1 className="t-display-s mt-7 text-bone">{agent.name}</h1>
          <p className="t-lede mt-6 max-w-[40ch] text-bone-dim">{agent.role}</p>
        </div>

        <dl className="col-span-12 space-y-7 lg:col-span-3 lg:col-start-10">
          <Fact label="Stars">
            <span className="nums">{agent.starCount}</span>
          </Fact>
          <Fact label="Standing">
            {agent.visibility === "published" ? "Published" : "Draft"}
          </Fact>
          <Fact label="Origin">
            {agent.source === "builtin" ? "Built in" : "Community"}
          </Fact>
          <Fact label="Written by">
            <Author agent={agent} viewerId={player?.id ?? null} />
          </Fact>
          <Fact label="Created (UTC)">
            <span className="nums">{agent.createdAt.slice(0, 10)}</span>
          </Fact>
        </dl>
      </header>

      <hr className="rule" />

      <section className="grid-12 gap-y-10">
        <div className="col-span-12 lg:col-span-7">
          <h2 className="t-label text-bone-dim">The persona brief</h2>
          {/*
            Rendered as written, line breaks and all. `break-words` is not
            cosmetic: this is up to 2,000 characters of text somebody else
            typed, and one unbroken 2,000-character run would otherwise
            push the page sideways on a phone.
          */}
          <p className="t-body-lg mt-6 max-w-[62ch] break-words whitespace-pre-wrap text-bone">
            {agent.personaBrief}
          </p>
        </div>

        <aside className="col-span-12 lg:col-span-4 lg:col-start-9">
          <div className="panel p-6">
            <p className="t-label text-bone-dim">What this text is</p>
            <p className="t-small mt-4 text-bone-dim">
              It is not a description of the agent. It is the instruction
              handed to the model, as written, on every turn of a session
              that uses this agent. Nothing reviews it before it is
              published.
            </p>
          </div>
        </aside>
      </section>

      <hr className="rule" />

      <section>
        <h2 className="t-label text-bone-dim">One star per player</h2>
        <div className="mt-6">
          <Starring agent={agent} token={token} viewerId={player?.id ?? null} />
        </div>
      </section>
    </article>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="t-label text-bone-dim">{label}</dt>
      <dd className="t-small mt-2.5 break-words text-bone">{children}</dd>
    </div>
  );
}

/**
 * Who wrote it.
 *
 * The service identifies an author by id and exposes no route that turns
 * a player id into a handle, so for anyone other than the viewer the id
 * is the whole of what is known. It is shown as an id and labelled as
 * one. Inventing a display name for it would be inventing data.
 */
function Author({
  agent,
  viewerId,
}: {
  agent: MarketAgent;
  viewerId: string | null;
}) {
  if (agent.source === "builtin") return <>Ships with the companion</>;
  if (agent.authorId === null) return <span className="text-bone-dim">Not recorded</span>;
  if (viewerId !== null && agent.authorId === viewerId) return <>You</>;
  return (
    <>
      <span className="t-mono block">{agent.authorId}</span>
      <span className="t-micro mt-2 block text-bone-dim">
        A player id. The service publishes no name for it.
      </span>
    </>
  );
}

/**
 * The star control, or the reason there isn't one.
 *
 * Every branch here is a rule the service enforces, checked in the same
 * order it would check them, so the screen never offers a button that
 * would come back refused.
 */
async function Starring({
  agent,
  token,
  viewerId,
}: {
  agent: MarketAgent;
  token: string | null;
  viewerId: string | null;
}) {
  if (agent.visibility !== "published") {
    return (
      <p className="t-small max-w-[52ch] text-bone-dim">
        A draft cannot be starred, and it is not in the ranking. Only its
        author can see it listed.
      </p>
    );
  }

  if (!token || viewerId === null) {
    return (
      <div>
        <p className="t-small max-w-[52ch] text-bone-dim">
          A star is attached to a player, so it needs a sign-in.
        </p>
        <Link href="/console" className="btn-stamp mt-6">
          Sign in
          <span className="arrow" aria-hidden>
            →
          </span>
        </Link>
        <p className="t-label mt-7 text-bone-dim">
          <span className="nums text-bone">{agent.starCount}</span>{" "}
          {agent.starCount === 1 ? "star" : "stars"} so far
        </p>
      </div>
    );
  }

  if (agent.authorId !== null && agent.authorId === viewerId) {
    return (
      <div>
        <p className="t-small max-w-[52ch] text-bone-dim">
          You wrote this one. The service refuses a self-star: one star on
          your own agent is a thumb on the scale that decides the whole
          front page.
        </p>
        <p className="t-label mt-6 text-bone-dim">
          <span className="nums text-bone">{agent.starCount}</span>{" "}
          {agent.starCount === 1 ? "star" : "stars"} from other players
        </p>
      </div>
    );
  }

  const mine = await starState(token, agent.id);
  if (!mine.ok) {
    // Without knowing the real state there is no honest button to draw:
    // one drawn either way would be a guess at a value the service holds.
    return (
      <div>
        <p className="t-small max-w-[52ch] text-magenta">{mine.reason}</p>
        <p className="t-small mt-4 max-w-[52ch] text-bone-dim">
          Whether you have already starred this agent is unknown, so no
          button is offered rather than one that might be wrong.
        </p>
      </div>
    );
  }

  return (
    <StarButton
      agentId={agent.id}
      slug={agent.slug}
      starred={mine.value}
      starCount={agent.starCount}
    />
  );
}

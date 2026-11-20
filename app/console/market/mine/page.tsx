import { Suspense } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "../../_lib/config";
import { whoAmI } from "../../_lib/backend";
import { myAgents, type MarketAgent } from "../../_lib/market";
import DraftForm from "../_lib/DraftForm";
import VisibilityButton from "../_lib/VisibilityButton";

/**
 * Your agents: the ones you wrote, drafts included.
 *
 * Writing and publishing are on one screen because they are one job, and
 * because the step between them is the point: a draft is yours alone
 * until you publish it, and this is where you can see that it is.
 */
export default function MinePage() {
  return (
    <div className="space-y-14">
      <header className="grid-12 gap-y-8">
        <div className="col-span-12 lg:col-span-7">
          <p className="t-label text-bone-dim">Your agents</p>
          <h1 className="t-display-s mt-4 text-bone">
            Write one<span className="text-magenta">.</span>
          </h1>
        </div>
        <div className="col-span-12 lg:col-span-4 lg:col-start-9">
          <p className="t-small max-w-[46ch] text-bone-dim">
            An agent is a name, a role, and the instruction the model is
            given. It is saved as a draft and stays out of the ranking
            until you publish it.
          </p>
          <Link
            href="/console/market"
            className="t-label link-wipe mt-6 inline-block text-bone-dim"
          >
            The ranking
          </Link>
        </div>
      </header>

      <hr className="rule" />

      <Suspense fallback={<p className="t-label text-bone-dim">Checking</p>}>
        <Studio />
      </Suspense>
    </div>
  );
}

async function Studio() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  const player = token ? await whoAmI(token) : null;

  if (!token || !player) {
    return (
      <div className="panel p-6">
        <p className="t-label text-bone-dim">Not signed in</p>
        <p className="t-body-lg mt-5 max-w-[48ch] text-bone-dim">
          An agent belongs to whoever wrote it, so writing one needs a
          sign-in.
        </p>
        <Link href="/console" className="btn-stamp mt-8">
          Sign in
          <span className="arrow" aria-hidden>
            →
          </span>
        </Link>
      </div>
    );
  }

  const owned = await myAgents(token);

  return (
    <div className="space-y-16">
      <DraftForm />

      <hr className="rule" />

      {!owned.ok ? (
        <div className="panel p-6">
          <p className="t-label text-bone-dim">Your agents could not be read</p>
          <p className="t-small mt-4 max-w-[52ch] text-bone-dim">{owned.reason}</p>
          <p className="t-small mt-4 max-w-[52ch] text-bone-dim">
            This does not mean you have none. The request went unanswered,
            so the list is not shown at all rather than shown as empty.
          </p>
        </div>
      ) : (
        <Owned agents={owned.value} />
      )}
    </div>
  );
}

function Owned({ agents }: { agents: MarketAgent[] }) {
  if (agents.length === 0) {
    return (
      <div>
        <h2 className="t-label text-bone-dim">Nothing yet</h2>
        <p className="t-body-lg mt-5 max-w-[48ch] text-bone-dim">
          You have not written an agent. The form above is the whole of it.
        </p>
      </div>
    );
  }

  const drafts = agents.filter((a) => a.visibility === "draft");
  const published = agents.filter((a) => a.visibility === "published");

  return (
    <div className="space-y-16">
      <Group
        title="Drafts"
        note="Yours only. Not in the ranking and not starrable until published."
        agents={drafts}
        empty="No drafts."
      />
      <Group
        title="Published"
        note="In the ranking, and open to stars from other players."
        agents={published}
        empty="Nothing published."
      />
    </div>
  );
}

function Group({
  title,
  note,
  agents,
  empty,
}: {
  title: string;
  note: string;
  agents: MarketAgent[];
  empty: string;
}) {
  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h2 className="t-head text-bone">{title}</h2>
        <p className="t-label nums text-bone-dim">{agents.length}</p>
      </div>
      <p className="t-small mt-4 max-w-[52ch] text-bone-dim">{note}</p>

      {agents.length === 0 ? (
        <p className="t-small mt-8 text-bone-dim">{empty}</p>
      ) : (
        <ul className="mt-8">
          {agents.map((agent) => (
            <li key={agent.id} className="border-t border-line last:border-b">
              <OwnedRow agent={agent} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function OwnedRow({ agent }: { agent: MarketAgent }) {
  return (
    <div className="grid-12 items-start gap-y-6 py-7">
      <div className="col-span-12 min-w-0 lg:col-span-6">
        <h3 className="t-head text-bone">{agent.name}</h3>
        <p className="t-small mt-3 max-w-[54ch] text-bone-dim">{agent.role}</p>
        <p className="t-micro mt-4 max-w-[62ch] break-words text-bone-dim">
          {agent.personaBrief.length > 160
            ? `${agent.personaBrief.slice(0, 160)}…`
            : agent.personaBrief}
        </p>
      </div>

      <div className="col-span-12 lg:col-span-2">
        <p className="t-label text-bone-dim">
          <span className="nums text-bone">{agent.starCount}</span>{" "}
          {agent.starCount === 1 ? "star" : "stars"}
        </p>
        <Link
          href={`/console/market/${agent.slug}`}
          className="t-label link-wipe mt-4 inline-block text-bone-dim"
        >
          Its page
        </Link>
      </div>

      <div className="col-span-12 lg:col-span-3 lg:col-start-10">
        <VisibilityButton agentId={agent.id} visibility={agent.visibility} />
      </div>
    </div>
  );
}

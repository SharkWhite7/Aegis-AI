import { Suspense } from "react";
import Link from "next/link";
import { currentPlayer } from "./_lib/session";
import { signInReadiness } from "./_lib/config";
import { listAgents } from "./_lib/backend";
import Begin from "./_lib/Begin";
import Notice from "./_lib/Notice";

/**
 * The app's front door.
 *
 * Who you are is per-player and cannot be prerendered, so it is read
 * inside a Suspense boundary: the shell paints at once and the part that
 * needs the cookie streams in behind it. With Cache Components enabled,
 * reading `cookies()` outside a boundary fails the build rather than
 * quietly making the whole route blocking.
 */
export default function ConsolePage() {
  return (
    <Suspense fallback={<Waiting />}>
      <Door />
    </Suspense>
  );
}

/**
 * Holds the layout steady while the session is read. Deliberately plain:
 * a skeleton that pretends to be content is a small lie about what is
 * there, and this one resolves in a few milliseconds anyway.
 */
function Waiting() {
  return (
    <div className="grid-12 gap-y-12">
      <div className="col-span-12 lg:col-span-7">
        <p className="t-label text-bone-dim">Checking</p>
        <div className="mt-6 h-px w-24 bg-line-hard" />
      </div>
    </div>
  );
}

async function Door() {
  const player = await currentPlayer();
  const readiness = signInReadiness();

  if (!player) {
    return (
      <div className="grid-12 gap-y-12">
        <div className="col-span-12 lg:col-span-7">
          <h1 className="t-display-s text-bone">
            Not signed in<span className="text-magenta">.</span>
          </h1>
          <p className="t-body-lg mt-6 max-w-[42ch] text-bone-dim">
            The companion keeps what you tell it. That needs to be attached
            to someone, so it starts here.
          </p>

          {readiness.ready ? (
            <a href="/console/auth/discord" className="btn-stamp mt-9">
              Continue with Discord
              <span className="arrow" aria-hidden>
                →
              </span>
            </a>
          ) : (
            <div className="panel mt-9 p-6">
              <p className="t-label text-bone-dim">Sign-in is not configured</p>
              <p className="t-small mt-4 max-w-[52ch] text-bone-dim">
                This build has no Discord application attached, so there is
                nothing to sign in to yet. The screen is real; the handshake
                behind it is not wired until these are set.
              </p>
              <ul className="mt-5 space-y-1.5">
                {readiness.missing.map((name) => (
                  <li key={name} className="t-mono text-bone-dim">
                    {name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="col-span-12 lg:col-span-4 lg:col-start-9">
          <Notice />
        </div>
      </div>
    );
  }

  const agents = await listAgents();

  return (
    <div className="space-y-16">
      <div className="flex flex-wrap items-baseline justify-between gap-6">
        <div>
          <p className="t-label text-bone-dim">Signed in</p>
          <h1 className="t-display-s mt-3 text-bone">
            {player.displayName ?? player.handle}
            <span className="text-magenta">.</span>
          </h1>
        </div>
        <form action="/console/auth/signout" method="post">
          <button type="submit" className="btn-stamp">
            Sign out
          </button>
        </form>
      </div>

      <hr className="rule" />

      {agents.length > 0 ? (
        <Begin agents={agents} />
      ) : (
        <div className="panel p-6">
          <p className="t-label text-bone-dim">No voices available</p>
          <p className="t-small mt-4 max-w-[52ch] text-bone-dim">
            The companion service did not return any. It is either not
            running or not reachable at the address this build was given,
            so there is nothing to start a session with.
          </p>
        </div>
      )}

      <hr className="rule" />

      <div className="grid-12 gap-y-8">
        <div className="col-span-12 lg:col-span-5">
          <Notice />
        </div>
        <div className="col-span-12 lg:col-span-3 lg:col-start-10 lg:text-right">
          <Link href="/" className="t-micro link-wipe text-bone-dim">
            Back to the site
          </Link>
        </div>
      </div>
    </div>
  );
}

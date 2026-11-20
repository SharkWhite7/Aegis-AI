import { Suspense } from "react";
import Link from "next/link";
import { currentPlayer } from "./_lib/session";
import { signInReadiness } from "./_lib/config";
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

  return (
    <div className="grid-12 gap-y-12">
      <div className="col-span-12 lg:col-span-7">
        <p className="t-label text-bone-dim">Signed in</p>
        <h1 className="t-display-s mt-4 text-bone">
          {player.displayName ?? player.handle}
          <span className="text-magenta">.</span>
        </h1>
        <p className="t-mono mt-3 text-bone-dim">@{player.handle}</p>

        <hr className="rule my-10" />

        <p className="t-label text-bone-dim">What is built</p>
        <p className="t-body-lg mt-4 max-w-[46ch] text-bone-dim">
          Sign-in, and nothing past it. Naming a game, choosing a voice and
          talking to it are the next piece of work — they are not here yet,
          and a button that led nowhere would be worse than this sentence.
        </p>

        <form action="/console/auth/signout" method="post" className="mt-10">
          <button type="submit" className="btn-stamp">
            Sign out
          </button>
        </form>
      </div>

      <div className="col-span-12 lg:col-span-4 lg:col-start-9">
        <Notice />
        <p className="t-micro mt-8 text-bone-dim">
          <Link href="/" className="link-wipe">
            Back to the site
          </Link>
        </p>
      </div>
    </div>
  );
}

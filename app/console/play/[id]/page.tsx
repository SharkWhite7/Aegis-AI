import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "../../_lib/config";
import { getTurns, whoAmI, type Turn } from "../../_lib/backend";
import Composer from "../../_lib/Composer";
import { finishSession } from "../../_lib/actions";

/**
 * This route is blocking rather than partially prerendered.
 *
 * Frame reads usePathname() to tell the app apart from the site, and on a
 * dynamic segment that value is only known at request time, so it cannot
 * be prerendered. The alternative Next offers — wrapping Frame in Suspense
 * — would apply to the root layout and therefore to the landing, which is
 * fully static today and must stay that way. A chat room is per-player and
 * has no useful static shell, so the cost here is nothing.
 */
export const instant = false;

export default async function PlayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<p className="t-label text-bone-dim">Opening</p>}>
      <Room sessionId={id} />
    </Suspense>
  );
}

async function Room({ sessionId }: { sessionId: string }) {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token || !(await whoAmI(token))) redirect("/console");

  const turns = await getTurns(token, sessionId);

  return (
    <div className="flex min-h-[60vh] flex-col">
      <div className="flex flex-wrap items-baseline justify-between gap-5 border-b border-line pb-5">
        <p className="t-label text-bone-dim">
          Session <span className="t-mono text-bone">{sessionId.slice(0, 8)}</span>
        </p>
        <form action={finishSessionBound.bind(null, sessionId)}>
          <button type="submit" className="btn-stamp">
            End session
          </button>
        </form>
      </div>

      <div className="flex-1 py-10">
        {turns.length === 0 ? (
          <p className="t-body-lg max-w-[44ch] text-bone-dim">
            Nothing said yet. It knows the game and it knows you; it does
            not know what you are doing right now unless you say so.
          </p>
        ) : (
          <ol className="space-y-7">
            {turns.map((turn) => (
              <li key={turn.id}>
                <Line turn={turn} />
              </li>
            ))}
          </ol>
        )}
      </div>

      <Composer sessionId={sessionId} />

      <p className="t-micro mt-8 text-bone-dim">
        Ending the session is what makes it remember:{" "}
        <Link href="/console" className="link-wipe">
          leaving without ending
        </Link>{" "}
        keeps the transcript but writes nothing down.
      </p>
    </div>
  );
}

function Line({ turn }: { turn: Turn }) {
  const mine = turn.role === "player";
  return (
    <div className="grid-12">
      <p className="t-label col-span-12 text-bone-dim lg:col-span-2">
        {mine ? "You" : "Companion"}
      </p>
      <p
        className={`col-span-12 lg:col-span-8 ${
          mine ? "t-body-lg text-bone-dim" : "t-body-lg text-bone"
        }`}
      >
        {turn.text}
      </p>
    </div>
  );
}

/**
 * `finishSession` takes (previousState, formData) so it can report an
 * error to a client component. Here there is no client component to
 * report to, so the session id is bound and the unused state supplied.
 */
async function finishSessionBound(sessionId: string, form: FormData) {
  "use server";
  form.set("sessionId", sessionId);
  await finishSession({ error: null }, form);
}

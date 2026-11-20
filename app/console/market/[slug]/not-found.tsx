import Link from "next/link";

/**
 * Reached when the service answers that no agent has this slug.
 *
 * Its own file so the reply is a real 404 and still arrives inside the
 * console's chrome, rather than falling through to the site's.
 */
export default function AgentNotFound() {
  return (
    <div className="panel p-6">
      <p className="t-label text-bone-dim">No such agent</p>
      <p className="t-body-lg mt-5 max-w-[48ch] text-bone-dim">
        The service has nothing published or drafted under that name. It may
        have been unpublished, or the link may be wrong.
      </p>
      <Link href="/console/market" className="btn-stamp mt-8">
        The ranking
        <span className="arrow" aria-hidden>
          →
        </span>
      </Link>
    </div>
  );
}

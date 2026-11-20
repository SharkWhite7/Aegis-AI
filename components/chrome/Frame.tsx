"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Decides which surface the page is: the marketing site, or the app.
 *
 * Layouts in the App Router compose rather than replace, so without this
 * every screen under /console would wear the site's nav, status bar,
 * column guides, grain and Lenis smooth scroll. Smooth scroll in
 * particular is actively wrong in a chat transcript.
 *
 * The site's chrome is passed in as already-built elements rather than
 * imported here, so it keeps rendering exactly as it did and this file
 * does not drag server components into the client bundle.
 *
 * Known cost: on an app route those elements are still built by the
 * server layout and serialised, then discarded here. They never mount, so
 * Lenis never initialises and no GSAP ticker runs — the waste is bytes,
 * not behaviour. The structural fix is a pair of route groups with
 * separate root layouts, which is worth doing once the app has enough
 * screens to justify moving the site's files.
 */
export default function Frame({
  siteBefore,
  siteAfter,
  children,
}: {
  siteBefore: ReactNode;
  siteAfter: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isApp = pathname?.startsWith("/console") ?? false;

  if (isApp) {
    // The app brings its own chrome. `main` keeps the id so the skip link
    // works on both surfaces.
    return (
      <main id="main" className="min-h-dvh">
        {children}
      </main>
    );
  }

  return (
    <>
      {siteBefore}
      <main id="main" className="pb-[var(--bar-h)]">
        {children}
      </main>
      {siteAfter}
    </>
  );
}

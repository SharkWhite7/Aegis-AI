import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Console",
  // The app is per-player and behind a sign-in; it has no business in an
  // index.
  robots: { index: false, follow: false },
};

/**
 * The app's own chrome.
 *
 * Deliberately thinner than the site's. No smooth scroll, no grain, no
 * leaf-turner: this is a tool someone keeps open beside a game, and the
 * things that make a page feel composed make an instrument feel slow.
 */
export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-ink text-bone">
      <header className="border-b border-line">
        <div className="shell flex h-[var(--nav-h)] items-center justify-between">
          <Link href="/console" className="wordmark" aria-label={`${SITE.name} console`}>
            AEGIS<span className="text-magenta">/</span>AI
          </Link>
          <nav className="flex items-center gap-7">
            <Link
              href="/console/market"
              className="t-label link-wipe text-bone-dim"
            >
              Market
            </Link>
            <span className="t-label text-bone-dim">Console</span>
          </nav>
        </div>
      </header>

      <div className="shell flex-1 py-12 lg:py-16">{children}</div>

      <footer className="border-t border-line">
        <div className="shell flex flex-wrap items-center justify-between gap-4 py-5">
          <span className="t-label text-bone-dim">
            {SITE.stage} · Build {SITE.build}
          </span>
          <Link href="/" className="t-label link-wipe text-bone-dim">
            The site
          </Link>
        </div>
      </footer>
    </div>
  );
}

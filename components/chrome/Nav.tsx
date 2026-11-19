"use client";

import { useEffect, useState } from "react";
import { NAV } from "@/lib/site";
import Wordmark from "./Wordmark";

export default function Nav() {
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 28);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-[80] border-b transition-colors duration-500 ${
        solid
          ? "border-line bg-ink"
          : "border-transparent bg-transparent"
      }`}
    >
      <div className="shell">
        <div className="grid-12 h-[var(--nav-h)] items-center">
          <div className="col-span-6 lg:col-span-3">
            <a href="#top" className="inline-block text-bone">
              <Wordmark />
            </a>
          </div>

          <nav
            aria-label="Sections"
            className="col-span-6 hidden lg:flex lg:items-baseline lg:gap-8"
          >
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="group flex items-baseline gap-2"
              >
                <span className="t-label text-bone-mute transition-colors duration-300 group-hover:text-magenta">
                  {item.n}
                </span>
                <span className="t-label text-bone-dim transition-colors duration-300 group-hover:text-bone">
                  {item.label}
                </span>
              </a>
            ))}
          </nav>

          <div className="col-span-6 flex justify-end lg:col-span-3">
            <a href="#access" className="btn-stamp">
              Request access
              <span className="arrow" aria-hidden>
                &#8594;
              </span>
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}

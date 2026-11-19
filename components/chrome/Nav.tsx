"use client";

import { useEffect, useState } from "react";
import Wordmark from "./Wordmark";
import IndexMenu from "./IndexMenu";

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
          <div className="col-span-4 lg:col-span-3">
            <a href="#top" className="inline-block text-bone">
              <Wordmark />
            </a>
          </div>

          <div className="col-span-6 hidden justify-center lg:flex">
            <IndexMenu />
          </div>

          <div className="col-span-8 flex items-center justify-end gap-7 lg:col-span-3">
            <span className="lg:hidden">
              <IndexMenu />
            </span>
            <a href="#access" className="btn-stamp">
              Where it stands
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

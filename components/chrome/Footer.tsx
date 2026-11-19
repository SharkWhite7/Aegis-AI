import Wordmark from "./Wordmark";
import { SITE, NAV } from "@/lib/site";

export default function Footer() {
  return (
    <footer className="mt-[var(--section-pad)] border-t border-line">
      <div className="shell py-14 lg:py-20">
        <div className="grid-12 gap-y-10">
          <div className="col-span-12 lg:col-span-5">
            <a href="#top" className="inline-block text-bone">
              <Wordmark />
            </a>
            <p className="t-small mt-4 max-w-[34ch] text-bone-dim">
              {SITE.tagline}
            </p>
          </div>

          <nav
            aria-label="Sections"
            className="col-span-12 sm:col-span-6 lg:col-span-3"
          >
            <p className="t-label mb-4 text-bone-mute">Sections</p>
            <ul className="space-y-2.5">
              {NAV.map((item) => (
                <li key={item.href}>
                  <a href={item.href} className="t-small link-wipe text-bone-dim">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="col-span-12 sm:col-span-6 lg:col-span-3 lg:col-start-10">
            <p className="t-label mb-4 text-bone-mute">Status</p>
            <ul className="space-y-2.5">
              <li className="t-small text-bone-dim">{SITE.stage}</li>
              <li className="t-small text-bone-dim">Build {SITE.build}</li>
              <li>
                <a href="#access" className="t-small link-wipe text-bone">
                  Ask for access
                </a>
              </li>
            </ul>
          </div>
        </div>

        <hr className="rule mt-14" />

        <div className="flex flex-col gap-4 pt-6 lg:flex-row lg:items-start lg:justify-between">
          <p className="t-small max-w-[82ch] text-bone-mute">
            {SITE.name} is an independent companion application. It is not
            affiliated with, sponsored by or endorsed by Rockstar Games,
            Take-Two Interactive, Spotify or any other company named here.
            Grand Theft Auto and all other titles and marks belong to their
            respective owners and are named only to state compatibility. No
            game file is modified, distributed or redistributed.
          </p>
          <p className="t-label shrink-0 text-bone-mute">&copy; 2026</p>
        </div>
      </div>
    </footer>
  );
}

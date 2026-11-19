"use client";

import { useState } from "react";
import Section from "@/components/primitives/Section";
import DotRow from "@/components/primitives/DotRow";
import Reveal, { MaskLine } from "@/lib/motion/Reveal";
import { SITE, ROADMAP } from "@/lib/site";

export default function Access() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "error" | "done">("idle");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = email.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
      setState("error");
      return;
    }

    // TODO: no endpoint yet — wire this to the list before launch.
    setState("done");
  }

  return (
    <Section id="access" n="06" label="Access" className="pb-0">
      <div className="grid-12 gap-y-14">
        <Reveal
          as="h2"
          className="t-display-l col-span-12 text-bone lg:col-span-7"
        >
          <MaskLine>Coming</MaskLine>
          <MaskLine>
            soon<span className="text-magenta">.</span>
          </MaskLine>
        </Reveal>

        <Reveal
          kind="fade"
          className="col-span-12 self-end md:col-span-9 lg:col-span-4 lg:col-start-9"
        >
          <p className="t-lede text-bone-dim">
            {SITE.name} is in development. Nothing is downloadable yet and there
            is no public date &mdash; when the first build goes out, this list
            gets it first.
          </p>
        </Reveal>
      </div>

      <div className="grid-12 gap-y-14 pt-16 lg:pt-20">
        {/* ── Where it is ────────────────────────────────────── */}
        <Reveal kind="fade" className="col-span-12 lg:col-span-5">
          <p className="t-label mb-6 text-bone-mute">Where it is</p>
          <ul>
            {ROADMAP.map(([item, stage]) => (
              <DotRow
                key={item}
                term={item}
                value={stage}
                accent={stage === "In build"}
                className="border-b border-line-soft"
              />
            ))}
          </ul>
          <p className="t-small mt-6 text-bone-mute">
            Entry point is GTA VI. The companion runs beside it &mdash; no mods,
            no injection, nothing written into the game.
          </p>
        </Reveal>

        {/* ── The list ───────────────────────────────────────── */}
        <Reveal
          kind="fade"
          className="col-span-12 lg:col-span-6 lg:col-start-7"
        >
          <p className="t-label mb-6 text-bone-mute">Ask for access</p>

          {state === "done" ? (
            <div className="panel px-5 py-6">
              <p className="t-head text-[1.25rem] text-bone">
                You&rsquo;re on the list.
              </p>
              <p className="t-small mt-2 text-bone-dim">
                One mail when the first build goes out. Nothing else.
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
                <label htmlFor="access-email" className="sr-only">
                  Your email
                </label>
                <input
                  id="access-email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="you@domain.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (state === "error") setState("idle");
                  }}
                  aria-invalid={state === "error"}
                  aria-describedby={state === "error" ? "access-error" : undefined}
                  className={`t-mono min-w-0 flex-1 border bg-ink-raise px-4 py-3.5 text-bone placeholder:text-bone-mute focus:outline-none focus-visible:border-magenta ${
                    state === "error" ? "border-magenta" : "border-line-hard"
                  }`}
                />
                <button type="submit" className="btn-stamp justify-center">
                  Request access
                  <span className="arrow" aria-hidden>
                    &#8594;
                  </span>
                </button>
              </div>

              <p
                id="access-error"
                role={state === "error" ? "alert" : undefined}
                className={`t-small mt-3 ${
                  state === "error" ? "text-magenta" : "text-bone-mute"
                }`}
              >
                {state === "error"
                  ? "That address is missing an @ or a domain."
                  : "No newsletter, no launch countdown. One mail, when there is something to install."}
              </p>
            </form>
          )}

          <ul className="mt-12">
            <DotRow term="Stage" value={SITE.stage} className="border-b border-line-soft" />
            <DotRow term="Platforms at launch" value="PC · macOS · iOS · Android" className="border-b border-line-soft" />
            <DotRow term="Public date" value="None announced" className="border-b border-line-soft" />
          </ul>
        </Reveal>
      </div>
    </Section>
  );
}

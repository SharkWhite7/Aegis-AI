"use client";

import { useState } from "react";
import Section from "@/components/primitives/Section";
import Console from "@/components/primitives/Console";
import DotRow from "@/components/primitives/DotRow";
import Reveal, { MaskLine } from "@/lib/motion/Reveal";
import { PERSONAS } from "@/lib/personas";

export default function CoPilot() {
  const [active, setActive] = useState(PERSONAS[0].id);
  const persona = PERSONAS.find((p) => p.id === active) ?? PERSONAS[0];

  return (
    <Section id="co-pilot" n="01" label="Co-Pilot">
      <div className="grid-12 gap-y-14">
        <Reveal
          as="h2"
          className="t-display-m col-span-12 text-bone lg:col-span-7"
        >
          <MaskLine>It speaks first</MaskLine>
          <MaskLine>
            <span className="text-magenta">&mdash;</span> you decide
          </MaskLine>
          <MaskLine>if it was right.</MaskLine>
        </Reveal>

        <Reveal
          kind="fade"
          className="col-span-12 self-end lg:col-span-4 lg:col-start-9"
        >
          <p className="t-body-lg text-bone-dim">
            Six personalities, each written on its own against one rule: you
            should be able to name the character from a single line with the
            label hidden. None of them waits to be asked.
          </p>
        </Reveal>
      </div>

      <hr className="rule mt-16 mb-0 lg:mt-20" />

      {/* Roster · dossier · transcript, snapped to columns 1, 5 and 9 */}
      <div className="grid-12 gap-y-12 pt-12">
        {/* ── Roster ─────────────────────────────────────────── */}
        <div className="col-span-12 lg:col-span-3">
          <p className="t-label mb-5 text-bone-mute">Roster</p>
          <ul>
            {PERSONAS.map((p, i) => {
              const on = p.id === persona.id;
              return (
                <li key={p.id} className={i === 0 ? "" : "border-t border-line-soft"}>
                  <button
                    type="button"
                    onClick={() => setActive(p.id)}
                    aria-pressed={on}
                    className="group flex w-full items-baseline gap-3 py-3.5 text-left"
                  >
                    <span
                      className={`t-label shrink-0 transition-colors duration-300 ${
                        on ? "text-magenta" : "text-bone-mute"
                      }`}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      className={`t-head text-[1.0625rem] transition-colors duration-300 ${
                        on
                          ? "text-bone"
                          : "text-bone-mute group-hover:text-bone-dim"
                      }`}
                    >
                      {p.name}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* ── Dossier ────────────────────────────────────────── */}
        <div className="col-span-12 md:col-span-6 lg:col-span-3 lg:col-start-5">
          <p className="t-label mb-5 text-bone-mute">Dossier</p>
          <p className="t-body-lg mb-6 text-bone">{persona.role}</p>
          <ul>
            <DotRow term="Specialty" value={persona.dossier.specialty} />
            <DotRow term="Voice" value={persona.dossier.voice} />
            <DotRow term="Toward" value={persona.dossier.toward} />
            <DotRow term="Won't" value={persona.dossier.wontDo} accent />
          </ul>
        </div>

        {/* ── Transcript ─────────────────────────────────────── */}
        <div className="col-span-12 md:col-span-6 lg:col-span-4 lg:col-start-9">
          <p className="t-label mb-5 text-bone-mute">Transcript</p>
          <Console
            key={persona.id}
            turns={persona.lines}
            title={persona.name}
            eyebrow="Session"
            footerLabel="Listening"
          />
        </div>
      </div>
    </Section>
  );
}

import Section from "@/components/primitives/Section";
import Quote from "@/components/primitives/Quote";
import Reveal, { MaskLine } from "@/lib/motion/Reveal";

/* A ledger, not a feature list. Each line is something only a companion that
   was actually there could hold. */
const LEDGER: Array<[string, string, string]> = [
  ["06", "Preference", "rear wheel drive only. turned down three rally cars."],
  ["14", "Open goal", "the beach house on ocean drive. 1.2m short."],
  ["19", "Promise", "no casino after the 42k night. you asked me to hold you to it."],
  ["23", "Pattern", "four nights on the same causeway loop."],
  ["27", "Standing", "two favours out. i keep a book."],
];

const CONTROL: Array<[string, string]> = [
  ["Yours", "Read it, export it as JSON, delete it fact by fact."],
  ["Private", "Your sessions do not train anyone's model, ours included."],
  ["Local first", "Speech is recognised on your device. Only intent leaves it."],
];

export default function Memory() {
  return (
    <Section id="memory" n="04" label="Memory">
      <div className="grid-12 gap-y-14">
        <Reveal
          as="h2"
          className="t-display-m col-span-12 text-bone lg:col-span-6"
        >
          <MaskLine>It keeps</MaskLine>
          <MaskLine>
            the record of you<span className="text-magenta">.</span>
          </MaskLine>
        </Reveal>

        <Reveal
          kind="fade"
          className="col-span-12 self-end md:col-span-8 lg:col-span-5 lg:col-start-8"
        >
          <p className="t-body-lg text-bone-dim">
            Debts, habits, the thing you swore you were done with. A session
            that starts from zero is a chatbot. This one starts from the
            twenty-six nights before it.
          </p>
        </Reveal>
      </div>

      <div className="grid-12 gap-y-14 pt-16 lg:pt-20">
        {/* ── The ledger ─────────────────────────────────────── */}
        <Reveal kind="fade" className="col-span-12 lg:col-span-7">
          <div className="flex items-baseline justify-between gap-6 pb-4">
            <p className="t-label text-bone-mute">Held</p>
            <p className="t-label text-bone-mute">Session</p>
          </div>
          <hr className="rule" />
          <ul>
            {LEDGER.map(([session, kind, text]) => (
              <li
                key={session}
                className="grid grid-cols-[auto_1fr_auto] items-baseline gap-x-5 gap-y-1 border-b border-line-soft py-4"
              >
                <span className="t-label text-magenta">{kind}</span>
                <span className="t-mono col-start-2 row-start-2 text-bone md:col-start-2 md:row-start-1">
                  {text}
                </span>
                <span className="t-label col-start-3 row-start-1 text-bone-mute">
                  {session}
                </span>
              </li>
            ))}
          </ul>
        </Reveal>

        {/* ── Control ────────────────────────────────────────── */}
        <Reveal
          kind="fade"
          className="col-span-12 lg:col-span-4 lg:col-start-9"
        >
          <p className="t-label mb-6 text-bone-mute">Who holds it</p>
          <ul>
            {CONTROL.map(([term, text], i) => (
              <li
                key={term}
                className={`py-4 ${i === 0 ? "" : "border-t border-line-soft"}`}
              >
                <p className="t-head text-[1.0625rem] text-bone">{term}</p>
                <p className="t-small mt-1.5 text-bone-dim">{text}</p>
              </li>
            ))}
          </ul>

          <Quote className="mt-12" attribution="The Companion · 01:03">
            last thursday you told me you were done with the strip. we&rsquo;re
            on the strip.
          </Quote>
        </Reveal>
      </div>
    </Section>
  );
}

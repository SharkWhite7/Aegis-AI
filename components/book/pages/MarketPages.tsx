import { SHEET, TERMS } from "@/lib/market";
import { INCLUDED, CHANGE_LINE } from "@/lib/pricing";

/** The blank sheet. The character limits are the craft constraint. */
export function Sheet() {
  return (
    <div>
      <div className="grid-12 items-end gap-y-8">
        <h2 className="t-display-m col-span-12 text-bone lg:col-span-6">
          Make the
          <br />
          Seventh<span className="text-magenta">.</span>
        </h2>
        <p className="t-body-lg col-span-12 text-bone-dim lg:col-span-5 lg:col-start-8">
          The six are not special. They are written to a sheet anyone can
          write to, and this is the whole of it.
        </p>
      </div>

      <div className="grid-12 mt-10 gap-y-12 lg:mt-12">
        <div className="col-span-12 lg:col-span-7">
          <p className="t-label text-bone-dim">Character sheet</p>
          <dl className="mt-4 border-b border-line">
            {SHEET.map((f, i) => (
              <div
                key={f.label}
                className={`flex items-baseline gap-5 py-3 ${
                  i === 0 ? "border-t border-line" : "border-t border-line-soft"
                }`}
              >
                <dt className="t-label min-w-0 text-bone sm:w-48 sm:shrink-0">
                  {f.label}
                </dt>
                {/* The rule needs slack to be a rule. Below sm there is
                    none, so label and hint share the line. */}
                <span
                  className="hidden h-px min-w-6 flex-1 -translate-y-[0.35em] bg-line-hard sm:block"
                  aria-hidden
                />
                <dd className="t-mono ml-auto shrink-0 text-right text-bone-dim sm:ml-0">
                  {f.hint}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="col-span-12 lg:col-span-4 lg:col-start-9">
          <p className="t-label text-bone-dim">Terms</p>
          <ul className="mt-4">
            {TERMS.map((t, i) => (
              <li
                key={t.n}
                className={`py-4 ${
                  i === 0 ? "border-t border-line" : "border-t border-line-soft"
                }`}
              >
                <div className="flex items-baseline gap-4">
                  <span className="t-label nums shrink-0 text-magenta">
                    {t.n}
                  </span>
                  <h3 className="t-head text-bone">{t.head}</h3>
                </div>
                <p className="t-small mt-2 text-bone-dim">{t.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/**
 * One unbroken run of what is included. No dividing rules anywhere in this
 * page — there are no tiers to divide, and the absence is the argument.
 */
export function Price() {
  return (
    <div>
      <div className="grid-12 items-end gap-y-8">
        <h2 className="t-display-m col-span-12 text-bone lg:col-span-5">
          Free.
          <br />
          Not forever<span className="text-magenta">.</span>
        </h2>
        <p className="t-body-lg col-span-12 text-bone-dim lg:col-span-6 lg:col-start-7">
          Nothing is held back for a tier that does not exist yet. There is no
          trial, no cap, and no locked row.
        </p>
      </div>

      <p className="t-head mt-10 text-bone lg:mt-12">
        {INCLUDED.map((item, i) => (
          <span key={item}>
            {i > 0 && (
              <span className="mx-3 text-bone-mute" aria-hidden>
                &middot;
              </span>
            )}
            {item}
          </span>
        ))}
      </p>

      <div className="grid-12 mt-10 gap-y-4 lg:mt-12">
        <p className="t-label col-span-12 text-bone-dim lg:col-span-3">
          What happens later
        </p>
        <p className="t-body-lg col-span-12 text-bone lg:col-span-7 lg:col-start-5">
          {CHANGE_LINE}
        </p>
      </div>
    </div>
  );
}

import type { ReactNode } from "react";
import SectionLabel from "./SectionLabel";

/**
 * The shell every section from 02 onward sits in: an id to anchor the nav,
 * the fluid rhythm token, and the numbered label in its standing position.
 * The hero is deliberately NOT built on this — it owns its own full-height
 * composition.
 */
export default function Section({
  id,
  n,
  label,
  children,
  className = "",
  hairline = true,
}: {
  id: string;
  n: string;
  label: string;
  children: ReactNode;
  className?: string;
  hairline?: boolean;
}) {
  return (
    <section
      id={id}
      className={`relative py-[var(--section-pad)] ${className}`}
    >
      <div className="shell">
        {hairline && <hr className="rule mb-7" />}
        <SectionLabel n={n} className="mb-8 lg:mb-10">
          {label}
        </SectionLabel>
        {children}
      </div>
    </section>
  );
}

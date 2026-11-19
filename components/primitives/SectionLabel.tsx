import type { ReactNode } from "react";

export default function SectionLabel({
  n,
  children,
  className = "",
}: {
  n: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span className="t-label text-magenta">{n}</span>
      <span className="h-px w-8 bg-line-hard" aria-hidden />
      <span className="t-label text-bone-dim">{children}</span>
    </div>
  );
}

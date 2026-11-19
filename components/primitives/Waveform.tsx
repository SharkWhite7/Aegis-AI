/* Deterministic bar heights — a random array would desync on hydration. */
const BARS = [
  18, 42, 26, 64, 38, 88, 54, 30, 72, 46, 22, 58, 80, 34, 48, 68, 26, 52, 40,
  76, 30, 60, 20, 44, 84, 36, 56, 24, 70, 32,
];

export default function Waveform({
  active = true,
  className = "",
}: {
  active?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`flex h-6 items-end gap-[2px] ${className}`}
      aria-hidden
    >
      {BARS.map((h, i) => (
        <span
          key={i}
          className={active ? "wave-bar" : ""}
          style={{
            height: `${h}%`,
            width: "2px",
            background: "var(--color-magenta)",
            opacity: 0.55,
            animationDelay: `${(i % 10) * 0.11}s`,
          }}
        />
      ))}
    </div>
  );
}

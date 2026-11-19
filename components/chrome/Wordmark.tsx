export default function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`wordmark ${className}`} aria-label="VICE AI">
      <span aria-hidden>VICE</span>
      <span aria-hidden className="mx-[0.14em] text-magenta">
        /
      </span>
      <span aria-hidden>AI</span>
    </span>
  );
}

/**
 * The non-affiliation notice.
 *
 * Flagged on day one in docs/handover.md and never built. It matters more
 * here than on the marketing page: the app is the half that runs beside
 * somebody else's game, so this is where a player sees it.
 */
export default function Notice() {
  return (
    <p className="t-micro max-w-[46ch] text-bone-dim">
      AEGIS AI is an independent companion. It is not affiliated with,
      endorsed by, or connected to any game publisher. It reads nothing
      from a game and writes nothing to one. Game titles are named only to
      say what it has been told about.
    </p>
  );
}

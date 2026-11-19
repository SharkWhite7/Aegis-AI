/**
 * A line of co-pilot speech, set as display type. Lowercase is deliberate —
 * it is how every character on the site talks, and the one typographic
 * signal that these words are spoken rather than written at the reader.
 */
export default function Quote({
  children,
  attribution,
  className = "",
}: {
  children: string;
  attribution?: string;
  className?: string;
}) {
  return (
    <figure className={className}>
      <blockquote className="t-display-s lowercase text-bone">
        &ldquo;{children}&rdquo;
      </blockquote>
      {attribution && (
        <figcaption className="t-label mt-5 text-bone-mute">
          {attribution}
        </figcaption>
      )}
    </figure>
  );
}

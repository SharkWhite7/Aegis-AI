/**
 * What used to be each section's display headline and lede. Demoted to
 * `t-head` because the section above now owns the display line — the copy
 * is unchanged, only its rank is.
 */
export default function PanelHead({
  head,
  lede,
}: {
  head: string;
  lede: string;
}) {
  return (
    <div className="grid-12 items-end gap-y-5">
      <h3 className="t-head col-span-12 text-bone lg:col-span-5">
        {head}
        <span className="text-magenta">.</span>
      </h3>
      <p className="t-body-lg col-span-12 text-bone-dim lg:col-span-6 lg:col-start-7">
        {lede}
      </p>
    </div>
  );
}

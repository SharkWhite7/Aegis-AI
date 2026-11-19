import BuildBar from "@/components/sections/access/BuildBar";

/**
 * The last leaf. No mailing list and no date — what it carries is the
 * build bar, which is the only honest answer to "when".
 */
export default function Access() {
  return (
    <div>
      <div className="grid-12 items-end gap-y-8">
        <h2 className="t-display-m col-span-12 text-bone lg:col-span-5">
          Not open
          <br />
          Yet<span className="text-magenta">.</span>
        </h2>
        <p className="t-body-lg col-span-12 text-bone-dim lg:col-span-6 lg:col-start-7">
          No launch date yet, and this page will not invent one. What it shows
          is where the build actually stands.
        </p>
      </div>

      <div className="grid-12 mt-8 lg:mt-10">
        <div className="col-span-12 lg:col-span-8">
          <BuildBar />
        </div>
      </div>
    </div>
  );
}

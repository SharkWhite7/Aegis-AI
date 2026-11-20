"use client";

import { useActionState } from "react";
import { changeVisibility } from "./actions";
import { NO_STATE } from "./state";

/**
 * Publish or unpublish one of your own agents.
 *
 * Which way it goes is read from the agent's current visibility as the
 * page last saw it, so the button cannot offer "publish" on something the
 * service already has published.
 *
 * Success is reported by the row itself moving between the Drafts and
 * Published groups, which is the server's own answer re-rendered. There is
 * deliberately no "done" message: the move unmounts this component and a
 * remounted one has no state, so a success note here would be written and
 * then thrown away in the same instant. Observed in a browser — the note
 * this component used to render never survived long enough to be read.
 *
 * A failure does not move the row, so the component stays mounted and the
 * error below is the only feedback there is. That one has to be here.
 */
export default function VisibilityButton({
  agentId,
  visibility,
}: {
  agentId: string;
  visibility: "draft" | "published";
}) {
  const [state, action, pending] = useActionState(changeVisibility, NO_STATE);
  const publishing = visibility === "draft";

  return (
    <div>
      <form action={action}>
        <input type="hidden" name="agentId" value={agentId} />
        <input
          type="hidden"
          name="intent"
          value={publishing ? "publish" : "unpublish"}
        />
        <button type="submit" className="btn-stamp" disabled={pending}>
          {pending ? "Working" : publishing ? "Publish" : "Unpublish"}
        </button>
      </form>

      {state.error ? (
        <p role="alert" className="t-small mt-3 max-w-[40ch] text-magenta">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}

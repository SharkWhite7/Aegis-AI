"use client";

import { useActionState } from "react";
import { toggleStar } from "./actions";
import { NO_STATE } from "./state";

/**
 * The star control.
 *
 * `starred` and `starCount` are what the page read off the service on its
 * last render, and this component displays them unchanged. It does not
 * keep its own copy, does not flip the label on click, and does not
 * increment the count: the action writes, `revalidatePath` makes the page
 * re-read, and the new props are what appear. So the button is either
 * showing the service's answer or showing that it is waiting for one.
 *
 * The cost is a visible wait on a slow network. The alternative — guess
 * now, correct later — can show "Starred, 12" against a service that
 * holds 11 and no star, and in a ranking sorted on that number a wrong
 * one is worse than a slow one.
 */
export default function StarButton({
  agentId,
  slug,
  starred,
  starCount,
}: {
  agentId: string;
  slug: string;
  starred: boolean;
  starCount: number;
}) {
  const [state, action, pending] = useActionState(toggleStar, NO_STATE);

  return (
    <div>
      <form action={action} className="flex flex-wrap items-center gap-5">
        <input type="hidden" name="agentId" value={agentId} />
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="intent" value={starred ? "unstar" : "star"} />
        <button
          type="submit"
          className="btn-stamp"
          disabled={pending}
          aria-pressed={starred}
        >
          {pending ? "Asking" : starred ? "Starred — remove" : "Star this"}
        </button>
        <p className="t-label text-bone-dim">
          <span className="nums text-bone">{starCount}</span>{" "}
          {starCount === 1 ? "star" : "stars"}
          {pending ? " · reading back" : null}
        </p>
      </form>

      {state.error ? (
        <p role="alert" className="t-small mt-4 text-magenta">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}

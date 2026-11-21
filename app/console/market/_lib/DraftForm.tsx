"use client";

import { useActionState, useId } from "react";
import { writeDraft } from "./actions";
import { NO_STATE } from "./state";

/**
 * Writing an agent.
 *
 * Three fields, because an agent is three things: what it is called, what
 * it does, and what it is told. The third is the one that matters — it is
 * the instruction that reaches the model — so it gets the room.
 *
 * The limits in the labels are the service's own (name 2-60, role 2-80,
 * brief 20-2000) and are mirrored onto the inputs so the browser can
 * catch a violation before a round trip. They are a convenience, not the
 * rule: the service checks again and its message is what gets shown.
 */
export default function DraftForm() {
  const [state, action, pending] = useActionState(writeDraft, NO_STATE);
  const nameId = useId();
  const roleId = useId();
  const briefId = useId();

  return (
    <form action={action} className="grid-12 gap-y-10">
      <div className="col-span-12 lg:col-span-5">
        <label htmlFor={nameId} className="t-label block text-bone-dim">
          Name
        </label>
        <input
          id={nameId}
          name="name"
          type="text"
          defaultValue={state.draft?.name ?? ""}
          required
          minLength={2}
          maxLength={60}
          autoComplete="off"
          placeholder="what it is called"
          className="field-line t-head mt-4"
        />
        <p className="t-micro mt-4 text-bone-dim">2 to 60 characters.</p>
      </div>

      <div className="col-span-12 lg:col-span-6 lg:col-start-7">
        <label htmlFor={roleId} className="t-label block text-bone-dim">
          Role
        </label>
        <input
          id={roleId}
          name="role"
          type="text"
          defaultValue={state.draft?.role ?? ""}
          required
          minLength={2}
          maxLength={80}
          autoComplete="off"
          placeholder="one line on what it does"
          className="field-line t-lede mt-4"
        />
        <p className="t-micro mt-4 text-bone-dim">2 to 80 characters.</p>
      </div>

      <div className="col-span-12 lg:col-span-8">
        <label htmlFor={briefId} className="t-label block text-bone-dim">
          Persona brief
        </label>
        <textarea
          id={briefId}
          name="personaBrief"
          defaultValue={state.draft?.personaBrief ?? ""}
          required
          minLength={20}
          maxLength={2000}
          rows={9}
          spellCheck
          placeholder="write it in the second person — you are…"
          className="field-line t-body-lg mt-4 resize-y"
        />
        <p className="t-small mt-4 max-w-[58ch] text-bone-dim">
          20 to 2,000 characters. This is not a description of the agent —
          it is the instruction the model is given, verbatim, every turn.
          Write what it should do and refuse, not what it is like.
        </p>
      </div>

      <div className="col-span-12">
        {state.error ? (
          <p role="alert" className="t-small mb-5 max-w-[58ch] text-magenta">
            {state.error}
          </p>
        ) : null}
        {state.note ? (
          <p role="status" className="t-small mb-5 max-w-[58ch] text-bone-dim">
            {state.note}
          </p>
        ) : null}
        <button type="submit" className="btn-stamp" disabled={pending}>
          {pending ? "Saving" : "Save as draft"}
          <span className="arrow" aria-hidden>
            →
          </span>
        </button>
      </div>
    </form>
  );
}

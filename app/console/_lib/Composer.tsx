"use client";

import { useActionState, useEffect, useRef } from "react";
import { sendTurn, type FormState } from "./actions";

const INITIAL: FormState = { error: null };

/**
 * The line the player types.
 *
 * Clears itself only once the turn has actually gone through, so a failed
 * send does not quietly eat what somebody wrote.
 */
export default function Composer({ sessionId }: { sessionId: string }) {
  const [state, action, pending] = useActionState(sendTurn, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && state.error === null) {
      formRef.current?.reset();
      inputRef.current?.focus();
    }
    wasPending.current = pending;
  }, [pending, state.error]);

  return (
    <form ref={formRef} action={action} className="border-t border-line pt-6">
      <input type="hidden" name="sessionId" value={sessionId} />
      <div className="flex items-end gap-5">
        <input
          ref={inputRef}
          name="text"
          type="text"
          placeholder="say something"
          autoComplete="off"
          maxLength={2000}
          disabled={pending}
          className="field-line t-body-lg"
          aria-label="Your message"
        />
        <button type="submit" className="btn-stamp shrink-0" disabled={pending}>
          {pending ? "Sending" : "Send"}
        </button>
      </div>
      {state.error ? (
        <p role="alert" className="t-small mt-4 text-magenta">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Phase = "idle" | "sending" | "streaming";

/**
 * The line the player types, and the reply as it arrives.
 *
 * The in-flight exchange is rendered here rather than in the transcript
 * above, because until the turn finishes it exists only in this
 * component. Once the stream ends the page is refreshed and the
 * authoritative transcript takes over — the optimistic pair is only
 * dropped after that, so nothing blinks out and back.
 */
export default function Composer({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [said, setSaid] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [refreshing, startRefresh] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const busy = phase !== "idle" || refreshing;

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = inputRef.current;
    const text = input?.value.trim() ?? "";
    if (text.length === 0 || busy) return;

    setError(null);
    setSaid(text);
    setReply("");
    setPhase("sending");
    if (input) input.value = "";

    let response: Response;
    try {
      response = await fetch("/console/api/turn", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId, text }),
      });
    } catch {
      // The player's words are not lost: they go back in the box.
      return fail("The companion could not be reached.", input, text);
    }

    if (!response.ok || !response.body) {
      const detail = await response.json().catch(() => null);
      return fail(
        (detail as { message?: string } | null)?.message ??
          `The turn failed (${response.status}).`,
        input,
        text,
      );
    }

    setPhase("streaming");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffered = "";
    let refused = false;

    // Newline-delimited JSON: a chunk can split a line, so whatever
    // follows the last newline is kept for the next read.
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffered += decoder.decode(value, { stream: true });
      const lines = buffered.split("\n");
      buffered = lines.pop() ?? "";
      for (const line of lines) {
        if (line.trim().length === 0) continue;
        try {
          const event = JSON.parse(line) as
            | { type: "delta"; text: string }
            | { type: "done"; refused: boolean }
            | { type: "player" };
          if (event.type === "delta") setReply((r) => r + event.text);
          else if (event.type === "done") refused = event.refused;
        } catch {
          // A malformed line is skipped rather than killing the turn.
        }
      }
    }

    if (refused) setError("It did not answer that one.");

    // Pull the real transcript, then drop the optimistic pair.
    startRefresh(() => {
      router.refresh();
      setPhase("idle");
      setSaid(null);
      setReply("");
      inputRef.current?.focus();
    });
  }

  function fail(message: string, input: HTMLInputElement | null, text: string) {
    setError(message);
    setPhase("idle");
    setSaid(null);
    setReply("");
    if (input) input.value = text;
  }

  return (
    <div>
      {said !== null ? (
        <ol className="mb-10 space-y-7">
          <li className="grid-12">
            <p className="t-label col-span-12 text-bone-dim lg:col-span-2">You</p>
            <p className="t-body-lg col-span-12 text-bone-dim lg:col-span-8">{said}</p>
          </li>
          <li className="grid-12">
            <p className="t-label col-span-12 text-bone-dim lg:col-span-2">
              Companion
            </p>
            <p className="t-body-lg col-span-12 text-bone lg:col-span-8">
              {reply}
              {phase !== "idle" ? (
                <span className="dot-live ml-1 align-middle" aria-hidden />
              ) : null}
            </p>
          </li>
        </ol>
      ) : null}

      <form onSubmit={send} className="border-t border-line pt-6">
        <div className="flex items-end gap-5">
          <input
            ref={inputRef}
            name="text"
            type="text"
            placeholder="say something"
            autoComplete="off"
            maxLength={2000}
            disabled={busy}
            className="field-line t-body-lg"
            aria-label="Your message"
          />
          <button type="submit" className="btn-stamp shrink-0" disabled={busy}>
            {phase === "streaming" ? "Listening" : busy ? "Sending" : "Send"}
          </button>
        </div>
        {error ? (
          <p role="alert" className="t-small mt-4 text-magenta">
            {error}
          </p>
        ) : null}
      </form>
    </div>
  );
}

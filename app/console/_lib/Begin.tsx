"use client";

import { useActionState, useId, useState } from "react";
import { beginSession, type FormState } from "./actions";
import type { Agent } from "./backend";

const INITIAL: FormState = { error: null };

/**
 * The first two steps of the funnel, on one screen: name a game, pick a
 * voice. They are together because neither is interesting alone and the
 * pair is the whole setup the brief promises.
 */
export default function Begin({ agents }: { agents: Agent[] }) {
  const [state, action, pending] = useActionState(beginSession, INITIAL);
  const [chosen, setChosen] = useState(agents[0]?.id ?? "");
  const titleId = useId();

  return (
    <form action={action} className="grid-12 gap-y-14">
      <div className="col-span-12 lg:col-span-5">
        <label htmlFor={titleId} className="t-label block text-bone-dim">
          Your game
        </label>
        <input
          id={titleId}
          name="gameTitle"
          type="text"
          placeholder="type a title"
          autoComplete="off"
          spellCheck={false}
          required
          minLength={2}
          maxLength={120}
          className="field-line t-head mt-4"
        />
        <p className="t-small mt-5 max-w-[40ch] text-bone-dim">
          Any title. There is no supported-games list to be on — a profile
          is written the first time a title is named, and nothing is read
          from the game.
        </p>
      </div>

      <fieldset className="col-span-12 lg:col-span-6 lg:col-start-7">
        <legend className="t-label text-bone-dim">The voice</legend>
        <ul className="mt-4">
          {agents.map((agent) => {
            const selected = chosen === agent.id;
            return (
              <li key={agent.id} className="border-t border-line last:border-b">
                <label
                  className={`flex cursor-pointer items-baseline gap-4 py-4 transition-colors duration-200 ${
                    selected ? "text-bone" : "text-bone-dim hover:text-bone"
                  }`}
                >
                  <input
                    type="radio"
                    name="agentId"
                    value={agent.id}
                    checked={selected}
                    onChange={() => setChosen(agent.id)}
                    className="sr-only"
                  />
                  <span
                    aria-hidden
                    className={`mt-1.5 h-2 w-2 shrink-0 ${
                      selected ? "bg-magenta" : "bg-line-hard"
                    }`}
                  />
                  <span className="min-w-0">
                    <span className="t-head block leading-none">{agent.name}</span>
                    <span className="t-small mt-2 block text-bone-dim">
                      {agent.role}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <div className="col-span-12">
        {state.error ? (
          <p role="alert" className="t-small mb-5 text-magenta">
            {state.error}
          </p>
        ) : null}
        <button type="submit" className="btn-stamp" disabled={pending}>
          {pending ? "Starting" : "Begin"}
          <span className="arrow" aria-hidden>
            →
          </span>
        </button>
      </div>
    </form>
  );
}

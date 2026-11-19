"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import Console from "@/components/primitives/Console";
import { GAMES, DEFAULT_GAME } from "@/lib/games";

/**
 * The hero's proof that the product is not tied to one title. Changing the
 * game rewrites the transcript in that world — the claim demonstrates
 * itself rather than being asserted in copy, which is the one thing the
 * brief forbids.
 *
 * All four transcripts stay mounted in a single grid cell, so the stack
 * always measures the tallest and switching never moves the page. Only the
 * active one is visible and reachable.
 */
export default function GameConsole() {
  const [active, setActive] = useState(DEFAULT_GAME);
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);

  const select = (i: number) => {
    setActive(GAMES[i].id);
    buttons.current[i]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = GAMES.findIndex((g) => g.id === active);
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        select((i + 1) % GAMES.length);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        select((i - 1 + GAMES.length) % GAMES.length);
        break;
      case "Home":
        e.preventDefault();
        select(0);
        break;
      case "End":
        e.preventDefault();
        select(GAMES.length - 1);
        break;
    }
  };

  return (
    <div>
      <div className="grid">
        {GAMES.map((game, i) => (
          <div
            key={game.id}
            className="col-start-1 row-start-1"
            style={{ visibility: game.id === active ? "visible" : "hidden" }}
            aria-hidden={game.id !== active}
          >
            <Console
              turns={game.turns}
              title={game.persona}
              nowPlaying={game.nowPlaying}
              active={game.id === active}
              animateOnBoot={i === 0}
              delay={0.95}
            />
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <span className="t-label shrink-0 text-bone-dim">Playing</span>
        <div
          role="radiogroup"
          aria-label="Game"
          onKeyDown={onKeyDown}
          className="flex flex-wrap items-baseline gap-x-6 gap-y-2"
        >
          {GAMES.map((game, i) => (
            <button
              key={game.id}
              ref={(el) => {
                buttons.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={game.id === active}
              tabIndex={game.id === active ? 0 : -1}
              onClick={() => setActive(game.id)}
              className={`t-label game-pick ${
                game.id === active ? "text-bone" : "text-bone-dim"
              }`}
            >
              {game.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Deterministic stub adapter.
 *
 * Exists so the whole turn loop, the generator and the HTTP surface can be
 * tested without a network call, a credential or a bill. Its replies are
 * derived from a hash of the input, so a test that passes once passes
 * every time.
 *
 * It is not a simulation of quality. It proves the plumbing, and nothing
 * about whether the voice is any good — that judgement needs the real
 * model and a person listening.
 */

import { createHash } from "node:crypto";
import type {
  ModelAdapter,
  SpeakRequest,
  SpeakResult,
  StructuredRequest,
  StructuredResult,
} from "./adapter.ts";

const digest = (s: string): string =>
  createHash("sha256").update(s).digest("hex");

export type StubOptions = {
  /** Force a policy refusal, to exercise the refusal path. */
  refuse?: boolean;
  /** Override the structured payload, to exercise validation failures. */
  structuredPayload?: unknown;
};

export class StubModelAdapter implements ModelAdapter {
  readonly id = "stub";
  readonly #opts: StubOptions;

  constructor(opts: StubOptions = {}) {
    this.#opts = opts;
  }

  async speak(req: SpeakRequest): Promise<SpeakResult> {
    if (this.#opts.refuse) {
      return { text: "", modelId: this.id, refused: true };
    }
    const last = req.messages.at(-1);
    const h = digest(
      req.systemStable + req.systemVolatile + (last?.text ?? ""),
    ).slice(0, 8);
    return {
      text: `stub reply ${h}`,
      modelId: this.id,
      refused: false,
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  }

  async structured(req: StructuredRequest): Promise<StructuredResult> {
    if (this.#opts.refuse) {
      return { data: null, modelId: this.id, refused: true };
    }
    if ("structuredPayload" in this.#opts) {
      return { data: this.#opts.structuredPayload, modelId: this.id, refused: false };
    }

    // The stub serves two different structured callers, so it switches on
    // the schema it was handed rather than guessing from the prompt.
    const props = (req.schema["properties"] ?? {}) as Record<string, unknown>;
    if ("summary" in props && "memories" in props) {
      // A debrief. Deterministic and deliberately thin: one memory and a
      // summary derived from the transcript's hash, enough to prove the
      // path end to end without pretending to be good at the job.
      const h = digest(req.prompt).slice(0, 8);
      return {
        data: {
          summary: `stub summary ${h}`,
          memories: [
            {
              kind: "event",
              text: `stub memory ${h}`,
              salience: 0.5,
              supersedesId: null,
            },
          ],
        },
        modelId: this.id,
        refused: false,
      };
    }
    // Default: withhold everything. The honest answer for a stub that knows
    // nothing about any game, and it keeps the generator's safe path the
    // one exercised by default.
    return {
      data: {
        status: "unknown",
        fields: {
          world: { value: null, provenance: "withheld", confidence: 0 },
          economy: { value: null, provenance: "withheld", confidence: 0 },
          traversal: { value: null, provenance: "withheld", confidence: 0 },
          pressure: { value: null, provenance: "withheld", confidence: 0 },
          vocabulary: { value: null, provenance: "withheld", confidence: 0 },
          leadVoice: { value: null, provenance: "withheld", confidence: 0 },
        },
      },
      modelId: this.id,
      refused: false,
    };
  }
}

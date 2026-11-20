/**
 * The model seam.
 *
 * Inference is managed: AEGIS AI holds the credential and the player never
 * sees a key, a provider or a model name. There is no bring-your-own-key
 * path and this interface deliberately offers nowhere to put one.
 *
 * Two shapes, because the two callers want different guarantees:
 *
 *  - `speak`      the companion's voice. Latency-bound, short output.
 *  - `structured` the profile generator. Correctness-bound, runs once per
 *                 title, and its result is validated before storage.
 */

export type SpeakMessage = { role: "player" | "copilot"; text: string };

export type SpeakRequest = {
  /** Stable across the session: profile + agent voice. Cached upstream. */
  systemStable: string;
  /** Rebuilt every turn: memory digest + live context. */
  systemVolatile: string;
  messages: SpeakMessage[];
  maxTokens?: number;
};

export type SpeakResult = {
  text: string;
  modelId: string;
  /** True when the provider declined the request on policy grounds. */
  refused: boolean;
  usage?: { inputTokens: number; outputTokens: number } | undefined;
};

export type StructuredRequest = {
  system: string;
  prompt: string;
  /** JSON Schema the response must satisfy. */
  schema: Record<string, unknown>;
  maxTokens?: number;
};

export type StructuredResult = {
  data: unknown;
  modelId: string;
  refused: boolean;
};

/**
 * What a streaming reply emits.
 *
 * `done` always arrives last on a stream that ran to completion, and
 * carries what the whole-reply shape would have reported. A stream the
 * consumer abandons simply stops; the caller is responsible for what it
 * already received.
 */
export type SpeakEvent =
  | { type: "delta"; text: string }
  | {
      type: "done";
      modelId: string;
      refused: boolean;
      usage?: { inputTokens: number; outputTokens: number } | undefined;
    };

export interface ModelAdapter {
  /** Identifies the adapter in stored rows, e.g. "stub" or a model id. */
  readonly id: string;
  /**
   * The companion speaking, a piece at a time.
   *
   * This is the primitive: `speak` below is the same thing drained. Voice
   * cannot start playing until text starts arriving, so everything that
   * matters later is built on this rather than on the whole-reply form.
   */
  speakStream(req: SpeakRequest): AsyncIterable<SpeakEvent>;
  speak(req: SpeakRequest): Promise<SpeakResult>;
  structured(req: StructuredRequest): Promise<StructuredResult>;
}

/**
 * Drains a stream into the whole-reply shape.
 *
 * Shared so an adapter has one real implementation of speaking rather
 * than two that can drift apart.
 */
export async function drain(
  stream: AsyncIterable<SpeakEvent>,
): Promise<SpeakResult> {
  let text = "";
  let modelId = "unknown";
  let refused = false;
  let usage: SpeakResult["usage"];
  for await (const event of stream) {
    if (event.type === "delta") text += event.text;
    else {
      modelId = event.modelId;
      refused = event.refused;
      usage = event.usage;
    }
  }
  return { text: text.trim(), modelId, refused, usage };
}

/** Raised when the provider declines; callers must not invent a reply. */
export class ModelRefusedError extends Error {
  constructor(message = "the model declined this request") {
    super(message);
    this.name = "ModelRefusedError";
  }
}

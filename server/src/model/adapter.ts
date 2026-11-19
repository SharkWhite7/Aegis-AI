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

export interface ModelAdapter {
  /** Identifies the adapter in stored rows, e.g. "stub" or a model id. */
  readonly id: string;
  speak(req: SpeakRequest): Promise<SpeakResult>;
  structured(req: StructuredRequest): Promise<StructuredResult>;
}

/** Raised when the provider declines; callers must not invent a reply. */
export class ModelRefusedError extends Error {
  constructor(message = "the model declined this request") {
    super(message);
    this.name = "ModelRefusedError";
  }
}

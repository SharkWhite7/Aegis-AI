/**
 * The managed-inference adapter.
 *
 * Every binding used here was checked against the installed SDK's own type
 * declarations (@anthropic-ai/sdk 0.74.0) rather than recalled:
 *
 *   - `thinking: { type: "adaptive" }`            ThinkingConfigAdaptive
 *   - `output_config.effort`                      "low"|"medium"|"high"|"max"
 *     (this SDK has no "xhigh" — do not add it without checking again)
 *   - `output_config.format`                      { type: "json_schema", schema }
 *
 * Server-side refusal fallbacks are deliberately absent: `fallbacks` does
 * not exist anywhere in 0.74.0's params, so there is nothing to send. A
 * refusal is surfaced as a refusal instead of being papered over, which is
 * the behaviour that matters — the caller must never invent a reply. Revisit
 * when the SDK is upgraded.
 */

import Anthropic from "@anthropic-ai/sdk";
import { drain, type SpeakEvent } from "./adapter.ts";
import type {
  ModelAdapter,
  SpeakRequest,
  SpeakResult,
  StructuredRequest,
  StructuredResult,
} from "./adapter.ts";

/** The default model. Overridden only by explicit configuration. */
export const DEFAULT_MODEL = "claude-opus-5-5";

export type AnthropicAdapterOptions = {
  client?: Anthropic;
  model?: string;
  /**
   * Chat runs at low effort on purpose. A companion that answers three
   * seconds late is not the product, and chat is the workload where lower
   * effort costs the least quality.
   */
  speakEffort?: "low" | "medium" | "high" | "max";
  /**
   * Generation runs high: it happens once per title, the result is cached
   * forever, and a wrong field compounds across every future session.
   */
  structuredEffort?: "low" | "medium" | "high" | "max";
};

const textOf = (content: Anthropic.ContentBlock[]): string =>
  content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

export class AnthropicModelAdapter implements ModelAdapter {
  readonly id: string;
  readonly #client: Anthropic;
  readonly #model: string;
  readonly #speakEffort: "low" | "medium" | "high" | "max";
  readonly #structuredEffort: "low" | "medium" | "high" | "max";

  constructor(opts: AnthropicAdapterOptions = {}) {
    // Zero-arg construction resolves the credential from the environment.
    // The player never supplies one; there is no path for them to.
    this.#client = opts.client ?? new Anthropic();
    this.#model = opts.model ?? DEFAULT_MODEL;
    this.#speakEffort = opts.speakEffort ?? "low";
    this.#structuredEffort = opts.structuredEffort ?? "high";
    this.id = this.#model;
  }

  /**
   * The stable half carries the cache breakpoint: game profile and agent
   * voice do not change within a session, so they are a reusable prefix.
   * The volatile half (memory digest, live context) is rebuilt per turn
   * and must sit after it, or it would invalidate the cache every turn.
   */
  #request(req: SpeakRequest) {
    const system: Anthropic.TextBlockParam[] = [
      {
        type: "text",
        text: req.systemStable,
        cache_control: { type: "ephemeral" },
      },
      { type: "text", text: req.systemVolatile },
    ];
    return {
      model: this.#model,
      max_tokens: req.maxTokens ?? 1024,
      thinking: { type: "adaptive" as const },
      output_config: { effort: this.#speakEffort },
      system,
      messages: req.messages.map((m) => ({
        role: m.role === "player" ? ("user" as const) : ("assistant" as const),
        content: m.text,
      })),
    };
  }

  /**
   * Streaming is the primitive here, not an extra.
   *
   * Bindings checked against the installed SDK rather than recalled:
   * `client.messages.stream()` returns a MessageStream that is an
   * AsyncIterable of events and exposes finalMessage(); a text delta
   * arrives as `content_block_delta` carrying `delta.text`.
   */
  async *speakStream(req: SpeakRequest): AsyncGenerator<SpeakEvent> {
    const stream = this.#client.messages.stream(this.#request(req));

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        yield { type: "delta", text: event.delta.text };
      }
    }

    const final = await stream.finalMessage();
    // A refusal arrives as a stop reason on a 200, so it is read here
    // rather than caught: the caller must not put words in the
    // companion's mouth, and partial text before a refusal is not a reply.
    yield {
      type: "done",
      modelId: final.model,
      refused: final.stop_reason === "refusal",
      usage: {
        inputTokens: final.usage.input_tokens,
        outputTokens: final.usage.output_tokens,
      },
    };
  }

  async speak(req: SpeakRequest): Promise<SpeakResult> {
    return drain(this.speakStream(req));
  }

  async structured(req: StructuredRequest): Promise<StructuredResult> {
    const response = await this.#client.messages.create({
      model: this.#model,
      max_tokens: req.maxTokens ?? 4096,
      thinking: { type: "adaptive" },
      output_config: {
        effort: this.#structuredEffort,
        format: { type: "json_schema", schema: req.schema },
      },
      system: req.system,
      messages: [{ role: "user", content: req.prompt }],
    });

    if (response.stop_reason === "refusal") {
      return { data: null, modelId: response.model, refused: true };
    }

    const raw = textOf(response.content);
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      // Structured outputs should make this unreachable. If it happens we
      // report it rather than salvage a guess out of a broken payload.
      throw new Error(
        `model returned unparseable JSON (${raw.length} chars) for profile generation`,
      );
    }
    return { data, modelId: response.model, refused: false };
  }
}

/** True when a credential is resolvable without constructing a client. */
export const hasManagedCredential = (): boolean =>
  Boolean(process.env["ANTHROPIC_API_KEY"] ?? process.env["ANTHROPIC_AUTH_TOKEN"]);

// Every agent call goes through here: timeout, zod validation (+1 retry), agent_runs logging,
// and the cached fallback (no key, DEMO_MODE=cached, timeout, refusal or error).
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import { getRepo } from "../db/repo";
import { lookupCache } from "./cache";
import { getDemoMode } from "./mode";
import type { AgentRun } from "../types";

export const AGENT_TIMEOUT_MS = 25_000;
type Source = AgentRun["source"];

let client: Anthropic | null = null;
export const anthropic = () => (client ??= new Anthropic({ maxRetries: 0 }));

export interface AgentResult<T> { data: T; cached: boolean; latencyMs: number; error?: string }

export async function logRun(run: Omit<AgentRun, "id" | "createdAt">) {
  try {
    const repo = await getRepo();
    await repo.agentRuns.insert({
      ...run,
      id: `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
    });
  } catch {
    // logging must never break the demo
  }
}

export async function runAgent<S extends z.ZodType>(opts: {
  agent: string;
  model: string;
  system: string;
  input: unknown;
  /** User message content; defaults to JSON of input. */
  user?: string;
  schema: S;
  source: Source;
  effort?: "low" | "medium" | "high";
  maxTokens?: number;
  /** Deterministic offline fallback used when there is no exact cache hit. */
  fallback?: (input: unknown) => z.infer<S> | null;
  forceCached?: boolean;
}): Promise<AgentResult<z.infer<S>>> {
  const t0 = Date.now();
  const mode = opts.forceCached ? "cached" : await getDemoMode();
  let error: string | undefined;

  if (mode === "live") {
    try {
      const data = await callStructured(opts);
      const latencyMs = Date.now() - t0;
      await logRun({ agent: opts.agent, model: opts.model, source: opts.source, input: opts.input, output: data, latencyMs, cached: false });
      return { data, cached: false, latencyMs };
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }

  const data = cachedOutput(opts);
  const latencyMs = Date.now() - t0;
  await logRun({ agent: opts.agent, model: opts.model, source: opts.source, input: opts.input, output: data, latencyMs, cached: true });
  return { data, cached: true, latencyMs, error };
}

function cachedOutput<S extends z.ZodType>(opts: { agent: string; input: unknown; schema: S; fallback?: (i: unknown) => z.infer<S> | null }): z.infer<S> {
  const exact = lookupCache(opts.agent, opts.input, { exactOnly: true });
  if (exact) return opts.schema.parse(exact.output);
  const fb = opts.fallback?.(opts.input);
  if (fb) return fb;
  const near = lookupCache(opts.agent, opts.input);
  if (near) return opts.schema.parse(near.output);
  throw new Error(`No cached output for ${opts.agent}`);
}

async function callStructured<S extends z.ZodType>(opts: {
  model: string; system: string; input: unknown; user?: string; schema: S; effort?: "low" | "medium" | "high"; maxTokens?: number;
}): Promise<z.infer<S>> {
  const user = opts.user ?? JSON.stringify(opts.input);
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: user }];
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await anthropic().messages.parse(
      {
        model: opts.model,
        max_tokens: opts.maxTokens ?? 4000,
        system: opts.system,
        messages,
        output_config: { format: zodOutputFormat(opts.schema), effort: opts.effort ?? "low" },
      },
      { timeout: AGENT_TIMEOUT_MS },
    );
    if (res.stop_reason === "refusal") throw new Error("Model declined (refusal)");
    const parsed = opts.schema.safeParse(res.parsed_output);
    if (parsed.success) return parsed.data;
    messages.push({ role: "assistant", content: res.content.filter((b) => b.type === "text") });
    messages.push({ role: "user", content: `Your output failed validation: ${parsed.error.message}. Return corrected JSON only.` });
  }
  throw new Error("Validation failed after retry");
}

/** Plain-text call (ShopBuddy). */
export async function callText(opts: { model: string; system: string; messages: Anthropic.MessageParam[]; maxTokens?: number }) {
  const res = await anthropic().messages.create(
    { model: opts.model, max_tokens: opts.maxTokens ?? 1000, system: opts.system, messages: opts.messages, output_config: { effort: "low" } },
    { timeout: AGENT_TIMEOUT_MS },
  );
  if (res.stop_reason === "refusal") throw new Error("Model declined (refusal)");
  return res.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("").trim();
}

export type ToolHandler = (input: Record<string, unknown>) => Promise<unknown>;
export type LoopEvent =
  | { type: "tool_call"; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; name: string; result: unknown };

/** Manual tool-use loop (max turns). Yields tool events; returns the final text. */
export async function* toolLoop(opts: {
  model: string; system: string; user: string; tools: Anthropic.Tool[]; handlers: Record<string, ToolHandler>; maxTurns?: number;
}): AsyncGenerator<LoopEvent, string> {
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: opts.user }];
  const maxTurns = opts.maxTurns ?? 6;
  for (let turn = 0; turn <= maxTurns; turn++) {
    const lastTurn = turn === maxTurns;
    const res = await anthropic().messages.create(
      {
        model: opts.model,
        max_tokens: 8000,
        system: opts.system,
        tools: opts.tools,
        tool_choice: lastTurn ? { type: "none" } : { type: "auto" },
        messages,
        output_config: { effort: "low" },
      },
      { timeout: AGENT_TIMEOUT_MS },
    );
    if (res.stop_reason === "refusal") throw new Error("Model declined (refusal)");
    messages.push({ role: "assistant", content: res.content });
    const uses = res.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    if (res.stop_reason !== "tool_use" || uses.length === 0) {
      return res.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("\n");
    }
    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const u of uses) {
      const input = (u.input ?? {}) as Record<string, unknown>;
      yield { type: "tool_call", name: u.name, input };
      try {
        const h = opts.handlers[u.name];
        if (!h) throw new Error(`Unknown tool ${u.name}`);
        const result = await h(input);
        yield { type: "tool_result", name: u.name, result };
        results.push({ type: "tool_result", tool_use_id: u.id, content: JSON.stringify(result) });
      } catch (e) {
        results.push({ type: "tool_result", tool_use_id: u.id, content: String(e instanceof Error ? e.message : e), is_error: true });
      }
    }
    messages.push({ role: "user", content: results });
  }
  throw new Error("Tool loop exceeded max turns");
}

// F3 Brief Interpreter (Sonnet + tools). Streams friendly step events, then a result.
// Cached mode replays cached steps with a 300 ms delay.
import { z } from "zod";
import { MODELS } from "../ai/models";
import { PROMPTS } from "../ai/prompts";
import { toolLoop, logRun } from "../ai/run";
import { getDemoMode } from "../ai/mode";
import { lookupCache } from "../ai/cache";
import { topicsFor } from "../existing/contextGraph";
import { fmtReach } from "../existing/dealsDesk";
import { SpecSchema, normalizeSpec, type Spec } from "./spec";
import { anthropicTools, toolHandlers, findContexts, forecastReach, contextgraphTopics } from "./tools";
import { sensitiveLabel } from "../labels";

export const BriefResultSchema = z.object({
  spec: SpecSchema,
  summary: z.string(),
  ambiguities: z.array(z.string()),
});
export type BriefResult = z.infer<typeof BriefResultSchema>;

export type BriefEvent =
  | { type: "step"; label: string; detail?: string }
  | { type: "result"; data: BriefResult & { forecast?: { low: number; high: number; point: number; basis: string } }; cached: boolean; latencyMs: number };

const STEP_FOR_TOOL: Record<string, string> = {
  contextgraph_topics: "Mapping to ContextGraph",
  find_contexts: "Scoring pages",
  forecast_reach: "Forecasting reach",
  explain_match: "Explaining matches",
  create_package: "Saving draft",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Deterministic offline interpreter used in cached mode when the brief isn't in the cache. */
export async function heuristicInterpret(brief: string): Promise<{ result: BriefResult; steps: { label: string; detail?: string }[] }> {
  const b = brief.toLowerCase();
  const steps: { label: string; detail?: string }[] = [{ label: "Reading brief" }];
  const topicHits = (await contextgraphTopics({ query: brief })).topics;
  const wanted = topicHits.filter((t) => t.startsWith("Shopping") && !t.includes("Product Safety") && !t.includes("Deals"));
  const collapse = (arr: string[]) => arr.filter((t) => !arr.some((o) => o !== t && t.startsWith(o + " > ")));
  let topics = collapse(wanted.length ? wanted : topicHits.filter((t) => !t.startsWith("Shopping > Product Safety")));
  if (/comparison|compare/.test(b) && !topics.some((t) => t.startsWith("Shopping > Electronics"))) topics.push("Shopping > Electronics");
  if (/gift/.test(b) && /comparison|compare/.test(b) && !topics.includes("Shopping > Home & Office")) topics.push("Shopping > Home & Office");
  topics = collapse(topics);
  steps.push({ label: "Mapping to ContextGraph", detail: topics.join(" · ") || "No topic matched" });
  const purposes: string[] = [];
  if (/guide|gift ideas|picks/.test(b)) purposes.push("buying_guide");
  if (/comparison|compare|review/.test(b)) purposes.push("product_comparison");
  if (/how[- ]to|tips|plan/.test(b)) purposes.push("how_to");
  const tones = ["upbeat", "practical", "neutral", "serious"].filter((t) => b.includes(t));
  const sens: string[] = [];
  if (/recall/.test(b)) sens.push("recalls");
  if (/tragedy|tragic|death/.test(b)) sens.push("tragedy");
  if (/layoff|job loss/.test(b)) sens.push("layoffs");
  if (/health|medical/.test(b)) sens.push("health");
  if (/debt|financial distress|hardship/.test(b)) sens.push("financial_distress");
  if (/politic/.test(b)) sens.push("politics");
  const country = /\buk\b|united kingdom|britain/.test(b) ? "GB" : /canada/.test(b) ? "CA" : "US";
  const tier = Number(b.match(/tier (\d)/)?.[1] ?? 1);
  const price = brief.match(/(under|below) (\$|£)\d+/i)?.[0];
  const spec = normalizeSpec({ topics, purposes: purposes as Spec["purposes"], tonePreference: tones as Spec["tonePreference"], excludeSensitive: sens as Spec["excludeSensitive"], country, partnerTierMax: tier, ...(price ? { maxPriceHint: price.replace(/^(under|below) /i, "") } : {}) });
  steps.push({ label: "Applying hard restrictions", detail: [...sens.map((s) => `Exclude ${sensitiveLabel[s]}`), `Country ${country}`, `Partner tier ≤ ${tier}`].join(" · ") });
  const found = await findContexts({ spec, brief });
  steps.push({ label: "Scoring pages", detail: `${found.eligibleCount} eligible · ${found.excluded.length} excluded with reasons` });
  const fc = await forecastReach({ spec });
  steps.push({ label: "Forecasting reach", detail: `${fmtReach(fc.point)} opportunities · next 7 days · ${fc.basis}` });
  steps.push({ label: "Draft ready" });
  const ambiguities: string[] = [];
  if (price) ambiguities.push(`"${price}" is a price hint; pages aren't priced, so it is kept as a creative and landing-page note, not a page filter.`);
  if (topics.length > 1) ambiguities.push(`Mapped to ${topics.length} ContextGraph topics (${topics.join(", ")}). Remove one to narrow reach.`);
  if (!tones.length) ambiguities.push("No tone preference stated; ranking is neutral on tone.");
  return {
    steps,
    result: {
      spec,
      summary: `Targets ${topics.join(", ") || "no topic"}${purposes.length ? ` for ${purposes.map((p) => p.replace("_", " ")).join(" and ")} pages` : ""} in ${country}${tones.length ? `, preferring ${tones.join(" and ")} tone` : ""}. Hard exclusions: ${sens.map((s) => sensitiveLabel[s].toLowerCase()).join(", ") || "none"}. Partner tier ≤ ${tier}.`,
      ambiguities,
    },
  };
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced?.[1] ?? text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  return JSON.parse(raw);
}

export async function* interpretBrief(
  args: { brief: string; campaignId?: string; advertiser?: string },
  source: "ui" | "mcp" = "ui",
  opts: { forceCached?: boolean; stepDelayMs?: number } = {},
): AsyncGenerator<BriefEvent> {
  const t0 = Date.now();
  const mode = opts.forceCached ? "cached" : await getDemoMode();
  const input = { brief: args.brief };

  if (mode === "live") {
    try {
      yield { type: "step", label: "Reading brief" };
      let restrictionsShown = false;
      const loop = toolLoop({
        model: MODELS.planner,
        system: PROMPTS.briefInterpreter,
        user: `Advertiser: ${args.advertiser ?? "unknown"}\nBrief: ${args.brief}\n\nThe buyer will review the rules in the UI before saving, so do not call create_package. Today's planning window is the next 7 days.`,
        tools: anthropicTools(["contextgraph_topics", "find_contexts", "forecast_reach", "explain_match"]) as never,
        handlers: toolHandlers(source, { brief: args.brief }),
        maxTurns: 6,
      });
      let r = await loop.next();
      while (!r.done) {
        const ev = r.value;
        if (ev.type === "tool_call") {
          if (ev.name === "find_contexts" && !restrictionsShown) {
            restrictionsShown = true;
            const spec = (ev.input.spec ?? {}) as Partial<Spec>;
            yield { type: "step", label: "Applying hard restrictions", detail: [...(spec.excludeSensitive ?? []).map((s) => `Exclude ${sensitiveLabel[s] ?? s}`), `Country ${spec.country ?? "US"}`, `Partner tier ≤ ${spec.partnerTierMax ?? 1}`].join(" · ") };
          }
          yield { type: "step", label: STEP_FOR_TOOL[ev.name] ?? ev.name, detail: ev.name === "contextgraph_topics" ? `query: ${String(ev.input.query)}` : undefined };
        }
        r = await loop.next();
      }
      const parsed = BriefResultSchema.parse(extractJson(r.value));
      const result = { ...parsed, spec: normalizeSpec(parsed.spec) };
      const fc = await forecastReach({ spec: result.spec });
      yield { type: "step", label: "Draft ready" };
      const latencyMs = Date.now() - t0;
      await logRun({ agent: "briefInterpreter", model: MODELS.planner, source, input, output: result, latencyMs, cached: false });
      yield { type: "result", data: { ...result, forecast: fc }, cached: false, latencyMs };
      return;
    } catch (e) {
      yield { type: "step", label: "Live agent unavailable · using cached plan", detail: e instanceof Error ? e.message.slice(0, 120) : undefined };
    }
  }

  // Cached replay.
  const hit = lookupCache("briefInterpreter", input, { exactOnly: true });
  let steps: { label: string; detail?: string }[];
  let result: BriefResult;
  if (hit) {
    steps = hit.steps ?? [];
    result = BriefResultSchema.parse(hit.output);
  } else {
    const h = await heuristicInterpret(args.brief);
    steps = h.steps;
    result = h.result;
  }
  for (const s of steps) {
    yield { type: "step", ...s };
    await sleep(opts.stepDelayMs ?? 300);
  }
  const fc = await forecastReach({ spec: result.spec });
  const latencyMs = Date.now() - t0;
  await logRun({ agent: "briefInterpreter", model: MODELS.planner, source, input, output: result, latencyMs, cached: true });
  yield { type: "result", data: { ...result, spec: normalizeSpec(result.spec), forecast: fc }, cached: true, latencyMs };
}

export { topicsFor };

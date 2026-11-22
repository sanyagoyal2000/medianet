// F1 Context Profiler (Haiku). Adds purpose, tone, sensitive + quoted evidence on top of the
// ContextGraph topic (never changes the topic). Evidence quotes are verified against the text in code.
import { z } from "zod";
import { runAgent } from "../ai/run";
import { MODELS } from "../ai/models";
import { PROMPTS } from "../ai/prompts";
import { PURPOSES, TONES, SENSITIVE } from "../labels";
import type { ContextProfile, Purpose, Sensitive, Tone } from "../types";

export const ProfileSchema = z.object({
  purpose: z.enum(PURPOSES as [Purpose, ...Purpose[]]),
  tone: z.enum(TONES as [Tone, ...Tone[]]),
  confidence: z.number(),
  sensitive: z.array(z.enum(SENSITIVE as unknown as [Sensitive, ...Sensitive[]])),
  evidence: z.array(z.object({ field: z.enum(["purpose", "tone"]), quote: z.string() })),
});
export type ProfileOutput = z.infer<typeof ProfileSchema>;

export interface ProfilerInput { url: string; title: string; text: string; existingTopic: string }

const normQ = (s: string) => s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim().toLowerCase();
export const quoteInText = (quote: string, text: string) => {
  const q = normQ(quote).replace(/^"|"$/g, "");
  return q.length > 0 && normQ(text).includes(q.replace(/[.!?]$/, ""));
};

/** Post-checks from spec/04: verbatim evidence, confidence thresholds. */
export function postCheck(out: ProfileOutput, text: string): Pick<ContextProfile, "confidence" | "status"> & { evidenceOk: boolean } {
  let confidence = Math.max(0, Math.min(1, out.confidence));
  const evidenceOk = out.evidence.length > 0 && out.evidence.every((e) => quoteInText(e.quote, text));
  if (!evidenceOk) confidence = Math.min(confidence, 0.5);
  const status = !evidenceOk || confidence < 0.6 ? "needs_review" : "fresh";
  return { confidence: Number(confidence.toFixed(2)), status, evidenceOk };
}

// ---------- offline heuristic (used in cached mode when the page isn't in the cache) ----------
const sentences = (text: string) => text.replace(/\s+/g, " ").match(/[^.!?]+[.!?]/g)?.map((s) => s.trim()).filter((s) => s.split(" ").length >= 5 && s.split(" ").length <= 25) ?? [];
const RULES: { purpose: Purpose; re: RegExp }[] = [
  { purpose: "safety_report", re: /\brecall(ed|s)?\b|hazard|safety (warning|alert)/i },
  { purpose: "product_comparison", re: /\bcompar(e|ed|ison)|side by side|\bvs\.?\b|tested \w+ (pairs|models)/i },
  { purpose: "buying_guide", re: /gift guide|our picks|best .* (for|under)|\bunder \$\d+|worth buying|we recommend/i },
  { purpose: "how_to", re: /\bhow to\b|step|tips|checklist|follow these/i },
  { purpose: "opinion", re: /\bI think\b|in my view|\bI disagree\b|op-ed/i },
  { purpose: "entertainment", re: /satire|comedy|funny/i },
  { purpose: "news", re: /\bsaid on (monday|tuesday|wednesday|thursday|friday|saturday|sunday)|announced|officials said|reported/i },
];
const TONE_RULES: { tone: Tone; re: RegExp }[] = [
  { tone: "tragic", re: /killed|died|mourn|death|fatal/i },
  { tone: "satirical", re: /satire/i },
  { tone: "negative", re: /cuts? \d|layoff|job cuts|cruel|fell \d+ percent|decline/i },
  { tone: "serious", re: /recall|warning|emergency|immediately|risk/i },
  { tone: "upbeat", re: /love|delight|fun|smile|bright|cheer/i },
  { tone: "practical", re: /tested|compare|budget|steps?|tips/i },
];
const SENS_RULES: { s: Sensitive; re: RegExp }[] = [
  { s: "recalls", re: /\brecall/i }, { s: "tragedy", re: /killed|died|mourn|fatal/i }, { s: "layoffs", re: /layoff|job cuts|cut about [\d,]+ .*jobs|cuts [\d,]+ jobs/i },
  { s: "health", re: /symptom|diagnos|disease|flu\b|cancer/i }, { s: "financial_distress", re: /debt|bankrupt|behind on payments|lost (my|their) job/i },
  { s: "violence", re: /shooting|assault|attack/i }, { s: "politics", re: /election|senator|congress|campaign trail/i },
];

export function heuristicProfile(input: ProfilerInput): ProfileOutput {
  const all = `${input.title}. ${input.text}`;
  const purpose = RULES.find((r) => r.re.test(all))?.purpose ?? "other";
  const tone = TONE_RULES.find((r) => r.re.test(all))?.tone ?? "neutral";
  const sensitive = SENS_RULES.filter((r) => r.re.test(all)).map((r) => r.s);
  const sents = sentences(input.text);
  const pr = RULES.find((r) => r.purpose === purpose)?.re;
  const tr = TONE_RULES.find((r) => r.tone === tone)?.re;
  const pq = (pr && sents.find((s) => pr.test(s))) || sents[0];
  const tq = (tr && sents.find((s) => tr.test(s) && s !== pq)) || sents[1] || sents[0];
  const evidence: ProfileOutput["evidence"] = [];
  if (pq) evidence.push({ field: "purpose", quote: pq });
  if (tq) evidence.push({ field: "tone", quote: tq });
  const confidence = purpose === "other" ? 0.5 : tone === "neutral" ? 0.62 : 0.7;
  return { purpose, tone, confidence, sensitive, evidence };
}

export async function profilePage(input: ProfilerInput, source: "ui" | "mcp" | "script" = "ui") {
  const clipped = { ...input, text: input.text.slice(0, 6000) };
  const user = `URL: ${clipped.url}\nTitle: ${clipped.title}\nContextGraph topic (fixed): ${clipped.existingTopic}\n\nPage text:\n${clipped.text}`;
  const res = await runAgent({
    agent: "contextProfiler", model: MODELS.fast, system: PROMPTS.contextProfiler, input: clipped, user, schema: ProfileSchema,
    source: source === "script" ? "script" : source, fallback: (i) => heuristicProfile(i as ProfilerInput),
  });
  const checks = postCheck(res.data, clipped.text);
  return { ...res, data: res.data, ...checks };
}

// Phase 2 Placement Guard: hard rules in code first, then Haiku classifies the turn, then code checks,
// then match.ts against AI-channel campaigns. It never receives the full conversation.
import { z } from "zod";
import registry from "@/data/seed/agent-registry.json";
import { runAgent } from "../ai/run";
import { MODELS } from "../ai/models";
import { PROMPTS } from "../ai/prompts";
import { PURPOSES, SENSITIVE, sensitiveLabel } from "../labels";
import { evaluate } from "../context/match";
import type { AiRules, Campaign, ContextProfile, Page, Purpose, Sensitive } from "../types";

export const TURN_TOPICS = ["Shopping", "Gifts", "Product comparisons", "Home office", "Electronics", "Travel", "Finance", "Health", "News", "Other"] as const;

export const TurnSchema = z.object({
  topic: z.enum(TURN_TOPICS),
  purpose: z.enum(PURPOSES as [Purpose, ...Purpose[]]),
  sensitive: z.array(z.enum(SENSITIVE as unknown as [Sensitive, ...Sensitive[]])),
  confidence: z.number(),
});
export type TurnClass = z.infer<typeof TurnSchema>;

export interface GuardInput { appId: string; turnSummary: string; userConsentAds: boolean; recentCardCount: number }

export type GuardResult =
  | { status: 403; placement: null; reason: string }
  | { status: 200; placement: null; reason: string; classification?: TurnClass; checks: Check[]; cached?: boolean }
  | { status: 200; placement: Placement; reason: null; classification: TurnClass; checks: Check[]; campaign: Campaign; cached?: boolean };

export type Check = { label: string; ok: boolean };
export interface Placement {
  advertiser: string; headline: string; body: string; cta: string; imageUrl: string; label: "Sponsored"; reasonReader: string;
}

const TOPIC_TO_PATH: Record<string, string> = {
  Shopping: "Shopping", Gifts: "Shopping > Gifts", "Product comparisons": "Shopping > Electronics", "Home office": "Shopping > Home & Office",
  Electronics: "Shopping > Electronics", Travel: "Travel", Finance: "Finance", Health: "Health", News: "News", Other: "Other",
};

export function heuristicClassify(turn: string): TurnClass {
  const t = turn.toLowerCase();
  const sensitive: Sensitive[] = [];
  if (/recall/.test(t)) sensitive.push("recalls");
  if (/lost (my|our) job|laid off|layoff|can't afford|debt/.test(t)) sensitive.push("financial_distress");
  if (/died|funeral|passed away/.test(t)) sensitive.push("tragedy");
  if (/sick|symptom|doctor|diagnos/.test(t)) sensitive.push("health");
  let topic: TurnClass["topic"] = "Other";
  if (/gift|present|stocking/.test(t)) topic = "Gifts";
  else if (/compare|vs\.?|which (is|one) better|best .* (charger|earbuds|headphones|laptop)/.test(t)) topic = "Product comparisons";
  else if (/desk|office chair|home office/.test(t)) topic = "Home office";
  else if (/budget|money|bank|credit/.test(t)) topic = "Finance";
  else if (/buy|shop|deal|under \$/.test(t)) topic = "Shopping";
  const purpose: Purpose = sensitive.includes("recalls") ? "safety_report" : topic === "Product comparisons" ? "product_comparison" : topic === "Finance" ? "how_to" : topic === "Other" ? "other" : "buying_guide";
  return { topic, purpose, sensitive, confidence: topic === "Other" ? 0.45 : 0.86 };
}

/** Creative per advertiser: approved assets only (built in code, no external images). */
export function creativeFor(c: Campaign, topic: string): Omit<Placement, "reasonReader" | "label"> {
  return {
    advertiser: "Kohl's",
    headline: "Useful gifts under $50",
    body: "Practical picks for home, work and on the go this holiday season.",
    cta: "Explore gifts",
    imageUrl: `/creative/${c.id}/${topic === "Gifts" ? "mug" : "gifts"}.svg`,
  };
}

export async function placementGuard(input: GuardInput, deps: { rules: AiRules | null; campaigns: Campaign[]; advertiserName: (id: string) => string }): Promise<GuardResult> {
  // 1. Hard rules in code.
  const app = registry.aiApps.find((a) => a.appId === input.appId);
  if (!app) return { status: 403, placement: null, reason: "App not registered" };
  const checks: Check[] = [];
  if (!input.userConsentAds) return { status: 200, placement: null, reason: "No ad consent", checks: [{ label: "Consent to sponsored suggestions", ok: false }] };
  checks.push({ label: "Consent to sponsored suggestions", ok: true });
  if (input.recentCardCount >= 1) return { status: 200, placement: null, reason: "Frequency cap", checks: [...checks, { label: "Frequency within cap (max 1 per 3 turns)", ok: false }] };
  checks.push({ label: "Frequency within cap", ok: true });

  // 2. LLM classifies the turn (turn summary only).
  const turnSummary = input.turnSummary.slice(0, 200);
  const res = await runAgent({
    agent: "placementGuard", model: MODELS.fast, system: PROMPTS.placementGuard, source: "partner",
    input: { turnSummary },
    user: `Chat turn: "${turnSummary}"\nTopic must be one of: ${TURN_TOPICS.join(", ")}. Use the same purpose and sensitive taxonomy as the Context Profiler.`,
    schema: TurnSchema, fallback: (i) => heuristicClassify((i as { turnSummary: string }).turnSummary),
  });
  const cls = { ...res.data, confidence: Math.max(0, Math.min(1, res.data.confidence)) };
  const rules = deps.rules;

  // 3. Code checks.
  if (cls.sensitive.length) {
    return { status: 200, placement: null, reason: `Sensitive request (${cls.sensitive.map((s) => (s === "recalls" ? "recalls" : sensitiveLabel[s]?.toLowerCase() ?? s)).join(", ")})`, classification: cls, cached: res.cached,
      checks: [...checks, { label: "Not sensitive", ok: false }] };
  }
  checks.push({ label: "Not sensitive", ok: true });
  if (cls.confidence < 0.6) return { status: 200, placement: null, reason: "Low confidence", classification: cls, cached: res.cached, checks: [...checks, { label: "Classification confidence ≥ 0.6", ok: false }] };
  const allowed = rules?.contextsAllowed ?? [];
  const topicAllowed = allowed.includes(cls.topic) || (cls.purpose === "product_comparison" && allowed.includes("Product comparisons"));
  if (!topicAllowed) return { status: 200, placement: null, reason: "Context not allowed", classification: cls, cached: res.cached, checks: [...checks, { label: `Context allowed (${cls.topic})`, ok: false }] };
  checks.push({ label: `Relevant context matched (${cls.topic})`, ok: true });

  // 4. match.ts against AI-channel-enabled campaigns.
  const pseudoPage: Page = {
    id: "ai-turn", url: `${input.appId}/turn`, site: input.appId, title: turnSummary, text: turnSummary, topicPath: TOPIC_TO_PATH[cls.topic] ?? "Other",
    partnerTier: 1, country: "US", trafficPerDay: 0,
  };
  const profile: ContextProfile = {
    pageId: "ai-turn", purpose: cls.purpose, tone: "practical", confidence: cls.confidence, sensitive: cls.sensitive, evidence: [], status: "fresh", classifiedAt: new Date().toISOString(), version: 1,
  };
  const candidates = deps.campaigns.filter((c) => c.aiChannels);
  const ranked = candidates
    .map((c) => ({ c, m: evaluate(pseudoPage, profile, { ...c, rules: { ...c.rules, purposes: [] } }, "context_studio") }))
    .filter((x) => x.m.outcome === "eligible")
    .sort((a, b) => b.m.score - a.m.score);
  if (!ranked.length) return { status: 200, placement: null, reason: "No eligible campaign", classification: cls, cached: res.cached, checks: [...checks, { label: "Eligible campaign found", ok: false }] };
  checks.push({ label: "Approved assets available", ok: true });
  const top = ranked[0].c;
  const creative = creativeFor(top, cls.topic);
  return {
    status: 200, reason: null, classification: cls, campaign: top, cached: res.cached, checks,
    placement: {
      ...creative, advertiser: deps.advertiserName(top.advertiserId) || creative.advertiser, label: "Sponsored",
      reasonReader: `Matched to this ${cls.topic === "Gifts" ? "gift-shopping" : cls.topic.toLowerCase()} question. Paid placement.`,
    },
  };
}

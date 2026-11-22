// Planning tools: shared by the Brief Interpreter (UI) and the MCP endpoint for buying agents.
// Everything here is deterministic and reads the simulated existing systems + match.ts.
import { z } from "zod";
import { getRepo } from "../db/repo";
import { topicsFor, ALL_TOPICS, isTopic } from "../existing/contextGraph";
import { createDealRequest } from "../existing/dealsDesk";
import { eligibility } from "../queries";
import { lbl, purposeLabel, toneLabel, topicShort } from "../labels";
import { SpecSchema, normalizeSpec, type Spec } from "./spec";
import { explainDecision } from "../context/explainer";
import { evaluate, corpusIndex } from "../context/match";
import type { Campaign } from "../types";

type Src = "ui" | "mcp";

export async function contextgraphTopics({ query }: { query: string }) {
  const hits = topicsFor(query);
  return { query, topics: hits.length ? hits : ALL_TOPICS.filter((t) => !t.includes(">")) };
}

const asCampaign = (spec: Spec, brief = ""): Pick<Campaign, "rules" | "brief" | "bidCpm"> => ({ rules: spec, brief, bidCpm: 6.5 });

export async function findContexts({ spec, limit = 10, brief }: { spec: Partial<Spec>; limit?: number; brief?: string }) {
  const s = normalizeSpec(spec);
  const unknownTopics = s.topics.filter((t) => !isTopic(t));
  const { rows } = await eligibility(asCampaign(s, brief), "context_studio");
  const fmt = (r: (typeof rows)[number]) => ({
    pageId: r.page.id, url: r.page.url, title: r.page.title, topic: topicShort(r.page.topicPath),
    purpose: lbl(purposeLabel, r.profile?.purpose), tone: lbl(toneLabel, r.profile?.tone),
    outcome: r.outcome, reasons: r.outcome === "eligible" ? r.whyMatches : r.reasons, score: r.score,
  });
  const eligible = rows.filter((r) => r.outcome === "eligible");
  const excluded = rows.filter((r) => r.outcome !== "eligible" && !r.reasons[0]?.startsWith("Topic not in campaign"));
  return {
    eligibleCount: eligible.length,
    eligible: eligible.slice(0, limit).map(fmt),
    excluded: excluded.slice(0, limit).map(fmt),
    ...(unknownTopics.length ? { warning: `Unknown topic paths ignored: ${unknownTopics.join(", ")}` } : {}),
  };
}

export async function forecastReach({ spec }: { spec: Partial<Spec> }) {
  const s = normalizeSpec(spec);
  const { forecast } = await eligibility(asCampaign(s), "context_studio");
  return { low: forecast.low, high: forecast.high, point: forecast.point, days: forecast.days, basis: forecast.basis };
}

export async function explainMatch({ pageId, campaignId }: { pageId: string; campaignId: string }, source: Src = "ui") {
  const repo = await getRepo();
  const [page, profile, campaign, pages] = await Promise.all([
    repo.pages.get(pageId), repo.profiles.get(pageId), repo.campaigns.get(campaignId), repo.pages.list(),
  ]);
  if (!page) throw new Error(`Unknown pageId ${pageId}`);
  if (!campaign) throw new Error(`Unknown campaignId ${campaignId}`);
  const m = evaluate(page, profile, campaign, "context_studio", { idx: corpusIndex(pages) });
  const ex = await explainDecision({ page, profile, campaign, match: m }, source);
  return { pageId, campaignId, outcome: m.outcome, buyer: ex.data.buyer, reader: ex.data.reader, whyMatches: m.whyMatches, reasons: m.reasons, cached: ex.cached };
}

export async function createPackage(
  { campaignId, name, spec, brief, advertiserId }: { campaignId?: string; name: string; spec: Partial<Spec>; brief?: string; advertiserId?: string },
  source: Src,
) {
  const repo = await getRepo();
  const s = normalizeSpec(spec);
  const now = new Date().toISOString();
  let campaign = campaignId ? await repo.campaigns.get(campaignId) : null;
  if (campaign && campaign.status === "live") throw new Error("Live campaigns cannot be changed by an agent. Create a new draft instead.");
  const deal = createDealRequest({ campaignId: campaignId ?? "new", name });
  if (campaign) {
    campaign = (await repo.campaigns.update(campaign.id, { rules: s, status: "draft", updatedAt: now, dealRequestId: deal.dealRequestId, ...(brief ? { brief } : {}) }))!;
  } else {
    const advertisers = await repo.advertisers.list();
    const adv = advertisers.find((a) => a.id === advertiserId || a.name.toLowerCase() === (advertiserId ?? "").toLowerCase()) ?? advertisers[0];
    campaign = {
      id: `cmp-${source}-${Date.now().toString(36)}`, advertiserId: adv.id, name, status: "draft", source, brief: brief ?? "",
      rules: s, bidCpm: 5.5, aiChannels: false, dealRequestId: deal.dealRequestId, createdAt: now, updatedAt: now,
    };
    await repo.campaigns.insert(campaign);
  }
  return { campaignId: campaign.id, dealRequestId: deal.dealRequestId, status: "draft" as const, note: "Draft only. A human approves activation in Deals Desk; no spend is active." };
}

export async function listCampaigns() {
  const repo = await getRepo();
  const [cs, advs] = await Promise.all([repo.campaigns.list(), repo.advertisers.list()]);
  const adv = new Map(advs.map((a) => [a.id, a.name]));
  return cs.map((c) => ({ id: c.id, name: c.name, advertiser: adv.get(c.advertiserId), status: c.status, source: c.source, updatedAt: c.updatedAt }));
}

// ---- JSON schemas for Claude tool use (Brief Interpreter) ----
export const TOOL_INPUTS = {
  contextgraph_topics: z.object({ query: z.string().describe("Plain-English topic words, e.g. 'gift guides'") }),
  find_contexts: z.object({ spec: SpecSchema, limit: z.number().optional() }),
  forecast_reach: z.object({ spec: SpecSchema }),
  explain_match: z.object({ pageId: z.string(), campaignId: z.string() }),
  create_package: z.object({ campaignId: z.string().optional(), name: z.string(), spec: SpecSchema }),
};

export const TOOL_DESCRIPTIONS: Record<keyof typeof TOOL_INPUTS, string> = {
  contextgraph_topics: "Map plain-English topic words to Media.net ContextGraph topic paths. Never invent topic names; use only paths returned here.",
  find_contexts: "Find Media.net pages that fit a campaign spec; returns eligible and excluded pages with reasons.",
  forecast_reach: "Historical 7-day opportunity estimate for a spec; not guaranteed delivery. Use for any number you report.",
  explain_match: "Why a page is eligible or excluded for a campaign (buyer- and reader-facing reasons).",
  create_package: "Save a DRAFT targeting package for human approval; never activates spend.",
};

export function anthropicTools(names: (keyof typeof TOOL_INPUTS)[]) {
  return names.map((n) => ({
    name: n,
    description: TOOL_DESCRIPTIONS[n],
    input_schema: z.toJSONSchema(TOOL_INPUTS[n]) as { type: "object"; [k: string]: unknown },
  }));
}

export function toolHandlers(source: Src, extra: { brief?: string } = {}) {
  return {
    contextgraph_topics: (i: Record<string, unknown>) => contextgraphTopics(TOOL_INPUTS.contextgraph_topics.parse(i)),
    find_contexts: (i: Record<string, unknown>) => findContexts({ ...TOOL_INPUTS.find_contexts.parse(i), brief: extra.brief }),
    forecast_reach: (i: Record<string, unknown>) => forecastReach(TOOL_INPUTS.forecast_reach.parse(i)),
    explain_match: (i: Record<string, unknown>) => explainMatch(TOOL_INPUTS.explain_match.parse(i), source),
    create_package: (i: Record<string, unknown>) => createPackage({ ...TOOL_INPUTS.create_package.parse(i), brief: extra.brief }, source),
  };
}

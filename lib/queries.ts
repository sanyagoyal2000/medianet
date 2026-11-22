// Server-side derived numbers. Every screen reads these, so Overview == Traffic == Context Library.
import { getRepo } from "./db/repo";
import type { Campaign, CampaignRules, ContextProfile, Page } from "./types";
import { corpusIndex, evaluate, type MatchMode, type MatchResult } from "./context/match";
import { forecast } from "./existing/dealsDesk";

export const FOCUS_CAMPAIGN_ID = "cmp-kohls-holiday-2026";

export async function contextKpis() {
  const repo = await getRepo();
  const [profiles, meta, pages] = await Promise.all([repo.profiles.list(), repo.meta.get(), repo.pages.list()]);
  const pageIds = new Set(pages.map((p) => p.id));
  const c = { ...meta.coverageBaseline };
  for (const p of profiles) if (pageIds.has(p.pageId)) c[p.status] += 1;
  const total = c.fresh + c.stale + c.unclassified + c.needs_review;
  return {
    total,
    freshPct: (c.fresh / total) * 100,
    stalePct: (c.stale / total) * 100,
    unclassifiedPct: (c.unclassified / total) * 100,
    needsReview: profiles.filter((p) => p.status === "needs_review").length,
  };
}

export async function trafficTotals() {
  const repo = await getRepo();
  const days = (await repo.dailyTraffic.list()).sort((a, b) => a.date.localeCompare(b.date));
  const human = days.reduce((s, d) => s + d.humanFacing, 0);
  const automated = days.reduce((s, d) => s + d.automated, 0);
  const unknown = days.reduce((s, d) => s + d.unknown, 0);
  const total = human + automated + unknown;
  return { days, human, automated, unknown, total, humanPct: (human / total) * 100, automatedPct: (automated / total) * 100, unknownPct: (unknown / total) * 100 };
}

export async function aiFunnel() {
  const repo = await getRepo();
  const [meta, offers] = await Promise.all([repo.meta.get(), repo.aiOffers.list()]);
  const b = meta.aiFunnelBaseline;
  return {
    requests: b.requests + offers.length,
    offers: b.offers + offers.filter((o) => o.returned).length,
    displays: b.displays + offers.filter((o) => o.displayed).length,
    clicks: b.clicks + offers.filter((o) => o.clicked).length,
  };
}

export async function taskCounts() {
  const repo = await getRepo();
  const [profiles, campaigns, requests] = await Promise.all([repo.profiles.list(), repo.campaigns.list(), repo.requests.list()]);
  const agentDrafts = campaigns.filter((c) => c.source === "mcp" && c.status === "draft");
  return {
    profilesToReview: profiles.filter((p) => p.status === "needs_review").length,
    agentDrafts: agentDrafts.length,
    firstAgentDraftId: agentDrafts.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]?.id ?? null,
    unknownOpen: requests.filter((r) => r.purpose === "unknown" && (!r.review || r.review.status === "open")).length,
  };
}

export async function activeCampaignCount() {
  const repo = await getRepo();
  return (await repo.campaigns.list()).filter((c) => c.status === "live").length;
}

export type EligibilityRow = MatchResult & {
  page: Page;
  profile: ContextProfile | null;
  todayOutcome?: MatchResult["outcome"];
  changed?: boolean;
};

/** Evaluate every page for a campaign (or an ad-hoc rule set). Pure, deterministic, fast. */
export async function eligibility(
  campaign: Pick<Campaign, "rules" | "brief" | "bidCpm">,
  mode: MatchMode,
): Promise<{ rows: EligibilityRow[]; forecast: ReturnType<typeof forecast> }> {
  const repo = await getRepo();
  const [pages, profiles] = await Promise.all([repo.pages.list(), repo.profiles.list()]);
  const prof = new Map(profiles.map((p) => [p.pageId, p]));
  const idx = corpusIndex(pages);
  const siblings = pages.map((p) => ({ page: p, profile: prof.get(p.id) ?? null }));
  const rows: EligibilityRow[] = pages.map((page) => {
    const profile = prof.get(page.id) ?? null;
    const m = evaluate(page, profile, campaign, mode, { idx, siblings });
    const other = evaluate(page, profile, campaign, mode === "today" ? "context_studio" : "today", { idx, siblings });
    return { ...m, page, profile, todayOutcome: mode === "today" ? m.outcome : other.outcome, changed: m.outcome !== other.outcome };
  });
  const order = { eligible: 0, partner_tier: 1, excluded: 2 } as const;
  rows.sort((a, b) => order[a.outcome] - order[b.outcome] || b.score - a.score);
  const fc = forecast({ pages: rows.filter((r) => r.outcome === "eligible").map((r) => r.page) });
  return { rows, forecast: fc };
}

export async function getCampaign(id: string) {
  const repo = await getRepo();
  return repo.campaigns.get(id);
}

export function rulesFromQuery(base: CampaignRules, q: URLSearchParams): CampaignRules {
  const arr = (k: string) => (q.get(k) != null ? q.get(k)!.split(",").filter(Boolean) : undefined);
  return {
    topics: arr("topics") ?? base.topics,
    purposes: arr("purposes") ?? base.purposes,
    tonePreference: arr("tonePreference") ?? base.tonePreference,
    excludeSensitive: arr("excludeSensitive") ?? base.excludeSensitive,
    country: q.get("country") ?? base.country,
    partnerTierMax: q.get("partnerTierMax") ? Number(q.get("partnerTierMax")) : base.partnerTierMax,
    maxPriceHint: base.maxPriceHint,
  };
}

export const nextId = (prefix: string, ids: string[], start: number) => {
  const nums = ids.map((i) => Number(i.replace(/\D/g, ""))).filter((n) => !Number.isNaN(n));
  return `${prefix}${Math.max(start - 1, ...nums) + 1}`;
};

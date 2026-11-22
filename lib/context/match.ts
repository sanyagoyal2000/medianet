// F1 matching: deterministic. Hard rules first (exclusions always apply), then a soft score.
// Tone never excludes; it only ranks.

import type { Campaign, ContextProfile, Page } from "../types";
import { intentScore } from "../existing/searchSignals";
import { lbl, purposeLabel, sensitiveLabel, toneLabel, topicShort } from "../labels";
import { TfIdf } from "./tfidf";

export type MatchMode = "context_studio" | "today";
export type Outcome = "eligible" | "excluded" | "partner_tier";

export interface MatchResult {
  pageId: string;
  outcome: Outcome;
  reasons: string[];
  whyMatches: string[];
  evidence: ContextProfile["evidence"];
  score: number;
  relevance: number;
  fallbackTier: "profile" | "section" | "domain" | "safe_only";
}

let cachedIdx: { key: string; idx: TfIdf } | null = null;
export function corpusIndex(pages: Page[]) {
  const key = pages.map((p) => p.id).join("|");
  if (!cachedIdx || cachedIdx.key !== key) cachedIdx = { key, idx: new TfIdf(pages.map((p) => `${p.title} ${p.text}`)) };
  return cachedIdx.idx;
}

const topicMatches = (topic: string, rules: string[]) => rules.some((r) => topic === r || topic.startsWith(r + " > "));

export function evaluate(
  page: Page,
  profile: ContextProfile | null | undefined,
  campaign: Pick<Campaign, "rules" | "brief" | "bidCpm">,
  mode: MatchMode,
  ctx: { idx?: TfIdf; siblings?: { page: Page; profile?: ContextProfile | null }[] } = {},
): MatchResult {
  const r = campaign.rules;
  const why: string[] = [];
  const hasProfile = !!profile && profile.status !== "unclassified" && !!profile.purpose;
  let fallbackTier: MatchResult["fallbackTier"] = "profile";

  const base = { pageId: page.id, evidence: profile?.evidence ?? [], relevance: 0 };
  const excluded = (reason: string, outcome: Outcome = "excluded"): MatchResult => ({
    ...base, outcome, reasons: [reason], whyMatches: why, score: 0, fallbackTier,
  });

  // 1. Hard rules, in order. First failure wins.
  if (!topicMatches(page.topicPath, r.topics)) return excluded("Topic not in campaign");
  why.push(`Topic matched: ${topicShort(page.topicPath)}`);

  // Fallback when there is no profile: section -> domain -> safe-only campaigns.
  let sensitive = profile?.sensitive ?? [];
  if (mode === "context_studio" && !hasProfile) {
    const sib = (ctx.siblings ?? []).filter((s) => s.page.id !== page.id && s.page.site === page.site && s.profile?.purpose);
    const section = page.url.split("/")[1] ?? "";
    const sameSection = sib.filter((s) => (s.page.url.split("/")[1] ?? "") === section);
    const pool = sameSection.length ? sameSection : sib;
    if (pool.length) {
      fallbackTier = sameSection.length ? "section" : "domain";
      sensitive = [...new Set(pool.flatMap((s) => s.profile?.sensitive ?? []))] as typeof sensitive;
      why.push(`No page profile yet · using ${fallbackTier} profile`);
    } else {
      fallbackTier = "safe_only";
      return excluded("No profile · safe-only campaigns only");
    }
  }

  if (mode === "context_studio") {
    const hit = sensitive.filter((s) => r.excludeSensitive.includes(s));
    if (hit.length) return excluded(`Hard exclusion: ${hit.map((h) => sensitiveLabel[h] ?? h).join(", ")}`);
  }
  if (page.partnerTier > r.partnerTierMax) return excluded("Partner tier above campaign limit", "partner_tier");
  if (r.country && page.country !== r.country) return excluded("Country mismatch");

  if (mode === "context_studio" && hasProfile && r.purposes.length && !r.purposes.includes(profile!.purpose!)) {
    return excluded(`Purpose not targeted: ${lbl(purposeLabel, profile!.purpose)}`);
  }

  // 2. Soft score.
  const pctr = intentScore(page.topicPath) * 0.02;
  if (mode === "today") {
    return { ...base, outcome: "eligible", reasons: ["Topic match only"], whyMatches: why, score: round(campaign.bidCpm * pctr), fallbackTier: "profile" };
  }
  const idx = ctx.idx;
  const relevance = idx ? idx.cosine(`${page.title} ${page.text}`, campaign.brief) : 0;
  const tone = profile?.tone ?? "neutral";
  const toneMatch = r.tonePreference.includes(tone) ? 1 : tone === "negative" || tone === "tragic" ? -0.5 : 0;
  const score = campaign.bidCpm * pctr * (1 + 0.5 * relevance + 0.3 * toneMatch);

  if (hasProfile) {
    why.push(`Purpose matched: ${lbl(purposeLabel, profile!.purpose)}`);
    why.push(
      toneMatch > 0
        ? `Tone preferred: ${lbl(toneLabel, tone)}`
        : `Tone: ${lbl(toneLabel, tone)} (ranked lower, not excluded)`,
    );
  }
  const exNames = r.excludeSensitive.map((s) => (s === "recalls" ? "a product recall" : (sensitiveLabel[s] ?? s).toLowerCase()));
  why.push(exNames.length ? `No hard exclusion: Not ${exNames.join(" or ")}` : "No hard exclusion detected");

  return {
    ...base,
    outcome: "eligible",
    reasons: ["All hard rules passed"],
    whyMatches: why,
    score: round(score),
    relevance: Number(relevance.toFixed(3)),
    fallbackTier,
  };
}

const round = (n: number) => Number(n.toFixed(4));

export const outcomeLabel = (o: Outcome) => (o === "eligible" ? "Eligible" : o === "partner_tier" ? "Partner tier" : "Excluded");

// Context Library data + profile persistence (shared by API routes and the page).
import { createHash } from "node:crypto";
import { getRepo } from "../db/repo";
import { topicOf } from "../existing/contextGraph";
import { corpusIndex, evaluate } from "./match";
import { illustrativeVector } from "./tfidf";
import { profilePage } from "./profiler";
import { FOCUS_CAMPAIGN_ID } from "../queries";
import type { ContextProfile, Page } from "../types";

export async function libraryRows() {
  const repo = await getRepo();
  const [pages, profiles, campaign, requests, corrections] = await Promise.all([
    repo.pages.list(), repo.profiles.list(), repo.campaigns.get(FOCUS_CAMPAIGN_ID), repo.requests.list(), repo.corrections.list(),
  ]);
  const prof = new Map(profiles.map((p) => [p.pageId, p]));
  const idx = corpusIndex(pages);
  const siblings = pages.map((p) => ({ page: p, profile: prof.get(p.id) ?? null }));
  return pages.map((page) => {
    const profile = prof.get(page.id) ?? null;
    const m = campaign ? evaluate(page, profile, campaign, "context_studio", { idx, siblings }) : null;
    const req = requests.filter((r) => r.pageId === page.id && r.purpose === "human_facing").sort((a, b) => b.ts.localeCompare(a.ts))[0];
    return {
      page, profile,
      eligibility: m ? { outcome: m.outcome, reason: m.outcome === "eligible" ? m.whyMatches.at(-1) ?? "No hard exclusion detected" : m.reasons[0], fallbackTier: m.fallbackTier } : null,
      terms: idx.topTerms(`${page.title} ${page.text}`, 8),
      vector: illustrativeVector(`${page.title} ${page.text}`, idx),
      inspectRequestId: req?.id ?? null,
      openCorrections: corrections.filter((c) => c.pageId === page.id && c.status === "open"),
    };
  });
}
export type LibraryRow = Awaited<ReturnType<typeof libraryRows>>[number];

/** Upsert a page from extracted/pasted content (dedupe by URL). */
export async function upsertPage(input: { url?: string; site?: string; title: string; text: string }) {
  const repo = await getRepo();
  const url = (input.url || `pasted.example/${createHash("sha1").update(input.title + input.text).digest("hex").slice(0, 10)}`).replace(/^https?:\/\//, "").replace(/^www\./, "");
  const existing = (await repo.pages.list()).find((p) => p.url === url);
  if (existing) return existing;
  const site = input.site ?? url.split("/")[0];
  const page: Page = {
    id: `pg-${createHash("sha1").update(url).digest("hex").slice(0, 10)}`,
    url, site, title: input.title.slice(0, 200), text: input.text.slice(0, 20000),
    topicPath: topicOf({ topicPath: "", title: input.title, text: input.text }),
    partnerTier: 1, country: "US", trafficPerDay: 12000,
  };
  await repo.pages.insert(page);
  return page;
}

export async function profileAndStore(page: Page, source: "ui" | "mcp" = "ui") {
  const repo = await getRepo();
  const prev = await repo.profiles.get(page.id);
  const res = await profilePage({ url: page.url, title: page.title, text: page.text, existingTopic: page.topicPath }, source);
  const profile: ContextProfile = {
    pageId: page.id, purpose: res.data.purpose, tone: res.data.tone, confidence: res.confidence, sensitive: res.data.sensitive,
    evidence: res.data.evidence, status: res.status, classifiedAt: new Date().toISOString(), version: (prev?.version ?? 0) + 1, cached: res.cached,
  };
  await repo.profiles.upsert(profile);
  return { profile, cached: res.cached, latencyMs: res.latencyMs, evidenceOk: res.evidenceOk };
}

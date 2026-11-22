// Simulate -> route -> store. Also folds each live request into today's traffic bucket.
import { getRepo } from "../db/repo";
import { buildRequest, SIM_KINDS, type SimKind } from "./simulate";
import { route } from "./router";
import { corpusIndex } from "../context/match";
import { FOCUS_CAMPAIGN_ID, nextId } from "../queries";
import type { Decision, RequestPurpose, TrafficRequest } from "../types";

const PAGE_FOR: Record<SimKind, string | null> = {
  human: "pg-gift-guide", crawler: "pg-gift-guide", unknown: "pg-stocking-stuffers", headless: "pg-gift-guide", ai_app: null, buyer: null,
};

export async function simulateRequest(kind: SimKind, opts: { pageId?: string | null } = {}) {
  if (!SIM_KINDS.some((k) => k.kind === kind)) throw new Error(`Unknown kind ${kind}`);
  const repo = await getRepo();
  const [requests, pages] = await Promise.all([repo.requests.list(), repo.pages.list()]);
  const id = nextId("RQ", requests.map((r) => r.id), 1057);
  const now = new Date();
  const b = buildRequest(kind, { created: Math.floor(now.getTime() / 1000), seed: id });
  const pageId = opts.pageId !== undefined ? opts.pageId : PAGE_FOR[kind];
  const page = pageId ? pages.find((p) => p.id === pageId) ?? null : null;
  const [profile, campaign] = await Promise.all([page ? repo.profiles.get(page.id) : null, repo.campaigns.get(FOCUS_CAMPAIGN_ID)]);
  const r = route({ id, ts: now.toISOString(), userAgent: b.userAgent, headers: b.headers, pageId: page?.id ?? null }, { page, profile, campaign, idx: corpusIndex(pages) });

  const request: TrafficRequest = {
    id, ts: now.toISOString(), source: b.source, pageId: page?.id ?? null, userAgent: b.userAgent, headers: b.headers,
    ivtScore: r.ivtScore, declaredIdentity: r.identityLabel, purpose: r.purpose, confidence: r.confidence, audienceExposure: r.audienceExposure,
    channel: b.channel, kind, simulated: true, review: r.purpose === "unknown" ? { status: "open" } : null,
    ...(kind === "ai_app" ? { contextLabel: "Shopping question" } : {}),
  };
  const decision: Decision = { id: `DEC-${id}`, requestId: id, ...r.decision };
  await repo.requests.insert(request);
  await repo.decisions.insert(decision);
  await bumpToday(r.purpose);
  return { request, decision };
}

const BUCKET: Record<RequestPurpose, "humanFacing" | "automated" | "unknown"> = {
  human_facing: "humanFacing", ai_app: "automated", crawler: "automated", buying_agent: "automated", unknown: "unknown", suspected_invalid: "unknown",
};
const AUTOMATION_TYPE: Partial<Record<RequestPurpose, string>> = { crawler: "Content retrieval", buying_agent: "Buying-agent planning", ai_app: "Other automation" };

async function bumpToday(purpose: RequestPurpose) {
  const repo = await getRepo();
  const days = (await repo.dailyTraffic.list()).sort((a, b) => a.date.localeCompare(b.date));
  const today = days.at(-1);
  if (today) await repo.dailyTraffic.update(today.date, { [BUCKET[purpose]]: today[BUCKET[purpose]] + 1 });
  const t = AUTOMATION_TYPE[purpose];
  if (t) {
    const row = await repo.automation.get(t);
    if (row) await repo.automation.update(t, { requests: row.requests + 1 });
  }
}

export async function requestBundle(requestId: string) {
  const repo = await getRepo();
  const request = await repo.requests.get(requestId);
  if (!request) return null;
  const decision = await repo.decisions.get(`DEC-${requestId}`);
  const page = request.pageId ? await repo.pages.get(request.pageId) : null;
  const profile = request.pageId ? await repo.profiles.get(request.pageId) : null;
  const campaign = decision?.campaignId ? await repo.campaigns.get(decision.campaignId) : null;
  return { request, decision, page, profile, campaign };
}

// Partner placement flow: guard -> ai_offers row (+ linked request/decision) -> display confirmation -> billable.
// Returning an offer is not an impression.
import { randomBytes } from "node:crypto";
import { getRepo } from "../db/repo";
import { placementGuard, type GuardInput, type Placement } from "./placementGuard";
import { buildRequest } from "../traffic/simulate";
import { route } from "../traffic/router";
import { nextId } from "../queries";
import type { AiOffer, Decision, TrafficRequest } from "../types";

export type PlacementResponse =
  | { status: 403; placement: null; reason: string }
  | { status: 200; placement: (Placement & { offerId: string }) | null; displayToken: string | null; reason: string | null; offerId: string; requestId: string; cached: boolean; checks: { label: string; ok: boolean }[] };

export async function requestPlacement(input: GuardInput & { scenario?: string }): Promise<PlacementResponse> {
  const repo = await getRepo();
  const [rules, campaigns, advertisers] = await Promise.all([repo.aiRules.get(input.appId), repo.campaigns.list(), repo.advertisers.list()]);
  const g = await placementGuard(input, { rules, campaigns, advertiserName: (id) => advertisers.find((a) => a.id === id)?.name ?? "" });
  if (g.status === 403) return { status: 403, placement: null, reason: g.reason };

  // Linked traffic request + decision record (AI-app request; routed by the same deterministic router).
  const [requests, offers] = await Promise.all([repo.requests.list(), repo.aiOffers.list()]);
  const requestId = nextId("RQ", requests.map((r) => r.id), 1057);
  const offerId = nextId("AI-", offers.map((o) => o.id), 2042);
  const now = new Date();
  const b = buildRequest("ai_app", { created: Math.floor(now.getTime() / 1000), seed: requestId });
  b.headers["x-ai-app-id"] = input.appId;
  const r = route({ id: requestId, ts: now.toISOString(), userAgent: b.userAgent, headers: b.headers, pageId: null });
  const placed = !!g.placement;
  const campaign = placed && "campaign" in g ? g.campaign : null;
  const request: TrafficRequest = {
    id: requestId, ts: now.toISOString(), source: b.source, pageId: null, userAgent: b.userAgent, headers: b.headers, ivtScore: r.ivtScore,
    declaredIdentity: r.identityLabel, purpose: r.purpose, confidence: r.confidence, audienceExposure: r.audienceExposure, channel: "ShopBuddy",
    kind: "ai_app", contextLabel: input.turnSummary.slice(0, 60), simulated: true, review: null,
  };
  const decision: Decision = {
    id: `DEC-${requestId}`, requestId, ...r.decision, campaignId: campaign?.id ?? null,
    outcome: placed ? "Awaiting display" : `No ad (${g.reason})`,
    adDisplayed: placed ? "Pending confirmation" : "No",
    reasonBuyer: placed ? `Offer ${offerId} returned; billable only after display confirmation.` : `No placement: ${g.reason}.`,
    reasonReader: placed ? g.placement!.reasonReader : "",
    steps: [
      ...r.decision.steps.slice(0, 2),
      ...g.checks.map((c, i) => ({ label: c.label, ok: c.ok, at: new Date(now.getTime() + 1 + i).toISOString() })),
      { label: placed ? "Offer returned · awaiting display confirmation" : `No ad: ${g.reason}`, ok: true, at: new Date(now.getTime() + 9).toISOString() },
    ],
  };
  const displayToken = placed ? `dt_${randomBytes(9).toString("base64url")}` : null;
  const offer: AiOffer = {
    id: offerId, appId: input.appId, scenario: input.scenario ?? "live", turnSummary: input.turnSummary.slice(0, 200), campaignId: campaign?.id ?? null,
    displayToken, returned: placed, displayed: false, clicked: false, reasonReader: placed ? g.placement!.reasonReader : "", reason: placed ? null : g.reason,
    checks: g.checks, requestId, createdAt: now.toISOString(),
  };
  await Promise.all([repo.requests.insert(request), repo.decisions.insert(decision), repo.aiOffers.insert(offer)]);
  const days = (await repo.dailyTraffic.list()).sort((a, b) => a.date.localeCompare(b.date));
  const today = days.at(-1);
  if (today) await repo.dailyTraffic.update(today.date, { automated: today.automated + 1 });

  return {
    status: 200, offerId, requestId, cached: !!g.cached, checks: g.checks, reason: placed ? null : g.reason, displayToken,
    placement: placed ? { ...g.placement!, offerId } : null,
  };
}

export async function confirmDisplay(displayToken: string) {
  const repo = await getRepo();
  const offer = (await repo.aiOffers.list()).find((o) => o.displayToken === displayToken);
  if (!offer) return null;
  if (offer.displayed) return { offer, alreadyConfirmed: true };
  const checks = [...(offer.checks ?? []), { label: "Display confirmation received", ok: true }, { label: "Billable", ok: true }];
  const updated = await repo.aiOffers.update(offer.id, { displayed: true, checks });
  if (offer.requestId) {
    const d = await repo.decisions.get(`DEC-${offer.requestId}`);
    if (d) {
      await repo.decisions.update(d.id, {
        outcome: "Ad displayed", billable: true, adDisplayed: "Yes (display confirmed)",
        steps: [...d.steps, { label: "Display confirmed by partner · billable", ok: true, at: new Date().toISOString() }],
      });
    }
    await repo.requests.update(offer.requestId, { audienceExposure: "Confirmed display in partner app" });
  }
  return { offer: updated!, alreadyConfirmed: false };
}

export async function recordClick(key: { displayToken?: string; offerId?: string }) {
  const repo = await getRepo();
  const offer = (await repo.aiOffers.list()).find((o) => (key.offerId && o.id === key.offerId) || (key.displayToken && o.displayToken === key.displayToken));
  if (!offer) return null;
  if (!offer.displayed) return { error: "Click before display confirmation is ignored" } as const;
  return repo.aiOffers.update(offer.id, { clicked: true });
}

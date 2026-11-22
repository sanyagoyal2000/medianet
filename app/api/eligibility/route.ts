// GET /api/eligibility?campaignId&mode=context_studio|today[&topics=..&purposes=..&tonePreference=..&excludeSensitive=..&country=..&partnerTierMax=..]
import { NextResponse } from "next/server";
import { eligibility, getCampaign, rulesFromQuery } from "@/lib/queries";
import { lbl, purposeLabel, toneLabel, topicShort } from "@/lib/labels";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const campaign = await getCampaign(q.get("campaignId") ?? "");
  if (!campaign) return NextResponse.json({ error: "Unknown campaignId" }, { status: 404 });
  const mode = q.get("mode") === "today" ? "today" : "context_studio";
  const rules = rulesFromQuery(campaign.rules, q);
  const { rows, forecast } = await eligibility({ ...campaign, rules }, mode);
  return NextResponse.json({
    mode,
    forecast,
    rows: rows.map((r) => ({
      pageId: r.page.id, title: r.page.title, url: r.page.url, site: r.page.site, topic: topicShort(r.page.topicPath), topicPath: r.page.topicPath,
      purpose: lbl(purposeLabel, r.profile?.purpose), tone: lbl(toneLabel, r.profile?.tone), status: r.profile?.status ?? "unclassified",
      classifiedAt: r.profile?.classifiedAt ?? null, confidence: r.profile?.confidence ?? null,
      outcome: r.outcome, reasons: r.reasons, whyMatches: r.whyMatches, evidence: r.evidence, score: r.score, relevance: r.relevance,
      fallbackTier: r.fallbackTier, changed: r.changed, otherOutcome: r.todayOutcome, partnerTier: r.page.partnerTier, trafficPerDay: r.page.trafficPerDay,
    })),
  });
}

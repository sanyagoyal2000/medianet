// Partner API: POST /api/v1/ai-placements   header x-ai-app-id (registered app)
// body {turnSummary, userConsentAds, recentCardCount}. Never receives the full conversation.
import { NextResponse } from "next/server";
import { requestPlacement } from "@/lib/aiChannels/placements";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const appId = req.headers.get("x-ai-app-id") ?? "";
  const b = (await req.json().catch(() => ({}))) as { turnSummary?: string; userConsentAds?: boolean; recentCardCount?: number; scenario?: string };
  if (!b.turnSummary) return NextResponse.json({ error: "turnSummary is required" }, { status: 400 });
  const res = await requestPlacement({
    appId, turnSummary: String(b.turnSummary).slice(0, 200), userConsentAds: b.userConsentAds === true, recentCardCount: Number(b.recentCardCount ?? 0), scenario: b.scenario,
  });
  if (res.status === 403) return NextResponse.json({ placement: null, reason: res.reason }, { status: 403 });
  const { status: _s, ...body } = res; // eslint-disable-line @typescript-eslint/no-unused-vars
  return NextResponse.json(body);
}

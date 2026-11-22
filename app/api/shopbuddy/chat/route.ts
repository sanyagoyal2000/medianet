// ShopBuddy partner server: answers with its own assistant, then asks Media.net for a placement
// using only a turn summary (last user message, trimmed to 200 chars).
import { NextResponse } from "next/server";
import { shopbuddyAnswer } from "@/lib/aiChannels/shopbuddy";
import { requestPlacement } from "@/lib/aiChannels/placements";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as {
    messages?: { role: "user" | "assistant"; content: string }[]; consent?: boolean; recentCardCount?: number; scenario?: string;
  };
  const messages = (b.messages ?? []).filter((m) => m.content?.trim()).slice(-12);
  const last = messages.filter((m) => m.role === "user").at(-1)?.content ?? "";
  if (!last) return NextResponse.json({ error: "No user message" }, { status: 400 });
  const [{ answer, cached }, placement] = await Promise.all([
    shopbuddyAnswer(messages),
    requestPlacement({ appId: "shopbuddy", turnSummary: last.slice(0, 200), userConsentAds: b.consent !== false, recentCardCount: Number(b.recentCardCount ?? 0), scenario: b.scenario }),
  ]);
  if (placement.status === 403) return NextResponse.json({ answer, placement: null, reason: placement.reason, cached });
  return NextResponse.json({
    answer, cached: cached || placement.cached, placement: placement.placement, displayToken: placement.displayToken, reason: placement.reason,
    offerId: placement.offerId, requestId: placement.requestId, checks: placement.checks,
  });
}

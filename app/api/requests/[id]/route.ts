// PATCH: review an unknown request. Reclassifying never re-bills past traffic; it trains the configured review.
import { NextResponse } from "next/server";
import { getRepo } from "@/lib/db/repo";
import type { RequestPurpose } from "@/lib/types";

export const runtime = "nodejs";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const b = (await req.json()) as { action: "confirm_unknown" | "reclassify"; to?: RequestPurpose; note?: string };
  const repo = await getRepo();
  const r = await repo.requests.get(id);
  if (!r) return NextResponse.json({ error: "Unknown request" }, { status: 404 });
  if (r.purpose !== "unknown") return NextResponse.json({ error: "Only unknown requests are reviewed here" }, { status: 409 });
  if (b.action === "reclassify") {
    if (!b.to) return NextResponse.json({ error: "Choose a classification" }, { status: 400 });
    if (b.to === "human_facing" && !(b.note ?? "").trim()) return NextResponse.json({ error: "Reclassifying as human-facing requires a reason note" }, { status: 400 });
    await repo.requests.update(id, { review: { status: "reclassified", to: b.to, note: b.note ?? "" } });
  } else {
    await repo.requests.update(id, { review: { status: "confirmed_unknown", note: b.note ?? "" } });
  }
  return NextResponse.json({ ok: true, billable: false, note: "Past requests are never re-billed as human." });
}

import { NextResponse } from "next/server";
import { getRepo } from "@/lib/db/repo";
import { createDealRequest } from "@/lib/existing/dealsDesk";
import { normalizeSpec } from "@/lib/planning/spec";
import type { Campaign } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const repo = await getRepo();
  const c = await repo.campaigns.get(id);
  return c ? NextResponse.json(c) : NextResponse.json({ error: "Not found" }, { status: 404 });
}

/** Save draft or send for review. Never activates spend: "in_review" files a Deals Desk DRAFT request. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const b = (await req.json()) as Partial<Pick<Campaign, "rules" | "brief" | "name" | "status">>;
  const repo = await getRepo();
  const c = await repo.campaigns.get(id);
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (c.status === "live") return NextResponse.json({ error: "Live campaigns are managed in Deals Desk" }, { status: 409 });
  if (b.status && !["draft", "in_review"].includes(b.status)) return NextResponse.json({ error: "Only draft or in_review can be set here" }, { status: 400 });
  const patch: Partial<Campaign> = { updatedAt: new Date().toISOString() };
  if (b.rules) patch.rules = { ...normalizeSpec(b.rules), ...(b.rules.maxPriceHint ? { maxPriceHint: b.rules.maxPriceHint } : {}) };
  if (b.brief != null) patch.brief = b.brief;
  if (b.name) patch.name = b.name;
  if (b.status) patch.status = b.status;
  if (b.status === "in_review") patch.dealRequestId = createDealRequest({ campaignId: id, name: c.name }).dealRequestId;
  const updated = await repo.campaigns.update(id, patch);
  return NextResponse.json(updated);
}

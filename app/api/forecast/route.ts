import { NextResponse } from "next/server";
import { eligibility, getCampaign, rulesFromQuery } from "@/lib/queries";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const c = await getCampaign(q.get("campaignId") ?? "");
  if (!c) return NextResponse.json({ error: "Unknown campaignId" }, { status: 404 });
  const { forecast, rows } = await eligibility({ ...c, rules: rulesFromQuery(c.rules, q) }, q.get("mode") === "today" ? "today" : "context_studio");
  return NextResponse.json({ ...forecast, eligiblePages: rows.filter((r) => r.outcome === "eligible").length });
}

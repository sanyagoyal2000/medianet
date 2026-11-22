import { NextResponse } from "next/server";
import { getRepo } from "@/lib/db/repo";

export const runtime = "nodejs";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { action } = (await req.json()) as { action: "approve" | "reject" };
  const repo = await getRepo();
  const c = await repo.corrections.get(id);
  if (!c) return NextResponse.json({ error: "Unknown correction" }, { status: 404 });
  if (c.status !== "open") return NextResponse.json({ error: "Already resolved" }, { status: 409 });
  const profile = await repo.profiles.get(c.pageId);
  await repo.corrections.update(id, { status: action === "approve" ? "approved" : "rejected" });
  if (profile) {
    await repo.profiles.update(c.pageId, {
      ...(action === "approve" ? { [c.field]: c.to, version: profile.version + 1, confidence: Math.max(profile.confidence, 0.9) } : {}),
      status: "fresh",
      classifiedAt: new Date().toISOString(),
    });
  }
  return NextResponse.json({ ok: true, status: action === "approve" ? "approved" : "rejected" });
}

import { NextResponse } from "next/server";
import { getRepo } from "@/lib/db/repo";
import type { Correction } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  const repo = await getRepo();
  return NextResponse.json(await repo.corrections.list());
}

export async function POST(req: Request) {
  const b = (await req.json()) as { pageId: string; field: "purpose" | "tone"; to: string; note?: string };
  if (!b.pageId || !["purpose", "tone"].includes(b.field) || !b.to) return NextResponse.json({ error: "pageId, field and to are required" }, { status: 400 });
  const repo = await getRepo();
  const profile = await repo.profiles.get(b.pageId);
  if (!profile) return NextResponse.json({ error: "Page has no profile yet" }, { status: 404 });
  const correction: Correction = {
    id: `COR-${Date.now().toString(36).toUpperCase()}`, pageId: b.pageId, field: b.field, from: String(profile[b.field] ?? ""), to: b.to,
    note: b.note ?? "", status: "open", createdAt: new Date().toISOString(),
  };
  await repo.corrections.insert(correction);
  await repo.profiles.update(b.pageId, { status: "needs_review" });
  return NextResponse.json(correction, { status: 201 });
}

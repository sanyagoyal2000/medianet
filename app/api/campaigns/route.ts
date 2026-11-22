import { NextResponse } from "next/server";
import { getRepo } from "@/lib/db/repo";
import type { Campaign } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  const repo = await getRepo();
  return NextResponse.json(await repo.campaigns.list());
}

/** Create a new UI draft (empty brief) and return it. */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { name?: string; advertiserId?: string };
  const repo = await getRepo();
  const now = new Date().toISOString();
  const c: Campaign = {
    id: `cmp-ui-${Date.now().toString(36)}`, advertiserId: b.advertiserId ?? "adv-kohls", name: b.name?.trim() || "Untitled campaign",
    status: "draft", source: "ui", brief: "", bidCpm: 6.0, aiChannels: false, dealRequestId: null,
    rules: { topics: [], purposes: [], tonePreference: [], excludeSensitive: ["recalls", "tragedy"], country: "US", partnerTierMax: 1 },
    createdAt: now, updatedAt: now,
  };
  await repo.campaigns.insert(c);
  return NextResponse.json(c, { status: 201 });
}

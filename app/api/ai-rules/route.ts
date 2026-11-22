import { NextResponse } from "next/server";
import { getRepo } from "@/lib/db/repo";
import type { AiRules } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  const repo = await getRepo();
  return NextResponse.json(await repo.aiRules.get("shopbuddy"));
}

/** Save placement rules; they take effect on the next placement request. */
export async function PUT(req: Request) {
  const b = (await req.json()) as Partial<AiRules>;
  const repo = await getRepo();
  const cur = await repo.aiRules.get(b.appId ?? "shopbuddy");
  if (!cur) return NextResponse.json({ error: "Unknown app" }, { status: 404 });
  const next: AiRules = {
    ...cur,
    ...(Array.isArray(b.contextsAllowed) ? { contextsAllowed: b.contextsAllowed.map(String) } : {}),
    ...(b.format ? { format: b.format } : {}),
    ...(b.frequency ? { frequency: b.frequency } : {}),
    ...(typeof b.approvedAssetsOnly === "boolean" ? { approvedAssetsOnly: b.approvedAssetsOnly } : {}),
    ...(b.disclosure ? { disclosure: b.disclosure } : {}),
    sensitivePolicy: "No ad", // fixed: sensitive or unsuitable requests never get an ad
  };
  await repo.aiRules.upsert(next);
  return NextResponse.json(next);
}

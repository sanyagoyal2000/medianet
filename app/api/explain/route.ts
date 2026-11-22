import { NextResponse } from "next/server";
import { explainMatch } from "@/lib/planning/tools";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const { pageId, campaignId } = (await req.json()) as { pageId: string; campaignId: string };
  try {
    return NextResponse.json(await explainMatch({ pageId, campaignId }, "ui"));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Explain failed" }, { status: 400 });
  }
}

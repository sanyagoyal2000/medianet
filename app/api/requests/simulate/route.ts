import { NextResponse } from "next/server";
import { simulateRequest } from "@/lib/traffic/service";
import type { SimKind } from "@/lib/traffic/simulate";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { kind, pageId } = (await req.json().catch(() => ({}))) as { kind?: SimKind; pageId?: string };
  try {
    const { request, decision } = await simulateRequest(kind ?? "human", pageId ? { pageId } : {});
    return NextResponse.json({ requestId: request.id, purpose: request.purpose, confidence: request.confidence, outcome: decision.outcome, billable: decision.billable, routedMs: decision.routedMs, request, decision });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Simulation failed" }, { status: 400 });
  }
}

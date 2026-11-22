import { NextResponse } from "next/server";
import { requestBundle } from "@/lib/traffic/service";

export const runtime = "nodejs";

export async function GET(_: Request, ctx: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await ctx.params;
  const b = await requestBundle(requestId.replace("-", ""));
  return b ? NextResponse.json(b) : NextResponse.json({ error: "Unknown request" }, { status: 404 });
}

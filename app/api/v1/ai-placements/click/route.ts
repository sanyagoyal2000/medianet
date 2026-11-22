import { NextResponse } from "next/server";
import { recordClick } from "@/lib/aiChannels/placements";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { displayToken?: string; offerId?: string };
  const r = await recordClick(b);
  if (!r) return NextResponse.json({ error: "Unknown offer" }, { status: 404 });
  if ("error" in r) return NextResponse.json(r, { status: 409 });
  return NextResponse.json({ offerId: r.id, clicked: true });
}

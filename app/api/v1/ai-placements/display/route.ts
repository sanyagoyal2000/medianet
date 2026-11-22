// Display confirmation: the only event that makes an AI-channel offer billable.
import { NextResponse } from "next/server";
import { confirmDisplay } from "@/lib/aiChannels/placements";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { displayToken } = (await req.json().catch(() => ({}))) as { displayToken?: string };
  const r = displayToken ? await confirmDisplay(displayToken) : null;
  if (!r) return NextResponse.json({ error: "Unknown displayToken" }, { status: 404 });
  return NextResponse.json({ offerId: r.offer.id, displayed: true, billable: true, alreadyConfirmed: r.alreadyConfirmed });
}

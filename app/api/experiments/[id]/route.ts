// Pause / resume an experiment. Ramp approval is not available here: it is gated on evidence.
import { NextResponse } from "next/server";
import { getRepo } from "@/lib/db/repo";

export const runtime = "nodejs";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { status } = (await req.json()) as { status: "running" | "paused" };
  if (!["running", "paused"].includes(status)) return NextResponse.json({ error: "status must be running or paused" }, { status: 400 });
  const repo = await getRepo();
  const e = await repo.experiments.update(id, { status });
  return e ? NextResponse.json(e) : NextResponse.json({ error: "Not found" }, { status: 404 });
}

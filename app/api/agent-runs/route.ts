import { NextResponse } from "next/server";
import { getRepo } from "@/lib/db/repo";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const repo = await getRepo();
  const runs = (await repo.agentRuns.list())
    .filter((r) => (!q.get("agent") || r.agent === q.get("agent")) && (!q.get("source") || r.source === q.get("source")))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return NextResponse.json(runs);
}

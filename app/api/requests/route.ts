import { NextResponse } from "next/server";
import { getRepo } from "@/lib/db/repo";

export const runtime = "nodejs";

export async function GET() {
  const repo = await getRepo();
  const [requests, decisions] = await Promise.all([repo.requests.list(), repo.decisions.list()]);
  const dec = new Map(decisions.map((d) => [d.requestId, d]));
  return NextResponse.json(
    requests.sort((a, b) => Number(b.id.slice(2)) - Number(a.id.slice(2))).map((r) => ({ ...r, decision: dec.get(r.id) ?? null })),
  );
}

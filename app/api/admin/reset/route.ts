import { NextResponse } from "next/server";
import { getRepo } from "@/lib/db/repo";

export const runtime = "nodejs";

export async function POST() {
  const repo = await getRepo();
  await repo.reset();
  return NextResponse.json({ ok: true, adapter: repo.kind });
}

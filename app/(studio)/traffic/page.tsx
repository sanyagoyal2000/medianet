import { getRepo } from "@/lib/db/repo";
import { aiFunnel, trafficTotals } from "@/lib/queries";
import { TrafficClient } from "./TrafficClient";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ review?: string }> }) {
  const sp = await searchParams;
  const repo = await getRepo();
  const [t, automation, requests, decisions, funnel] = await Promise.all([trafficTotals(), repo.automation.list(), repo.requests.list(), repo.decisions.list(), aiFunnel()]);
  const dec = new Map(decisions.map((d) => [d.requestId, d]));
  const rows = requests.sort((a, b) => Number(b.id.slice(2)) - Number(a.id.slice(2))).map((r) => ({ request: r, decision: dec.get(r.id) ?? null }));
  return <TrafficClient totals={t} automation={automation} rows={rows} aiDisplays={funnel.displays} openReview={sp.review === "unknown"} />;
}

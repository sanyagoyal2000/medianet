import { getRepo } from "@/lib/db/repo";
import { readout } from "@/lib/experiments";
import { trafficTotals } from "@/lib/queries";
import { ReportsClient } from "./ReportsClient";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const repo = await getRepo();
  const [experiments, profiles, pages, campaigns, traffic, decisions] = await Promise.all([
    repo.experiments.list(), repo.profiles.list(), repo.pages.list(), repo.campaigns.list(), trafficTotals(), repo.decisions.list(),
  ]);
  const exp = experiments[0];
  const statusCounts = ["fresh", "needs_review", "stale", "unclassified"].map((s) => ({ status: s, pages: profiles.filter((p) => p.status === s).length }));
  const purposeCounts = Object.entries(profiles.reduce<Record<string, number>>((m, p) => { const k = p.purpose ?? "unclassified"; m[k] = (m[k] ?? 0) + 1; return m; }, {})).map(([purpose, n]) => ({ purpose, n }));
  const confBuckets = [0.5, 0.6, 0.7, 0.8, 0.9].map((lo) => ({ bucket: `${lo.toFixed(1)}–${(lo + 0.1).toFixed(1)}`, pages: profiles.filter((p) => p.purpose && p.confidence >= lo && p.confidence < lo + 0.1).length }));
  const byAdvertiser = Object.entries(campaigns.filter((c) => c.status === "live").reduce<Record<string, number>>((m, c) => { m[c.advertiserId] = (m[c.advertiserId] ?? 0) + 1; return m; }, {}));
  const billable = decisions.filter((d) => d.billable).length;
  return (
    <ReportsClient
      initialTab={(["performance", "quality", "experiments", "traffic"].includes(tab ?? "") ? tab : "experiments") as "experiments"}
      exp={exp}
      readout={readout(exp)}
      quality={{ statusCounts, purposeCounts, confBuckets, pages: pages.length }}
      traffic={traffic}
      perf={{ byAdvertiser, billable, decisions: decisions.length }}
    />
  );
}

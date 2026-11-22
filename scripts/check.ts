// Sanity check (not a test suite): prints the headline numbers the screens must reproduce.
import { contextKpis, trafficTotals, eligibility, aiFunnel, taskCounts, activeCampaignCount, FOCUS_CAMPAIGN_ID, getCampaign } from "../lib/queries";
import { fmtReach } from "../lib/existing/dealsDesk";

async function main() {
  const t = await trafficTotals();
  console.log(`traffic total=${t.total} human=${t.human} (${t.humanPct.toFixed(1)}%) automated=${t.automated} (${t.automatedPct.toFixed(1)}%) unknown=${t.unknown} (${t.unknownPct.toFixed(1)}%)`);
  const k = await contextKpis();
  console.log(`context fresh=${k.freshPct.toFixed(1)}% needsReview=${k.needsReview} stale=${k.stalePct.toFixed(1)}% unclassified=${k.unclassifiedPct.toFixed(1)}%`);
  const c = (await getCampaign(FOCUS_CAMPAIGN_ID))!;
  for (const mode of ["context_studio", "today"] as const) {
    const e = await eligibility(c, mode);
    const recall = e.rows.find((r) => r.page.id === "pg-toy-recall")!;
    console.log(`[${mode}] forecast=${fmtReach(e.forecast.point)} eligible=${e.rows.filter((r) => r.outcome === "eligible").length} recall=${recall.outcome} (${recall.reasons[0]})`);
  }
  console.log("ai funnel", await aiFunnel());
  console.log("tasks", await taskCounts(), "active campaigns", await activeCampaignCount());
}
main();

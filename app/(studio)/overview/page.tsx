import Link from "next/link";
import { getRepo } from "@/lib/db/repo";
import { activeCampaignCount, aiFunnel, contextKpis, taskCounts, trafficTotals } from "@/lib/queries";
import { PageHeader } from "@/components/studio/PageHeader";
import { KpiCard } from "@/components/studio/KpiCard";
import { StatusPill, type PillVariant } from "@/components/studio/StatusPill";
import { InspectRequestButton } from "@/components/studio/InspectRequestDialog";
import { CreateCampaignButton } from "@/components/studio/CreateCampaignButton";
import { ShareLine } from "@/components/charts/ShareLine";
import { int, pct } from "@/lib/format";

export const dynamic = "force-dynamic";

const OUTCOME_PILL: Record<string, PillVariant> = { "Ad displayed": "green", "Campaign excluded": "amber", "No ad impression": "red", "Awaiting display": "amber" };
const PURPOSE_TEXT: Record<string, string> = { human_facing: "Human-facing", crawler: "Content crawler", ai_app: "AI-app request" };

export default async function Page() {
  const repo = await getRepo();
  const [active, ctx, traffic, funnel, tasks, meta, requests, decisions, pages, campaigns] = await Promise.all([
    activeCampaignCount(), contextKpis(), trafficTotals(), aiFunnel(), taskCounts(), repo.meta.get(),
    repo.requests.list(), repo.decisions.list(), repo.pages.list(), repo.campaigns.list(),
  ]);
  const dec = new Map(decisions.map((d) => [d.requestId, d]));
  const pageById = new Map(pages.map((p) => [p.id, p]));
  const campById = new Map(campaigns.map((c) => [c.id, c]));
  const recent = requests
    .filter((r) => ["human_facing", "crawler", "ai_app"].includes(r.purpose) && dec.get(r.id) && !dec.get(r.id)!.outcome.startsWith("No ad ("))
    .sort((a, b) => Number(b.id.slice(2)) - Number(a.id.slice(2)))
    .slice(0, 4);

  const bar = [
    { label: "Human-facing", value: traffic.human, pct: traffic.humanPct, color: "bg-ok-solid", dot: "bg-ok-solid" },
    { label: "Known automation", value: traffic.automated, pct: traffic.automatedPct, color: "bg-warn-solid", dot: "bg-warn-solid" },
    { label: "Unknown", value: traffic.unknown, pct: traffic.unknownPct, color: "bg-bad-solid", dot: "bg-bad-solid" },
  ];

  return (
    <>
      <PageHeader
        title="Overview"
        subtitle="Contextual relevance, request quality and AI delivery in one workspace."
        actions={<><InspectRequestButton /><div className="[&_button]:h-11 [&_button]:px-5 [&_button]:text-[16px]"><CreateCampaignButton /></div></>}
      />
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Campaigns active" value={active} href="/campaigns?status=live" />
        <KpiCard label="Fresh context coverage" value={pct(ctx.freshPct)} href="/context-library" />
        <KpiCard label="Requests assessed" value={int(traffic.total)} href="/traffic" />
        <KpiCard label="Unknown purpose" value={pct(traffic.unknownPct)} href="/traffic?review=unknown" />
      </div>

      <div className="mt-4 grid grid-cols-[minmax(0,1.07fr)_minmax(0,1fr)] gap-4">
        <section className="studio-card p-4">
          <h2 className="mb-3 text-[20px] font-bold">Contextual delivery</h2>
          <div className="grid grid-cols-[250px_1fr] gap-4">
            <table className="w-full self-start text-[14px]">
              <thead><tr className="bg-[#F2F4F7]"><th className="px-3 py-1.5 text-left font-semibold">Context</th><th className="px-3 py-1.5 text-right font-semibold">Share</th></tr></thead>
              <tbody>
                {meta.contextualDelivery.rows.map((r) => (
                  <tr key={r.context} className="border-b border-line"><td className="px-3 py-1.5">{r.context}</td><td className="px-3 py-1.5 text-right tabular-nums">{r.share}%</td></tr>
                ))}
              </tbody>
            </table>
            <div className="h-[150px]" aria-label="Buying-guide share of contextual delivery by day"><ShareLine data={meta.contextualDelivery.trend} /></div>
          </div>
          <Link href="/context-library" className="mt-3 inline-block text-[15px] text-link hover:underline">View context library</Link>
        </section>

        <section className="studio-card p-4">
          <h2 className="mb-4 text-[20px] font-bold">Request purpose</h2>
          <div className="flex h-8 overflow-hidden rounded" role="img" aria-label={bar.map((b) => `${b.label} ${pct(b.pct, 0)}`).join(", ")}>
            {bar.map((b) => (
              <div key={b.label} className={`${b.color} flex items-center justify-center text-[15px] font-semibold ${b.label === "Known automation" ? "text-ink" : "text-white"}`} style={{ width: `${b.pct}%` }}>
                {pct(b.pct, 0)}
              </div>
            ))}
          </div>
          <ul className="mt-3 divide-y divide-line text-[15px]">
            {bar.map((b) => (
              <li key={b.label} className="flex items-center justify-between py-1.5">
                <span className="flex items-center gap-2.5"><span className={`size-3.5 rounded-sm ${b.dot}`} />{b.label}</span>
                <span className="tabular-nums">{pct(b.pct, 0)}  ({int(b.value)})</span>
              </li>
            ))}
          </ul>
          <Link href="/traffic" className="mt-2 inline-block text-[15px] text-link hover:underline">Review traffic</Link>
        </section>
      </div>

      <section className="studio-card mt-4 p-4">
        <h2 className="mb-3 text-[20px] font-bold">Recent delivery decisions</h2>
        <table className="w-full text-[15px]">
          <thead><tr className="bg-[#F2F4F7] text-left">{["Time", "Campaign", "Context", "Request purpose", "Outcome", "Action"].map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}</tr></thead>
          <tbody>
            {recent.map((r) => {
              const d = dec.get(r.id)!;
              const page = r.pageId ? pageById.get(r.pageId) : null;
              const camp = d.campaignId && r.purpose !== "crawler" ? campById.get(d.campaignId) : null;
              return (
                <tr key={r.id} className="border-b border-line">
                  <td className="px-3 py-1.5 tabular-nums">{r.ts.slice(11, 16)}</td>
                  <td className="px-3 py-1.5">{camp ? `Kohl's ${camp.name.replace(" 2026", "")}` : "—"}</td>
                  <td className="px-3 py-1.5">
                    {page?.shortTitle ?? page?.title ?? r.contextLabel ?? "—"}{" "}
                    <span className="ml-2 rounded-full bg-grey-bg px-2 py-0.5 text-[12px]">{r.channel}</span>
                  </td>
                  <td className="px-3 py-1.5">{PURPOSE_TEXT[r.purpose]}</td>
                  <td className="px-3 py-1.5"><StatusPill variant={OUTCOME_PILL[d.outcome] ?? "grey"}>{d.outcome}</StatusPill></td>
                  <td className="px-3 py-1.5"><Link href={`/decisions/${r.id}`} className="text-link hover:underline">Inspect</Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-4">
        <section className="studio-card p-4">
          <h2 className="mb-2 text-[20px] font-bold">Tasks awaiting review</h2>
          {[
            ["Context profiles", tasks.profilesToReview, "New or updated context profiles to review.", "Review profiles", "/context-library?status=needs_review", "green"],
            ["Targeting draft", tasks.agentDrafts, "Draft targeting from a buying agent, for approval.", "Review draft", tasks.firstAgentDraftId ? `/campaigns/${tasks.firstAgentDraftId}?tab=targeting` : "/campaigns?source=mcp", "amber"],
            ["Unknown request cases", tasks.unknownOpen, "Requests with unknown purpose to review.", "Review requests", "/traffic?review=unknown", "amber"],
          ].map(([label, n, desc, cta, href, tone]) => (
            <div key={label as string} className="grid grid-cols-[170px_44px_1fr_auto] items-center gap-3 border-b border-line py-2.5 text-[14px] last:border-0">
              <span className="font-semibold">{label}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-center font-semibold ${tone === "green" ? "bg-ok-bg text-ok" : "bg-warn-bg text-warn"}`}>{n}</span>
              <span>{desc}</span>
              <Link href={href as string} className="text-link hover:underline">{cta}</Link>
            </div>
          ))}
        </section>
        <section className="studio-card p-4">
          <h2 className="mb-2 text-[20px] font-bold">AI channels</h2>
          <div className="flex items-start justify-between gap-3 border-b border-line py-2">
            <div>
              <p className="flex items-center gap-3 text-[16px] font-semibold">ShopBuddy Sponsored answers <StatusPill variant="green">Partner pilot</StatusPill></p>
              <p className="text-[15px] text-[#475467]">Deliver contextual answers with eligible brand content.</p>
              <p className="mt-1 text-[13px] tabular-nums text-subtle">{int(funnel.requests)} requests › {int(funnel.offers)} offers › {int(funnel.displays)} displays confirmed › {int(funnel.clicks)} clicks</p>
            </div>
            <Link href="/ai-channels" className="inline-flex h-10 shrink-0 items-center rounded-md border border-link px-4 text-[15px] text-link hover:bg-[#F0F6FF]">Open channel</Link>
          </div>
          <div className="py-2">
            <p className="flex items-center gap-3 text-[16px] font-semibold">Licensed content access <StatusPill variant="grey">Planned</StatusPill></p>
            <p className="text-[15px] text-[#475467]">Enable controlled use of approved brand content across AI channels.</p>
          </div>
        </section>
      </div>
    </>
  );
}

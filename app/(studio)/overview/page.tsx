import Link from "next/link";
import { getRepo } from "@/lib/db/repo";
import { activeCampaignCount, aiFunnel, contextKpis, taskCounts, trafficTotals } from "@/lib/queries";
import { PageHeader } from "@/components/studio/PageHeader";
import { KpiCard } from "@/components/studio/KpiCard";
import { StatusPill, type PillVariant } from "@/components/studio/StatusPill";
import { InspectRequestButton } from "@/components/studio/InspectRequestDialog";
import { CreateCampaignButton } from "@/components/studio/CreateCampaignButton";
import { LinkBtn } from "@/components/studio/Buttons";
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
    { label: "Human-facing", value: traffic.human, pct: traffic.humanPct, color: "bg-ok-solid" },
    { label: "Known automation", value: traffic.automated, pct: traffic.automatedPct, color: "bg-warn-solid" },
    { label: "Unknown", value: traffic.unknown, pct: traffic.unknownPct, color: "bg-bad-solid" },
  ];

  const route = [
    [funnel.requests, "requests"], [funnel.offers, "offers"], [funnel.displays, "displays confirmed"], [funnel.clicks, "clicks"],
  ] as const;

  const taskRows = [
    { label: "Context profiles", n: tasks.profilesToReview, desc: "New or updated context profiles to review", cta: "Review profiles", href: "/context-library?status=needs_review", tone: "green" as const },
    { label: "Targeting draft", n: tasks.agentDrafts, desc: "Draft targeting from a buying agent, for approval", cta: "Review draft", href: tasks.firstAgentDraftId ? `/campaigns/${tasks.firstAgentDraftId}?tab=targeting` : "/campaigns?source=mcp", tone: "amber" as const },
    { label: "Unknown request cases", n: tasks.unknownOpen, desc: "Requests with unknown purpose to review", cta: "Review requests", href: "/traffic?review=unknown", tone: "amber" as const },
  ];

  const th = "px-3 py-2 text-[13px] font-medium text-[#475467]";
  const td = "px-3 py-2.5";

  return (
    <>
      <PageHeader
        title="Overview"
        subtitle="Contextual relevance, request quality and AI delivery in one workspace"
        actions={<><InspectRequestButton className="h-10 text-[15px]" /><CreateCampaignButton /></>}
      />
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Campaigns active" value={active} href="/campaigns?status=live" />
        <KpiCard label="Fresh context coverage" value={pct(ctx.freshPct)} href="/context-library" />
        <KpiCard label="Requests assessed" value={int(traffic.total)} href="/traffic" />
        <KpiCard label="Unknown purpose" value={pct(traffic.unknownPct)} href="/traffic?review=unknown" />
      </div>

      <div className="mt-4 grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-4">
        <section className="studio-card flex flex-col p-5">
          <h2 className="mb-4 text-[18px] font-semibold">Contextual delivery</h2>
          <div className="grid grid-cols-[236px_minmax(0,1fr)] gap-6">
            <table className="w-full self-start text-[14px]">
              <thead><tr className="border-b border-line bg-[#F8F9FB]"><th className={`${th} text-left`}>Context</th><th className={`${th} text-right`}>Share</th></tr></thead>
              <tbody>
                {meta.contextualDelivery.rows.map((r) => (
                  <tr key={r.context} className="border-b border-line last:border-0"><td className={`${td} whitespace-nowrap`}>{r.context}</td><td className={`${td} text-right tabular-nums`}>{r.share}%</td></tr>
                ))}
              </tbody>
            </table>
            <figure className="min-w-0">
              <figcaption className="mb-1 text-[13px] text-subtle">Buying guides share, by day</figcaption>
              <div className="h-[160px]" aria-label="Buying-guide share of contextual delivery by day"><ShareLine data={meta.contextualDelivery.trend} /></div>
            </figure>
          </div>
          <Link href="/context-library" className="mt-auto inline-block self-start pt-4 text-[15px] text-link underline-offset-2 hover:underline">View context library</Link>
        </section>

        <section className="studio-card flex flex-col p-5">
          <h2 className="mb-4 text-[18px] font-semibold">Request purpose</h2>
          <div className="flex h-6 gap-0.5 overflow-hidden rounded-md" role="img" aria-label={bar.map((b) => `${b.label} ${pct(b.pct)}`).join(", ")}>
            {bar.map((b) => <div key={b.label} className={b.color} style={{ width: `${b.pct}%` }} />)}
          </div>
          <ul className="mt-3 divide-y divide-line text-[15px]">
            {bar.map((b) => (
              <li key={b.label} className="grid grid-cols-[minmax(0,1fr)_64px_88px] items-center gap-3 py-2.5">
                <span className="flex items-center gap-2.5"><span className={`size-3 rounded-[3px] ${b.color}`} aria-hidden />{b.label}</span>
                <span className="text-right font-medium tabular-nums">{pct(b.pct)}</span>
                <span className="text-right text-[14px] tabular-nums text-subtle">{int(b.value)}</span>
              </li>
            ))}
          </ul>
          <Link href="/traffic" className="mt-auto inline-block self-start pt-4 text-[15px] text-link underline-offset-2 hover:underline">Review traffic</Link>
        </section>
      </div>

      <section className="studio-card mt-4 p-5">
        <h2 className="mb-4 text-[18px] font-semibold">Recent delivery decisions</h2>
        <table className="w-full text-[15px]">
          <thead><tr className="border-b border-line bg-[#F8F9FB] text-left">{["Time", "Campaign", "Context", "Request purpose", "Outcome", ""].map((h, i) => <th key={i} className={th}>{h || <span className="sr-only">Action</span>}</th>)}</tr></thead>
          <tbody>
            {recent.map((r) => {
              const d = dec.get(r.id)!;
              const page = r.pageId ? pageById.get(r.pageId) : null;
              const camp = d.campaignId && r.purpose !== "crawler" ? campById.get(d.campaignId) : null;
              return (
                <tr key={r.id} className="border-b border-line last:border-0">
                  <td className={`${td} font-mono text-[14px] tabular-nums text-[#475467]`}>{r.ts.slice(11, 16)}</td>
                  <td className={td}>{camp ? `Kohl's ${camp.name.replace(" 2026", "")}` : <span className="text-subtle">—</span>}</td>
                  <td className={td}>
                    <span className="flex max-w-[360px] items-center gap-2">
                      <span className="truncate">{page?.shortTitle ?? page?.title ?? r.contextLabel ?? "—"}</span>
                      <span className="shrink-0 rounded border border-line px-1.5 text-[12px] leading-5 text-subtle">{r.channel}</span>
                    </span>
                  </td>
                  <td className={td}>{PURPOSE_TEXT[r.purpose]}</td>
                  <td className={td}><StatusPill variant={OUTCOME_PILL[d.outcome] ?? "grey"}>{d.outcome}</StatusPill></td>
                  <td className={`${td} text-right`}><Link href={`/decisions/${r.id}`} className="text-link underline-offset-2 hover:underline">Inspect</Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <section className="studio-card p-5">
          <h2 className="mb-2 text-[18px] font-semibold">Tasks awaiting review</h2>
          <ul>
            {taskRows.map((t) => (
              <li key={t.label} className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 border-b border-line py-3 last:border-0">
                <span className={`inline-flex h-6 items-center justify-center rounded-md text-[14px] font-semibold tabular-nums ${t.tone === "green" ? "bg-ok-bg text-ok" : "bg-warn-bg text-warn"}`}>{t.n}</span>
                <span className="min-w-0">
                  <span className="block text-[15px] font-medium">{t.label}</span>
                  <span className="block text-[14px] text-[#475467]">{t.desc}</span>
                </span>
                <Link href={t.href} className="text-[15px] text-link underline-offset-2 hover:underline">{t.cta}</Link>
              </li>
            ))}
          </ul>
        </section>
        <section className="studio-card p-5">
          <h2 className="mb-2 text-[18px] font-semibold">AI App Placements</h2>
          <div className="border-b border-line py-3">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="flex items-center gap-2.5 text-[15px] font-medium">ShopBuddy Sponsored answers <StatusPill variant="green">Partner pilot</StatusPill></p>
                <p className="mt-0.5 text-[14px] text-[#475467]">Deliver contextual answers with eligible brand content</p>
              </div>
              <LinkBtn kind="outline" href="/ai-app-placements" className="h-9 shrink-0 text-[14px]">Open channel</LinkBtn>
            </div>
            <p className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-md bg-[#F8F9FB] px-3 py-2 text-[13px] text-subtle" aria-label="Delivery route this week">
                {route.map(([n, label], i) => (
                  <span key={label} className="whitespace-nowrap">
                    {i > 0 && <span className="mr-1.5 text-[#98A2B3]" aria-hidden>›</span>}
                    <span className="font-medium tabular-nums text-ink">{int(n)}</span> {label}
                  </span>
                ))}
            </p>
          </div>
          <div className="py-3">
            <p className="flex items-center gap-2.5 text-[15px] font-medium">Licensed content access <StatusPill variant="grey">Planned</StatusPill></p>
            <p className="mt-0.5 text-[14px] text-[#475467]">Enable controlled use of approved brand content across AI apps</p>
          </div>
        </section>
      </div>
    </>
  );
}

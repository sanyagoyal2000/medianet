import Link from "next/link";
import { notFound } from "next/navigation";
import { CircleCheck, CircleX, Info } from "lucide-react";
import { getRepo } from "@/lib/db/repo";
import { requestBundle } from "@/lib/traffic/service";
import { PageHeader } from "@/components/studio/PageHeader";
import { StatusPill } from "@/components/studio/StatusPill";
import { RoutingTable } from "@/components/studio/RoutingTable";
import { RoutingPolicyButton } from "@/components/studio/RoutingPolicySheet";
import { EventLogButton } from "./EventLogButton";
import { lbl, purposeLabel, requestPurposeActivity, requestPurposeLabel, rqLabel, toneLabel, topicLeaf } from "@/lib/labels";
import { dateTime, relTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PINNED = ["RQ1048", "RQ1049", "RQ1051"];
const SUBTITLE: Record<string, string> = {
  human_facing: "Human-facing display passed advertising checks.",
  ai_app: "An offer was returned to the AI app. It becomes an impression only after display is confirmed.",
  crawler: "Content retrieval is not a human-facing ad display.",
  buying_agent: "A buyer's agent is planning; no ad is displayed.",
  unknown: "Requester could not be identified. Routed to configured review; never billed as human.",
  suspected_invalid: "Invalid-traffic signal above threshold. Excluded from delivery and billing.",
};

export default async function Page({ params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await params;
  const id = requestId.replace("-", "");
  const bundle = await requestBundle(id);
  if (!bundle || !bundle.decision) notFound();
  const { request: r, decision: d, page, profile, campaign } = bundle;
  const repo = await getRepo();
  const all = await repo.requests.list();
  const simulated = all.filter((x) => x.simulated).sort((a, b) => Number(b.id.slice(2)) - Number(a.id.slice(2))).slice(0, 4);
  const tabs = [...PINNED.map((p) => all.find((x) => x.id === p)!).filter(Boolean), ...simulated];
  if (!tabs.some((t) => t.id === r.id)) tabs.push(r);
  const shortType: Record<string, string> = { human_facing: "Human-facing", ai_app: "AI app", crawler: "Crawler", buying_agent: "Buying agent", unknown: "Unknown", suspected_invalid: "Invalid" };
  const candidatePill = r.purpose === "crawler" ? ["green", "Content match"] : d.outcome === "Ad displayed" ? ["green", "Eligible"] : d.outcome === "Campaign excluded" ? ["red", "Excluded"] : ["grey", "Not evaluated"];
  const sourceLabel = r.channel === "Web" ? "Publisher website" : r.channel === "ShopBuddy" ? "ShopBuddy (partner AI app)" : "MCP endpoint (buyer's agent)";

  const row = (label: string, value: React.ReactNode) => (
    <div className="grid grid-cols-[150px_1fr] items-start gap-3 border-b border-line py-2.5 text-[15px] last:border-b-0">
      <span>{label}:</span><span className="min-w-0">{value}</span>
    </div>
  );

  return (
    <>
      <PageHeader crumbs={[{ label: "Decision Inspector", href: "/decisions" }, { label: rqLabel(r.id) }]} title="Delivery decision" className="mb-4" />
      <nav aria-label="Requests" className="mb-4 flex flex-wrap overflow-hidden">
        {tabs.map((t, i) => (
          <Link key={t.id} href={`/decisions/${t.id}`} aria-current={t.id === r.id ? "page" : undefined}
            className={cn("border border-line bg-white px-10 py-2.5 text-[15px] text-ink hover:bg-[#F9FAFB]", i === 0 && "rounded-l-md", i === tabs.length - 1 && "rounded-r-md", i > 0 && "-ml-px",
              t.id === r.id && "relative z-10 border-link bg-[#E8F0FE] font-medium text-link after:absolute after:inset-x-0 after:-bottom-px after:h-[3px] after:bg-blue")}>
            {shortType[t.purpose]} {rqLabel(t.id)}{t.simulated && <span className="ml-1 text-[11px] text-subtle">live</span>}
          </Link>
        ))}
      </nav>

      <div className="grid grid-cols-3 gap-4">
        <section className="studio-card p-4">
          <h2 className="mb-2 text-[20px] font-bold">Request</h2>
          {row("Source", sourceLabel)}
          {row("Page", page ? <Link href={`/context-library?page=${page.id}`} className="break-all text-link hover:underline">{page.url}</Link> : <span className="text-subtle">{r.contextLabel ?? "No page (API request)"}</span>)}
          {row("Request purpose", requestPurposeActivity[r.purpose])}
          {row("Confidence", <StatusPill variant={r.confidence === "High" ? "green" : "amber"}>{r.confidence}</StatusPill>)}
          {row("Identity", <span className="flex items-center gap-2">{r.declaredIdentity}{(r.purpose === "crawler" || r.purpose === "buying_agent" || r.purpose === "ai_app") && <CircleCheck className="size-5 shrink-0 fill-ok-solid text-white" />}</span>)}
          {row("Signal provider", "Existing verification partner")}
          {row("IVT score", r.ivtScore.toFixed(2))}
          {row("Audience exposure", r.audienceExposure)}
        </section>

        <section className="studio-card p-4">
          <h2 className="mb-2 text-[20px] font-bold">Context profile</h2>
          {page ? (
            <>
              {row("Topic", topicLeaf(page.topicPath))}
              {row("Purpose", lbl(purposeLabel, profile?.purpose))}
              {row("Tone", lbl(toneLabel, profile?.tone))}
              {row("Freshness", profile?.classifiedAt ? relTime(profile.classifiedAt).replace(" ago", "") : "Not classified")}
              {row("Candidate campaign", campaign ? <span className="flex flex-wrap items-center gap-2">Kohl&apos;s {campaign.name.replace(" 2026", "")}<StatusPill variant={candidatePill[0] as "green"}>{candidatePill[1]}</StatusPill></span> : "—")}
              <div className="py-2.5 text-[15px]">
                <p>Evidence:</p>
                <ul className="mt-1.5 list-disc space-y-1 pl-10">
                  {(profile?.evidence ?? []).map((e) => <li key={e.field}>&ldquo;{e.quote}&rdquo;</li>)}
                </ul>
              </div>
              <Link href={`/context-library?page=${page.id}`} className="text-[15px] text-link hover:underline">View profile</Link>
            </>
          ) : (
            <p className="text-[15px] text-subtle">
              {r.purpose === "buying_agent" ? "Planning request over MCP: no page is rendered, so there is no page context to score." : r.purpose === "ai_app" ? "Context comes from the chat turn summary (Placement Guard), never the full conversation." : "No page context."}
            </p>
          )}
        </section>

        <section className="studio-card p-4">
          <h2 className="mb-2 text-[20px] font-bold">Final decision</h2>
          <div className={cn("inline-block rounded-md px-8 py-1.5 text-[21px] font-semibold", d.billable ? "bg-ok-bg text-ok" : "bg-[#E4E7EC] text-ink")}>{d.outcome === "No ad impression" ? "No ad impression" : d.outcome}</div>
          <p className="mt-2 text-[15px]">{SUBTITLE[r.purpose]}</p>
          <ol className="mt-3 space-y-2.5">
            {d.steps.map((s, i) => (
              <li key={i} className="grid grid-cols-[22px_1fr_auto] items-start gap-3 text-[15px]" title={s.detail}>
                {s.ok ? <CircleCheck className="size-6 fill-ok-solid text-white" aria-label="passed" /> : <CircleX className="size-6 fill-bad-solid text-white" aria-label="failed" />}
                <span className="pl-1" title={s.detail}>{s.label}</span>
                <time className="whitespace-nowrap pt-0.5 text-[12.5px] tabular-nums text-[#475467]" dateTime={s.at}>{dateTime(s.at)}.{s.at.slice(20, 23)}</time>
              </li>
            ))}
          </ol>
          <dl className="mt-3 border-t border-line pt-2 text-[15px]">
            <div className="grid grid-cols-[170px_1fr] py-0.5"><dt>Ad displayed:</dt><dd>{d.adDisplayed}</dd></div>
            <div className="grid grid-cols-[170px_1fr] py-0.5"><dt>Billable ad impression:</dt><dd>{d.billable ? "Yes" : d.appliedRule === "ai_app" ? "Only after display confirmation" : "No"}</dd></div>
            <div className="grid grid-cols-[170px_1fr] py-0.5"><dt>Content access:</dt><dd>{d.contentAccess}</dd></div>
          </dl>
          <p className="mt-2 flex items-center gap-2 rounded-md bg-[#F2F4F7] px-3 py-2 text-[14px]"><Info className="size-4 shrink-0" /> Agent identity does not establish human exposure.</p>
          <p className="mt-2 text-[13px] text-subtle">Routed in {d.routedMs} ms · Traffic Router (rules only, no LLM) · {d.reasonBuyer}</p>
          <div className="mt-3 flex items-center justify-between">
            <EventLogButton data={{ request: r, decision: d }} />
            <RoutingPolicyButton label="Review routing policy" kind="blue" applied={d.appliedRule} />
          </div>
        </section>
      </div>

      <section className="studio-card mt-4 p-4">
        <h2 className="mb-3 text-[20px] font-bold">Routing rules</h2>
        <RoutingTable applied={d.appliedRule} />
        <p className="mt-2 text-[13px] text-subtle">Applied rule for {rqLabel(r.id)}: <b>{requestPurposeLabel[d.appliedRule]}</b></p>
      </section>
    </>
  );
}

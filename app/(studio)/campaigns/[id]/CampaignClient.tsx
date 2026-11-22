"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, CircleCheck, CircleX, Loader2, Sparkles, Info } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts";
import type { Campaign, CampaignRules, DailyTraffic } from "@/lib/types";
import { PageHeader } from "@/components/studio/PageHeader";
import { Btn } from "@/components/studio/Buttons";
import { StatusPill, type PillVariant } from "@/components/studio/StatusPill";
import { SimpleSelect } from "@/components/studio/SimpleSelect";
import { MultiSelect } from "@/components/studio/MultiSelect";
import { ChipInput } from "@/components/studio/ChipInput";
import { AgentStepsStream, type AgentStep } from "@/components/studio/AgentStepsStream";
import { CachedChip } from "@/components/studio/CachedChip";
import { GiftArt, KohlsWordmark } from "@/components/studio/Creative";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { readStream } from "@/lib/client/ndjson";
import { countryLabel, sensitiveLabel, toneLabel, topicShort, SENSITIVE } from "@/lib/labels";
import { fmtReach } from "@/lib/existing/dealsDesk";
import { relShort } from "@/lib/format";
import { cn } from "@/lib/utils";

type Tab = "brief" | "targeting" | "placements" | "performance";
type Row = {
  pageId: string; title: string; url: string; site: string; topic: string; topicPath: string; purpose: string; tone: string; status: string;
  classifiedAt: string | null; confidence: number | null; outcome: "eligible" | "excluded" | "partner_tier"; reasons: string[]; whyMatches: string[];
  evidence: { field: string; quote: string }[]; score: number; relevance: number; fallbackTier: string; changed: boolean; otherOutcome: string;
  partnerTier: number; trafficPerDay: number;
};
type Forecast = { point: number; low: number; high: number; basis: string };
type BriefOut = { summary: string; ambiguities: string[]; spec: CampaignRules };

const outcomeVariant: Record<string, PillVariant> = { eligible: "green", excluded: "red", partner_tier: "amber" };
const outcomeText: Record<string, string> = { eligible: "Eligible", excluded: "Excluded", partner_tier: "Partner tier" };
const statusPill = { draft: ["amber", "Draft"], in_review: ["blue", "In review"], live: ["green", "Live"] } as const;
const STUDIO_PURPOSES = [
  { value: "buying_guide", label: "Buying guide" }, { value: "product_comparison", label: "Comparison" }, { value: "how_to", label: "How-to" },
  { value: "news", label: "News" }, { value: "opinion", label: "Opinion" }, { value: "entertainment", label: "Entertainment" },
];
const STUDIO_TONES = ["practical", "upbeat", "neutral", "serious"].map((t) => ({ value: t, label: toneLabel[t] }));

function qs(campaignId: string, rules: CampaignRules, mode: string) {
  const p = new URLSearchParams({
    campaignId, mode, topics: rules.topics.join(","), purposes: rules.purposes.join(","), tonePreference: rules.tonePreference.join(","),
    excludeSensitive: rules.excludeSensitive.join(","), country: rules.country, partnerTierMax: String(rules.partnerTierMax),
  });
  return p.toString();
}

export function CampaignClient({ campaign: initial, advertiser, topics, days, initialTab }: {
  campaign: Campaign; advertiser: string; topics: string[]; days: DailyTraffic[]; initialTab: Tab;
}) {
  const router = useRouter();
  const [campaign, setCampaign] = useState(initial);
  const [tab, setTabState] = useState<Tab>(initialTab);
  const [brief, setBrief] = useState(initial.brief);
  const [rules, setRules] = useState<CampaignRules>(initial.rules);
  const [compareToday, setCompareToday] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>("pg-gift-guide");
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [interpreting, setInterpreting] = useState(false);
  const [briefOut, setBriefOut] = useState<(BriefOut & { cached: boolean }) | null>(null);
  const [saving, setSaving] = useState<"draft" | "review" | null>(null);
  const [dirty, setDirty] = useState(false);
  const readOnly = campaign.status === "live";

  const setTab = (t: Tab) => {
    setTabState(t);
    window.history.replaceState(null, "", `/campaigns/${campaign.id}?tab=${t}`);
  };

  // Re-query eligibility whenever rules or the compare toggle change (debounced).
  const reqId = useRef(0);
  useEffect(() => {
    const id = ++reqId.current;
    setLoading(true);
    const t = setTimeout(async () => {
      const r = await fetch(`/api/eligibility?${qs(campaign.id, rules, compareToday ? "today" : "context_studio")}`);
      const d = await r.json();
      if (id !== reqId.current) return;
      setRows(d.rows);
      setForecast(d.forecast);
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [rules, compareToday, campaign.id]);

  const updateRules = (patch: Partial<CampaignRules>) => { setRules((r) => ({ ...r, ...patch })); setDirty(true); };

  const interpret = useCallback(async () => {
    if (brief.trim().length < 10) return toast.error("Write a brief first.");
    setInterpreting(true);
    setBriefOut(null);
    setSteps([{ label: "Reading brief", state: "running" }]);
    try {
      const res = await fetch("/api/brief/interpret", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ brief, campaignId: campaign.id, advertiser }) });
      let result: (BriefOut & { cached: boolean }) | null = null;
      await readStream<{ type: string; label?: string; detail?: string; data?: BriefOut; cached?: boolean; message?: string }>(res, (e) => {
        if (e.type === "step") {
          setSteps((prev) => {
            const done = prev.map((s) => (s.state === "running" ? { ...s, state: "done" as const } : s));
            const existing = done.findIndex((s) => s.label === e.label);
            if (existing >= 0) { done[existing] = { label: e.label!, detail: e.detail ?? done[existing].detail, state: e.label === "Draft ready" ? "done" : "running" }; return done; }
            return [...done, { label: e.label!, detail: e.detail, state: e.label === "Draft ready" ? "done" : "running" }];
          });
        } else if (e.type === "result" && e.data) {
          result = { ...e.data, cached: !!e.cached };
        } else if (e.type === "error") {
          toast.error(e.message ?? "Interpretation failed");
        }
      });
      setSteps((prev) => prev.map((s) => (s.state === "running" ? { ...s, state: "done" } : s)));
      if (result) {
        const r = result as BriefOut & { cached: boolean };
        setBriefOut(r);
        setRules({ ...r.spec });
        setDirty(true);
        setCompareToday(false);
        setTab("targeting");
        toast.success("Targeting rules drafted from brief · review before saving");
      }
    } finally {
      setInterpreting(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brief, campaign.id, advertiser]);

  async function save(kind: "draft" | "review") {
    setSaving(kind);
    const r = await fetch(`/api/campaigns/${campaign.id}`, {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ rules, brief, ...(kind === "review" ? { status: "in_review" } : {}) }),
    });
    setSaving(null);
    if (!r.ok) return toast.error((await r.json()).error ?? "Save failed");
    const c = (await r.json()) as Campaign;
    setCampaign(c);
    setDirty(false);
    router.refresh();
    if (kind === "review") toast.success(`Sent to Deals Desk as draft request ${c.dealRequestId}`, { description: "No spend is active until a person approves it in Deals Desk." });
    else toast.success("Draft saved");
  }

  const relevant = useMemo(() => (rows ?? []).filter((r) => !r.reasons[0]?.startsWith("Topic not in campaign")), [rows]);
  const [showAll, setShowAll] = useState(false);
  const ordered = useMemo(() => {
    const pr = (r: Row) => (compareToday && r.changed ? 1 : r.outcome === "eligible" ? 0 : r.reasons[0]?.startsWith("Hard exclusion") ? 2 : r.outcome === "partner_tier" ? 3 : 4);
    const elig = relevant.filter((r) => pr(r) === 0).sort((a, b) => b.score - a.score);
    const rest = relevant.filter((r) => pr(r) !== 0).sort((a, b) => pr(a) - pr(b));
    return showAll ? [...elig, ...rest] : [...elig.slice(0, 2), ...rest.slice(0, 2), ...elig.slice(2, 3)].sort((a, b) => pr(a) - pr(b) || b.score - a.score);
  }, [relevant, compareToday, showAll]);
  const selected = relevant.find((r) => r.pageId === expanded) ?? relevant.find((r) => r.outcome === "eligible") ?? null;
  const adPage = selected?.outcome === "eligible" ? selected : relevant.find((r) => r.outcome === "eligible") ?? null;

  return (
    <>
      <PageHeader
        className="mb-3"
        crumbs={[{ label: "Campaigns", href: "/campaigns" }, { label: campaign.name, href: `/campaigns/${campaign.id}?tab=brief` }, { label: tab[0].toUpperCase() + tab.slice(1) }]}
        title={campaign.name}
        titleExtra={
          <>
            <StatusPill variant={statusPill[campaign.status][0]} className="h-7 px-3 text-[14px]">{statusPill[campaign.status][1]}</StatusPill>
            {campaign.source === "mcp" && <StatusPill variant="blue">Source: MCP agent</StatusPill>}
            <span className="ml-1 border-l border-[#98A2B3] pl-4 text-[18px] text-[#475467]">Advertiser: <b className="text-ink">{advertiser}</b></span>
          </>
        }
        actions={
          !readOnly && (
            <>
              <Btn kind="secondary" className="h-11 px-6 text-[16px]" disabled={!!saving} onClick={() => save("draft")}>
                {saving === "draft" && <Loader2 className="size-4 animate-spin" />}Save draft
              </Btn>
              <Btn kind="primary" className="h-11 px-6 text-[16px]" disabled={!!saving} onClick={() => save("review")}>
                {saving === "review" && <Loader2 className="size-4 animate-spin" />}Review campaign
              </Btn>
            </>
          )
        }
      />
      <div role="tablist" aria-label="Campaign sections" className="mb-5 flex gap-2 border-b border-[#D0D5DD]">
        {(["brief", "targeting", "placements", "performance"] as Tab[]).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn("relative px-4 pb-2.5 pt-1 text-[17px] text-[#475467] hover:text-ink", tab === t && "font-semibold text-ink")}
          >
            {t[0].toUpperCase() + t.slice(1)}
            {tab === t && <span className="absolute inset-x-0 -bottom-px h-[3px] rounded bg-cta" />}
          </button>
        ))}
        {dirty && !readOnly && <span className="ml-auto self-center pb-2 text-[13px] text-warn">Unsaved changes</span>}
      </div>

      {tab === "brief" && (
        <BriefTab
          campaign={campaign} advertiser={advertiser} brief={brief} setBrief={(b) => { setBrief(b); setDirty(true); }}
          onInterpret={interpret} interpreting={interpreting} steps={steps} briefOut={briefOut} readOnly={readOnly}
        />
      )}

      {tab === "targeting" && (
        <div className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-5">
          <div className="space-y-5">
            <section className="studio-card p-5">
              <h2 className="mb-3 text-[20px] font-bold">Campaign brief</h2>
              <label className="sr-only" htmlFor="brief-compact">Campaign brief</label>
              <textarea
                id="brief-compact" value={brief} onChange={(e) => { setBrief(e.target.value); setDirty(true); }} rows={3} disabled={readOnly}
                className="w-full resize-none rounded-md border border-[#D0D5DD] p-3 text-[16px] leading-relaxed"
                placeholder="Describe who and what context you want to reach, in plain English."
              />
              <div className="mt-3 flex items-center gap-3">
                <Btn kind="outline" onClick={interpret} disabled={interpreting || readOnly}>
                  {interpreting ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}Interpret brief
                </Btn>
                {briefOut?.cached && <CachedChip />}
              </div>
              {(interpreting || steps.length > 0) && <AgentStepsStream steps={steps} className="mt-3" />}
            </section>

            <RulesCard rules={rules} update={updateRules} topics={topics} readOnly={readOnly} />
          </div>

          <div className="space-y-5">
            <section className="studio-card p-0">
              <div className="flex items-start justify-between gap-4 p-5 pb-3">
                <div>
                  <h2 className="text-[22px] font-bold">Placement eligibility</h2>
                  <p className="mt-6 text-[15px] text-[#475467]">Historical estimate, not guaranteed delivery.</p>
                </div>
                <div className="rounded-lg bg-ok-bg px-5 py-3">
                  <div className="text-[15px] text-ink">Estimated opportunities</div>
                  <div className="flex items-baseline gap-5">
                    <span className="text-[32px] font-bold tabular-nums">{forecast ? fmtReach(forecast.point) : "—"}</span>
                    <span className="text-[15px] text-[#475467]">Next 7 days</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between border-y border-line bg-[#F9FAFB] px-5 py-2">
                <label className="flex items-center gap-2.5 text-[14px]">
                  <Switch checked={compareToday} onCheckedChange={setCompareToday} aria-label="Compare: Today (topic only)" />
                  <span><b>Compare: Today (topic only)</b> <span className="text-subtle">· what topic-only targeting would allow</span></span>
                </label>
                <span className="text-[13px] text-subtle">{compareToday ? "Showing Today (topic only)" : "With Context Studio"}</span>
              </div>
              <EligibilityTable rows={ordered} loading={loading && !rows} expanded={expanded} setExpanded={setExpanded} compare={compareToday} />
              {relevant.length > ordered.length || showAll ? (
                <div className="flex items-center justify-between border-b border-line px-5 py-2 text-[14px]">
                  <span className="text-subtle">{relevant.filter((r) => r.outcome === "eligible").length} eligible · {relevant.filter((r) => r.outcome !== "eligible").length} excluded or limited · of {relevant.length} on-topic pages</span>
                  <button type="button" className="text-link hover:underline" onClick={() => setShowAll((v) => !v)}>{showAll ? "Show fewer" : `Show all ${relevant.length}`}</button>
                </div>
              ) : null}
              <div className="grid grid-cols-2 gap-4 p-5 pt-4">
                <ContextProfileCard row={selected} />
                <AdPreview campaignId={campaign.id} row={adPage} advertiser={advertiser} />
              </div>
            </section>
          </div>
        </div>
      )}

      {tab === "placements" && <PlacementsTab rows={rows} loading={loading} compare={compareToday} setCompare={setCompareToday} forecast={forecast} />}
      {tab === "performance" && <PerformanceTab days={days} forecast={forecast} status={campaign.status} />}
    </>
  );
}

function BriefTab({ campaign, advertiser, brief, setBrief, onInterpret, interpreting, steps, briefOut, readOnly }: {
  campaign: Campaign; advertiser: string; brief: string; setBrief: (b: string) => void; onInterpret: () => void; interpreting: boolean;
  steps: AgentStep[]; briefOut: (BriefOut & { cached: boolean }) | null; readOnly: boolean;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] gap-5">
      <section className="studio-card p-5">
        <h2 className="mb-4 text-[20px] font-bold">Campaign brief</h2>
        <dl className="mb-4 grid grid-cols-3 gap-4 text-[15px]">
          <div><dt className="text-subtle">Advertiser</dt><dd className="font-medium">{advertiser}</dd></div>
          <div><dt className="text-subtle">Budget</dt><dd className="font-medium">{campaign.budget ?? "Set in Deals Desk"}</dd></div>
          <div><dt className="text-subtle">Flight</dt><dd className="font-medium">{campaign.flight ?? "Set in Deals Desk"}</dd></div>
        </dl>
        <label htmlFor="brief" className="mb-1 block text-[15px] font-medium">Brief</label>
        <textarea
          id="brief" value={brief} onChange={(e) => setBrief(e.target.value)} rows={6} disabled={readOnly}
          className="w-full rounded-md border border-[#D0D5DD] p-3 text-[16px] leading-relaxed"
          placeholder="e.g. Find US gift guides and product comparisons under $50. Prefer practical, upbeat content. Exclude product recalls and tragedy."
        />
        <div className="mt-3 flex items-center gap-3">
          <Btn kind="outline" onClick={onInterpret} disabled={interpreting || readOnly}>
            {interpreting ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}Interpret brief
          </Btn>
          <span className="text-[13px] text-subtle">Claude maps the brief through ContextGraph and drafts rules. Nothing is activated.</span>
        </div>
      </section>
      <section className="studio-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[20px] font-bold">Brief Interpreter</h2>
          {briefOut?.cached && <CachedChip />}
        </div>
        {steps.length === 0 ? (
          <p className="text-[15px] text-subtle">Run <b>Interpret brief</b> to see each step live: reading the brief, mapping to ContextGraph, applying hard restrictions, scoring pages and forecasting reach.</p>
        ) : (
          <AgentStepsStream steps={steps} />
        )}
        {briefOut && (
          <div className="mt-4 space-y-3 text-[14px]">
            <p><b>Summary:</b> {briefOut.summary}</p>
            {briefOut.ambiguities.length > 0 && (
              <div>
                <b>Ambiguities to check</b>
                <ul className="mt-1 list-disc space-y-1 pl-5">{briefOut.ambiguities.map((a) => <li key={a}>{a}</li>)}</ul>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function RulesCard({ rules, update, topics, readOnly }: { rules: CampaignRules; update: (p: Partial<CampaignRules>) => void; topics: string[]; readOnly: boolean }) {
  const row = (label: string, child: React.ReactNode) => (
    <div className="grid grid-cols-[130px_1fr] items-center gap-3 py-1.5">
      <span className="text-[16px] text-ink">{label}</span>
      {child}
    </div>
  );
  return (
    <section className={cn("studio-card p-5", readOnly && "pointer-events-none opacity-70")}>
      <h2 className="mb-3 text-[20px] font-bold">Targeting rules</h2>
      {row("Topic", (
        <MultiSelect
          ariaLabel="Topic" value={rules.topics} onChange={(v) => update({ topics: v })} placeholder="Choose ContextGraph topics"
          options={topics.filter((t) => t.includes(">")).map((t) => ({ value: t, label: t.split(" > ").join(" / ") }))}
          summary={(l) => (l.length > 1 ? `${l[0].split(" / ").slice(0, 2).join(" / ")} +${l.length - 1}` : l[0])}
        />
      ))}
      {row("Purpose", <MultiSelect ariaLabel="Purpose" value={rules.purposes} onChange={(v) => update({ purposes: v })} options={STUDIO_PURPOSES} placeholder="Any purpose" />)}
      {row("Tone preference", <MultiSelect ariaLabel="Tone preference" value={rules.tonePreference} onChange={(v) => update({ tonePreference: v })} options={STUDIO_TONES} placeholder="No preference" />)}
      <p className="mt-1 text-[14px] text-[#475467]">Preference only; exclusions always apply.</p>
      <div className="mt-4 border-t border-line pt-4">
        <h3 className="mb-2 text-[18px] font-bold">Hard restrictions</h3>
        {row("Exclude topics", (
          <ChipInput ariaLabel="Excluded sensitive categories" value={rules.excludeSensitive} onChange={(v) => update({ excludeSensitive: v })} options={[...SENSITIVE]} labelFor={(v) => sensitiveLabel[v] ?? v} />
        ))}
        {row("Country", <SimpleSelect ariaLabel="Country" value={rules.country} onChange={(v) => update({ country: v })} options={Object.entries(countryLabel).map(([value, label]) => ({ value, label }))} />)}
        {row("Partner tier max", <SimpleSelect ariaLabel="Partner tier max" value={String(rules.partnerTierMax)} onChange={(v) => update({ partnerTierMax: Number(v) })} options={[1, 2, 3].map((n) => ({ value: String(n), label: `Tier ${n}${n === 1 ? " (premium partners)" : ""}` }))} />)}
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-line pt-4 text-[15px]">
        <span className="flex items-center gap-2">
          <span className="size-3 rounded-full bg-ok-solid" aria-hidden />
          Agent access: <b className="font-medium">Connected</b> · Read &amp; draft only
        </span>
        <Link href="/settings?agent=briefInterpreter#runs" className="text-link underline underline-offset-2">View activity</Link>
      </div>
    </section>
  );
}

function EligibilityTable({ rows, loading, expanded, setExpanded, compare }: { rows: Row[]; loading: boolean; expanded: string | null; setExpanded: (id: string | null) => void; compare: boolean }) {
  return (
    <table className="w-full text-[15px]">
      <thead>
        <tr className="border-b border-line bg-[#F2F4F7] text-left">
          <th scope="col" className="py-2.5 pl-10 pr-3 font-semibold">Article title</th>
          <th scope="col" className="px-3 py-2.5 font-semibold">Purpose</th>
          <th scope="col" className="px-3 py-2.5 font-semibold">Tone</th>
          <th scope="col" className="px-3 py-2.5 font-semibold">Outcome</th>
        </tr>
      </thead>
      <tbody>
        {loading && Array.from({ length: 3 }).map((_, i) => (
          <tr key={i} className="border-b border-line"><td colSpan={4} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>
        ))}
        {!loading && rows.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-subtle">Choose at least one topic to see eligible placements.</td></tr>}
        {!loading && rows.map((r) => {
          const open = expanded === r.pageId;
          return (
            <FragmentRow key={r.pageId}>
              <tr className={cn("cursor-pointer border-b border-line hover:bg-[#F5F8FF]", open && "bg-[#E8F0FE] hover:bg-[#E8F0FE]")} onClick={() => setExpanded(open ? null : r.pageId)}>
                <td className="py-2.5 pl-3 pr-3">
                  <button type="button" aria-expanded={open} className="flex items-center gap-2 text-left" onClick={(e) => { e.stopPropagation(); setExpanded(open ? null : r.pageId); }}>
                    {open ? <ChevronDown className="size-4 shrink-0" /> : <ChevronRight className="size-4 shrink-0" />}
                    <span className={cn(open && "font-medium")}>{r.title}</span>
                  </button>
                </td>
                <td className="px-3 py-2.5">{r.purpose}</td>
                <td className="px-3 py-2.5">{r.tone}</td>
                <td className="px-3 py-2.5">
                  <span className="flex items-center gap-1.5">
                    <StatusPill variant={outcomeVariant[r.outcome]}>{outcomeText[r.outcome]}</StatusPill>
                    {compare && r.changed && (
                      <span title={`With Context Studio: ${outcomeText[r.otherOutcome]}`} className="rounded border border-[#F5C2BE] bg-white px-1.5 text-[11px] font-semibold uppercase text-bad">changed</span>
                    )}
                  </span>
                </td>
              </tr>
              {open && (
                <tr className="border-b border-line bg-white">
                  <td colSpan={4} className="px-6 py-4">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <h4 className="mb-2 text-[16px] font-bold">{r.outcome === "eligible" ? "Why this matches" : "Why this is excluded"}</h4>
                        <ul className="space-y-2 text-[14px]">
                          {(r.outcome === "eligible" ? r.whyMatches : [...r.whyMatches, ...r.reasons]).map((w) => {
                            const bad = r.outcome !== "eligible" && r.reasons.includes(w);
                            const [k, ...rest] = w.split(": ");
                            return (
                              <li key={w} className="flex items-start gap-2">
                                {bad ? <CircleX className="mt-0.5 size-5 shrink-0 fill-bad-solid text-white" /> : <CircleCheck className="mt-0.5 size-5 shrink-0 fill-ok-solid text-white" />}
                                <span>{rest.length ? <><b className="font-semibold">{k}:</b> {rest.join(": ")}</> : w}</span>
                              </li>
                            );
                          })}
                          {compare && r.changed && <li className="text-[13px] text-bad">With Context Studio this page is {outcomeText[r.otherOutcome]}.</li>}
                        </ul>
                      </div>
                      <div className="border-l border-line pl-6">
                        <h4 className="mb-2 text-[16px] font-bold">Evidence from content</h4>
                        {r.evidence.length ? (
                          <div className="space-y-2">
                            {r.evidence.map((e) => (
                              <div key={e.field} className="grid grid-cols-[72px_1fr] items-start gap-2 text-[14px]">
                                <span className="pt-2 capitalize">{e.field}:</span>
                                <blockquote className="rounded-md border border-line px-3 py-2">&ldquo;{e.quote}&rdquo;</blockquote>
                              </div>
                            ))}
                          </div>
                        ) : <p className="text-[14px] text-subtle">No profile evidence ({r.fallbackTier} fallback).</p>}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </FragmentRow>
          );
        })}
      </tbody>
    </table>
  );
}
function FragmentRow({ children }: { children: React.ReactNode }) { return <>{children}</>; }

function ContextProfileCard({ row }: { row: Row | null }) {
  return (
    <section className="rounded-lg border border-line p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[18px] font-bold">Context profile</h3>
        {row && <Link href={`/context-library?page=${row.pageId}`} className="text-[15px] text-link hover:underline">Open full profile</Link>}
      </div>
      {row ? (
        <>
          <div className="flex flex-wrap gap-1.5 text-[12px]">
            <StatusPill variant={row.status === "fresh" ? "green" : row.status === "stale" ? "red" : "amber"} className="h-6 text-[12px]">{row.status === "fresh" ? "Fresh" : row.status === "stale" ? "Stale" : "Needs review"}</StatusPill>
            <span className="inline-flex h-6 items-center rounded-full bg-grey-bg px-2">Content classified {relShort(row.classifiedAt)}</span>
            <span className="inline-flex h-6 items-center rounded-full bg-grey-bg px-2">Semantic similarity enabled</span>
          </div>
          <dl className="mt-3 grid grid-cols-[70px_1fr] gap-y-1 text-[14px]">
            <dt className="text-subtle">Page</dt><dd className="truncate">{row.title}</dd>
            <dt className="text-subtle">Topic</dt><dd>{topicShort(row.topicPath)}</dd>
            <dt className="text-subtle">Purpose</dt><dd>{row.purpose}</dd>
            <dt className="text-subtle">Tone</dt><dd>{row.tone}</dd>
          </dl>
        </>
      ) : <p className="text-[14px] text-subtle">Expand a row to see its profile.</p>}
    </section>
  );
}

function AdPreview({ campaignId, row, advertiser }: { campaignId: string; row: Row | null; advertiser: string }) {
  const [reason, setReason] = useState<{ reader: string; buyer: string; cached: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => { setReason(null); }, [row?.pageId]);
  async function load() {
    if (!row || reason) return;
    setLoading(true);
    const r = await fetch("/api/explain", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pageId: row.pageId, campaignId }) });
    const d = await r.json();
    setLoading(false);
    if (r.ok) setReason({ reader: d.reader, buyer: d.buyer, cached: d.cached });
  }
  return (
    <section className="rounded-lg border border-line p-3" aria-label="Ad preview">
      <div className="grid grid-cols-[1fr_120px] gap-2">
        <div>
          <div className="flex items-center gap-2">
            <KohlsWordmark className="h-12 w-20" />
            <div className="leading-tight"><div className="text-[16px] font-semibold">{advertiser}</div><div className="text-[13px] text-subtle">Sponsored</div></div>
          </div>
          <p className="mt-2 text-[15px]">Gift ideas under $50 at {advertiser}.</p>
          <p className="text-[13px] text-[#475467]">Practical picks for everyone on your list.</p>
        </div>
        <GiftArt className="h-full w-full rounded-md" />
      </div>
      <div className="mt-2 flex items-center gap-4">
        <span className="inline-flex h-9 items-center rounded-md bg-blue px-5 text-[15px] font-medium text-white">Shop now</span>
        <Popover onOpenChange={(o) => o && load()}>
          <PopoverTrigger className="text-[15px] text-link underline underline-offset-2" disabled={!row}>Why this ad?</PopoverTrigger>
          <PopoverContent className="w-80 text-[14px]" align="start">
            {loading || !reason ? (
              <div className="flex items-center gap-2 text-subtle"><Loader2 className="size-4 animate-spin" /> Asking the Explainer…</div>
            ) : (
              <div className="space-y-2">
                <p className="font-medium">{reason.reader}</p>
                <p className="flex items-center gap-1.5 text-[12px] text-subtle"><Info className="size-3.5" /> Paid placement. Based only on this page&apos;s content, never on you.</p>
                <div className="border-t border-line pt-2 text-[12px] text-subtle">Buyer view: {reason.buyer}</div>
                {reason.cached && <CachedChip />}
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>
      {row && <p className="mt-1.5 truncate text-[12px] text-subtle">Preview on: {row.title}</p>}
    </section>
  );
}

function PlacementsTab({ rows, loading, compare, setCompare, forecast }: { rows: Row[] | null; loading: boolean; compare: boolean; setCompare: (v: boolean) => void; forecast: Forecast | null }) {
  const sorted = [...(rows ?? [])].sort((a, b) => (a.outcome === "eligible" ? 0 : 1) - (b.outcome === "eligible" ? 0 : 1) || b.score - a.score);
  return (
    <section className="studio-card p-0">
      <div className="flex items-center justify-between p-5">
        <div>
          <h2 className="text-[20px] font-bold">Ranked placements</h2>
          <p className="text-[14px] text-subtle">score = bid CPM × pCTR × (1 + 0.5·relevance + 0.3·tone match). Tone ranks; it never excludes.{forecast ? ` · ${fmtReach(forecast.point)} opportunities, next 7 days (${forecast.basis.toLowerCase()})` : ""}</p>
        </div>
        <label className="flex items-center gap-2 text-[14px]"><Switch checked={compare} onCheckedChange={setCompare} aria-label="Compare: Today (topic only)" /> Today (topic only)</label>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[14px]">
          <thead><tr className="bg-[#F2F4F7] text-left">{["#", "Page", "Site", "Topic", "Purpose", "Tone", "Relevance", "Score", "Outcome", "Reason"].map((h) => <th key={h} className="px-3 py-2.5 font-semibold">{h}</th>)}</tr></thead>
          <tbody>
            {loading && !rows && <tr><td colSpan={10} className="p-4"><Skeleton className="h-24 w-full" /></td></tr>}
            {sorted.map((r, i) => (
              <tr key={r.pageId} className="border-b border-line">
                <td className="px-3 py-2 text-subtle">{r.outcome === "eligible" ? i + 1 : "—"}</td>
                <td className="max-w-[240px] truncate px-3 py-2"><Link className="text-link hover:underline" href={`/context-library?page=${r.pageId}`}>{r.title}</Link></td>
                <td className="px-3 py-2 text-subtle">{r.site}</td>
                <td className="px-3 py-2">{r.topic}</td>
                <td className="px-3 py-2">{r.purpose}</td>
                <td className="px-3 py-2">{r.tone}</td>
                <td className="px-3 py-2 tabular-nums">{r.relevance ? r.relevance.toFixed(3) : "—"}</td>
                <td className="px-3 py-2 tabular-nums">{r.score ? r.score.toFixed(4) : "—"}</td>
                <td className="px-3 py-2"><StatusPill variant={outcomeVariant[r.outcome]}>{outcomeText[r.outcome]}</StatusPill></td>
                <td className="max-w-[260px] truncate px-3 py-2 text-subtle" title={r.reasons.join("; ")}>{r.outcome === "eligible" ? r.whyMatches.slice(1, 3).join(" · ") : r.reasons[0]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PerformanceTab({ days, forecast, status }: { days: DailyTraffic[]; forecast: Forecast | null; status: Campaign["status"] }) {
  const totalHuman = days.reduce((s, d) => s + d.humanFacing, 0);
  const data = days.map((d) => ({
    day: new Date(d.date + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }),
    opportunities: forecast ? Math.round((forecast.point * d.humanFacing) / totalHuman) : 0,
  }));
  return (
    <section className="studio-card p-5">
      <h2 className="text-[20px] font-bold">Performance</h2>
      <p className="mb-4 text-[14px] text-subtle">
        {status === "live" ? "Delivery to date." : "Not live yet: eligible human-facing opportunities by day over the last 7 days, the basis of the Deals Desk forecast. Historical estimate, not guaranteed delivery."}
      </p>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 10, right: 10 }}>
            <CartesianGrid vertical={false} stroke="#EAECF0" />
            <XAxis dataKey="day" tickLine={false} axisLine={{ stroke: "#D0D5DD" }} />
            <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}K`} tickLine={false} axisLine={false} />
            <RTooltip formatter={(v) => [Number(v).toLocaleString("en-US"), "Eligible opportunities"]} />
            <Bar dataKey="opportunities" fill="#2F6FEB" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-[13px] text-subtle">Outcome measurement (incremental qualified conversions) comes from ELEVATE once the campaign is live.</p>
    </section>
  );
}

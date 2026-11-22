"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarDays, Info, Lock, Pause, Play } from "lucide-react";
import { Bar, BarChart, CartesianGrid, LabelList, Legend, Line, LineChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts";
import type { DailyTraffic, Experiment } from "@/lib/types";
import { PageHeader } from "@/components/studio/PageHeader";
import { Btn } from "@/components/studio/Buttons";
import { StatusPill } from "@/components/studio/StatusPill";
import { Stepper } from "@/components/studio/Stepper";
import { SimpleSelect } from "@/components/studio/SimpleSelect";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { lbl, purposeLabel, statusLabel } from "@/lib/labels";
import { int, usd } from "@/lib/format";
import { cn } from "@/lib/utils";

type Tab = "performance" | "quality" | "experiments" | "traffic";
type Readout = { text: string; verdict: string; canRamp: boolean; rampBlockers: string[]; ci: { ratePer1kControl: number; ratePer1kTreatment: number; diffPer1k: number; ciPer1k: [number, number]; crossesZero: boolean } };
const ADV: Record<string, string> = { "adv-kohls": "Kohl's", "adv-wanderly": "Wanderly", "adv-northbank": "Northbank", "adv-voltmart": "VoltMart" };

export function ReportsClient({ initialTab, exp: initialExp, readout, quality, traffic, perf }: {
  initialTab: Tab; exp: Experiment; readout: Readout;
  quality: { statusCounts: { status: string; pages: number }[]; purposeCounts: { purpose: string; n: number }[]; confBuckets: { bucket: string; pages: number }[]; pages: number };
  traffic: { days: DailyTraffic[]; total: number; human: number; automated: number; unknown: number };
  perf: { byAdvertiser: [string, number][]; billable: number; decisions: number };
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [exp, setExp] = useState(initialExp);
  const [busy, setBusy] = useState(false);
  const [breakdown, setBreakdown] = useState<Experiment["reconciliation"][number] | null>(null);
  const paused = exp.status === "paused";
  const blockers = paused ? [...readout.rampBlockers.filter((b) => b !== "Pilot is paused"), "Pilot is paused"] : readout.rampBlockers.filter((b) => b !== "Pilot is paused");

  async function togglePause() {
    setBusy(true);
    const r = await fetch(`/api/experiments/${exp.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: paused ? "running" : "paused" }) });
    setBusy(false);
    if (!r.ok) return toast.error("Could not update the pilot");
    const e = await r.json();
    setExp(e);
    router.refresh();
    toast.success(e.status === "paused" ? "Pilot paused · treatment traffic returns to control" : "Pilot resumed");
  }

  const tabs: [Tab, string][] = [["performance", "Campaign performance"], ["quality", "Context quality"], ["experiments", "Experiment monitoring"], ["traffic", "Traffic quality"]];
  const chartData = [
    { arm: "Control", value: Number(readout.ci.ratePer1kControl.toFixed(1)) },
    { arm: "Treatment", value: Number(readout.ci.ratePer1kTreatment.toFixed(1)) },
  ];
  const fmtDay = (d: string) => new Date(d + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

  return (
    <>
      <PageHeader crumbs={[{ label: "Reports", href: "/reports" }, { label: "Performance & experiments" }]} title="Performance & experiments" className="mb-4" />
      <div role="tablist" className="mb-4 inline-flex overflow-hidden rounded-md border border-line bg-white">
        {tabs.map(([k, l], i) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => { setTab(k); window.history.replaceState(null, "", `/reports?tab=${k}`); }}
            className={cn("relative px-8 py-2.5 text-[15px]", i > 0 && "border-l border-line", tab === k ? "bg-[#E8F0FE] font-medium text-link after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:bg-blue" : "hover:bg-[#F9FAFB]")}>
            {l}
          </button>
        ))}
      </div>

      {tab === "experiments" && (
        <>
          <section className="studio-card p-4">
            <div className="flex items-center gap-4">
              <span className="text-[15px] font-medium underline underline-offset-2">Experiment:</span>
              <SimpleSelect ariaLabel="Experiment" className="w-[290px]" value={exp.id} onChange={() => {}} options={[{ value: exp.id, label: exp.name }]} />
              <span className="flex h-10 w-[260px] items-center gap-2 rounded-md border border-[#D0D5DD] px-3 text-[15px]"><CalendarDays className="size-4" /> 16 Nov – 22 Nov 2026</span>
              <span className="ml-auto rounded-md bg-[#E4E7EC] px-5 py-1.5 text-[15px]">{paused ? "Paused" : "Running"}</span>
              <button type="button" onClick={togglePause} disabled={busy}
                className="ml-6 inline-flex h-10 items-center gap-2 rounded-md border border-bad-solid bg-white px-5 text-[16px] font-medium text-bad hover:bg-bad-bg disabled:opacity-50">
                {paused ? <Play className="size-4 fill-current" /> : <Pause className="size-4 fill-current" />}{paused ? "Resume experiment" : "Pause experiment"}
              </button>
            </div>
            <p className="mt-3 flex items-center gap-2 rounded-md bg-[#EEF1F5] px-3 py-2 text-[15px]"><Info className="size-5" /> Results are provisional. Check sample size and guardrails before rollout.</p>
          </section>

          <div className="mt-4 grid grid-cols-4 gap-4">
            <div className="studio-card p-4"><p className="font-semibold">Control requests</p><p className="text-[26px] font-bold">{int(exp.control.requests)}</p><p className="text-[14px] text-[#475467]">Conversions: {exp.control.conversions}<br />Conversions per 1,000: {readout.ci.ratePer1kControl.toFixed(1)}</p></div>
            <div className="studio-card p-4"><p className="font-semibold">Treatment requests</p><p className="text-[26px] font-bold">{int(exp.treatment.requests)}</p><p className="text-[14px] text-[#475467]">Conversions: {exp.treatment.conversions}<br />Conversions per 1,000: {readout.ci.ratePer1kTreatment.toFixed(1)}</p></div>
            <div className="studio-card p-4"><p className="font-semibold">Qualified conversions</p><p className="text-[26px] font-bold">{exp.control.conversions} <span className="text-[18px] font-normal">vs</span> {exp.treatment.conversions}</p><p className="text-[14px] text-[#475467]">{readout.ci.ratePer1kControl.toFixed(1)} vs {readout.ci.ratePer1kTreatment.toFixed(1)} per 1,000 requests · via ELEVATE</p></div>
            <div className="studio-card p-4"><p className="font-semibold">Added lookup p99</p><p className="text-[26px] font-bold">{exp.treatment.p99Ms} ms</p><p className="text-[14px] text-[#475467]">Budget: under 5 ms</p></div>
          </div>

          <div className="mt-4 grid grid-cols-[minmax(0,1fr)_minmax(0,1.03fr)] gap-4">
            <section className="studio-card p-4">
              <h2 className="text-[20px] font-bold">Primary outcome</h2>
              <p className="text-[15px]">Qualified conversions per 1,000 eligible requests</p>
              <div className="mt-2 h-[190px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 40, top: 6 }}>
                    <CartesianGrid horizontal={false} stroke="#EAECF0" />
                    <XAxis type="number" domain={[0, 7]} ticks={[0, 1, 2, 3, 4, 5, 6, 7]} tickFormatter={(v) => v.toFixed(1)} fontSize={12} label={{ value: "Conversions per 1,000 requests", position: "insideBottom", offset: -2, fontSize: 12 }} height={36} />
                    <YAxis type="category" dataKey="arm" width={80} tickLine={false} axisLine={{ stroke: "#344054" }} fontSize={14} />
                    <Bar isAnimationActive={false} dataKey="value" fill="#0169F4" barSize={30}><LabelList dataKey="value" position="right" fontSize={14} formatter={(v) => Number(v).toFixed(1)} /></Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 rounded-md bg-[#F2F4F7] px-3 py-2 text-[14px]">
                <span className="flex items-center gap-2"><Info className="size-4 shrink-0" /> {readout.text}</span>
                <Tooltip>
                  <TooltipTrigger asChild><span tabIndex={0} className="shrink-0 rounded bg-[#E4E7EC] px-3 py-1">{readout.verdict}</span></TooltipTrigger>
                  <TooltipContent>95% CI (two-proportion, normal approximation): {readout.ci.ciPer1k[0].toFixed(2)} to {readout.ci.ciPer1k[1].toFixed(2)} per 1,000</TooltipContent>
                </Tooltip>
              </div>
            </section>
            <section className="studio-card p-4">
              <h2 className="mb-2 text-[20px] font-bold">Guardrails</h2>
              <table className="w-full text-[14px]">
                <thead><tr className="bg-[#F2F4F7] text-left">{["Metric", "Control", "Treatment", "Status"].map((h) => <th key={h} className="px-2 py-1.5 font-semibold">{h}</th>)}</tr></thead>
                <tbody>
                  {exp.guardrails.map((g) => (
                    <tr key={g.metric} className="border-b border-line">
                      <td className="px-2 py-1.5">{g.metric}</td><td className="px-2 py-1.5">{g.control}</td><td className="px-2 py-1.5">{g.treatment}</td>
                      <td className="px-2 py-1.5"><StatusPill variant={g.status === "passed" ? "green" : "amber"}>{g.label}</StatusPill></td>
                    </tr>
                  ))}
                  <tr className="border-b border-line"><td className="px-2 py-1.5">Agent spend without approval</td><td className="px-2 py-1.5">0</td><td className="px-2 py-1.5">0</td><td className="px-2 py-1.5"><StatusPill variant="green">Drafts only</StatusPill></td></tr>
                </tbody>
              </table>
              <p className="mt-3 flex items-center gap-2 rounded-md bg-[#F2F4F7] px-3 py-2 text-[14px]"><Info className="size-4" /> Thresholds configured per experiment. Fill rate is within tolerance but trending down: watch.</p>
            </section>
          </div>

          <section className="studio-card mt-4 grid grid-cols-[220px_1fr_1fr_1fr] items-center gap-4 p-4">
            <h2 className="text-[20px] font-bold">Revenue reconciliation</h2>
            {exp.reconciliation.map((r) => (
              <div key={r.label} className="flex items-end justify-between border-l border-line pl-5 first-of-type:border-0">
                <div><p className="text-[14px] font-semibold">{r.label}</p><p className="text-[22px] font-bold tabular-nums">{usd(r.amount)}</p></div>
                <button type="button" className="text-[15px] text-link hover:underline" onClick={() => setBreakdown(r)}>View breakdown</button>
              </div>
            ))}
          </section>

          <section className="studio-card mt-4 flex items-center gap-6 p-4">
            <h2 className="w-[110px] text-[20px] font-bold">Rollout</h2>
            <Stepper steps={exp.rollout.map((s) => ({ label: s.stage, sub: s.state === "done" ? "Complete" : s.state === "current" ? (paused ? "Paused" : "Current") : "Pending", state: s.state }))} />
            <span className="mx-2 h-10 border-l border-line" />
            <Link href="/campaigns/cmp-kohls-holiday-2026?tab=placements" className="inline-flex h-10 items-center rounded-md border border-link px-4 text-[15px] text-link hover:bg-[#F0F6FF]">Inspect placements</Link>
            <Btn kind="outline" onClick={() => toast.info("Rollout plan: Shadow (done) › Pilot 10% of Kohl's eligible traffic › Ramp to 50%, then 100%, each gated on uplift + guardrails.")}>Review rollout</Btn>
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0} className="ml-auto">
                  <Btn kind="secondary" disabled={!readout.canRamp || paused} className="h-10 bg-[#EAECF0] px-6"><Lock className="size-4" /> Approve ramp</Btn>
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-72">
                {blockers.length ? <>Needs conclusive uplift and all guardrails passing:<ul className="mt-1 list-disc pl-4">{blockers.map((b) => <li key={b}>{b}</li>)}</ul></> : "Ready to ramp."}
              </TooltipContent>
            </Tooltip>
          </section>

          <Dialog open={!!breakdown} onOpenChange={(o) => !o && setBreakdown(null)}>
            <DialogContent>
              <DialogHeader><DialogTitle>{breakdown?.label}: {breakdown ? usd(breakdown.amount) : ""}</DialogTitle><DialogDescription>{breakdown?.detail}</DialogDescription></DialogHeader>
              <p className="text-[14px] text-subtle">Reconciled against Deals Desk billing and ELEVATE conversions for 16–22 Nov. Pilot figures; final numbers follow the monthly close.</p>
            </DialogContent>
          </Dialog>
        </>
      )}

      {tab === "performance" && (
        <div className="grid grid-cols-2 gap-4">
          <section className="studio-card p-4">
            <h2 className="mb-2 text-[20px] font-bold">Live campaigns by advertiser</h2>
            <div className="h-64"><ResponsiveContainer><BarChart data={perf.byAdvertiser.map(([a, n]) => ({ adv: ADV[a] ?? a, n }))}><CartesianGrid vertical={false} stroke="#EAECF0" /><XAxis dataKey="adv" /><YAxis allowDecimals={false} /><RTooltip /><Bar isAnimationActive={false} dataKey="n" name="Live campaigns" fill="#2F6FEB" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
          </section>
          <section className="studio-card p-4">
            <h2 className="mb-2 text-[20px] font-bold">Pilot conversions per 1,000 (ELEVATE)</h2>
            <div className="h-64"><ResponsiveContainer><BarChart data={chartData}><CartesianGrid vertical={false} stroke="#EAECF0" /><XAxis dataKey="arm" /><YAxis domain={[0, 7]} /><RTooltip /><Bar isAnimationActive={false} dataKey="value" fill="#1FB58F" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
            <p className="text-[13px] text-subtle">{perf.billable} of {perf.decisions} inspected decisions were billable.</p>
          </section>
        </div>
      )}

      {tab === "quality" && (
        <div className="grid grid-cols-3 gap-4">
          <section className="studio-card p-4">
            <h2 className="mb-2 text-[18px] font-bold">Profile status (sample of {quality.pages} pages)</h2>
            <div className="h-60"><ResponsiveContainer><BarChart data={quality.statusCounts.map((s) => ({ ...s, status: statusLabel[s.status as keyof typeof statusLabel] }))}><CartesianGrid vertical={false} stroke="#EAECF0" /><XAxis dataKey="status" fontSize={12} /><YAxis allowDecimals={false} /><RTooltip /><Bar isAnimationActive={false} dataKey="pages" fill="#2F6FEB" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
          </section>
          <section className="studio-card p-4">
            <h2 className="mb-2 text-[18px] font-bold">Purpose mix</h2>
            <div className="h-60"><ResponsiveContainer><BarChart layout="vertical" data={quality.purposeCounts.map((p) => ({ ...p, purpose: lbl(purposeLabel, p.purpose === "unclassified" ? null : p.purpose) === "—" ? "Unclassified" : lbl(purposeLabel, p.purpose) }))} margin={{ left: 30 }}><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="purpose" width={100} fontSize={12} /><RTooltip /><Bar isAnimationActive={false} dataKey="n" name="Pages" fill="#1FB58F" /></BarChart></ResponsiveContainer></div>
          </section>
          <section className="studio-card p-4">
            <h2 className="mb-2 text-[18px] font-bold">Confidence distribution</h2>
            <div className="h-60"><ResponsiveContainer><BarChart data={quality.confBuckets}><CartesianGrid vertical={false} stroke="#EAECF0" /><XAxis dataKey="bucket" fontSize={12} /><YAxis allowDecimals={false} /><RTooltip /><Bar isAnimationActive={false} dataKey="pages" fill="#FFC83D" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
            <p className="text-[13px] text-subtle">Below 0.60 goes to review automatically.</p>
          </section>
        </div>
      )}

      {tab === "traffic" && (
        <section className="studio-card p-4">
          <h2 className="mb-1 text-[20px] font-bold">Share of requests by classification</h2>
          <p className="mb-3 text-[14px] text-subtle">{int(traffic.total)} requests · unknown and automation are never billed as human.</p>
          <div className="h-72">
            <ResponsiveContainer>
              <LineChart data={traffic.days.map((d) => { const t = d.humanFacing + d.automated + d.unknown; return { day: fmtDay(d.date), human: +(100 * d.humanFacing / t).toFixed(1), automated: +(100 * d.automated / t).toFixed(1), unknown: +(100 * d.unknown / t).toFixed(1) }; })}>
                <CartesianGrid vertical={false} stroke="#EAECF0" /><XAxis dataKey="day" /><YAxis unit="%" /><RTooltip /><Legend itemSorter={null} />
                <Line isAnimationActive={false} dataKey="human" name="Human-facing" stroke="#2F6FEB" strokeWidth={2} />
                <Line isAnimationActive={false} dataKey="automated" name="Known automation" stroke="#1FB58F" strokeWidth={2} />
                <Line isAnimationActive={false} dataKey="unknown" name="Unknown" stroke="#F6B51E" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
    </>
  );
}

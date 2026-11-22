"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Download, FileText, Info, TriangleAlert, Loader2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, LabelList, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { AutomationRow, DailyTraffic, Decision, RequestPurpose, TrafficRequest } from "@/lib/types";
import { KpiCard } from "@/components/studio/KpiCard";
import { Btn } from "@/components/studio/Buttons";
import { StatusPill } from "@/components/studio/StatusPill";
import { SimpleSelect } from "@/components/studio/SimpleSelect";
import { Drawer } from "@/components/studio/Drawer";
import { RoutingPolicyButton } from "@/components/studio/RoutingPolicySheet";
import { InspectRequestButton } from "@/components/studio/InspectRequestDialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { requestPurposeActivity, requestPurposeLabel } from "@/lib/labels";
import { clock, int, pct } from "@/lib/format";

type Totals = { days: DailyTraffic[]; human: number; automated: number; unknown: number; total: number; humanPct: number; automatedPct: number; unknownPct: number };
type Row = { request: TrafficRequest; decision: Decision | null };

const AD_OUTCOME: Record<string, string> = {
  "Ad displayed": "Displayed", "Campaign excluded": "Campaign excluded", "No ad impression": "No ad impression", "Awaiting display": "Awaiting display",
  "Planning only": "Planning only", "Review required": "Review required", Excluded: "Excluded",
};
const confVariant = { High: "green", Medium: "amber", Low: "amber" } as const;
const PAGE = 5;

export function TrafficClient({ totals, automation, rows, aiDisplays, openReview }: { totals: Totals; automation: AutomationRow[]; rows: Row[]; aiDisplays: number; openReview: boolean }) {
  const router = useRouter();
  const [purpose, setPurpose] = useState("all");
  const [source, setSource] = useState("all");
  const [outcome, setOutcome] = useState("all");
  const [page, setPage] = useState(0);
  const [reviewOpen, setReviewOpen] = useState(openReview);
  const [reconOpen, setReconOpen] = useState(false);

  const sources = [...new Set(rows.map((r) => r.request.source))];
  const outcomes = [...new Set(rows.map((r) => r.decision?.outcome).filter(Boolean) as string[])];
  const filtered = rows.filter(
    (r) => (purpose === "all" || r.request.purpose === purpose) && (source === "all" || r.request.source === source) && (outcome === "all" || r.decision?.outcome === outcome),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const visible = filtered.slice(page * PAGE, page * PAGE + PAGE);

  const chart = totals.days.map((d) => ({
    day: new Date(d.date + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }),
    human: d.humanFacing, automated: d.automated, unknown: d.unknown, total: d.humanFacing + d.automated + d.unknown,
  }));
  const autoTotal = automation.reduce((s, a) => s + a.requests, 0);
  const unknownRows = rows.filter((r) => r.request.purpose === "unknown");

  function exportCsv() {
    const header = ["request_id", "ts", "source", "purpose", "confidence", "ad_outcome", "billable", "content_access", "routed_ms"];
    const lines = filtered.map((r) => [r.request.id, r.request.ts, r.request.source, r.request.purpose, r.request.confidence, r.decision?.outcome ?? "", r.decision?.billable ?? "", r.decision?.contentAccess ?? "", r.decision?.routedMs ?? ""].join(","));
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "request-activity.csv";
    a.click();
    toast.success(`Exported ${filtered.length} requests`);
  }

  return (
    <>
      <div className="mb-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold leading-tight">Traffic Intelligence</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[15px]">
            <label className="flex items-center gap-2">Request purpose:
              <SimpleSelect ariaLabel="Request purpose filter" className="w-[150px]" value={purpose} onChange={(v) => { setPurpose(v); setPage(0); }}
                options={[{ value: "all", label: "All" }, ...(Object.keys(requestPurposeLabel) as RequestPurpose[]).map((k) => ({ value: k, label: requestPurposeLabel[k] }))]} />
            </label>
            <label className="flex items-center gap-2">Source:
              <SimpleSelect ariaLabel="Source filter" className="w-[150px]" value={source} onChange={(v) => { setSource(v); setPage(0); }} options={[{ value: "all", label: "All" }, ...sources.map((s) => ({ value: s, label: s }))]} />
            </label>
            <label className="flex items-center gap-2">Outcome:
              <SimpleSelect ariaLabel="Outcome filter" className="w-[170px]" value={outcome} onChange={(v) => { setOutcome(v); setPage(0); }} options={[{ value: "all", label: "All" }, ...outcomes.map((s) => ({ value: s, label: s }))]} />
            </label>
          </div>
          <p className="mt-3 text-[15px] text-[#475467]">16 Nov – 22 Nov 2026</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <InspectRequestButton className="h-10 text-[15px]" />
          <Btn kind="blue" onClick={exportCsv}><Download className="size-4" /> Export</Btn>
          <RoutingPolicyButton />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Requests assessed" value={int(totals.total)} />
        <KpiCard label="Human-facing" value={int(totals.human)} pill={<StatusPill variant="blue">{pct(totals.humanPct)}</StatusPill>} />
        <KpiCard label="Known automation" value={int(totals.automated)} pill={<StatusPill variant="green">{pct(totals.automatedPct)}</StatusPill>} />
        <KpiCard label="Unknown" value={int(totals.unknown)} pill={<StatusPill variant="amber">{pct(totals.unknownPct)}</StatusPill>} />
      </div>

      <div className="mt-4 grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-4">
        <section className="studio-card p-4">
          <h2 className="text-[19px] font-bold">Request volume by day and classification</h2>
          <div className="mt-2 h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} margin={{ top: 22, left: 8, right: 8 }} barCategoryGap="22%">
                <CartesianGrid vertical={false} stroke="#EAECF0" />
                <XAxis dataKey="day" tickLine={false} axisLine={{ stroke: "#344054" }} fontSize={12} />
                <YAxis tickFormatter={(v) => int(v)} tickLine={false} axisLine={false} fontSize={12} width={64} domain={[0, 175000]} ticks={[0, 25000, 50000, 75000, 100000, 125000, 150000, 175000]} />
                <Tooltip formatter={(v, n) => [int(Number(v)), n]} />
                <Legend itemSorter={null} formatter={(v) => <span className="text-[13px] text-ink">{v}</span>} iconType="square" />
                <Bar isAnimationActive={false} dataKey="human" stackId="a" fill="#2F6FEB" name={`Human-facing (${int(totals.human)})`}>
                  <LabelList dataKey="human" position="center" fill="#fff" fontSize={11} formatter={(v) => int(Number(v))} />
                </Bar>
                <Bar isAnimationActive={false} dataKey="automated" stackId="a" fill="#1FB58F" name={`Automated (${int(totals.automated)})`}>
                  <LabelList dataKey="automated" position="center" fill="#fff" fontSize={10} formatter={(v) => int(Number(v))} />
                </Bar>
                <Bar isAnimationActive={false} dataKey="unknown" stackId="a" fill="#FFC83D" name={`Unknown (${int(totals.unknown)})`}>
                  <LabelList dataKey="unknown" position="center" fill="#1D2939" fontSize={10} formatter={(v) => int(Number(v))} />
                  <LabelList dataKey="total" position="top" fill="#1D2939" fontSize={11} fontWeight={600} formatter={(v) => int(Number(v))} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="studio-card p-4">
          <h2 className="mb-3 text-[19px] font-bold">Automation breakdown</h2>
          <table className="w-full text-[15px]">
            <thead><tr className="bg-[#F2F4F7] text-left"><th className="px-3 py-2 font-semibold">Automation type</th><th className="px-3 py-2 text-right font-semibold">Requests</th><th className="px-3 py-2 text-right font-semibold">Share of requests</th></tr></thead>
            <tbody>
              {automation.map((a) => (
                <tr key={a.type} className="border-b border-line">
                  <td className="px-3 py-2">{a.type}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{int(a.requests)}</td>
                  <td className="px-3 py-2 text-right"><span title={`${pct((a.requests / autoTotal) * 100)} of automation`}><StatusPill variant="green">{pct((a.requests / totals.total) * 100)}</StatusPill></span></td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td className="px-3 py-2">Total automation</td>
                <td className="px-3 py-2 text-right tabular-nums">{int(autoTotal)}</td>
                <td className="px-3 py-2 text-right"><StatusPill variant="green">{pct((autoTotal / totals.total) * 100)}</StatusPill></td>
              </tr>
            </tbody>
          </table>
          <p className="mt-3 flex items-center gap-2 rounded-md bg-[#F2F4F7] px-3 py-2 text-[14px]"><Info className="size-4 shrink-0" /> Identity, request purpose and audience exposure are assessed separately.</p>
        </section>
      </div>

      <section className="studio-card mt-4 p-4">
        <h2 className="mb-3 text-[19px] font-bold">Request activity</h2>
        <table className="w-full text-[15px]">
          <thead>
            <tr className="bg-[#F2F4F7] text-left">{["Request ID", "Time", "Source", "Purpose", "Confidence", "Ad outcome", "Action"].map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody>
            {visible.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-subtle">No requests match these filters.</td></tr>}
            {visible.map(({ request: r, decision: d }) => (
              <tr key={r.id} className="border-b border-line hover:bg-[#F5F8FF]">
                <td className="px-3 py-1.5"><Link href={`/decisions/${r.id}`} className="text-link underline underline-offset-2">{r.id}</Link>{r.simulated && <span className="ml-1.5 text-[11px] text-subtle">live</span>}</td>
                <td className="px-3 py-1.5 tabular-nums text-subtle">{clock(r.ts)}</td>
                <td className="px-3 py-1.5">{r.source}</td>
                <td className="px-3 py-1.5">{requestPurposeActivity[r.purpose]}</td>
                <td className="px-3 py-1.5"><StatusPill variant={confVariant[r.confidence]}>{r.confidence}</StatusPill></td>
                <td className="px-3 py-1.5">{d ? AD_OUTCOME[d.outcome] ?? d.outcome : "—"}{d?.billable && <span className="ml-1.5 text-[12px] text-ok">· billable</span>}</td>
                <td className="px-3 py-1.5"><Link href={`/decisions/${r.id}`} className="inline-flex h-7 items-center rounded border border-[#98A2B3] px-6 text-[14px] text-link hover:bg-[#F0F6FF]">Inspect</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3 flex items-center justify-between text-[14px]">
          <span>{filtered.length} recent request{filtered.length === 1 ? "" : "s"}</span>
          <span className="flex items-center gap-3">
            <button type="button" aria-label="Previous page" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="rounded border border-line p-1.5 disabled:opacity-40"><ChevronLeft className="size-4" /></button>
            {page + 1} of {pages}
            <button type="button" aria-label="Next page" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)} className="rounded border border-line p-1.5 disabled:opacity-40"><ChevronRight className="size-4" /></button>
          </span>
        </div>
      </section>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <section className="studio-card flex items-start gap-4 p-4">
          <TriangleAlert className="size-8 shrink-0 text-ink" strokeWidth={1.5} />
          <div className="flex-1">
            <h2 className="text-[19px] font-bold">Unknown does not mean human</h2>
            <p className="text-[14px]">Requests classified as Unknown cannot be assumed to be from a human. Review these requests to confirm routing and policy handling.</p>
          </div>
          <Btn kind="primary" onClick={() => setReviewOpen(true)}>Review unknown requests</Btn>
        </section>
        <section className="studio-card flex items-start gap-4 p-4">
          <FileText className="size-8 shrink-0" strokeWidth={1.5} />
          <div className="flex-1">
            <h2 className="text-[19px] font-bold">Billing reconciliation</h2>
            <p className="text-[14px]">Display-confirmed events are separate from requests. Reconcile confirmed events, impressions and billing for this campaign.</p>
          </div>
          <button type="button" className="text-[15px] text-link underline underline-offset-2" onClick={() => setReconOpen(true)}>View reconciliation</button>
        </section>
      </div>

      <UnknownReviewSheet open={reviewOpen} onOpenChange={setReviewOpen} rows={unknownRows} onChanged={() => router.refresh()} />
      <Dialog open={reconOpen} onOpenChange={setReconOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Billing reconciliation · 16–22 Nov</DialogTitle>
            <DialogDescription>Billable = human-facing displays + AI displays confirmed. Automation and unknown are excluded.</DialogDescription>
          </DialogHeader>
          {(() => {
            const humanDisplays = Math.round(totals.human * 0.82);
            const rowsR: [string, string, string][] = [
              ["Human-facing requests", int(totals.human), ""],
              ["  → ad displays confirmed (fill 82.0%)", int(humanDisplays), "Billable"],
              ["AI-app displays confirmed (ShopBuddy)", int(aiDisplays), "Billable"],
              ["AI-app offers returned, not displayed", "—", "Not billable"],
              ["Known automation", int(totals.automated), "Excluded"],
              ["Unknown + suspected invalid", int(totals.unknown), "Excluded"],
            ];
            return (
              <table className="w-full text-[14px]">
                <tbody>
                  {rowsR.map(([a, b, c]) => (
                    <tr key={a} className="border-b border-line"><td className="whitespace-pre py-1.5">{a}</td><td className="py-1.5 text-right tabular-nums">{b}</td><td className="py-1.5 pl-3 text-right">{c && <StatusPill variant={c === "Billable" ? "green" : c === "Excluded" ? "red" : "grey"}>{c}</StatusPill>}</td></tr>
                  ))}
                  <tr className="font-semibold"><td className="py-2">Billable impressions</td><td className="py-2 text-right tabular-nums">{int(humanDisplays + aiDisplays)}</td><td /></tr>
                </tbody>
              </table>
            );
          })()}
        </DialogContent>
      </Dialog>
    </>
  );
}

function UnknownReviewSheet({ open, onOpenChange, rows, onChanged }: { open: boolean; onOpenChange: (o: boolean) => void; rows: Row[]; onChanged: () => void }) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} title="Review unknown requests" width="sm:max-w-2xl"
      description="Unknown is never billed as human. Confirm the classification or reclassify; reclassifying as human-facing requires a reason and never re-bills past traffic.">
      <div className="space-y-3">
        {rows.length === 0 && <p className="text-subtle">No unknown requests.</p>}
        {rows.map((r) => <UnknownItem key={r.request.id} row={r} onChanged={onChanged} />)}
      </div>
    </Drawer>
  );
}

function UnknownItem({ row, onChanged }: { row: Row; onChanged: () => void }) {
  const r = row.request;
  const [to, setTo] = useState<string>("crawler");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const status = r.review?.status ?? "open";
  async function act(action: "confirm_unknown" | "reclassify") {
    setBusy(true);
    const res = await fetch(`/api/requests/${r.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, to, note }) });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) return toast.error(d.error);
    toast.success(action === "confirm_unknown" ? `${r.id} confirmed as unknown` : `${r.id} reclassified · past traffic not re-billed`);
    onChanged();
  }
  const reviewed = useMemo(() => status !== "open", [status]);
  return (
    <div className="rounded-md border border-line p-3 text-[14px]">
      <div className="flex items-center justify-between">
        <Link href={`/decisions/${r.id}`} className="font-semibold text-link hover:underline">{r.id}</Link>
        <span className="text-subtle">{clock(r.ts)} · IVT {r.ivtScore.toFixed(2)}</span>
      </div>
      <p className="mt-1 break-all font-mono text-[12px] text-subtle">UA: {r.userAgent}</p>
      <p className="mt-1">Identity: {r.declaredIdentity} · Exposure: {r.audienceExposure}</p>
      {reviewed ? (
        <p className="mt-2"><StatusPill variant="grey">{status === "confirmed_unknown" ? "Confirmed unknown" : `Reclassified as ${requestPurposeLabel[r.review!.to!]}`}</StatusPill> {r.review?.note && <span className="text-subtle">“{r.review.note}”</span>}</p>
      ) : (
        <div className="mt-2 grid grid-cols-[auto_180px_1fr_auto] items-center gap-2">
          <Btn kind="secondary" className="h-9" disabled={busy} onClick={() => act("confirm_unknown")}>Confirm unknown</Btn>
          <SimpleSelect ariaLabel="Reclassify as" className="!h-9" value={to} onChange={setTo} options={["crawler", "buying_agent", "ai_app", "suspected_invalid", "human_facing"].map((k) => ({ value: k, label: requestPurposeLabel[k as RequestPurpose] }))} />
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={to === "human_facing" ? "Reason (required)" : "Note (optional)"} className="h-9 rounded-md border border-[#D0D5DD] px-2" aria-label="Reason note" />
          <Btn kind="outline" className="h-9" disabled={busy || (to === "human_facing" && !note.trim())} onClick={() => act("reclassify")}>{busy && <Loader2 className="size-4 animate-spin" />}Reclassify</Btn>
        </div>
      )}
    </div>
  );
}

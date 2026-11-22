"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowUp, ArrowDown, ChevronRight, CircleCheck, CircleX, ExternalLink, Info, Lock, Search, Loader2, TriangleAlert } from "lucide-react";
import type { LibraryRow } from "@/lib/context/library";
import { PageHeader } from "@/components/studio/PageHeader";
import { KpiCard } from "@/components/studio/KpiCard";
import { Btn } from "@/components/studio/Buttons";
import { StatusPill, type PillVariant } from "@/components/studio/StatusPill";
import { SimpleSelect } from "@/components/studio/SimpleSelect";
import { PathStepper } from "@/components/studio/Stepper";
import { CachedChip } from "@/components/studio/CachedChip";
import { AgentStepsStream, type AgentStep } from "@/components/studio/AgentStepsStream";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { readStream } from "@/lib/client/ndjson";
import { lbl, purposeLabel, toneLabel, statusLabel, topicShort, PURPOSES, TONES } from "@/lib/labels";
import { relTime, relShort } from "@/lib/format";
import { cn } from "@/lib/utils";

type Kpis = { freshPct: number; stalePct: number; unclassifiedPct: number; needsReview: number };
const statusVariant: Record<string, PillVariant> = { fresh: "green", needs_review: "amber", stale: "red", unclassified: "grey" };
const outcomeVariant: Record<string, PillVariant> = { eligible: "green", excluded: "red", partner_tier: "amber" };
const outcomeText: Record<string, string> = { eligible: "Eligible", excluded: "Excluded", partner_tier: "Partner tier" };
const siteLabel = (s: string) => s.replace(".example", "").replace(/^./, (c) => c.toUpperCase());

type SortKey = "page" | "topic" | "purpose" | "tone" | "confidence" | "status" | "classified";

export function LibraryClient({ rows, kpis, initial }: { rows: LibraryRow[]; kpis: Kpis; initial: { status?: string; site?: string; page?: string; q?: string } }) {
  const router = useRouter();
  const [q, setQ] = useState(initial.q ?? "");
  const [site, setSite] = useState(initial.site ?? "all");
  const [purpose, setPurpose] = useState("all");
  const [status, setStatus] = useState(initial.status ?? "all");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "page", dir: 1 });
  const [selectedId, setSelectedId] = useState<string | null>(initial.page ?? "pg-gift-guide");
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [corr, setCorr] = useState<{ field: "purpose" | "tone"; to: string } | null>(null);
  const [reclass, setReclass] = useState<{ done: number; total: number } | null>(null);
  const [cachedIds, setCachedIds] = useState<Set<string>>(new Set());

  const sites = useMemo(() => [...new Set(rows.map((r) => r.page.site))].sort(), [rows]);
  const filtered = useMemo(() => {
    const ql = q.toLowerCase();
    const out = rows.filter(
      (r) =>
        (!ql || r.page.title.toLowerCase().includes(ql) || r.page.url.toLowerCase().includes(ql)) &&
        (site === "all" || r.page.site === site) &&
        (purpose === "all" || r.profile?.purpose === purpose) &&
        (status === "all" || (r.profile?.status ?? "unclassified") === status),
    );
    const val = (r: LibraryRow): string | number => {
      switch (sort.key) {
        case "page": return r.page.title.toLowerCase();
        case "topic": return r.page.topicPath;
        case "purpose": return r.profile?.purpose ?? "zz";
        case "tone": return r.profile?.tone ?? "zz";
        case "confidence": return r.profile?.confidence ?? 0;
        case "status": return r.profile?.status ?? "zz";
        case "classified": return r.profile?.classifiedAt ?? "";
      }
    };
    return out.sort((a, b) => (val(a) < val(b) ? -1 : val(a) > val(b) ? 1 : 0) * sort.dir);
  }, [rows, q, site, purpose, status, sort]);

  const selected = rows.find((r) => r.page.id === selectedId) ?? filtered[0] ?? null;
  useEffect(() => {
    if (selectedId && !rows.some((r) => r.page.id === selectedId)) setSelectedId(rows[0]?.page.id ?? null);
  }, [rows, selectedId]);

  async function reprofile(pageId: string) {
    const res = await fetch("/api/profile", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pageId }) });
    let ok = false;
    await readStream<{ type: string; cached?: boolean }>(res, (e) => {
      if (e.type === "result") {
        ok = true;
        setCachedIds((s) => { const n = new Set(s); if (e.cached) n.add(pageId); else n.delete(pageId); return n; });
      }
    });
    return ok;
  }

  async function reclassifySelected() {
    const ids = [...checked];
    if (!ids.length) return toast.info("Select one or more pages to reclassify.");
    setReclass({ done: 0, total: ids.length });
    let okCount = 0;
    for (let i = 0; i < ids.length; i++) {
      if (await reprofile(ids[i])) okCount++;
      setReclass({ done: i + 1, total: ids.length });
    }
    setReclass(null);
    setChecked(new Set());
    router.refresh();
    toast.success(`Reclassified ${okCount} of ${ids.length} page${ids.length === 1 ? "" : "s"}`);
  }

  const SortHead = ({ k, children, className }: { k: SortKey; children: React.ReactNode; className?: string }) => (
    <th scope="col" className={cn("px-2 py-2.5 text-left font-semibold whitespace-nowrap", className)} aria-sort={sort.key === k ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
      <button type="button" className="inline-flex items-center gap-1.5 hover:text-link" onClick={() => setSort((s) => ({ key: k, dir: s.key === k ? (s.dir === 1 ? -1 : 1) : 1 }))}>
        {children}
        {sort.key === k ? (sort.dir === 1 ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />) : <ChevronRight className="size-3.5 rotate-90 text-subtle" />}
      </button>
    </th>
  );

  const allChecked = filtered.length > 0 && filtered.every((r) => checked.has(r.page.id));

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_460px] gap-5">
      <div className="min-w-0">
        <PageHeader
          crumbs={[{ label: "Context Library", href: "/context-library" }, { label: "Kohl's Holiday Gifting" }]}
          title="Context Library"
          subtitle="Review page meaning, purpose and tone"
          actions={
            <>
              <Btn kind="outline" onClick={reclassifySelected} disabled={!!reclass}>
                {reclass ? <Loader2 className="size-4 animate-spin" /> : null}
                {reclass ? `Reclassifying ${reclass.done}/${reclass.total}` : "Reclassify selected"}
              </Btn>
              <Btn kind="primary" onClick={() => setAddOpen(true)}>Add content source</Btn>
            </>
          }
        />
        {reclass && <Progress value={(reclass.done / reclass.total) * 100} className="-mt-2 mb-3 h-1.5" aria-label="Reclassify progress" />}

        <div className="grid grid-cols-4 gap-4">
          <KpiCard label="Fresh profiles" value={`${kpis.freshPct.toFixed(1)}%`} />
          <KpiCard
            label="Needs review"
            value={<button type="button" onClick={() => setStatus("needs_review")} className="text-link hover:underline">{kpis.needsReview} page{kpis.needsReview === 1 ? "" : "s"}</button>}
          />
          <KpiCard label="Stale profiles" value={`${kpis.stalePct.toFixed(1)}%`} />
          <KpiCard label="Unclassified" value={`${kpis.unclassifiedPct.toFixed(1)}%`} />
        </div>

        <div className="studio-card mt-4 grid grid-cols-[1.3fr_1fr_1fr_1fr] gap-3 p-3">
          <label className="relative">
            <span className="sr-only">Search URL or title</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search URL or title"
              className="h-10 w-full rounded-md border border-[#D0D5DD] bg-white pl-9 pr-3 text-[15px] placeholder:text-subtle"
            />
          </label>
          <SimpleSelect ariaLabel="Site" prefix="Site:" value={site} onChange={setSite} options={[{ value: "all", label: "All" }, ...sites.map((s) => ({ value: s, label: siteLabel(s) }))]} />
          <SimpleSelect ariaLabel="Purpose" prefix="Purpose:" value={purpose} onChange={setPurpose} options={[{ value: "all", label: "All" }, ...PURPOSES.map((p) => ({ value: p, label: purposeLabel[p] }))]} />
          <SimpleSelect ariaLabel="Status" prefix="Status:" value={status} onChange={setStatus} options={[{ value: "all", label: "All" }, ...(["fresh", "needs_review", "stale", "unclassified"] as const).map((s) => ({ value: s, label: statusLabel[s] }))]} />
        </div>

        <div className="mt-3 flex items-center justify-between px-1 text-[15px] text-ink">
          <span>{filtered.length} page{filtered.length === 1 ? "" : "s"}{checked.size ? ` · ${checked.size} selected` : ""}</span>
          <span>16 Nov – 22 Nov 2026</span>
        </div>

        <div className="studio-card mt-2 overflow-x-auto">
          <table className="w-full border-collapse text-[13.5px]">
            <thead>
              <tr className="border-b border-line bg-[#F9FAFB] text-ink">
                <th className="w-9 px-2 py-2.5">
                  <Checkbox
                    aria-label="Select all visible pages"
                    checked={allChecked}
                    onCheckedChange={(v) => setChecked(v ? new Set(filtered.map((r) => r.page.id)) : new Set())}
                  />
                </th>
                <SortHead k="page">Page</SortHead>
                <SortHead k="topic">Topic</SortHead>
                <SortHead k="purpose">Purpose</SortHead>
                <SortHead k="tone">Tone</SortHead>
                <SortHead k="confidence">Conf.</SortHead>
                <SortHead k="status">Status</SortHead>
                <SortHead k="classified">Classified</SortHead>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-3 py-12 text-center text-subtle">No pages match these filters.</td></tr>
              )}
              {filtered.map((r) => {
                const st = r.profile?.status ?? "unclassified";
                const isSel = selected?.page.id === r.page.id;
                return (
                  <tr
                    key={r.page.id}
                    onClick={() => setSelectedId(r.page.id)}
                    className={cn("cursor-pointer border-b border-line hover:bg-[#F5F8FF]", isSel && "bg-[#E8F0FE] hover:bg-[#E8F0FE]")}
                  >
                    <td className="px-2 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        aria-label={`Select ${r.page.title}`}
                        checked={checked.has(r.page.id)}
                        onCheckedChange={(v) => setChecked((s) => { const n = new Set(s); if (v) n.add(r.page.id); else n.delete(r.page.id); return n; })}
                      />
                    </td>
                    <td className="max-w-[190px] px-2 py-2.5">
                      <button type="button" className="block max-w-full truncate text-left text-[15px] text-link hover:underline" onClick={() => setSelectedId(r.page.id)}>
                        {r.page.title}
                      </button>
                      <span className="block truncate text-[12px] text-subtle">{r.page.site}</span>
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5">{topicShort(r.page.topicPath)}</td>
                    <td className="whitespace-nowrap px-2 py-2.5">{lbl(purposeLabel, r.profile?.purpose)}</td>
                    <td className="whitespace-nowrap px-2 py-2.5">{lbl(toneLabel, r.profile?.tone)}</td>
                    <td className="px-2 py-2.5 tabular-nums">{r.profile?.purpose ? r.profile.confidence.toFixed(2) : "—"}</td>
                    <td className="px-2 py-2.5">
                      <span className="inline-flex items-center gap-1">
                        <StatusPill variant={statusVariant[st]}>{statusLabel[st as keyof typeof statusLabel]}</StatusPill>
                        {(cachedIds.has(r.page.id) || r.profile?.cached) && <CachedChip />}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-subtle">{relShort(r.profile?.classifiedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ProfilePanel
        row={selected}
        cached={!!selected && (cachedIds.has(selected.page.id) || !!selected.profile?.cached)}
        onRequestCorrection={(field, to) => setCorr({ field, to })}
        onChanged={() => router.refresh()}
      />

      <AddSourceDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onDone={(pageId, cached) => {
          setSelectedId(pageId);
          setCachedIds((s) => { const n = new Set(s); if (cached) n.add(pageId); return n; });
          setQ(""); setSite("all"); setPurpose("all"); setStatus("all");
          router.refresh();
        }}
      />
      {selected && corr && (
        <CorrectionDialog
          row={selected}
          initial={corr}
          onClose={() => setCorr(null)}
          onSaved={() => { setCorr(null); router.refresh(); }}
        />
      )}
    </div>
  );
}

function ProfilePanel({
  row, cached, onRequestCorrection, onChanged,
}: { row: LibraryRow | null; cached: boolean; onRequestCorrection: (f: "purpose" | "tone", to: string) => void; onChanged: () => void }) {
  if (!row) return <aside className="studio-card p-5 text-subtle">Select a page to see its profile.</aside>;
  const { page, profile, eligibility } = row;
  const open = row.openCorrections;
  const step = open.length ? 2 : profile?.evidence?.length ? 3 : 1;

  async function resolve(id: string, action: "approve" | "reject") {
    const r = await fetch(`/api/corrections/${id}/resolve`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action }) });
    if (r.ok) { toast.success(action === "approve" ? "Correction approved · profile updated" : "Correction rejected"); onChanged(); }
    else toast.error("Could not resolve correction");
  }

  const gated = (label: string, field: "purpose" | "tone" | null, value: string, options: { value: string; label: string }[]) => (
    <div className="grid grid-cols-[110px_1fr_auto] items-center gap-2 py-1.5">
      <span className="text-[15px] text-ink">{label}:</span>
      <SimpleSelect
        ariaLabel={`${label} (review gated)`}
        value={value}
        disabled={!field || !profile?.purpose}
        options={options}
        onChange={(v) => field && v !== value && onRequestCorrection(field, v)}
        className="!h-9"
      />
      <span className="flex items-center gap-1.5">
        <Lock className="size-4 text-subtle" aria-hidden />
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0} className="rounded bg-grey-bg px-2 py-0.5 text-[12px] text-grey">{field ? "Review gated" : "Locked"}</span>
          </TooltipTrigger>
          <TooltipContent>{field ? "Changing this opens a correction request; a reviewer approves it." : "Topic comes from ContextGraph and is never changed here."}</TooltipContent>
        </Tooltip>
      </span>
    </div>
  );

  return (
    <aside className="studio-card self-start p-5" aria-label="Page profile">
      <div className="flex items-center justify-between">
        <h2 className="text-[24px] font-bold text-ink">Page profile</h2>
        {cached && <CachedChip />}
      </div>
      <dl className="mt-3 grid grid-cols-[110px_1fr] gap-y-1 text-[15px]">
        <dt>URL:</dt>
        <dd className="min-w-0">
          <a href={`https://${page.url}`} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1 text-link hover:underline">
            <span className="truncate">{page.url}</span> <ExternalLink className="size-4 shrink-0" />
          </a>
        </dd>
        <dt>Last classified:</dt>
        <dd>{relTime(profile?.classifiedAt)}{profile?.version ? <span className="text-subtle"> · v{profile.version}</span> : null}</dd>
      </dl>

      <div className="mt-3 border-t border-line pt-2">
        {gated("Topic", null, page.topicPath, [{ value: page.topicPath, label: topicShort(page.topicPath) }])}
        {gated("Purpose", "purpose", profile?.purpose ?? "none", profile?.purpose ? PURPOSES.map((p) => ({ value: p, label: purposeLabel[p] })) : [{ value: "none", label: "Not classified" }])}
        {gated("Tone", "tone", profile?.tone ?? "none", profile?.tone ? TONES.map((t) => ({ value: t, label: toneLabel[t] })) : [{ value: "none", label: "Not classified" }])}
        <div className="grid grid-cols-[110px_1fr] items-center gap-2 py-1.5">
          <span className="text-[15px]">Confidence:</span>
          <span className="flex items-center gap-3">
            <span className="tabular-nums">{profile?.purpose ? profile.confidence.toFixed(2) : "—"}</span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-[#EAECF0]" role="meter" aria-valuenow={profile?.confidence ?? 0} aria-valuemin={0} aria-valuemax={1} aria-label="Confidence">
              <span className={cn("block h-full rounded-full", (profile?.confidence ?? 0) >= 0.6 ? "bg-ok-solid" : "bg-warn-solid")} style={{ width: `${(profile?.confidence ?? 0) * 100}%` }} />
            </span>
            <Tooltip>
              <TooltipTrigger aria-label="About confidence"><Info className="size-4 text-subtle" /></TooltipTrigger>
              <TooltipContent>Below 0.60, or any quote not found verbatim, sends the profile to review.</TooltipContent>
            </Tooltip>
          </span>
        </div>
      </div>

      <section className="mt-3 border-t border-line pt-3">
        <h3 className="text-[17px] font-bold">Evidence excerpts</h3>
        {profile?.evidence?.length ? (
          <div className="mt-2 divide-y divide-line rounded-md border border-line">
            {profile.evidence.map((e) => (
              <div key={e.field} className="grid grid-cols-[90px_1fr] gap-2 px-3 py-2 text-[14px]">
                <span className="capitalize">{e.field}:</span>
                <span>&ldquo;{e.quote}&rdquo;</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-[14px] text-subtle">No evidence yet. Reclassify this page to profile it.</p>
        )}
        {profile?.sensitive?.length ? (
          <p className="mt-2 flex items-center gap-1.5 text-[14px] text-bad"><TriangleAlert className="size-4" /> Sensitive: {profile.sensitive.join(", ").replace("_", " ")}</p>
        ) : null}
      </section>

      <Collapsible className="mt-3 rounded-md border border-line bg-[#F9FAFB]">
        <CollapsibleTrigger className="group flex w-full items-start gap-2 px-3 py-2.5 text-left">
          <ChevronRight className="mt-1 size-4 transition-transform group-data-[state=open]:rotate-90" />
          <span>
            <span className="block text-[16px] font-bold">Semantic representation</span>
            <span className="block text-[14px] text-ink">Similarity vector available.</span>
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent className="px-3 pb-3 text-[13px]">
          <p className="mb-1 font-medium">Top TF-IDF terms</p>
          <div className="flex flex-wrap gap-1.5">
            {row.terms.map((t) => (
              <span key={t.term} className="rounded-full border border-line bg-white px-2 py-0.5">{t.term} <span className="text-subtle">{t.weight}</span></span>
            ))}
          </div>
          <p className="mb-1 mt-3 font-medium">8-dimension vector preview <span className="font-normal text-subtle">(illustrative)</span></p>
          <code className="block rounded bg-white p-2 font-mono text-[12px]">[{row.vector.join(", ")}]</code>
        </CollapsibleContent>
      </Collapsible>

      <section className="mt-4 border-t border-line pt-3">
        <h3 className="text-[19px] font-bold">Campaign eligibility</h3>
        {eligibility ? (
          <>
            <div className="mt-2 flex items-center gap-3">
              <span className="text-[16px]">Kohl&apos;s Holiday Gifting</span>
              <StatusPill variant={outcomeVariant[eligibility.outcome]}>{outcomeText[eligibility.outcome]}</StatusPill>
            </div>
            <p className="mt-2 flex items-center gap-2 text-[15px]">
              {eligibility.outcome === "eligible" ? <CircleCheck className="size-5 fill-ok-solid text-white" /> : <CircleX className="size-5 fill-bad-solid text-white" />}
              {eligibility.outcome === "eligible" ? "No hard exclusion detected." : eligibility.reason}
            </p>
            <Link href={row.inspectRequestId ? `/decisions/${row.inspectRequestId}` : "/decisions"} className="mt-2 inline-block text-[15px] text-link hover:underline">
              Inspect decision
            </Link>
          </>
        ) : (
          <p className="text-subtle">No focus campaign.</p>
        )}
      </section>

      {open.length > 0 && (
        <section className="mt-4 rounded-md border border-[#F5D88A] bg-warn-bg p-3 text-[14px]">
          <p className="font-semibold">Correction awaiting review</p>
          {open.map((c) => (
            <div key={c.id} className="mt-1.5">
              <p>
                {c.field}: <s>{lbl(c.field === "purpose" ? purposeLabel : toneLabel, c.from)}</s> → <b>{lbl(c.field === "purpose" ? purposeLabel : toneLabel, c.to)}</b>
                {c.note && <span className="text-subtle"> · “{c.note}”</span>}
              </p>
              <div className="mt-1.5 flex gap-2">
                <Btn kind="secondary" className="h-8 text-[13px]" onClick={() => resolve(c.id, "approve")}>Approve</Btn>
                <Btn kind="secondary" className="h-8 text-[13px]" onClick={() => resolve(c.id, "reject")}>Reject</Btn>
              </div>
            </div>
          ))}
        </section>
      )}

      <section className="mt-4">
        <h3 className="mb-3 text-[19px] font-bold">User path: classification flow</h3>
        <PathStepper steps={["List", "Evidence", "Correction", "Decision"]} active={step} />
      </section>

      <div className="mt-6 flex items-center justify-between gap-3 border-t border-line pt-5">
        <Btn kind="outline" className="flex-1" disabled={!profile?.purpose} onClick={() => profile?.purpose && onRequestCorrection("purpose", profile.purpose)}>
          Request correction
        </Btn>
        <a href={`https://${page.url}`} target="_blank" rel="noreferrer" className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md bg-cta px-4 text-[15px] font-medium text-white hover:bg-cta-hover">
          View article <ExternalLink className="size-4" />
        </a>
      </div>
    </aside>
  );
}

function CorrectionDialog({ row, initial, onClose, onSaved }: { row: LibraryRow; initial: { field: "purpose" | "tone"; to: string }; onClose: () => void; onSaved: () => void }) {
  const [field, setField] = useState(initial.field);
  const current = (field === "purpose" ? row.profile?.purpose : row.profile?.tone) ?? "";
  const [to, setTo] = useState(initial.to);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const options = (field === "purpose" ? PURPOSES : TONES).map((v) => ({ value: v, label: (field === "purpose" ? purposeLabel : toneLabel)[v] }));
  const valid = to && to !== current;

  async function submit() {
    setBusy(true);
    const r = await fetch("/api/corrections", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pageId: row.page.id, field, to, note }) });
    setBusy(false);
    if (r.ok) { toast.success("Correction requested · page moved to Needs review"); onSaved(); }
    else toast.error("Could not create correction");
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request correction</DialogTitle>
          <DialogDescription>{row.page.title}. Purpose and tone are review gated: a reviewer approves the change before it affects delivery.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-[14px]">
          <label className="block">
            <span className="mb-1 block font-medium">Field</span>
            <SimpleSelect ariaLabel="Field" value={field} onChange={(v) => { setField(v as "purpose" | "tone"); setTo(""); }} options={[{ value: "purpose", label: "Purpose" }, { value: "tone", label: "Tone" }]} />
          </label>
          <p>Current value: <b>{lbl(field === "purpose" ? purposeLabel : toneLabel, current)}</b></p>
          <label className="block">
            <span className="mb-1 block font-medium">New value</span>
            <SimpleSelect ariaLabel="New value" value={to} onChange={setTo} options={options} placeholder="Choose a value" />
          </label>
          <label className="block">
            <span className="mb-1 block font-medium">Note for reviewer</span>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="w-full rounded-md border border-[#D0D5DD] p-2" placeholder="Why is the current label wrong?" />
          </label>
        </div>
        <DialogFooter>
          <Btn kind="secondary" onClick={onClose}>Cancel</Btn>
          <Btn kind="primary" disabled={!valid || busy} onClick={submit}>{busy && <Loader2 className="size-4 animate-spin" />}Submit for review</Btn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const ADD_STEPS = ["Fetching page", "Extracting text", "Profiling with Claude", "Checking evidence"];

function AddSourceDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; onDone: (pageId: string, cached: boolean) => void }) {
  const [url, setUrl] = useState("");
  const [paste, setPaste] = useState(false);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function reset() { setSteps([]); setError(null); setBusy(false); }

  async function run(body: Record<string, string>) {
    setBusy(true); setError(null);
    const labels = body.text ? ["Reading pasted text", "Profiling with Claude", "Checking evidence"] : ADD_STEPS;
    setSteps(labels.map((l, i) => ({ label: l, state: i === 0 ? "running" : "pending" })));
    const res = await fetch("/api/profile", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    await readStream<{ type: string; label?: string; done?: boolean; ok?: boolean; detail?: string; message?: string; page?: { id: string; title: string }; cached?: boolean }>(res, (e) => {
      if (e.type === "step") {
        setSteps((prev) => {
          const idx = prev.findIndex((s) => s.label === e.label);
          const next = [...prev];
          if (idx >= 0) {
            next[idx] = { label: e.label!, state: e.done ? (e.ok === false ? "error" : "done") : "running", detail: e.detail };
            if (e.done && next[idx + 1]?.state === "pending") next[idx + 1] = { ...next[idx + 1], state: "running" };
          }
          return next;
        });
      } else if (e.type === "error") {
        setError(e.message ?? "Failed");
        setSteps((prev) => prev.map((s) => (s.state === "running" ? { ...s, state: "error" } : s)));
      } else if (e.type === "result" && e.page) {
        toast.success(`Profiled “${e.page.title.slice(0, 60)}”`);
        onDone(e.page.id, !!e.cached);
        setTimeout(() => { onOpenChange(false); reset(); setUrl(""); setTitle(""); setText(""); setPaste(false); }, 700);
      }
    });
    setBusy(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add content source</DialogTitle>
          <DialogDescription>Paste a public article URL. The ContextGraph topic is kept; Claude adds purpose, tone and quoted evidence.</DialogDescription>
        </DialogHeader>
        {!paste ? (
          <form onSubmit={(e) => { e.preventDefault(); if (url.trim()) run({ url: url.trim() }); }} className="space-y-3">
            <label className="block text-[14px]">
              <span className="mb-1 block font-medium">Article URL</span>
              <input autoFocus value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.example.com/news/article" className="h-10 w-full rounded-md border border-[#D0D5DD] px-3" />
            </label>
            <div className="flex justify-between gap-2">
              <button type="button" className="text-[14px] text-link hover:underline" onClick={() => { setPaste(true); reset(); }}>Paste text instead</button>
              <Btn kind="primary" type="submit" disabled={busy || !url.trim()}>{busy && <Loader2 className="size-4 animate-spin" />}Profile page</Btn>
            </div>
          </form>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); if (title.trim() && text.trim()) run({ title: title.trim(), text: text.trim(), ...(url.trim() ? { url: url.trim() } : {}) }); }} className="space-y-3 text-[14px]">
            <label className="block"><span className="mb-1 block font-medium">Title</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="h-10 w-full rounded-md border border-[#D0D5DD] px-3" />
            </label>
            <label className="block"><span className="mb-1 block font-medium">Article text</span>
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={7} className="w-full rounded-md border border-[#D0D5DD] p-2" placeholder="Paste the article body (at least a few paragraphs)" />
            </label>
            <div className="flex justify-between gap-2">
              <button type="button" className="text-link hover:underline" onClick={() => { setPaste(false); reset(); }}>Use a URL instead</button>
              <Btn kind="primary" type="submit" disabled={busy || !title.trim() || text.trim().split(/\s+/).length < 30}>{busy && <Loader2 className="size-4 animate-spin" />}Profile text</Btn>
            </div>
          </form>
        )}
        <AgentStepsStream steps={steps} />
        {error && (
          <div className="rounded-md border border-[#F5C2BE] bg-bad-bg p-3 text-[14px] text-bad" role="alert">
            {error}{" "}
            {!paste && <button type="button" className="font-medium underline" onClick={() => { setPaste(true); setError(null); setSteps([]); }}>Paste text instead</button>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

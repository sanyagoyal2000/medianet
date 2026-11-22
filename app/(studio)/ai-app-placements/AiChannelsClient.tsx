"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronRight, CircleCheck, CircleX, Info, Loader2, MessagesSquare, Play, Lock } from "lucide-react";
import type { AiOffer, AiRules } from "@/lib/types";
import { Btn } from "@/components/studio/Buttons";
import { StatusPill } from "@/components/studio/StatusPill";
import { SimpleSelect } from "@/components/studio/SimpleSelect";
import { ChipInput } from "@/components/studio/ChipInput";
import { CachedChip } from "@/components/studio/CachedChip";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChatThread } from "@/components/shopbuddy/ChatThread";
import { useShopBuddy } from "@/components/shopbuddy/useShopBuddy";
import { int } from "@/lib/format";
import { cn } from "@/lib/utils";

const SCENARIOS = [
  { value: "shopping", label: "Relevant shopping request", q: "Gift ideas under $50 for my sister who loves cooking", consent: true },
  { value: "recall", label: "Product recall question", q: "Is the holiday toy recall affecting my kid's gift?", consent: true },
  { value: "jobloss", label: "Job-loss budgeting", q: "I just lost my job, how do I budget for holidays?", consent: true },
  { value: "noconsent", label: "No consent", q: "What are practical holiday gifts under $50?", consent: false },
];
const CONTEXTS = ["Shopping", "Gifts", "Product comparisons", "Home office", "Electronics", "Travel"];
type Funnel = { requests: number; offers: number; displays: number; clicks: number };

export function AiChannelsClient({ rules: initialRules, funnel, latest, initialTab }: { rules: AiRules; funnel: Funnel; latest: AiOffer | null; initialTab: "sponsored" | "licensed" }) {
  const router = useRouter();
  const [tab, setTab] = useState(initialTab);
  const [rules, setRules] = useState(initialRules);
  const [saving, setSaving] = useState(false);
  const [scenario, setScenario] = useState("shopping");
  const [lastCached, setLastCached] = useState(false);
  const { turns, busy, send } = useShopBuddy({ onResult: (t) => { setLastCached(!!t.cached); router.refresh(); } });

  const run = (key = scenario) => {
    const s = SCENARIOS.find((x) => x.value === key)!;
    setScenario(key);
    send(s.q, { consent: s.consent, scenario: key, reset: true });
  };

  async function saveRules() {
    setSaving(true);
    const r = await fetch("/api/ai-rules", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(rules) });
    setSaving(false);
    if (r.ok) { setRules(await r.json()); toast.success("Placement rules saved · they apply to the next request"); router.refresh(); }
    else toast.error("Could not save rules");
  }

  const row = (label: React.ReactNode, child: React.ReactNode) => (
    <div className="grid grid-cols-[235px_1fr] items-center gap-3 py-2 [&>label]:whitespace-nowrap">{label}{child}</div>
  );
  const info = (text: string) => (
    <Tooltip><TooltipTrigger aria-label="More info"><Info className="size-4 text-subtle" /></TooltipTrigger><TooltipContent className="max-w-64">{text}</TooltipContent></Tooltip>
  );

  return (
    <>
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-[30px] font-bold leading-tight">AI App Placements</h1>
          <div role="tablist" className="mt-3 flex gap-8">
            {([["sponsored", "Sponsored answers"], ["licensed", "Licensed content access"]] as const).map(([k, l]) => (
              <button key={k} role="tab" aria-selected={tab === k} onClick={() => { setTab(k); window.history.replaceState(null, "", `/ai-app-placements?tab=${k}`); }}
                className={cn("relative flex items-center gap-2 pb-2 text-[18px]", tab === k ? "font-semibold text-ink" : "text-[#475467]")}>
                {l}{k === "licensed" && <StatusPill variant="amber" className="h-6 text-[13px]">Planned</StatusPill>}
                {tab === k && <span className="absolute inset-x-0 -bottom-0.5 h-[3px] rounded bg-cta" />}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4 text-[16px]">
          <span>Application:</span>
          <SimpleSelect ariaLabel="Application" className="w-[190px]" value="shopbuddy" onChange={() => {}} options={[{ value: "shopbuddy", label: "ShopBuddy" }]} />
          <span className="h-8 border-l border-line" />
          <span>Channel status:</span>
          <StatusPill variant="green" className="h-8 px-3 text-[15px]">Partner pilot</StatusPill>
        </div>
      </div>

      {tab === "sponsored" ? (
        <>
          <div className="grid grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] gap-4">
            <section className="studio-card p-5">
              <h2 className="mb-2 text-[20px] font-bold">Placement rules</h2>
              {row(<span>Application</span>, <SimpleSelect ariaLabel="Application" value="shopbuddy" onChange={() => {}} options={[{ value: "shopbuddy", label: "ShopBuddy" }]} />)}
              {row(<span>Format</span>, <SimpleSelect ariaLabel="Format" value={rules.format} onChange={(v) => setRules({ ...rules, format: v })} options={["Sponsored answer card", "Sponsored product card"].map((v) => ({ value: v, label: v }))} />)}
              {row(<span>Context allowed</span>, <ChipInput ariaLabel="Context allowed" variant="grey" value={rules.contextsAllowed} onChange={(v) => setRules({ ...rules, contextsAllowed: v })} options={CONTEXTS} />)}
              {row(<span>Frequency</span>, <SimpleSelect ariaLabel="Frequency" value={rules.frequency} onChange={(v) => setRules({ ...rules, frequency: v })} options={["Max 1 per 3 turns", "At most one per eligible answer"].map((v) => ({ value: v, label: v }))} />)}
              {row(
                <label className="flex items-center gap-2"><Checkbox checked={rules.approvedAssetsOnly} onCheckedChange={(v) => setRules({ ...rules, approvedAssetsOnly: !!v })} className="data-[state=checked]:border-ok-solid data-[state=checked]:bg-ok-solid" />Approved assets only {info("Only creative already approved for this advertiser is used; nothing is generated.")}</label>,
                <span />,
              )}
              {row(
                <label className="flex items-center gap-2"><Checkbox checked disabled className="data-[state=checked]:border-ok-solid data-[state=checked]:bg-ok-solid" />Sponsorship disclosure {info("Every card carries a visible “Sponsored” label. This cannot be turned off.")}</label>,
                <SimpleSelect ariaLabel="Sponsorship disclosure" value={rules.disclosure} onChange={(v) => setRules({ ...rules, disclosure: v })} options={[{ value: "Sponsored", label: "Required · “Sponsored”" }]} />,
              )}
              {row(
                <span className="flex items-center gap-2">Sensitive or unsuitable request {info("Recalls, tragedy, layoffs, health, financial distress, violence or politics: no ad, always.")}</span>,
                <SimpleSelect ariaLabel="Sensitive or unsuitable request" value="No ad" disabled onChange={() => {}} options={[{ value: "No ad", label: "No ad" }]} />,
              )}
              <div className="mt-4 flex justify-end border-t border-line pt-4">
                <Btn kind="primary" className="h-11 px-6 text-[16px]" onClick={saveRules} disabled={saving}>{saving && <Loader2 className="size-4 animate-spin" />}Save rules</Btn>
              </div>
            </section>

            <section className="studio-card p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[20px] font-bold">Answer preview</h2>
                <button type="button" onClick={() => run(scenario === "shopping" ? "recall" : scenario)} className="text-[16px] text-link underline underline-offset-2">Preview no-ad response</button>
              </div>
              <div className="mb-3 flex items-center gap-3">
                <span className="text-[16px]">Scenario:</span>
                <SimpleSelect ariaLabel="Scenario" className="w-[300px]" value={scenario} onChange={setScenario} options={SCENARIOS.map((s) => ({ value: s.value, label: s.label }))} />
                <Btn kind="blue" onClick={() => run()} disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}Run preview</Btn>
                {lastCached && !busy && turns.length > 0 && <CachedChip />}
              </div>
              <div className="rounded-lg border border-line">
                <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
                  <span className="flex items-center gap-2 text-[17px] font-semibold"><MessagesSquare className="size-6" strokeWidth={1.5} /> ShopBuddy</span>
                  <StatusPill variant="green">Partner pilot</StatusPill>
                </div>
                <div className="min-h-[260px] p-4">
                  {turns.length === 0 && !busy ? (
                    <p className="pt-16 text-center text-[15px] text-subtle">Pick a scenario and run the preview. This calls the real ShopBuddy flow: its assistant answers, then Media.net decides whether a sponsored card is allowed.</p>
                  ) : (
                    <ChatThread turns={turns} busy={busy} showReasons onDisplayed={() => router.refresh()} onClicked={() => router.refresh()} />
                  )}
                </div>
              </div>
              {SCENARIOS.find((s) => s.value === scenario)?.consent === false && <p className="mt-2 text-[13px] text-subtle">The user has turned off sponsored suggestions in ShopBuddy.</p>}
            </section>
          </div>

          <div className="mt-4 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4">
            <section className="studio-card p-5">
              <h2 className="mb-3 text-[20px] font-bold">Delivery funnel</h2>
              <div className="flex items-center gap-2">
                {([["Requests", funnel.requests], ["Offers", funnel.offers], ["Displays confirmed", funnel.displays], ["Clicks", funnel.clicks]] as const).map(([l, v], i) => (
                  <div key={l} className="flex flex-1 items-center gap-2">
                    {i > 0 && <ChevronRight className="size-5 shrink-0 text-subtle" />}
                    <div className={cn("flex-1 rounded-md border px-4 py-3", l === "Offers" ? "border-[#84ADFF] bg-[#EEF4FF]" : "border-line")}>
                      <div className="text-[14px]">{l}</div>
                      <div className="text-[28px] font-semibold tabular-nums">{int(v)}</div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 flex items-center gap-2 text-[14px]"><Info className="size-4" /> Returning an offer does not establish an impression.</p>
            </section>
            <section className="studio-card p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[20px] font-bold">Linked decision</h2>
                {latest?.requestId && <Link href={`/decisions/${latest.requestId}`} className="text-[16px] text-link underline underline-offset-2">Inspect decision</Link>}
              </div>
              {latest ? (
                <div className="grid grid-cols-[120px_1fr] rounded-md border border-line">
                  <div className="border-r border-line p-3"><span className="rounded bg-grey-bg px-3 py-1.5 text-[14px] font-medium">{latest.id}</span></div>
                  <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 p-3 text-[14.5px]">
                    {(latest.checks ?? []).map((c) => (
                      <li key={c.label} className="flex items-center gap-2">
                        {c.ok ? <CircleCheck className="size-5 shrink-0 fill-ok-solid text-white" /> : <CircleX className="size-5 shrink-0 fill-bad-solid text-white" />}{c.label}
                      </li>
                    ))}
                    {!latest.displayed && <li className="flex items-center gap-2 text-warn"><Loader2 className="size-4" /> Awaiting display confirmation · not billable</li>}
                  </ul>
                </div>
              ) : <p className="text-subtle">No offers yet.</p>}
            </section>
          </div>
        </>
      ) : (
        <section className="studio-card max-w-4xl p-6">
          <div className="flex items-center gap-3">
            <h2 className="text-[22px] font-bold">Licensed content access</h2>
            <StatusPill variant="amber">Planned · Phase 3</StatusPill>
          </div>
          <p className="mt-3 text-[16px]">Publishers set terms for how AI crawlers and agents may use their content, and are paid when they do. Context Studio would apply those terms using the same crawler identification as Traffic Intelligence.</p>
          <div className="mt-5 grid grid-cols-3 gap-4">
            {[
              ["Publisher-controlled terms", "Per site or section: allow, deny, or price per crawl for each registered AI crawler and agent."],
              ["Separate from advertising", "A content-access transaction, never an ad impression. It does not touch advertiser billing."],
              ["Built on F2 identification", "Uses Web Bot Auth signatures and the agent registry from the Traffic Router to know who is asking."],
            ].map(([t, d]) => (
              <div key={t} className="rounded-lg border border-line p-4"><h3 className="font-semibold">{t}</h3><p className="mt-1 text-[14px] text-[#475467]">{d}</p></div>
            ))}
          </div>
          <table className="mt-5 w-full text-[14px]">
            <thead><tr className="bg-[#F2F4F7] text-left"><th className="px-3 py-2">Requester</th><th className="px-3 py-2">Example term</th><th className="px-3 py-2">Status</th></tr></thead>
            <tbody>
              <tr className="border-b border-line"><td className="px-3 py-2">NewsIndexBot (registered crawler)</td><td className="px-3 py-2">Allow · attribution required</td><td className="px-3 py-2"><StatusPill variant="grey">Illustrative</StatusPill></td></tr>
              <tr className="border-b border-line"><td className="px-3 py-2">ShopSearchBot (registered crawler)</td><td className="px-3 py-2">$0.002 per crawl, product pages only</td><td className="px-3 py-2"><StatusPill variant="grey">Illustrative</StatusPill></td></tr>
              <tr><td className="px-3 py-2">Unidentified clients</td><td className="px-3 py-2">Deny</td><td className="px-3 py-2"><StatusPill variant="grey">Illustrative</StatusPill></td></tr>
            </tbody>
          </table>
          <div className="mt-6 flex items-center gap-3">
            <Btn kind="primary" disabled><Lock className="size-4" /> Join pilot</Btn>
            <span className="text-[14px] text-subtle">Not available yet. Planned after the Sponsored answers pilot.</span>
          </div>
        </section>
      )}
    </>
  );
}

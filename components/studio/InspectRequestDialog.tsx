"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, Send } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SIM_KINDS, buildRequest, type SimKind } from "@/lib/traffic/simulate";
import { Btn } from "./Buttons";
import { cn } from "@/lib/utils";

export function InspectRequestButton({ kind = "outline", className }: { kind?: "outline" | "primary"; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Btn kind={kind} className={cn("h-11 px-4 text-[16px]", className)} onClick={() => setOpen(true)}>
        <Search className="size-[18px]" /> Inspect request
      </Btn>
      <InspectRequestDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

export function InspectRequestDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const [kind, setKind] = useState<SimKind>("crawler");
  const [busy, setBusy] = useState(false);
  const preview = useMemo(() => buildRequest(kind, { created: 1795874400, seed: "preview" }), [kind]);

  async function send() {
    setBusy(true);
    const r = await fetch("/api/requests/simulate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind }) });
    const d = await r.json();
    setBusy(false);
    if (!r.ok) return toast.error(d.error ?? "Simulation failed");
    toast.success(`${d.requestId} routed in ${d.routedMs} ms · ${d.outcome}`);
    onOpenChange(false);
    router.push(`/decisions/${d.requestId}`);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Inspect a live request</DialogTitle>
          <DialogDescription>Simulate a request hitting a publisher page. The Traffic Router (rules only, no LLM) classifies who is requesting, then routes it.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-[230px_1fr] gap-4">
          <fieldset className="space-y-1.5">
            <legend className="mb-1.5 text-[13px] font-semibold uppercase tracking-wide text-subtle">Requester</legend>
            {SIM_KINDS.map((k) => (
              <label key={k.kind} className={cn("flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2 text-[14px]", kind === k.kind ? "border-link bg-[#F0F6FF]" : "border-line hover:bg-[#F9FAFB]")}>
                <input type="radio" name="kind" value={k.kind} checked={kind === k.kind} onChange={() => setKind(k.kind)} className="mt-1 accent-[#0F78F1]" />
                {k.label}
              </label>
            ))}
          </fieldset>
          <div className="min-w-0">
            <p className="mb-1.5 text-[13px] font-semibold uppercase tracking-wide text-subtle">Generated request</p>
            <pre className="max-h-[300px] overflow-auto whitespace-pre-wrap break-all rounded-md bg-[#101828] p-3 font-mono text-[12px] leading-relaxed text-[#E4E7EC]">
{`GET /holiday-gifts-under-50 HTTP/1.1
host: giftguide.example
user-agent: ${preview.userAgent}
${Object.entries(preview.headers).map(([h, v]) => `${h}: ${v}`).join("\n")}`}
            </pre>
            {(kind === "crawler" || kind === "buyer") && (
              <p className="mt-2 text-[12px] text-subtle">Web Bot Auth: header structure and registry are checked (verification simulated; no cryptographic check).</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Btn kind="secondary" onClick={() => onOpenChange(false)}>Cancel</Btn>
          <Btn kind="blue" onClick={send} disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}Send &amp; inspect decision</Btn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

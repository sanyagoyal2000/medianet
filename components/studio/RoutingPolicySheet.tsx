"use client";
import { useState } from "react";
import { Drawer } from "./Drawer";
import { RoutingTable } from "./RoutingTable";
import { Btn } from "./Buttons";
import type { RequestPurpose } from "@/lib/types";

export function RoutingPolicyButton({ label = "Routing policies", kind = "primary", applied, className }: { label?: string; kind?: "primary" | "blue"; applied?: RequestPurpose; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Btn kind={kind} className={className} onClick={() => setOpen(true)}>{label}</Btn>
      <Drawer open={open} onOpenChange={setOpen} title="Routing policy (read-only)" width="sm:max-w-4xl"
        description="Deterministic rules, no LLM. Requester is not audience: identity, request purpose and audience exposure are assessed separately.">
        <RoutingTable applied={applied} detailed />
        <ul className="mt-4 list-disc space-y-1 pl-5 text-[14px] text-ink">
          <li>IVT score &gt; 0.80 from the existing verification partner → Suspected invalid.</li>
          <li>Valid Web Bot Auth headers (Signature-Agent, Signature-Input, Signature) with a registered key → Crawler or Buying agent, per the registry (verification simulated).</li>
          <li><code>x-ai-app-id</code> of a registered partner → AI-app request; billable only after display confirmation.</li>
          <li>Browser user agent + low IVT + no automation flags → Human-facing.</li>
          <li>Anything else → Unknown. <b>Unknown is never billed as human.</b></li>
        </ul>
        <p className="mt-3 text-[13px] text-subtle">Policy changes go through Media.net&apos;s existing change process; this view is read-only.</p>
      </Drawer>
    </>
  );
}

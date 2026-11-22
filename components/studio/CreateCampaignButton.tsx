"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Btn } from "./Buttons";

export function CreateCampaignButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Btn
      kind="primary"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const r = await fetch("/api/campaigns", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "New campaign draft" }) });
        if (!r.ok) { setBusy(false); return toast.error("Could not create campaign"); }
        const c = await r.json();
        router.push(`/campaigns/${c.id}?tab=brief`);
      }}
    >
      {busy && <Loader2 className="size-4 animate-spin" />}Create campaign
    </Btn>
  );
}

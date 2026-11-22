"use client";
import { useCallback, useState } from "react";

export type Placement = { offerId: string; advertiser: string; headline: string; body: string; cta: string; label: string; reasonReader: string };
export type Turn =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; placement?: Placement | null; displayToken?: string | null; reason?: string | null; offerId?: string; requestId?: string; cached?: boolean };

export function useShopBuddy(opts: { onResult?: (t: Extract<Turn, { role: "assistant" }>) => void } = {}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);

  const send = useCallback(async (text: string, o: { consent: boolean; scenario?: string; reset?: boolean }) => {
    const base = o.reset ? [] : turns;
    const next: Turn[] = [...base, { role: "user", content: text }];
    setTurns(next);
    setBusy(true);
    // Frequency: cards shown in the last 3 assistant turns.
    const recentCardCount = base.filter((t) => t.role === "assistant").slice(-3).filter((t) => t.role === "assistant" && t.placement).length;
    try {
      const r = await fetch("/api/shopbuddy/chat", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next.map((t) => ({ role: t.role, content: t.content })), consent: o.consent, recentCardCount, scenario: o.scenario }),
      });
      const d = await r.json();
      const turn: Extract<Turn, { role: "assistant" }> = r.ok
        ? { role: "assistant", content: d.answer, placement: d.placement, displayToken: d.displayToken, reason: d.reason, offerId: d.offerId, requestId: d.requestId, cached: d.cached }
        : { role: "assistant", content: "Sorry, something went wrong. Please try again.", reason: d.error };
      setTurns((t) => [...t, turn]);
      opts.onResult?.(turn);
    } finally {
      setBusy(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turns]);

  return { turns, busy, send, reset: () => setTurns([]) };
}

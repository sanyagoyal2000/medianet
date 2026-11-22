"use client";
import { useEffect, useRef, useState } from "react";
import { SendHorizontal, ShoppingBag } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { ChatThread } from "@/components/shopbuddy/ChatThread";
import { useShopBuddy } from "@/components/shopbuddy/useShopBuddy";

const SUGGESTIONS = [
  "Gift ideas under $50 for my sister who loves cooking",
  "What are practical holiday gifts under $50?",
  "Is the holiday toy recall affecting my kid's gift?",
  "I just lost my job, how do I budget for holidays?",
];

export default function ShopBuddyPage() {
  const [consent, setConsent] = useState(true);
  const [text, setText] = useState("");
  const { turns, busy, send, reset } = useShopBuddy();
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [turns, busy]);

  const submit = (q: string) => {
    if (!q.trim() || busy) return;
    setText("");
    send(q.trim(), { consent });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between bg-[#0E8C84] px-6 text-white shadow">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-full bg-white/15"><ShoppingBag className="size-5" /></span>
          <span className="text-[20px] font-semibold">ShopBuddy</span>
          <span className="ml-2 rounded-full bg-white/15 px-2 py-0.5 text-[12px]">Your shopping helper</span>
        </div>
        <label className="flex items-center gap-2.5 text-[14px]">
          <Switch checked={consent} onCheckedChange={setConsent} aria-label="Show sponsored suggestions" className="data-[state=checked]:bg-white/90 [&_[data-slot=switch-thumb]]:data-[state=checked]:bg-[#0E8C84]" />
          Show sponsored suggestions
        </label>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6">
        {turns.length === 0 ? (
          <div className="mt-10 text-center">
            <h1 className="text-[26px] font-semibold">What are you shopping for?</h1>
            <p className="mt-1 text-[15px] text-[#4B6B6B]">Ask for gift ideas, comparisons or budgeting help.</p>
            <div className="mx-auto mt-6 grid max-w-xl gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" onClick={() => submit(s)} className="rounded-lg border border-[#B8DAD7] bg-white px-4 py-3 text-left text-[15px] hover:border-[#0E8C84]">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ChatThread turns={turns} busy={busy} accent="#0E8C84" />
        )}
        <div ref={end} />
      </main>

      <form onSubmit={(e) => { e.preventDefault(); submit(text); }} className="sticky bottom-0 border-t border-[#D4E6E4] bg-[#F3F7F7] px-4 py-3">
        <div className="mx-auto flex max-w-3xl gap-2">
          <label className="sr-only" htmlFor="sb-input">Message ShopBuddy</label>
          <input id="sb-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask ShopBuddy…" className="h-11 flex-1 rounded-lg border border-[#B8DAD7] bg-white px-4 text-[15px]" />
          <button type="submit" disabled={busy || !text.trim()} className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#0E8C84] px-4 font-medium text-white disabled:opacity-50">
            <SendHorizontal className="size-4" /> Send
          </button>
          {turns.length > 0 && <button type="button" onClick={reset} className="h-11 rounded-lg border border-[#B8DAD7] bg-white px-3 text-[14px]">New chat</button>}
        </div>
        <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-[#4B6B6B]">
          Partner demo app. Sponsored suggestions are labelled and chosen from this chat&apos;s context only.
        </p>
      </form>
    </div>
  );
}

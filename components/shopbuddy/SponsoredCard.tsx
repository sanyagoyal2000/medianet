"use client";
import { useEffect, useRef, useState } from "react";
import { Info, X } from "lucide-react";
import { MugArt } from "@/components/studio/Creative";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Placement } from "./useShopBuddy";

/** Calls /display once when at least half the card is visible; /click on the CTA. */
export function SponsoredCard({ placement, displayToken, onDisplayed, onClicked }: { placement: Placement; displayToken?: string | null; onDisplayed?: () => void; onClicked?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const sent = useRef(false);
  const [displayed, setDisplayed] = useState(false);
  useEffect(() => {
    if (!displayToken || !ref.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !sent.current) {
          sent.current = true;
          fetch("/api/v1/ai-placements/display", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ displayToken }) })
            .then((r) => r.ok && (setDisplayed(true), onDisplayed?.()));
          io.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [displayToken, onDisplayed]);

  return (
    <div ref={ref} className="rounded-lg border border-[#D0D5DD] bg-white p-4 shadow-sm" aria-label={`Sponsored suggestion from ${placement.advertiser}`} data-displayed={displayed}>
      <p className="mb-2 text-[16px]"><b>{placement.label}</b> · {placement.advertiser}</p>
      <div className="grid grid-cols-[minmax(140px,200px)_1fr] gap-4">
        <MugArt className="h-auto w-full rounded-md" />
        <div>
          <h4 className="text-[19px] font-bold leading-tight">{placement.headline}</h4>
          <p className="mt-1 text-[15px] leading-snug">{placement.body}</p>
          <button
            type="button"
            className="mt-3 inline-flex h-9 items-center rounded-md bg-blue px-5 text-[15px] font-medium text-white hover:bg-[#0157CC]"
            onClick={() => {
              if (displayToken) fetch("/api/v1/ai-placements/click", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ displayToken }) }).then(() => onClicked?.());
            }}
          >
            {placement.cta}
          </button>
          <div className="mt-2">
            <Popover>
              <PopoverTrigger className="inline-flex items-center gap-1 text-[13px] text-link underline underline-offset-2">
                Why this suggestion? <Info className="size-3.5" />
              </PopoverTrigger>
              <PopoverContent side="right" className="w-60 text-[13px]">
                <div className="flex items-start justify-between gap-2"><p>{placement.reasonReader}</p><X className="size-3.5 shrink-0 text-subtle" aria-hidden /></div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    </div>
  );
}

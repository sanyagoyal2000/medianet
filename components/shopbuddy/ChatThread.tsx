"use client";
import { MessageCircleMore, User, Loader2, Ban } from "lucide-react";
import type { Turn } from "./useShopBuddy";
import { SponsoredCard } from "./SponsoredCard";
import { cn } from "@/lib/utils";

export function ChatThread({ turns, busy, showReasons, onDisplayed, onClicked, accent = "#0F78F1" }: {
  turns: Turn[]; busy: boolean; showReasons?: boolean; onDisplayed?: () => void; onClicked?: () => void; accent?: string;
}) {
  return (
    <div className="space-y-4" aria-live="polite">
      {turns.map((t, i) =>
        t.role === "user" ? (
          <div key={i} className="flex items-start justify-end gap-3">
            <p className="max-w-[80%] rounded-lg px-4 py-2.5 text-[16px]" style={{ background: `${accent}1F` }}>{t.content}</p>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#E4E7EC]"><User className="size-5 text-[#475467]" /></span>
          </div>
        ) : (
          <div key={i} className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#F2F4F7]"><MessageCircleMore className="size-5 text-[#475467]" /></span>
              <p className="max-w-[85%] rounded-lg bg-[#F2F4F7] px-4 py-2.5 text-[16px]">{t.content}</p>
            </div>
            {t.placement ? (
              <div className="pl-12"><SponsoredCard placement={t.placement} displayToken={t.displayToken} onDisplayed={onDisplayed} onClicked={onClicked} /></div>
            ) : showReasons && t.reason ? (
              <p className="pl-12">
                <span className={cn("inline-flex items-center gap-1.5 rounded-full bg-grey-bg px-3 py-1 text-[13px] font-medium text-grey")}>
                  <Ban className="size-3.5" /> No ad: {t.reason.charAt(0).toLowerCase() + t.reason.slice(1)}
                </span>
              </p>
            ) : null}
          </div>
        ),
      )}
      {busy && (
        <div className="flex items-center gap-3 text-[14px] text-subtle">
          <span className="flex size-9 items-center justify-center rounded-full bg-[#F2F4F7]"><Loader2 className="size-4 animate-spin" /></span>
          ShopBuddy is typing…
        </div>
      )}
    </div>
  );
}

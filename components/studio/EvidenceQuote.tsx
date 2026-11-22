import { cn } from "@/lib/utils";

export function EvidenceQuote({ field, quote, className }: { field?: string; quote: string; className?: string }) {
  return (
    <div className={cn("flex gap-3", className)}>
      {field && <div className="w-20 shrink-0 pt-2 text-[14px] font-medium capitalize text-ink">{field}:</div>}
      <blockquote className="flex-1 rounded-md border border-line border-l-4 border-l-[#98A2B3] bg-white px-3 py-2 text-[14px] leading-snug text-ink">
        &ldquo;{quote}&rdquo;
      </blockquote>
    </div>
  );
}

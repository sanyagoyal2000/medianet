import { Database } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function CachedChip({ show = true, latencyMs }: { show?: boolean; latencyMs?: number }) {
  if (!show) return null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="inline-flex h-5 items-center gap-1 rounded-full bg-grey-bg px-2 text-[11px] font-medium text-grey">
          <Database className="size-3" aria-hidden /> cached
        </span>
      </TooltipTrigger>
      <TooltipContent>
        Agent result served from the committed cache (no key, cached mode, timeout or error){latencyMs != null ? ` · ${latencyMs} ms` : ""}.
      </TooltipContent>
    </Tooltip>
  );
}

"use client";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function ChipInput({
  value, onChange, options, labelFor = (v) => v, variant = "red", ariaLabel,
}: {
  value: string[]; onChange: (v: string[]) => void; options: string[]; labelFor?: (v: string) => string;
  variant?: "red" | "grey"; ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const remaining = options.filter((o) => !value.includes(o));
  return (
    <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border border-[#D0D5DD] bg-white px-2 py-1.5" aria-label={ariaLabel} role="group">
      {value.map((v) => (
        <span
          key={v}
          className={cn(
            "inline-flex h-7 items-center gap-1.5 rounded-full pl-3 pr-1.5 text-[14px]",
            variant === "red" ? "bg-bad-bg text-ink" : "border border-line bg-[#F9FAFB] text-ink",
          )}
        >
          {labelFor(v)}
          <button
            type="button"
            onClick={() => onChange(value.filter((x) => x !== v))}
            className="rounded-full p-0.5 hover:bg-black/10"
            aria-label={`Remove ${labelFor(v)}`}
          >
            <X className="size-3.5" />
          </button>
        </span>
      ))}
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger
          disabled={remaining.length === 0}
          className="ml-auto inline-flex h-7 items-center gap-1 rounded-md px-2 text-[13px] text-link hover:bg-[#F0F6FF] disabled:opacity-40"
          aria-label={`Add to ${ariaLabel}`}
        >
          <Plus className="size-3.5" /> Add
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {remaining.map((o) => (
            <DropdownMenuItem key={o} onSelect={() => onChange([...value, o])}>
              {labelFor(o)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
